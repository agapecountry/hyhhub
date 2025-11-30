'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Household, HouseholdMember } from './types';
import { supabase } from './supabase';
import { useAuth } from './auth-context';

interface HouseholdContextType {
  households: Household[];
  currentHousehold: Household | null;
  householdMembers: HouseholdMember[];
  loading: boolean;
  switchHousehold: (householdId: string) => void;
  refreshHouseholds: () => Promise<void>;
}

export const HouseholdContext = createContext<HouseholdContextType | undefined>(undefined);

export function HouseholdProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [currentHousehold, setCurrentHousehold] = useState<Household | null>(null);
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHouseholds = useCallback(async () => {
    if (!user) {
      setHouseholds([]);
      setCurrentHousehold(null);
      setHouseholdMembers([]);
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching households for user:', user.id);
      const { data: memberData, error: memberError } = await supabase
        .from('household_members')
        .select('*, households(*)')
        .eq('user_id', user.id);

      if (memberError) {
        console.error('Error fetching household members:', memberError);
        throw memberError;
      }

      console.log('Member data:', memberData);
      const userHouseholds = memberData?.map(m => m.households).filter(Boolean) || [];
      console.log('User households:', userHouseholds);
      setHouseholds(userHouseholds);

      const savedHouseholdId = localStorage.getItem('currentHouseholdId');
      let household = null;

      if (savedHouseholdId && userHouseholds.find(h => h.id === savedHouseholdId)) {
        household = userHouseholds.find(h => h.id === savedHouseholdId) || null;
      } else if (userHouseholds.length > 0) {
        household = userHouseholds[0];
      }

      console.log('Selected household:', household);
      setCurrentHousehold(household);

      if (household) {
        const { data: members } = await supabase
          .from('household_members')
          .select('*')
          .eq('household_id', household.id);
        setHouseholdMembers(members || []);
        localStorage.setItem('currentHouseholdId', household.id);
      }
    } catch (error) {
      console.error('Error fetching households:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let mounted = true;

    const loadHouseholds = async () => {
      if (mounted) {
        await fetchHouseholds();
      }
    };

    loadHouseholds();

    return () => {
      mounted = false;
    };
  }, [user?.id, fetchHouseholds]);

  const switchHousehold = async (householdId: string) => {
    const household = households.find(h => h.id === householdId);
    if (household) {
      setCurrentHousehold(household);
      localStorage.setItem('currentHouseholdId', householdId);

      const { data: members } = await supabase
        .from('household_members')
        .select('*')
        .eq('household_id', householdId);
      setHouseholdMembers(members || []);
    }
  };

  return (
    <HouseholdContext.Provider
      value={{
        households,
        currentHousehold,
        householdMembers,
        loading,
        switchHousehold,
        refreshHouseholds: fetchHouseholds,
      }}
    >
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHousehold() {
  const context = useContext(HouseholdContext);
  if (context === undefined) {
    throw new Error('useHousehold must be used within a HouseholdProvider');
  }
  return context;
}
