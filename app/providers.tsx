'use client';

import { AuthProvider } from '@/lib/auth-context';
import { HouseholdProvider } from '@/lib/household-context';
import { SubscriptionProvider } from '@/lib/subscription-context';
import { Toaster } from '@/components/ui/toaster';
import { PlaidScriptLoader } from '@/components/plaid-script-loader';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <HouseholdProvider>
        <SubscriptionProvider>
          <PlaidScriptLoader />
          {children}
          <Toaster />
        </SubscriptionProvider>
      </HouseholdProvider>
    </AuthProvider>
  );
}
