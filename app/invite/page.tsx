'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Home, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface InviteData {
  household_id: string;
  household_name: string;
  email: string | null;
  expires_at: string;
}

export default function InvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  const { user } = useAuth();
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (code) {
      loadInvite();
    } else {
      setError('No invite code provided');
      setLoading(false);
    }
  }, [code]);

  const loadInvite = async () => {
    if (!code) return;

    try {
      const { data: inviteData, error: inviteError } = await supabase
        .from('household_invites')
        .select('household_id, email, expires_at')
        .eq('invite_code', code)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (inviteError) {
        console.error('Invite error:', inviteError);
        throw inviteError;
      }

      if (!inviteData) {
        setError('This invite is invalid, expired, or has already been used');
        setLoading(false);
        return;
      }

      const { data: householdData, error: householdError } = await supabase
        .from('households')
        .select('name')
        .eq('id', inviteData.household_id)
        .maybeSingle();

      if (householdError) {
        console.error('Household error:', householdError);
        throw householdError;
      }

      if (!householdData) {
        setError('Household not found');
        setLoading(false);
        return;
      }

      setInvite({
        household_id: inviteData.household_id,
        household_name: householdData.name,
        email: inviteData.email,
        expires_at: inviteData.expires_at,
      });
    } catch (error: any) {
      console.error('Full error:', error);
      setError(error.message || 'Failed to load invite');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (!user || !invite || !code) return;

    setAccepting(true);
    setError('');

    try {
      console.log('Starting invite acceptance for user:', user.id, 'household:', invite.household_id);

      const { data: existingMember, error: checkError } = await supabase
        .from('household_members')
        .select('id')
        .eq('household_id', invite.household_id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError) {
        console.error('Check existing member error:', checkError);
        throw checkError;
      }

      if (existingMember) {
        console.log('User already member, redirecting');
        router.push('/dashboard');
        return;
      }

      console.log('Attempting to insert member...');
      const { data: insertedMember, error: memberError } = await supabase
        .from('household_members')
        .insert({
          household_id: invite.household_id,
          user_id: user.id,
          role: 'member',
        })
        .select()
        .single();

      if (memberError) {
        console.error('Member insert error:', memberError);
        setError(`Failed to join household: ${memberError.message}`);
        setAccepting(false);
        return;
      }

      console.log('Successfully inserted member:', insertedMember);

      console.log('Marking invite as used...');
      const { error: updateError } = await supabase
        .from('household_invites')
        .update({
          used_at: new Date().toISOString(),
          used_by: user.id,
        })
        .eq('invite_code', code);

      if (updateError) {
        console.error('Update invite error:', updateError);
        throw updateError;
      }

      console.log('Invite marked as used, redirecting to dashboard');
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Full acceptance error:', error);
      setError(error.message || 'Failed to accept invite');
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent via-background to-secondary">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-accent via-background to-secondary p-4">
        <Link href="/" className="flex items-center gap-2 mb-8">
          <Home className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold text-primary">HYH Hub</span>
        </Link>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Invite</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="mt-4 space-y-2">
              <Link href="/login">
                <Button className="w-full">Go to Login</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-accent via-background to-secondary p-4">
        <Link href="/" className="flex items-center gap-2 mb-8">
          <Home className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold text-primary">HYH Hub</span>
        </Link>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Join {invite?.household_name}</CardTitle>
            <CardDescription>
              You've been invited to join this household
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Create an account or sign in to accept this invitation.
            </p>
            <div className="space-y-2">
              <Link href={`/signup?invite=${code}`}>
                <Button className="w-full">Create Account</Button>
              </Link>
              <Link href={`/login?invite=${code}`}>
                <Button variant="outline" className="w-full">Sign In</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-accent via-background to-secondary p-4">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <Home className="h-8 w-8 text-primary" />
        <span className="text-2xl font-bold text-primary">HYH Hub</span>
      </Link>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Join {invite?.household_name}</CardTitle>
          <CardDescription>
            You've been invited to join this household
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {invite?.email && (
            <p className="text-sm text-muted-foreground">
              This invite was sent to: <span className="font-medium">{invite.email}</span>
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Expires: {new Date(invite?.expires_at || '').toLocaleDateString()}
          </p>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button
            onClick={handleAcceptInvite}
            disabled={accepting}
            className="w-full"
          >
            {accepting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Accepting...
              </>
            ) : (
              'Accept Invite'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
