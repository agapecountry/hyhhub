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

    // First, call /transactions/refresh to tell Plaid to fetch new transactions from the institution
    try {
      console.log('Calling /transactions/refresh to fetch new transactions from institution...');
      await plaidClient.transactionsRefresh({
        access_token: plaidItem.access_token,
      });
      console.log('Refresh request sent successfully');
      
      // Wait a moment for Plaid to process the refresh
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (refreshError: any) {
      // Refresh may fail if not enabled or rate limited - continue with sync anyway
      console.log('Refresh skipped or failed:', refreshError?.response?.data?.error_code || refreshError.message);
    }

    // Always use transactionsGet to fetch recent transactions
    // This is more reliable than cursor-based sync which can get out of sync
    console.log('Fetching transactions using transactionsGet...');
    
    let transactions: any[] = [];
    const removedTransactionIds: string[] = [];
    
    // Determine how far back to fetch
    const isInitialSync = !plaidItem.transactions_cursor;
    const daysBack = isInitialSync ? 730 : 90; // 2 years for initial, 90 days for updates
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    const endDate = new Date();
    
    console.log(`Fetching transactions from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}...`);
    
    // Fetch all transactions with pagination
    let offset = 0;
    const count = 500;
    let totalAvailable = 0;
    
    do {
      const transactionsResponse = await plaidClient.transactionsGet({
        access_token: plaidItem.access_token,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        options: {
          count: count,
          offset: offset,
        },
      });
      
      transactions.push(...transactionsResponse.data.transactions);
      totalAvailable = transactionsResponse.data.total_transactions;
      offset += count;
      
      console.log(`Fetched ${transactions.length} of ${totalAvailable} transactions...`);
    } while (transactions.length < totalAvailable);
    
    console.log(`Total fetched: ${transactions.length} transactions`);
    
    // Update cursor to mark sync as done (for tracking purposes)
    const cursor = new Date().toISOString();

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
      .select('id, company, amount, due_date, category_id, institution, merchant_name, matching_keywords')
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
      if (!str1 || !str2) return 0;
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
      const txName = transaction.merchant_name || transaction.name || '';
      const txDate = new Date(transaction.date);

      // Try to match to bills first
      if (bills && bills.length > 0) {
        for (const bill of bills) {
          // Calculate name similarity against multiple fields (bills use company, not name)
          const nameSim = Math.max(
            similarity(txName, bill.company),
            bill.merchant_name ? similarity(txName, bill.merchant_name) : 0,
            bill.institution ? similarity(txName, bill.institution) : 0
          );
          
          // Check if any keywords match
          let keywordMatch = false;
          if (bill.matching_keywords && Array.isArray(bill.matching_keywords)) {
            keywordMatch = bill.matching_keywords.some((kw: string) => 
              txName.toLowerCase().includes(kw.toLowerCase())
            );
          }
          
          const amountMatch = Math.abs(txAmount - bill.amount) < 1.0; // Within $1
          const dayDiff = Math.abs(txDate.getDate() - (bill.due_date || 0));
          const dateMatch = dayDiff <= 3; // Within 3 days of due date

          // High confidence: good name match + amount + date, or keyword match + amount + date
          if ((nameSim > 0.7 || keywordMatch) && amountMatch && dateMatch) {
            billId = bill.id;
            categoryId = bill.category_id;
            autoMatched = true;
            matchConfidence = 'high';
            console.log(`Matched transaction "${txName}" to bill "${bill.company}" (high confidence, nameSim: ${nameSim}, keyword: ${keywordMatch})`);
            break;
          } 
          // Medium confidence: decent name match + amount or date
          else if ((nameSim > 0.5 || keywordMatch) && (amountMatch || dateMatch)) {
            billId = bill.id;
            categoryId = bill.category_id;
            autoMatched = true;
            matchConfidence = 'medium';
            console.log(`Matched transaction "${txName}" to bill "${bill.company}" (medium confidence, nameSim: ${nameSim})`);
            break;
          }
          // Low confidence: keyword match + amount
          else if (keywordMatch && amountMatch) {
            billId = bill.id;
            categoryId = bill.category_id;
            autoMatched = true;
            matchConfidence = 'low';
            console.log(`Matched transaction "${txName}" to bill "${bill.company}" (low confidence, keyword match)`);
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
            keywordMatch = debt.matching_keywords.some((kw: string) => 
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
      // Get existing transaction IDs (including hidden ones) to avoid overwriting or re-inserting
      const txIds = transactionsToInsert.map(t => t.transaction_id);
      const { data: existingTx } = await supabaseClient
        .from('plaid_transactions')
        .select('transaction_id, hidden')
        .in('transaction_id', txIds);
      
      // Include both existing and hidden transactions - hidden ones should never be re-inserted
      const existingIds = new Set(existingTx?.map(t => t.transaction_id) || []);
      const hiddenCount = existingTx?.filter(t => t.hidden).length || 0;
      if (hiddenCount > 0) {
        console.log(`Skipping ${hiddenCount} hidden (soft-deleted) transactions`);
      }
      
      // Only insert NEW transactions, never update existing ones
      const newTransactions = transactionsToInsert.filter(t => !existingIds.has(t.transaction_id));
      
      console.log(`Found ${existingIds.size} existing transactions, inserting ${newTransactions.length} new transactions only...`);
      
      if (newTransactions.length > 0) {
        const { error: insertError } = await supabaseClient
          .from('plaid_transactions')
          .insert(newTransactions);

        if (insertError) {
          console.error('Error inserting transactions:', insertError);
          throw insertError;
        }
        insertedCount = newTransactions.length;
      }
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
      // Use plaid_accounts table (not accounts)
      const { data: plaidAccountsForMatch } = await supabaseClient
        .from('plaid_accounts')
        .select('id')
        .eq('plaid_item_id', plaid_item_id);
      
      if (plaidAccountsForMatch && plaidAccountsForMatch.length > 0) {
        for (const account of plaidAccountsForMatch) {
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
        fetched: transactions.length,
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
