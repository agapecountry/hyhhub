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

    console.log('Fetching transactions from Plaid using sync...');
    console.log('Current cursor:', plaidItem.transactions_cursor || 'none (initial sync)');
    
    // Use transactions/sync for incremental updates
    let cursor = plaidItem.transactions_cursor || '';
    let hasMore = true;
    const allTransactions: any[] = [];
    const addedTransactions: any[] = [];
    const modifiedTransactions: any[] = [];
    const removedTransactionIds: string[] = [];

    // Fetch all updates using pagination
    while (hasMore) {
      const syncResponse = await plaidClient.transactionsSync({
        access_token: plaidItem.access_token,
        cursor: cursor,
      });

      const data = syncResponse.data;
      
      // Collect all transaction changes
      addedTransactions.push(...data.added);
      modifiedTransactions.push(...data.modified);
      removedTransactionIds.push(...data.removed.map((r: any) => r.transaction_id));
      
      hasMore = data.has_more;
      cursor = data.next_cursor;
      
      console.log(`Sync batch: ${data.added.length} added, ${data.modified.length} modified, ${data.removed.length} removed`);
    }

    console.log(`Total from sync: ${addedTransactions.length} added, ${modifiedTransactions.length} modified, ${removedTransactionIds.length} removed`);
    
    const transactions = [...addedTransactions, ...modifiedTransactions];

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
      .select('id, name, payee_id, amount, due_day, category_id')
      .eq('household_id', plaidItem.household_id)
      .eq('is_active', true);

    const { data: debts } = await supabaseClient
      .from('debts')
      .select('id, name, creditor, minimum_payment, category_id')
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
          const nameSim = similarity(txName, bill.name);
          const amountMatch = Math.abs(txAmount - bill.amount) < 1.0; // Within $1
          const dayDiff = Math.abs(txDate.getDate() - bill.due_day);
          const dateMatch = dayDiff <= 3; // Within 3 days of due date

          if (nameSim > 0.7 && amountMatch && dateMatch) {
            billId = bill.id;
            categoryId = bill.category_id;
            autoMatched = true;
            matchConfidence = 'high';
            console.log(`Matched transaction "${txName}" to bill "${bill.name}" (high confidence)`);
            break;
          } else if (nameSim > 0.6 && (amountMatch || dateMatch)) {
            billId = bill.id;
            categoryId = bill.category_id;
            autoMatched = true;
            matchConfidence = 'medium';
            break;
          }
        }
      }

      // If no bill match, try debts
      if (!billId && debts && debts.length > 0) {
        for (const debt of debts) {
          const nameSim = Math.max(
            similarity(txName, debt.name),
            debt.creditor ? similarity(txName, debt.creditor) : 0
          );
          const amountMatch = Math.abs(txAmount - debt.minimum_payment) < 1.0;

          if (nameSim > 0.7 && amountMatch) {
            debtId = debt.id;
            categoryId = debt.category_id;
            autoMatched = true;
            matchConfidence = 'high';
            console.log(`Matched transaction "${txName}" to debt "${debt.name}" (high confidence)`);
            break;
          } else if (nameSim > 0.6) {
            debtId = debt.id;
            categoryId = debt.category_id;
            autoMatched = true;
            matchConfidence = 'medium';
            break;
          }
        }
      }

      // If no match yet, try to auto-categorize based on Plaid categories
      if (!categoryId && categories && categories.length > 0 && transaction.category && transaction.category.length > 0) {
        const plaidCategory = transaction.category[0]?.toLowerCase() || '';
        
        // Map common Plaid categories to our categories
        const categoryMappings: Record<string, string[]> = {
          'food and drink': ['food', 'dining', 'restaurant', 'groceries'],
          'travel': ['travel', 'transportation', 'gas', 'fuel'],
          'shops': ['shopping', 'retail'],
          'recreation': ['entertainment', 'fun', 'leisure'],
          'service': ['utilities', 'services'],
          'healthcare': ['health', 'medical'],
        };

        for (const [plaidCat, keywords] of Object.entries(categoryMappings)) {
          if (plaidCategory.includes(plaidCat)) {
            const matchedCat = categories.find(c => 
              keywords.some(kw => c.name.toLowerCase().includes(kw))
            );
            if (matchedCat) {
              categoryId = matchedCat.id;
              autoMatched = true;
              matchConfidence = matchConfidence || 'low';
              console.log(`Auto-categorized "${txName}" to "${matchedCat.name}" based on Plaid category`);
              break;
            }
          }
        }
      }

      return { billId, debtId, categoryId, autoMatched, matchConfidence };
    };

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

    return new Response(
      JSON.stringify({
        success: true,
        added: addedTransactions.length,
        modified: modifiedTransactions.length,
        removed: removedCount,
        synced: insertedCount,
        user_modified_preserved: userModifiedIds.size,
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
