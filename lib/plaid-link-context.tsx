'use client';

import { createContext, useContext, useCallback, useState, useEffect, ReactNode } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface PlaidLinkContextType {
  openPlaidLink: (householdId: string, userId: string, onSuccess?: () => void) => Promise<void>;
  isLoading: boolean;
  isReady: boolean;
}

const PlaidLinkContext = createContext<PlaidLinkContextType | undefined>(undefined);

export function PlaidLinkProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentHouseholdId, setCurrentHouseholdId] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [successCallback, setSuccessCallback] = useState<(() => void) | undefined>();
  const [isClient, setIsClient] = useState(false);

  // Detect if we're on client side to prevent SSR issues
  useEffect(() => {
    setIsClient(true);
  }, []);

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
            householdId: currentHouseholdId,
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

        if (successCallback) {
          successCallback();
        }
        
        // Reset state
        setLinkToken(null);
        setCurrentHouseholdId('');
        setCurrentUserId('');
        setSuccessCallback(undefined);
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
    [currentHouseholdId, successCallback, toast]
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
    setLoading(false);
    // Reset state on exit
    setLinkToken(null);
  }, [toast]);

  const config = {
    token: linkToken,
    onSuccess: onPlaidSuccess,
    onExit: onPlaidExit,
  };

  // Only initialize Plaid Link on client side to prevent SSR/build errors
  const { open, ready } = usePlaidLink(isClient && linkToken ? config : null as any);

  const openPlaidLink = useCallback(
    async (householdId: string, userId: string, onSuccess?: () => void) => {
      setCurrentHouseholdId(householdId);
      setCurrentUserId(userId);
      setSuccessCallback(() => onSuccess);
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
    },
    [toast]
  );

  // Auto-open when token is ready
  useEffect(() => {
    if (linkToken && ready && !loading) {
      open();
    }
  }, [linkToken, ready, loading, open]);

  return (
    <PlaidLinkContext.Provider value={{ openPlaidLink, isLoading: loading, isReady: ready }}>
      {children}
    </PlaidLinkContext.Provider>
  );
}

export function usePlaidLinkContext() {
  const context = useContext(PlaidLinkContext);
  if (context === undefined) {
    throw new Error('usePlaidLinkContext must be used within a PlaidLinkProvider');
  }
  return context;
}
