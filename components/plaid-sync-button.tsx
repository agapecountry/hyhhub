'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface PlaidSyncButtonProps {
  plaidItemId: string;
  onSuccess?: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export function PlaidSyncButton({ plaidItemId, onSuccess, variant = 'outline', size = 'sm' }: PlaidSyncButtonProps) {
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/plaid-sync-transactions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plaid_item_id: plaidItemId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to sync transactions');
      }

      toast({
        title: 'Success',
        description: `Synced ${result.synced} transactions`,
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to sync transactions',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Button
      onClick={handleSync}
      disabled={syncing}
      variant={variant}
      size={size}
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
      {syncing ? 'Syncing...' : 'Sync Transactions'}
    </Button>
  );
}
