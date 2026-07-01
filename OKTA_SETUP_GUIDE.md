# Okta Sign-In Setup Guide

## Issue: "Sign in with Okta" Button Not Showing

If you're seeing the sign-in page but the "Sign in with Okta" button is not appearing, follow this guide.

## Prerequisites

You must complete the Supabase setup first. If you haven't done so:
1. Read [`docs/SUPABASE_MIGRATION.md`](./docs/SUPABASE_MIGRATION.md)
2. Create a Supabase project and run the schema from [`docs/SUPABASE_COMPLETE_SCHEMA.sql`](./docs/SUPABASE_COMPLETE_SCHEMA.sql)
3. Update `.env.local` with your Supabase credentials

## Quick Start (5 minutes)

### 1. Verify Supabase is Working
Check that your `.env.local` has:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

Restart the dev server and check for this warning in logs:
```
⚠️  Supabase not configured - using placeholder client for build
```
If you see this, your credentials aren't set. Otherwise, Supabase is working.

### 2. Configure Okta (Choose One Method)

#### Method A: Via Settings UI (Recommended)

1. **Sign in as Admin**
   - Email: `admin@example.com`
   - Password: `password`

2. **Navigate to Settings**
   - Click the gear icon (⚙️) in the top right

3. **Find "Okta Configuration" Section**
   - Scroll to the "System" tab if needed

4. **Enter Your Okta Credentials**
   - **Client ID**: From your Okta app settings
   - **Client Secret**: From your Okta app settings
   - **Issuer URL**: Format is `https://your-domain.okta.com/oauth2/default`
   - Click **Save**

5. **Server Restarts Automatically**
   - Watch the terminal for confirmation
   - Page will show success message

#### Method B: Via Environment Variables

Add to `.env.local`:
```env
OKTA_CLIENT_ID=your-okta-client-id
OKTA_CLIENT_SECRET=your-okta-client-secret
OKTA_ISSUER=https://your-domain.okta.com/oauth2/default
```

Then restart:
```bash
npm run dev
```

### 3. Verify It's Working

1. Go to http://localhost:3000/auth/signin
2. You should see **two** sign-in options:
   - Email/password (local authentication)
   - "Sign in with Okta" button
3. Click the Okta button - it should redirect to your Okta login page

## How It Works

The authentication flow:

```
User visits /auth/signin
        ↓
Page loads and calls /api/okta-configured
        ↓
API checks okta_settings table in Supabase
        ↓
If settings exist → { configured: true } → Okta button shows
If settings don't exist → { configured: false } → Okta button hidden
        ↓
User clicks "Sign in with Okta"
        ↓
NextAuth redirects to Okta login
        ↓
User authenticates with Okta
        ↓
Okta redirects back to /api/auth/callback/okta
        ↓
NextAuth creates session
        ↓
User is logged in!
```

## Troubleshooting

### Issue: Button Still Not Showing

**Check 1: Is Supabase configured?**
- Look at server logs for warning about placeholder Supabase
- If present, update `.env.local` with real credentials

**Check 2: Are settings in the database?**
- Go to Supabase dashboard → SQL Editor
- Run: `SELECT * FROM okta_settings;`
- Should see one row with your client_id, client_secret, and issuer
- If empty, follow "Configure Okta" section above

**Check 3: Browser console errors**
- Open browser DevTools (F12)
- Go to Console tab
- Look for errors when page loads
- Common errors:
  - `Supabase URL is not set` → Update `.env.local`
  - CORS errors → Check Okta application settings for redirect URIs

### Issue: Button Shows But Clicking Does Nothing

**Check 1: Browser console**
- Should see a redirect to Okta
- If not, check for JavaScript errors

**Check 2: Okta Application Settings**
- Go to your Okta dashboard
- App integrations → your app
- Check "Redirect URIs":
  - Must include `http://localhost:3000/api/auth/callback/okta`
  - On production, use `https://yourdomain.com/api/auth/callback/okta`

### Issue: "Invalid Okta settings saved"

Your Okta credentials are wrong:
- **Client ID**: Is it from your Okta application? (Not your domain)
- **Client Secret**: Check it's not a different secret (they rotate)
- **Issuer**: Should be `https://your-domain.okta.com/oauth2/default`
  - NOT `https://your-domain.okta.com`
  - NOT your full OAuth 2.0 configuration URL

Go back to settings and try again.

## Getting Your Okta Credentials

1. Go to your Okta dashboard
2. Applications → Applications
3. Find your app (or create one)
4. Go to General tab
5. Copy:
   - **Client ID** (top right, under "CLIENT CREDENTIALS")
   - **Client secret** (click to reveal)
6. Copy **Issuer** URL from top of page (looks like: `https://your-domain.okta.com/oauth2/default`)

## Environment Variables Reference

All Okta-related variables:

```env
# Required for Okta authentication
OKTA_CLIENT_ID=your-client-id-here
OKTA_CLIENT_SECRET=your-client-secret-here
OKTA_ISSUER=https://your-domain.okta.com/oauth2/default

# Required for settings storage
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Required for auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-generated-secret
```

## What Happens After Sign-In?

1. User authenticates with Okta
2. User data is stored in `federated_users` table
3. User is assigned default role: `viewer`
4. Admin can change roles via Users page
5. User session lasts 30 days (configurable)

## Need More Help?

- Check logs for detailed error messages
- Verify Okta app redirect URIs match your deployment URL
- Ensure Supabase SQL schema was run
- Confirm all environment variables are set correctly
