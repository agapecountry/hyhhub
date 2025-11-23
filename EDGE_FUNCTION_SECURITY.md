# Edge Function Security Documentation

## Overview

This document describes the security measures implemented for Supabase Edge Functions to prevent unauthorized access and abuse.

## Critical Security Fix - Unauthenticated Functions

### Previous Vulnerability (HIGH SEVERITY)

**Issue**: Edge Functions were publicly accessible without authentication, allowing anyone to:
- Trigger database operations with service role privileges
- Cause denial of service through repeated invocations
- Manipulate data integrity
- Consume API quotas (Brave Search, etc.)

**Impact**: CVSS 8.5+ (High) - Unauthenticated access to privileged operations

### Implemented Security Measures

## 1. Generate Daily Chores Function

**File**: `supabase/functions/generate-daily-chores/index.ts`

**Purpose**: Generates recurring chore assignments (normally runs via pg_cron)

### Security Features

#### Authentication Methods

The function now requires **one of two** authentication methods:

**Option 1: Secret Token (for administrative access)**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/generate-daily-chores \
  -H "X-Cron-Secret: your_secret_token_here"
```

**Option 2: JWT Token (for authenticated users)**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/generate-daily-chores \
  -H "Authorization: Bearer <user_jwt_token>"
```

#### Security Controls

- ✅ **Method restriction**: Only POST requests allowed
- ✅ **Authentication required**: Rejects all unauthenticated requests (401)
- ✅ **Dual authentication**: Supports secret token OR valid JWT
- ✅ **Security logging**: Logs all invocations with timestamp and auth method
- ✅ **Error handling**: No sensitive information leaked in error messages

#### Environment Variables Required

```bash
# For secret token authentication (set in Supabase dashboard)
CRON_SECRET=your_secure_random_token_here

# For JWT authentication (automatically available)
SUPABASE_URL=your_project_url
SUPABASE_ANON_KEY=your_anon_key
```

#### Recommended Setup

**For Production:**
1. Use **pg_cron** for automatic daily execution (already configured)
2. Keep the Edge Function **only for manual admin testing**
3. Generate a strong random secret: `openssl rand -base64 32`
4. Add CRON_SECRET to Supabase Edge Function secrets
5. Document the secret in your secure password manager

**For Testing:**
```bash
# Generate a test secret
export CRON_SECRET=$(openssl rand -base64 32)

# Test the function
curl -X POST https://your-project.supabase.co/functions/v1/generate-daily-chores \
  -H "X-Cron-Secret: $CRON_SECRET" \
  -H "Content-Type: application/json"
```

---

## 2. Search Recipes Function

**File**: `supabase/functions/search-recipes/index.ts`

**Purpose**: Searches for recipes using Brave Search API

### Security Features

#### Authentication

**Required**: Valid JWT token from authenticated user

```bash
curl -X POST https://your-project.supabase.co/functions/v1/search-recipes \
  -H "Authorization: Bearer <user_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"query": "chocolate cake"}'
```

#### Security Controls

- ✅ **Method restriction**: Only POST requests allowed
- ✅ **Authentication required**: Rejects all unauthenticated requests (401)
- ✅ **JWT validation**: Verifies token with Supabase auth
- ✅ **Input validation**: 200 character maximum query length
- ✅ **Security logging**: Logs user ID and query metadata (not query content)
- ✅ **Rate limiting**: Inherits Supabase Edge Function rate limits

#### Why Authentication Is Required

1. **API Quota Protection**: Brave Search API has usage limits
2. **Cost Control**: Prevent abuse that could incur API charges
3. **User Tracking**: Associate searches with user accounts for analytics
4. **Abuse Prevention**: Authenticated requests can be rate-limited per user

---

## General Security Best Practices

### 1. Never Use Service Role Key Client-Side

❌ **WRONG** - Exposes full database access:
```typescript
const supabase = createClient(url, serviceRoleKey);
```

✅ **CORRECT** - Use anon key for user operations:
```typescript
const supabase = createClient(url, anonKey);
const { data, error } = await supabase.auth.getUser(token);
```

### 2. Always Validate Authentication

```typescript
const authHeader = req.headers.get('Authorization');
if (!authHeader) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
}

const token = authHeader.replace('Bearer ', '');
const { data: { user }, error } = await supabase.auth.getUser(token);

if (error || !user) {
  return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
}
```

### 3. Implement Security Logging

```typescript
console.log('Function invoked', {
  userId: user?.id,
  timestamp: new Date().toISOString(),
  action: 'specific_action',
});
```

### 4. Use CORS Properly

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',  // Restrict in production if possible
  'Access-Control-Allow-Methods': 'POST, OPTIONS',  // Only methods you need
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};
```

### 5. Input Validation

```typescript
// Validate request body
const { query } = await req.json();
if (!query || typeof query !== 'string' || query.length > 200) {
  return new Response(
    JSON.stringify({ error: 'Invalid input' }),
    { status: 400 }
  );
}
```

---

## Testing Edge Functions Locally

### 1. Install Supabase CLI

```bash
npm install -g supabase
supabase login
```

### 2. Link to Your Project

```bash
supabase link --project-ref your_project_ref
```

### 3. Serve Functions Locally

```bash
supabase functions serve --env-file .env.local
```

### 4. Test with Authentication

```bash
# Get a JWT token from your app's auth system
export JWT_TOKEN="your_user_jwt_token"

# Test the function
curl -X POST http://localhost:54321/functions/v1/search-recipes \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "pasta"}'
```

---

## Deployment Checklist

Before deploying Edge Functions to production:

- [ ] All functions require authentication
- [ ] CRON_SECRET is set for scheduled functions
- [ ] Service role key is only used server-side
- [ ] Input validation is implemented
- [ ] Security logging is enabled
- [ ] Error messages don't leak sensitive data
- [ ] CORS headers are properly configured
- [ ] Rate limiting is considered
- [ ] Functions are tested with authentication
- [ ] Documentation is updated

---

## Security Incident Response

If you discover an unauthenticated Edge Function:

1. **Immediate**: Disable the function in Supabase dashboard
2. **Investigate**: Check logs for unauthorized access
3. **Fix**: Add authentication as shown in this document
4. **Test**: Verify authentication works correctly
5. **Deploy**: Re-enable with authentication enforced
6. **Monitor**: Watch logs for unusual activity

---

## Additional Resources

- [Supabase Edge Functions Security](https://supabase.com/docs/guides/functions/security)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
- [OWASP API Security](https://owasp.org/www-project-api-security/)

---

## Audit History

- **2025-11-14**: Initial security audit and fixes applied
  - Fixed unauthenticated access in `generate-daily-chores`
  - Fixed unauthenticated access in `search-recipes`
  - Added dual authentication (secret + JWT) for admin functions
  - Added input validation and security logging
  - Documented all security measures
