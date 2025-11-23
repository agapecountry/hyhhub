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

export default function SignUpPage() {
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get('invite');
  const referralCode = searchParams.get('ref');
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState('');

  useEffect(() => {
    if (inviteCode) {
      localStorage.setItem('pendingInvite', inviteCode);
    }
    if (referralCode) {
      localStorage.setItem('pendingReferral', referralCode);
    }
  }, [inviteCode, referralCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    const { error, needsEmailConfirmation } = await signUp(email, password);

    if (error) {
      setError(error.message || 'Failed to create account');
      setLoading(false);
    } else if (needsEmailConfirmation) {
      // Show confirmation message
      setConfirmationEmail(email);
      setShowConfirmation(true);
      setLoading(false);
    }
    // If no error and no confirmation needed, the auth context will redirect automatically
  };

  if (showConfirmation) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-teal-50 p-4">
        <Link href="/" className="mb-8">
          <HYHLogo size={80} showText={false} />
        </Link>

        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-3xl text-center">Check Your Email</CardTitle>
            <div className="text-center space-y-1">
              <p className="text-base font-semibold text-[#1e3a4c]">Handle Your House</p>
              <p className="text-xs text-[#178b9c]">by Agape Country Farms</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription className="text-center">
                <p className="font-medium mb-2">Account created successfully!</p>
                <p className="text-sm text-muted-foreground">
                  We've sent a confirmation email to <strong>{confirmationEmail}</strong>
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Please check your inbox and click the confirmation link to activate your account.
                </p>
              </AlertDescription>
            </Alert>
            <div className="text-xs text-muted-foreground text-center space-y-1">
              <p>Didn't receive the email? Check your spam folder.</p>
              <p>The confirmation link will expire in 24 hours.</p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <div className="text-sm text-muted-foreground text-center">
              <Link href="/login" className="text-primary hover:underline font-medium">
                Return to Sign In
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-teal-50 p-4">
      <Link href="/" className="mb-8">
        <HYHLogo size={80} showText={false} />
      </Link>

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl text-center">Create Account</CardTitle>
          <div className="text-center space-y-1">
            <p className="text-base font-semibold text-[#1e3a4c]">Handle Your House</p>
            <p className="text-xs text-[#178b9c]">by Agape Country Farms</p>
            <CardDescription className="pt-2">Start managing your households today</CardDescription>
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
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-sm text-muted-foreground text-center">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
