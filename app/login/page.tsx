'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import { HYHLogo } from '@/components/hyh-logo';
import { logAuthAttempt } from '@/lib/security-logger';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get('invite');
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (inviteCode) {
      localStorage.setItem('pendingInvite', inviteCode);
    }
  }, [inviteCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error, data } = await signIn(email, password);

      console.log('Sign in response:', { error, data });

      if (error) {
        console.error('Sign in error:', error);
        // Provide more helpful error message for unconfirmed email
        if (error.message?.includes('Email not confirmed')) {
          setError('Please confirm your email address before signing in. Check your inbox for the confirmation link.');
        } else {
          setError(error.message || 'Failed to sign in');
        }
        setLoading(false);

        // Log failed authentication attempt
        await logAuthAttempt(email, false);
      } else if (data?.user) {
        console.log('Sign in successful, user:', data.user.id);
        // Log successful authentication
        await logAuthAttempt(email, true, data.user.id);

        console.log('Waiting for session to establish...');
        // Wait a moment for the session to be established
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('Redirecting to dashboard...');
        // Use window.location for a full page refresh which ensures middleware runs
        const pendingInvite = localStorage.getItem('pendingInvite');
        if (pendingInvite) {
          localStorage.removeItem('pendingInvite');
          window.location.href = `/invite?code=${pendingInvite}`;
        } else {
          window.location.href = '/dashboard';
        }
      } else {
        console.error('No error and no user data');
        setError('Authentication failed. Please try again.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-teal-50 p-4">
      <Link href="/" className="mb-8">
        <HYHLogo size={80} showText={false} />
      </Link>

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl text-center">Welcome Back</CardTitle>
          <div className="text-center space-y-1">
            <p className="text-base font-semibold text-[#1e3a4c]">Handle Your House</p>
            <p className="text-xs text-[#178b9c]">by Agape Country Farms</p>
            <CardDescription className="pt-2">Sign in to manage your households</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-sm text-muted-foreground text-center">
            Don't have an account?{' '}
            <Link href="/signup" className="text-primary hover:underline font-medium">
              Sign up
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
