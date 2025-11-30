# Influencer Payout System

## Payout Structure

### Basic Tier
- **Monthly**: $1.00 one-time signup (no recurring)
- **Annual**: $5.00 one-time signup (no recurring)

### Premium Tier
- **Monthly**: $5.00 one-time signup + $1.00/month recurring
- **Annual**: $10.00 one-time signup + $10.00/year recurring

### Elite Tier
- **Monthly**: $10.00 one-time signup + $2.00/month recurring
- **Annual**: $15.00 one-time signup + $15.00/year recurring

## How It Works

### 1. Signup Payouts (Automatic)
- When a user subscribes using an influencer code, a signup payout is automatically created
- Stored in `influencer_payouts` table with `payout_type = 'signup'`
- `is_paid = false` until admin marks as paid

### 2. Recurring Payouts (Scheduled)
- Premium and Elite tiers generate recurring payouts
- Monthly subscriptions: payout generated every 30 days
- Annual subscriptions: payout generated every 365 days
- Tracked via `last_recurring_payout_at` in `influencer_signups` table

## Database Functions

### `calculate_influencer_payout(tier_name, billing_period, payout_type)`
Returns payout amount in cents based on tier, billing period, and payout type.

### `generate_recurring_influencer_payouts()`
Scans active subscriptions and creates recurring payouts when due.
Returns: `{ payouts_created: integer, total_amount_cents: integer }`

## Edge Function: generate-influencer-payouts

Location: `supabase/functions/generate-influencer-payouts/index.ts`

### Manual Trigger
```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-influencer-payouts \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

### Setup Monthly Cron Job

#### Option 1: Supabase Cron (Recommended)
1. Go to Supabase Dashboard → Database → Cron Jobs
2. Create new cron job:
   - **Schedule**: `0 0 1 * *` (1st day of each month at midnight)
   - **Command**: 
     ```sql
     SELECT net.http_post(
       url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-influencer-payouts',
       headers := jsonb_build_object(
         'Authorization', 'Bearer ' || current_setting('app.service_role_key')
       )
     );
     ```

#### Option 2: GitHub Actions
Create `.github/workflows/influencer-payouts.yml`:
```yaml
name: Generate Influencer Payouts
on:
  schedule:
    - cron: '0 0 1 * *' # 1st of each month
  workflow_dispatch: # Allow manual trigger

jobs:
  generate-payouts:
    runs-on: ubuntu-latest
    steps:
      - name: Call Edge Function
        run: |
          curl -X POST ${{ secrets.SUPABASE_URL }}/functions/v1/generate-influencer-payouts \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}"
```

#### Option 3: External Cron Service
Use services like:
- Cron-job.org
- EasyCron
- AWS EventBridge

## Viewing Payouts

Influencers can view their payouts at: `/dashboard/influencer`

Shows:
- Total earnings (sum of all payouts)
- Pending earnings (unpaid payouts)
- Payout history table with:
  - Date created
  - Payout type (signup/recurring)
  - Tier and billing period
  - Amount
  - Payment status

## Admin Tasks

### Mark Payouts as Paid
```sql
UPDATE influencer_payouts
SET is_paid = true, paid_at = now()
WHERE id = 'PAYOUT_ID';
```

### Get Pending Payouts Report
```sql
SELECT 
  ic.code,
  u.email as influencer_email,
  ip.payout_type,
  ip.subscription_tier_name,
  ip.billing_period,
  ip.payout_amount_cents / 100.0 as amount_dollars,
  ip.created_at
FROM influencer_payouts ip
JOIN influencer_codes ic ON ip.influencer_code_id = ic.id
JOIN auth.users u ON ip.influencer_user_id = u.id
WHERE ip.is_paid = false
ORDER BY ip.created_at DESC;
```

### Total Unpaid Amount
```sql
SELECT SUM(payout_amount_cents) / 100.0 as total_unpaid_dollars
FROM influencer_payouts
WHERE is_paid = false;
```

## Database Schema

### `influencer_codes`
- Stores influencer referral codes
- Tracks usage and expiration

### `influencer_signups`
- Links users to influencer codes
- Tracks subscription status
- `last_recurring_payout_at` - timestamp of last recurring payout

### `influencer_payouts`
- Records all payout events
- `payout_type`: 'signup', 'recurring', or 'bonus'
- `is_paid`: false until admin marks as paid

## Testing

### Test Recurring Payout Generation
```sql
SELECT * FROM generate_recurring_influencer_payouts();
```

### View Active Subscriptions Needing Payouts
```sql
SELECT 
  s.id,
  s.subscription_started_at,
  s.last_recurring_payout_at,
  st.name as tier_name,
  hs.billing_period,
  EXTRACT(DAY FROM (now() - COALESCE(s.last_recurring_payout_at, s.subscription_started_at))) as days_since_last_payout
FROM influencer_signups s
JOIN household_subscriptions hs ON hs.household_id = s.household_id
JOIN subscription_tiers st ON st.id = s.subscription_tier_id
WHERE s.is_active_subscriber = true
  AND st.name IN ('premium', 'elite')
  AND hs.status = 'active';
```
