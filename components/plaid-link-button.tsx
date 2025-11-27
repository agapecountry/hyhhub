'use client';

import { useCallback, useState, useEffect } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { Button } from '@/components/ui/button';
import { Link2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface PlaidLinkButtonProps {
  householdId: string;
  userId: string;
  onSuccess?: () => void;
  disabled?: boolean;
}

export function PlaidLinkButton({ householdId, userId, onSuccess, disabled }: PlaidLinkButtonProps) {
  const { toast } = useToast();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onPlaidSuccess = useCallback(
    async (public_token: string, metadata: any) => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('Not authenticated');
        }

        const apiUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/plaid-exchange-token`;
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            public_token,
            householdId,
          }),
        });

        const result = await response.json();

        if (result.error) {
          throw new Error(result.error);
        }

        toast({
          title: 'Success',
          description: `Connected ${metadata.institution.name} with ${result.accounts_count} account(s)`,
        });

        if (onSuccess) {
          onSuccess();
        }
      } catch (error: any) {
        console.error('Error exchanging token:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to connect bank account',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    },
    [householdId, onSuccess, toast]
  );

  const onPlaidExit = useCallback((error: any, metadata: any) => {
    if (error) {
      console.error('Plaid Link error:', error);
      toast({
        title: 'Connection Failed',
        description: error.display_message || 'Failed to connect bank account',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const config = {
    token: linkToken,
    onSuccess: onPlaidSuccess,
    onExit: onPlaidExit,
  };

  const { open, ready } = usePlaidLink(config);

  useEffect(() => {
    if (linkToken && ready && loading) {
      setLoading(false);
      open();
    }
  }, [linkToken, ready, loading, open]);

  const handleClick = async () => {
    if (linkToken && ready) {
      open();
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      const apiUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/plaid-create-link-token`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          householdId,
        }),
      });

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      if (!result.link_token) {
        throw new Error('No link token received from server');
      }

      setLinkToken(result.link_token);
    } catch (error: any) {
      console.error('Error creating link token:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to initialize bank connection',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleClick} disabled={disabled || loading}>
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Connecting...
        </>
      ) : (
        <>
          <Link2 className="h-4 w-4 mr-2" />
          Link Bank
        </>
      )}
    </Button>
  );
}
