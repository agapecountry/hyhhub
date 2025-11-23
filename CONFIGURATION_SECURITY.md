# Configuration Security: Fail-Fast Environment Variable Handling

## Overview

This document describes how the application handles missing or invalid environment variables using a **fail-fast** approach to prevent configuration errors from causing silent failures or security issues.

---

## Security Issue: Placeholder Values (RESOLVED)

### The Problem

Some applications use placeholder values when environment variables are missing:

```typescript
// ❌ INSECURE: Fails open with placeholder
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
);
```

**Risks**:
1. **Silent failures**: App appears to work but connects to wrong/invalid endpoint
2. **Data leakage**: If placeholder URL is real, data could be sent to wrong project
3. **Confusing behavior**: Users think they're logged in but operations fail mysteriously
4. **Delayed detection**: Errors only discovered in production, not during deployment
5. **Security bypass**: Auth checks might fail silently instead of blocking access

### The Solution: Fail-Fast

```typescript
// ✅ SECURE: Fails fast with clear error
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**Benefits**:
1. **Immediate detection**: Fails at build/startup time
2. **Clear error messages**: Developers know exactly what's missing
3. **Prevents deployment**: Cannot deploy with invalid config
4. **Security posture**: Fail closed, never fail open
5. **No silent failures**: Impossible to run with wrong configuration

---

## Implementation Across Application

### 1. Client-Side Supabase Client

**File**: `lib/supabase.ts`

```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**Behavior**:
- Module fails to load if env vars missing
- Error thrown at import time
- Application cannot start with invalid config

---

### 2. Server-Side Middleware

**File**: `middleware.ts`

```typescript
export async function middleware(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('CRITICAL: Missing Supabase environment variables in middleware');
    return new Response(
      'Application configuration error. Please contact support.',
      { status: 500 }
    );
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    // ... cookie handlers
  });

  // ... rest of middleware
}
```

**Behavior**:
- Every request checks env vars
- Returns 500 error if missing
- Logs critical error for monitoring
- Prevents app from appearing to work

---

### 3. Edge Function Calls

**File**: `app/dashboard/meals/page.tsx`

```typescript
const handleSearchRecipes = async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Application configuration error. Please contact support.');
  }

  const apiUrl = `${supabaseUrl}/functions/v1/search-recipes`;
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: searchQuery }),
  });
};
```

**Behavior**:
- Validates env vars before making request
- Throws clear error if missing
- Caught by try/catch and shown to user
- Cannot make request to undefined URL

---

## Environment Variables Reference

### Required Variables (Cannot Be Missing)

```bash
# Supabase Configuration (Required for all functionality)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# These will cause application failure if missing
```

### Optional Variables (Graceful Degradation)

```bash
# hCaptcha (Optional - signup/login work without it)
NEXT_PUBLIC_CAPTCHA_SITE_KEY=your_hcaptcha_site_key

# Brave Search (Optional - recipe search disabled if missing)
BRAVE_API_KEY=your_brave_api_key

# Cron Security (Optional - only needed for manual Edge Function calls)
CRON_SECRET=your_cron_secret

# Stripe (Optional - payment features disabled if missing)
STRIPE_SECRET_KEY=your_stripe_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# App URL (Optional - defaults to window.location.origin)
NEXT_PUBLIC_APP_URL=https://yourapp.com
```

---

## Deployment Checklist

Before deploying to any environment:

### 1. Verify Required Variables

```bash
# Check all required variables are set
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
echo $SUPABASE_SERVICE_ROLE_KEY
```

### 2. Test Build

```bash
# Build should succeed
npm run build

# If build fails with env var error, fix before deploying
```

### 3. Test Locally

```bash
# Start dev server
npm run dev

# Should show clear error if vars missing
```

### 4. Verify Deployment Platform

**Vercel/Netlify**:
- Add env vars in dashboard
- Redeploy after adding
- Check build logs for errors

**Docker**:
```dockerfile
# Fail build if vars not provided
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL:?Error: NEXT_PUBLIC_SUPABASE_URL not set}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY:?Error: NEXT_PUBLIC_SUPABASE_ANON_KEY not set}
```

---

## Error Messages & User Experience

### During Development

**Missing variables in .env.local**:
```
Error: Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set
    at lib/supabase.ts:7:9
```

**Developer action**: Add variables to `.env.local` file

### During Build

**Vercel/Netlify build failure**:
```
Error: Missing required environment variables
Build failed
```

**Developer action**: Add variables in platform dashboard

### In Production (If Somehow Deployed Wrong)

**Middleware catches missing vars**:
```
HTTP 500: Application configuration error. Please contact support.
```

