# Supabase Email Configuration for hyhhub.com

## Overview
This document explains how to configure Supabase email templates to use your custom domain `hyhhub.com` instead of the default bolt.new redirects.

## Required Configuration

### 1. Site URL Configuration
In your Supabase Dashboard:

1. Go to **Authentication** > **URL Configuration**
2. Set **Site URL** to: `https://hyhhub.com`
3. Add to **Redirect URLs**:
   - `https://hyhhub.com/dashboard`
   - `https://hyhhub.com/invite`
   - `https://hyhhub.com/*` (wildcard for all routes)

### 2. Email Templates Configuration
In your Supabase Dashboard:

1. Go to **Authentication** > **Email Templates**

#### Confirm Signup Template
- Update the confirmation link to use: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup`
- The `.SiteURL` variable will automatically use your configured Site URL

#### Magic Link Template
- Update the magic link to use: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink`

#### Password Reset Template
- Update the reset link to use: `{{ .SiteURL }}/auth/reset-password?token_hash={{ .TokenHash }}&type=recovery`

#### Email Change Confirmation Template
- Update the confirmation link to use: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email_change`

### 3. Environment Variables
Ensure your `.env` file has:
```
NEXT_PUBLIC_APP_URL=https://hyhhub.com
```

This is already configured in your project.

### 4. Netlify Configuration
Make sure your Netlify environment variables match:
1. Go to your Netlify dashboard
2. Navigate to **Site settings** > **Environment variables**
3. Add or update:
   - `NEXT_PUBLIC_APP_URL` = `https://hyhhub.com`

## Email Auth Flow

1. User signs up at `https://hyhhub.com/signup`
2. Confirmation email is sent with link to `https://hyhhub.com/auth/confirm?...`
3. User clicks link and is redirected to `https://hyhhub.com/dashboard`

## Custom Domain Setup

If you haven't already:
1. Configure your custom domain `hyhhub.com` in Netlify
2. Update DNS records to point to Netlify
3. Enable HTTPS/SSL certificate

## Verification

After configuration:
1. Create a test account
2. Check the confirmation email
3. Verify all links point to `hyhhub.com` (not bolt.new or localhost)
4. Test the entire signup flow

## Additional Notes

- All email redirects now use the `NEXT_PUBLIC_APP_URL` environment variable
- The `emailRedirectTo` option is set in `/lib/auth-context.tsx`
- Password reset and other auth flows will automatically use your custom domain
- Make sure to update Supabase configuration before deploying to production
