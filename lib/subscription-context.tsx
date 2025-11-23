'use client';

import { createContext, useContext, useEffect, useState } from 'react';
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

  const fetchSubscription = async () => {
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

      const { data: connections, error: connError } = await supabase
        .from('plaid_connections')
        .select('*')
        .eq('household_id', currentHousehold.id);

      if (connError) throw connError;
      setPlaidConnections(connections || []);
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
  };

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
  }, [householdContext?.currentHousehold?.id]);

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