**User sees**: Generic error page, cannot use application
**Monitoring sees**: "CRITICAL: Missing Supabase environment variables in middleware"

---

## Best Practices

### ✅ DO: Fail Fast

```typescript
if (!requiredVar) {
  throw new Error('Missing required variable');
}
```

### ✅ DO: Provide Clear Error Messages

```typescript
throw new Error(
  'Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set'
);
```

### ✅ DO: Check at Module Load Time

```typescript
// Runs when module is imported
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!supabaseUrl) throw new Error('...');

export const supabase = createClient(supabaseUrl, ...);
```

### ✅ DO: Log Critical Errors

```typescript
if (!supabaseUrl) {
  console.error('CRITICAL: Missing Supabase URL');
  return new Response('Configuration error', { status: 500 });
}
```

### ❌ DON'T: Use Placeholder Values

```typescript
// NEVER DO THIS
const url = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
```

### ❌ DON'T: Silently Continue

```typescript
// NEVER DO THIS
if (!supabaseUrl) {
  console.warn('Missing Supabase URL, some features disabled');
  return; // Silent failure
}
```

### ❌ DON'T: Use Non-Null Assertions Without Validation

```typescript
// RISKY - fails with unclear error if undefined
const client = createClient(process.env.SUPABASE_URL!, ...);

// BETTER - fails with clear error
if (!process.env.SUPABASE_URL) throw new Error('Missing SUPABASE_URL');
const client = createClient(process.env.SUPABASE_URL, ...);
```

---

## Testing Configuration Errors

### Test 1: Missing Required Variables

```bash
# Temporarily rename .env.local
mv .env.local .env.local.backup

# Try to start app
npm run dev

# Should see clear error message
# ✅ Expected: Error about missing variables
# ❌ Bad: App starts but doesn't work

# Restore
mv .env.local.backup .env.local
```

### Test 2: Invalid Variables

```bash
# Set invalid values
export NEXT_PUBLIC_SUPABASE_URL=invalid_url
export NEXT_PUBLIC_SUPABASE_ANON_KEY=invalid_key

# Try to use app
npm run dev

# Should fail fast
# ✅ Expected: Connection errors immediately
# ❌ Bad: Appears to work, then fails later
```

### Test 3: Partial Configuration

```bash
# Only set URL, not key
export NEXT_PUBLIC_SUPABASE_URL=https://project.supabase.co
unset NEXT_PUBLIC_SUPABASE_ANON_KEY

# Try to build
npm run build

# Should fail with clear message
# ✅ Expected: Error about missing ANON_KEY
# ❌ Bad: Builds but doesn't work
```

---

## Monitoring & Alerting

### Recommended Alerts

1. **500 Errors with "configuration" in message**
   - Indicates missing env vars in production
   - Critical priority

2. **Console logs containing "CRITICAL: Missing"**
   - Early warning of config issues
   - Check deployment platform

3. **Build failures with "environment variable" in log**
   - Deployment blocked by missing config
   - Fix before retrying

### Example Alert Query (CloudWatch/Datadog)

```
status:500 AND message:"configuration error"
```

---

## Migration Guide

If you find code using placeholder values:

### Before (Insecure)

```typescript
const url = process.env.SUPABASE_URL || 'https://fallback.supabase.co';
const key = process.env.SUPABASE_KEY || 'fallback-key';
const client = createClient(url, key);
```

### After (Secure)

```typescript
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY;

if (!url || !key) {
  throw new Error('Missing required environment variables: SUPABASE_URL and SUPABASE_KEY');
}

const client = createClient(url, key);
```

---

## Summary

### Security Principle: Fail Closed

- **Never use placeholder/default values** for critical config
- **Fail immediately** when configuration is invalid
- **Provide clear error messages** for developers
- **Block deployment** if config is missing
- **Monitor for config errors** in production

### Risk Mitigation

| Risk | Without Fail-Fast | With Fail-Fast |
|------|-------------------|----------------|
| **Silent failures** | ❌ App appears to work | ✅ Immediate error |
| **Data leakage** | ❌ Connects to wrong service | ✅ Cannot connect |
| **Security bypass** | ❌ Auth might fail open | ✅ App cannot start |
| **Production incidents** | ❌ Discovered by users | ✅ Caught at deploy |
| **Debugging difficulty** | ❌ Mysterious failures | ✅ Clear error messages |

**Result**: Application cannot run with invalid configuration, preventing security and reliability issues.

---

## References

- [The Twelve-Factor App: Config](https://12factor.net/config)
- [OWASP: Secure Configuration](https://owasp.org/www-project-top-ten/2017/A6_2017-Security_Misconfiguration)
- [Fail-Fast Principle](https://en.wikipedia.org/wiki/Fail-fast)
