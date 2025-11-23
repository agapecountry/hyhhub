'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any; needsEmailConfirmation?: boolean }>
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/auth/confirm`,
      },
    });

    if (!error && data.user) {
      // Check if email confirmation is required
      // When email confirmation is enabled and user hasn't confirmed:
      // - session will be null (most reliable indicator)
      // - identities array will be empty
      const needsEmailConfirmation = !data.session ||
                                     (data.user.identities && data.user.identities.length === 0);

      // If email confirmation is required, don't redirect or process further
      if (needsEmailConfirmation) {
        return { error: null, needsEmailConfirmation: true };
      }

      // Only proceed with these steps if user is confirmed
      setUser(data.user);

      const pendingReferral = localStorage.getItem('pendingReferral');

      if (pendingReferral) {
        await supabase
          .from('users')
          .update({ referral_code: pendingReferral })
          .eq('id', data.user.id);

        const { data: codeValidation } = await supabase
          .rpc('validate_influencer_code', { code_text: pendingReferral })
          .single();

        if (codeValidation && (codeValidation as any).is_valid) {
          const { data: householdData } = await supabase
            .from('households')
            .select('id')
            .eq('created_by', data.user.id)
            .maybeSingle();

          if (householdData) {
            await supabase.from('influencer_signups').insert({
              influencer_code_id: (codeValidation as any).code_id,
              user_id: data.user.id,
              household_id: householdData.id,
            });
          }
        }

        localStorage.removeItem('pendingReferral');
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      const pendingInvite = localStorage.getItem('pendingInvite');
      if (pendingInvite) {
        localStorage.removeItem('pendingInvite');
        router.push(`/invite?code=${pendingInvite}`);
      } else {
        router.push('/dashboard');
      }
    }
    return { error, needsEmailConfirmation: false };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
