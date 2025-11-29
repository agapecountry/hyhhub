import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'npm:plaid@30.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    const { plaid_item_id } = await req.json();

    if (!plaid_item_id) {
      throw new Error('Missing plaid_item_id');
    }

    console.log('Syncing transactions for plaid_item_id:', plaid_item_id);

    // Get the Plaid item with current cursor
    const { data: plaidItem, error: itemError } = await supabaseClient
      .from('plaid_items')
      .select('*')
      .eq('id', plaid_item_id)
      .single();

    if (itemError || !plaidItem) {
      throw new Error('Plaid item not found');
    }

    // Initialize Plaid client
    const plaidConfig = new Configuration({
      basePath: PlaidEnvironments[Deno.env.get('PLAID_ENV') || 'sandbox'],
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': Deno.env.get('PLAID_CLIENT_ID'),
          'PLAID-SECRET': Deno.env.get('PLAID_SECRET'),
        },
      },
    });

    const plaidClient = new PlaidApi(plaidConfig);

    console.log('Current cursor:', plaidItem.transactions_cursor || 'none (will do initial fetch)');
    
    let transactions: any[] = [];
    let cursor = plaidItem.transactions_cursor || '';
    const addedTransactions: any[] = [];
    const modifiedTransactions: any[] = [];
    const removedTransactionIds: string[] = [];

    // If no cursor exists, this is the first sync - use transactions/get for historical data
    if (!plaidItem.transactions_cursor) {
      console.log('First sync detected - fetching historical transactions...');
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 730); // 2 years back
      const endDate = new Date();
      
      const transactionsResponse = await plaidClient.transactionsGet({
        access_token: plaidItem.access_token,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        options: {
          count: 500,
          offset: 0,
        },
      });
      
      transactions = transactionsResponse.data.transactions;
      console.log(`Initial fetch: ${transactions.length} transactions`);
      
      // Now sync to get the cursor for future incremental updates
      const syncResponse = await plaidClient.transactionsSync({
        access_token: plaidItem.access_token,
        cursor: '',
      });
      cursor = syncResponse.data.next_cursor;
      console.log('Initialized cursor for future syncs');
      
    } else {
      // Use transactions/sync for incremental updates
      console.log('Incremental sync using cursor...');
      let hasMore = true;

      while (hasMore) {
        const syncResponse = await plaidClient.transactionsSync({
          access_token: plaidItem.access_token,
          cursor: cursor,
        });

        const data = syncResponse.data;
        
        addedTransactions.push(...data.added);
        modifiedTransactions.push(...data.modified);
        removedTransactionIds.push(...data.removed.map((r: any) => r.transaction_id));
        
        hasMore = data.has_more;
        cursor = data.next_cursor;
        
        console.log(`Sync batch: ${data.added.length} added, ${data.modified.length} modified, ${data.removed.length} removed`);
      }

      console.log(`Total from sync: ${addedTransactions.length} added, ${modifiedTransactions.length} modified, ${removedTransactionIds.length} removed`);
      transactions = [...addedTransactions, ...modifiedTransactions];
    }

    // Get all plaid_accounts for this item
    const { data: plaidAccounts, error: accountsError } = await supabaseClient
      .from('plaid_accounts')
      .select('id, account_id')
      .eq('plaid_item_id', plaid_item_id);

    if (accountsError) {
      throw accountsError;
    }

    // Create a map of Plaid account_id to our plaid_account id
    const accountMap = new Map(
      plaidAccounts?.map(acc => [acc.account_id, acc.id]) || []
    );

    // Get existing user-modified transactions to exclude them from updates
    const transactionIds = transactions.map(t => t.transaction_id);
    const { data: userModified } = await supabaseClient
      .from('plaid_transactions')
      .select('transaction_id')
      .in('transaction_id', transactionIds)
      .eq('user_modified', true);

    const userModifiedIds = new Set(userModified?.map(t => t.transaction_id) || []);
    console.log(`Found ${userModifiedIds.size} user-modified transactions to preserve`);

    // Load bills and debts for auto-matching
    const { data: bills } = await supabaseClient
      .from('bills')
      .select('id, name, company, payee_id, amount, due_day, category_id, institution, merchant_name, matching_keywords')
      .eq('household_id', plaidItem.household_id)
      .eq('is_active', true);

    const { data: debts } = await supabaseClient
      .from('debts')
      .select('id, name, creditor, minimum_payment, category_id, institution, merchant_name, matching_keywords')
      .eq('household_id', plaidItem.household_id);

    const { data: categories } = await supabaseClient
      .from('transaction_categories')
      .select('id, name, type')
      .eq('household_id', plaidItem.household_id);

    console.log(`Loaded ${bills?.length || 0} bills, ${debts?.length || 0} debts, ${categories?.length || 0} categories for matching`);

    // Helper function to calculate string similarity (simple version)
    const similarity = (str1: string, str2: string): number => {
      const s1 = str1.toLowerCase().trim();
      const s2 = str2.toLowerCase().trim();
      if (s1 === s2) return 1.0;
      if (s1.includes(s2) || s2.includes(s1)) return 0.8;
      
      // Check for word matches
      const words1 = s1.split(/\s+/);
      const words2 = s2.split(/\s+/);
      const matches = words1.filter(w => words2.includes(w)).length;
      return matches / Math.max(words1.length, words2.length);
    };

    // Helper function to auto-match transaction
    const autoMatch = (transaction: any) => {
      let billId = null;
      let debtId = null;
      let categoryId = null;
      let autoMatched = false;
      let matchConfidence = null;

      const txAmount = Math.abs(transaction.amount);
      const txName = transaction.merchant_name || transaction.name;
      const txDate = new Date(transaction.date);

      // Try to match to bills first
      if (bills && bills.length > 0) {
        for (const bill of bills) {
          // Calculate name similarity against multiple fields
          const nameSim = Math.max(
            similarity(txName, bill.name),
            bill.company ? similarity(txName, bill.company) : 0,
            bill.merchant_name ? similarity(txName, bill.merchant_name) : 0,
            bill.institution ? similarity(txName, bill.institution) : 0
          );
          
          // Check if any keywords match
          let keywordMatch = false;
          if (bill.matching_keywords && Array.isArray(bill.matching_keywords)) {
            keywordMatch = bill.matching_keywords.some(kw => 
              txName.toLowerCase().includes(kw.toLowerCase())
            );
          }
          
          const amountMatch = Math.abs(txAmount - bill.amount) < 1.0; // Within $1
          const dayDiff = Math.abs(txDate.getDate() - bill.due_day);
          const dateMatch = dayDiff <= 3; // Within 3 days of due date

          // High confidence: good name match + amount + date, or keyword match + amount + date
          if ((nameSim > 0.7 || keywordMatch) && amountMatch && dateMatch) {
            billId = bill.id;
            categoryId = bill.category_id;
            autoMatched = true;
            matchConfidence = 'high';
            console.log(`Matched transaction "${txName}" to bill "${bill.name}" (high confidence, nameSim: ${nameSim}, keyword: ${keywordMatch})`);
            break;
          } 
          // Medium confidence: decent name match + amount or date
          else if (nameSim > 0.6 && (amountMatch || dateMatch)) {
            billId = bill.id;
            categoryId = bill.category_id;
            autoMatched = true;
            matchConfidence = 'medium';
            console.log(`Matched transaction "${txName}" to bill "${bill.name}" (medium confidence, nameSim: ${nameSim})`);
            break;
          }
          // Low confidence: keyword match + amount
          else if (keywordMatch && amountMatch) {
            billId = bill.id;
            categoryId = bill.category_id;
            autoMatched = true;
            matchConfidence = 'low';
            console.log(`Matched transaction "${txName}" to bill "${bill.name}" (low confidence, keyword match)`);
            break;
          }
        }
      }

      // If no bill match, try debts
      if (!billId && debts && debts.length > 0) {
        for (const debt of debts) {
          // Calculate name similarity against multiple fields
          const nameSim = Math.max(
            similarity(txName, debt.name),
            debt.creditor ? similarity(txName, debt.creditor) : 0,
            debt.merchant_name ? similarity(txName, debt.merchant_name) : 0,
            debt.institution ? similarity(txName, debt.institution) : 0
          );
          
          // Check if any keywords match
          let keywordMatch = false;
          if (debt.matching_keywords && Array.isArray(debt.matching_keywords)) {
            keywordMatch = debt.matching_keywords.some(kw => 
              txName.toLowerCase().includes(kw.toLowerCase())
            );
          }
          
          const amountMatch = Math.abs(txAmount - debt.minimum_payment) < 1.0;

          // High confidence: good name match + amount, or keyword match + amount
          if ((nameSim > 0.7 || keywordMatch) && amountMatch) {
            debtId = debt.id;
            categoryId = debt.category_id;
            autoMatched = true;
            matchConfidence = 'high';
            console.log(`Matched transaction "${txName}" to debt "${debt.name}" (high confidence, nameSim: ${nameSim}, keyword: ${keywordMatch})`);
            break;
          } 
          // Medium confidence: decent name match
          else if (nameSim > 0.6) {
            debtId = debt.id;
            categoryId = debt.category_id;
            autoMatched = true;
            matchConfidence = 'medium';
            console.log(`Matched transaction "${txName}" to debt "${debt.name}" (medium confidence, nameSim: ${nameSim})`);
            break;
          }
          // Low confidence: keyword match only
          else if (keywordMatch) {
            debtId = debt.id;
            categoryId = debt.category_id;
            autoMatched = true;
            matchConfidence = 'low';
            console.log(`Matched transaction "${txName}" to debt "${debt.name}" (low confidence, keyword match)`);
            break;
          }
        }
      }

      // If no match yet, try to auto-categorize based on Plaid categories
      if (!categoryId && categories && categories.length > 0 && transaction.personal_finance_category) {
        const plaidPrimary = transaction.personal_finance_category.primary?.toLowerCase() || '';
        const plaidDetailed = transaction.personal_finance_category.detailed?.toLowerCase() || '';
        console.log(`Trying to categorize "${txName}" with Plaid category: ${plaidPrimary} / ${plaidDetailed}`);
        
        // Map Plaid personal_finance_category to our categories
        const categoryMappings: Record<string, string[]> = {
          'food_and_drink': ['food', 'dining', 'restaurant', 'groceries', 'grocery'],
          'transportation': ['travel', 'transportation', 'gas', 'fuel'],
          'general_merchandise': ['shopping', 'retail'],
          'entertainment': ['entertainment', 'fun', 'leisure'],
          'general_services': ['utilities', 'services', 'utility'],
          'medical': ['health', 'medical', 'healthcare'],
          'home_improvement': ['home improvement', 'home', 'improvement'],
          'personal_care': ['personal care', 'care'],
          'rent_and_utilities': ['rent', 'utilities', 'utility', 'mortgage'],
        };

        // Try to match using primary category
        for (const [plaidCat, keywords] of Object.entries(categoryMappings)) {
          if (plaidPrimary.includes(plaidCat) || plaidDetailed.includes(plaidCat)) {
            console.log(`Plaid category "${plaidPrimary}" matches pattern "${plaidCat}", looking for keywords:`, keywords);
            const matchedCat = categories.find(c => 
              keywords.some(kw => c.name.toLowerCase().includes(kw))
            );
            if (matchedCat) {
              categoryId = matchedCat.id;
              autoMatched = true;
              matchConfidence = matchConfidence || 'low';
              console.log(`✅ Auto-categorized "${txName}" to "${matchedCat.name}" based on Plaid category "${plaidPrimary}"`);
              break;
            }
          }
        }
        
        if (!categoryId) {
          console.log(`⚠️ Could not categorize "${txName}" - Plaid category "${plaidPrimary}" didn't match any patterns`);
        }
      } else if (!categoryId) {
        console.log(`⚠️ Skipping categorization for "${txName}" - categories:${categories?.length}, has personal_finance_category:${!!transaction.personal_finance_category}`);
      }

      return { billId, debtId, categoryId, autoMatched, matchConfidence };
    };

    // Debug: Log first transaction to see available fields
    if (transactions.length > 0) {
      console.log('Sample transaction fields:', Object.keys(transactions[0]));
      console.log('Sample transaction category data:', transactions[0].category, transactions[0].personal_finance_category);
    }

    // Prepare transactions for insert, filtering out user-modified ones and adding auto-match data
    const transactionsToInsert = transactions
      .filter(t => accountMap.has(t.account_id) && !userModifiedIds.has(t.transaction_id))
      .map(transaction => {
        const match = autoMatch(transaction);
        return {
          plaid_account_id: accountMap.get(transaction.account_id),
          transaction_id: transaction.transaction_id,
          household_id: plaidItem.household_id,
          amount: transaction.amount,
          date: transaction.date,
          name: transaction.name,
          merchant_name: transaction.merchant_name || null,
          category: transaction.category || [],
          pending: transaction.pending,
          user_modified: false,
          bill_id: match.billId,
          debt_id: match.debtId,
          category_id: match.categoryId,
          auto_matched: match.autoMatched,
          match_confidence: match.matchConfidence,
        };
      });

    let insertedCount = 0;
    if (transactionsToInsert.length > 0) {
      console.log(`Upserting ${transactionsToInsert.length} transactions (excluding user-modified)...`);
      
      const { error: insertError } = await supabaseClient
        .from('plaid_transactions')
        .upsert(transactionsToInsert, {
          onConflict: 'transaction_id',
        });

      if (insertError) {
        console.error('Error inserting transactions:', insertError);
        throw insertError;
      }
      insertedCount = transactionsToInsert.length;
    }

    // Handle removed transactions (delete only if not user-modified)
    let removedCount = 0;
    if (removedTransactionIds.length > 0) {
      console.log(`Removing ${removedTransactionIds.length} deleted transactions...`);
      
      const { error: deleteError } = await supabaseClient
        .from('plaid_transactions')
        .delete()
        .in('transaction_id', removedTransactionIds)
        .eq('user_modified', false); // Only delete non-modified transactions

      if (deleteError) {
        console.error('Error deleting transactions:', deleteError);
      } else {
        removedCount = removedTransactionIds.length;
      }
    }

    // Update last_synced_at and store the cursor for next incremental sync
    await supabaseClient
      .from('plaid_items')
      .update({ 
        last_synced_at: new Date().toISOString(),
        transactions_cursor: cursor, // Store cursor for next sync
      })
      .eq('id', plaid_item_id);

    console.log(`Successfully synced: ${insertedCount} upserted, ${removedCount} removed, ${userModifiedIds.size} user-modified preserved`);

    // Auto-match newly synced transactions with existing manual transactions
    let matchedCount = 0;
    try {
      console.log('Running auto-match for newly synced transactions...');
      const { data: accounts } = await supabaseClient
        .from('accounts')
        .select('id')
        .eq('plaid_item_id', plaid_item_id);
      
      if (accounts && accounts.length > 0) {
        for (const account of accounts) {
          const { data: matchCount, error: matchError } = await supabaseClient
            .rpc('auto_match_new_transactions', {
              p_account_id: account.id
            });
          
          if (!matchError && matchCount) {
            matchedCount += matchCount;
          }
        }
        console.log(`Auto-matched ${matchedCount} transactions`);
      }
    } catch (matchError) {
      console.error('Error during auto-match:', matchError);
      // Don't fail the sync if matching fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        added: addedTransactions.length,
        modified: modifiedTransactions.length,
        removed: removedCount,
        synced: insertedCount,
        user_modified_preserved: userModifiedIds.size,
        matched: matchedCount,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Sync error:', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to sync transactions',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
