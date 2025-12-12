'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, XCircle, Shield, CreditCard } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="mb-8">
          <Link href="/dashboard/subscription">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Subscription
            </Button>
          </Link>
        </div>

        <div className="space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-primary mb-2">Terms of Service</h1>
            <p className="text-muted-foreground">
              Handle Your Household (HYH) - Effective December 2024
            </p>
          </div>

          {/* Terms of Service */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                General Terms
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>
                By subscribing to Handle Your Household (HYH), you agree to the following terms:
              </p>
              
              <h4 className="font-semibold mt-4">1. Account Usage</h4>
              <p>
                Your subscription is for personal, household use only. You may not share your 
                account credentials with others outside your household. Each household member 
                can have their own login under your household account.
              </p>

              <h4 className="font-semibold mt-4">2. Service Availability</h4>
              <p>
                We strive to maintain 99.9% uptime but do not guarantee uninterrupted service. 
                Scheduled maintenance will be communicated in advance when possible. We are not 
                liable for any losses resulting from service interruptions.
              </p>

              <h4 className="font-semibold mt-4">3. Acceptable Use</h4>
              <p>
                You agree to use HYH only for lawful purposes and in accordance with these terms. 
                You may not use the service to:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe on the rights of others</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Transmit malicious code or interfere with the service</li>
                <li>Use the service for commercial purposes beyond household management</li>
              </ul>

              <h4 className="font-semibold mt-4">4. Modifications to Service</h4>
              <p>
                We reserve the right to modify, suspend, or discontinue any part of the service 
                at any time. We will provide reasonable notice for significant changes. Existing 
                subscribers will be grandfathered into their current pricing for the duration of 
                their billing period when price changes occur.
              </p>

              <h4 className="font-semibold mt-4">5. Termination</h4>
              <p>
                We may terminate or suspend your account if you violate these terms. You may 
                cancel your subscription at any time through the billing portal or by contacting 
                support.
              </p>
            </CardContent>
          </Card>

          {/* Data Privacy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Data Privacy & Security
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <h4 className="font-semibold">Your Data is Protected</h4>
              <p>
                Your financial data is encrypted and securely stored using industry-standard 
                encryption protocols. We take your privacy seriously:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>No Data Selling:</strong> We never sell your personal information 
                  to third parties.
                </li>
                <li>
                  <strong>Read-Only Bank Access:</strong> Bank connections through Plaid are 
                  read-only and cannot initiate transactions. We can only view your account 
                  balances and transaction history.
                </li>
                <li>
                  <strong>Secure Storage:</strong> All sensitive data is encrypted at rest 
                  and in transit using AES-256 encryption.
                </li>
                <li>
                  <strong>Data Retention:</strong> If you delete your account, your data will 
                  be permanently removed within 30 days.
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Billing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Billing Terms
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>
                Subscriptions are billed in advance on a monthly or yearly basis, depending on 
                your selected billing period.
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Automatic Renewal:</strong> Your subscription will automatically renew 
                  at the end of each billing period unless canceled.
                </li>
                <li>
                  <strong>Price Changes:</strong> We will provide at least 30 days notice before 
                  any price increases take effect.
                </li>
                <li>
                  <strong>Failed Payments:</strong> If a payment fails, we will attempt to charge 
                  your payment method again. After multiple failures, your subscription may be 
                  suspended.
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Cancellation Policy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                Cancellation & Refund Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold text-lg mb-2">Monthly Subscriptions</h4>
                  <p>
                    Monthly subscriptions are <strong>non-refundable and not prorated</strong>. 
                    Once billed, your subscription will remain active until the end of the current 
                    billing period. If you cancel, you will continue to have access to all features 
                    until the end of that month, after which your account will revert to the Free tier.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-lg mb-2">Yearly Subscriptions</h4>
                  <p>
                    Yearly subscriptions <strong>are prorated based on the monthly rate</strong> if 
                    canceled before the end of the subscription period. The refund is calculated 
                    as follows:
                  </p>
                  <div className="bg-muted/50 p-4 rounded-lg mt-3 mb-3">
                    <p className="font-medium mb-3">Refund Calculation Example:</p>
                    <ul className="list-disc pl-6 space-y-1 text-sm">
                      <li>You subscribe to <strong>Basic</strong> at <strong>$77.00/year</strong></li>
                      <li>Monthly equivalent rate: <strong>$7.00/month</strong></li>
                      <li>After 6 months, you decide to cancel</li>
                      <li>Usage charge: $7.00 × 6 months = <strong>$42.00</strong></li>
                      <li>Your refund: $77.00 - $42.00 = <strong>$35.00</strong></li>
                    </ul>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Refunds are processed within 5-10 business days to the original payment method.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-lg mb-2">How to Cancel</h4>
                  <p>
                    You can cancel your subscription at any time by:
                  </p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Clicking "Manage billing" on the Subscription page (for active subscriptions)</li>
                    <li>Contacting our support team</li>
                  </ul>
                  <p className="mt-2">
                    Cancellation takes effect at the end of your current billing period. You will 
                    retain access to all paid features until then.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-lg mb-2">Downgrading</h4>
                  <p>
                    If you downgrade to a lower tier, the change will take effect at the start of 
                    your next billing period. You will retain access to your current tier's features 
                    until then. No refunds are provided for downgrades on monthly plans.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-lg mb-2">Free Tier</h4>
                  <p>
                    The Free tier is always available at no cost. If your paid subscription ends 
                    or is canceled, your account will automatically revert to the Free tier. Your 
                    data will be preserved, but access to premium features will be restricted.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardHeader>
              <CardTitle>Questions?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                If you have any questions about these terms or our cancellation policy, please 
                contact us at billing@hyhhub.com
              </p>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground text-center pb-8">
            Last updated: December 2024. By using our service, you agree to these terms.
          </p>
        </div>
      </div>
    </div>
  );
}
