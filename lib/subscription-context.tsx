'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { SubscriptionTierData, HouseholdSubscription, PlaidConnection } from './types';
import { supabase } from './supabase';
import { HouseholdContext } from './household-context';

interface SubscriptionContextType {
  tier: SubscriptionTierData | null;
  subscription: HouseholdSubscription | null;
  plaidConnections: PlaidConnection[];
  loading: boolean;
  hasFeature: (feature: keyof SubscriptionTierData['features']) => boolean;
  canAddPlaidConnection: () => boolean;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const householdContext = useContext(HouseholdContext);
  const [tier, setTier] = useState<SubscriptionTierData | null>(null);
  const [subscription, setSubscription] = useState<HouseholdSubscription | null>(null);
  const [plaidConnections, setPlaidConnections] = useState<PlaidConnection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    if (!householdContext?.currentHousehold) {
      setTier(null);
      setSubscription(null);
      setPlaidConnections([]);
      setLoading(false);
      return;
    }

    const currentHousehold = householdContext.currentHousehold;

    try {
      const { data: subData, error: subError } = await supabase
        .from('household_subscriptions')
        .select('*, subscription_tiers(*)')
        .eq('household_id', currentHousehold.id)
        .maybeSingle();

      if (subError && subError.code !== 'PGRST116') throw subError;

      if (subData) {
        setSubscription(subData);
        setTier(subData.subscription_tiers);
      } else {
        const { data: freeTier, error: tierError } = await supabase
          .from('subscription_tiers')
          .select('*')
          .eq('name', 'free')
          .single();

        if (tierError) throw tierError;

        setTier(freeTier);
        setSubscription(null);
      }

      // Query plaid_items instead of plaid_connections since that's what's actually used
      const { data: items, error: itemsError } = await supabase
        .from('plaid_items')
        .select('id, household_id, item_id, institution_name, institution_id, status, created_at, updated_at, last_synced_at')
        .eq('household_id', currentHousehold.id);

      if (itemsError) throw itemsError;
      
      // Map plaid_items to PlaidConnection format
      const connections: PlaidConnection[] = (items || []).map(item => ({
        id: item.id,
        household_id: item.household_id,
        plaid_item_id: item.item_id,
        institution_name: item.institution_name,
        institution_id: item.institution_id,
        last_refresh: item.last_synced_at,
        status: item.status as 'active' | 'error' | 'disconnected',
        created_at: item.created_at,
        updated_at: item.updated_at,
      }));
      
      console.log('Plaid items found:', connections.length);
      console.log('Active plaid items:', connections.filter(c => c.status === 'active').length);
      console.log('Plaid items detail:', connections.map(c => ({ 
        institution: c.institution_name, 
        status: c.status,
        created: c.created_at 
      })));
      
      setPlaidConnections(connections);
    } catch (error) {
      console.error('Error fetching subscription:', error);

      const { data: freeTier } = await supabase
        .from('subscription_tiers')
        .select('*')
        .eq('name', 'free')
        .maybeSingle();

      if (freeTier) setTier(freeTier);
    } finally {
      setLoading(false);
    }
  }, [householdContext?.currentHousehold]);

  useEffect(() => {
    let mounted = true;

    const loadSubscription = async () => {
      if (mounted) {
        await fetchSubscription();
      }
    };

    loadSubscription();

    return () => {
      mounted = false;
    };
  }, [householdContext?.currentHousehold?.id, fetchSubscription]);

  const hasFeature = (feature: keyof SubscriptionTierData['features']): boolean => {
    if (!tier) return false;
    return tier.features[feature] as boolean;
  };

  const canAddPlaidConnection = (): boolean => {
    if (!tier) return false;
    const limit = tier.features.plaid_connection_limit;
    const activeConnections = plaidConnections.filter(c => c.status === 'active').length;
    return activeConnections < limit;
  };

  return (
    <SubscriptionContext.Provider
      value={{
        tier,
        subscription,
        plaidConnections,
        loading,
        hasFeature,
        canAddPlaidConnection,
        refreshSubscription: fetchSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
