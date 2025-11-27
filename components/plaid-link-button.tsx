'use client';

import { Button } from '@/components/ui/button';
import { Link2, Loader2 } from 'lucide-react';
import { usePlaidLinkContext } from '@/lib/plaid-link-context';

interface PlaidLinkButtonProps {
  householdId: string;
  userId: string;
  onSuccess?: () => void;
  disabled?: boolean;
}

export function PlaidLinkButton({ householdId, userId, onSuccess, disabled }: PlaidLinkButtonProps) {
  const { openPlaidLink, isLoading } = usePlaidLinkContext();

  const handleClick = async () => {
    await openPlaidLink(householdId, userId, onSuccess);
  };

  return (
    <Button onClick={handleClick} disabled={disabled || isLoading}>
      {isLoading ? (
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
