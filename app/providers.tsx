'use client';

import { AuthProvider } from '@/lib/auth-context';
import { HouseholdProvider } from '@/lib/household-context';
import { SubscriptionProvider } from '@/lib/subscription-context';
import { PlaidLinkProvider } from '@/lib/plaid-link-context';
import { Toaster } from '@/components/ui/toaster';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <HouseholdProvider>
        <SubscriptionProvider>
          <PlaidLinkProvider>
            {children}
            <Toaster />
          </PlaidLinkProvider>
        </SubscriptionProvider>
      </HouseholdProvider>
    </AuthProvider>
  );
}
