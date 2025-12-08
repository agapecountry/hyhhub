'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { SubscriptionTierData, HouseholdSubscription, PlaidConnection } from './types';
import { supabase } from './supabase';
import { HouseholdContext } from './household-context';

interface SubscriptionContextType {
  tier: SubscriptionTierData | null;
  subscription: HouseholdSubscription | null;
  plaidConnections: PlaidConnection[];
  totalPlaidConnections: number; // Count across all user's households
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
  const [totalPlaidConnections, setTotalPlaidConnections] = useState(0);
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

      // Query plaid_items for current household
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
      
      setPlaidConnections(connections);

      // Count total plaid connections across ALL households owned by this subscription owner
      // This is used for subscription limit checking
      const subscriptionOwnerId = subData?.subscription_owner_id;
      if (subscriptionOwnerId) {
        // Get all households owned by this subscription owner
        const { data: ownedHouseholds } = await supabase
          .from('household_subscriptions')
          .select('household_id')
          .eq('subscription_owner_id', subscriptionOwnerId)
          .eq('status', 'active');

        if (ownedHouseholds && ownedHouseholds.length > 0) {
          const householdIds = ownedHouseholds.map(h => h.household_id);
          
          // Count all active plaid items across all owned households
          const { count, error: countError } = await supabase
            .from('plaid_items')
            .select('id', { count: 'exact', head: true })
            .in('household_id', householdIds)
            .eq('status', 'active');

          if (!countError) {
            setTotalPlaidConnections(count || 0);
            console.log('Total Plaid connections across all households:', count);
          }
        } else {
          setTotalPlaidConnections(connections.filter(c => c.status === 'active').length);
        }
      } else {
        // No subscription owner, just use current household count
        setTotalPlaidConnections(connections.filter(c => c.status === 'active').length);
      }
      
      console.log('Plaid items found (current household):', connections.length);
      console.log('Active plaid items (current household):', connections.filter(c => c.status === 'active').length);
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
    // Use total connections across all user's households, not just current household
    return totalPlaidConnections < limit;
  };

  return (
    <SubscriptionContext.Provider
      value={{
        tier,
        subscription,
        plaidConnections,
        totalPlaidConnections,
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
