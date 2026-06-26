# Vercel Deployment Guide

## Required Environment Variables

Before deploying to Vercel, you MUST configure these environment variables in your Vercel project settings:

### 1. NextAuth Configuration (REQUIRED)

```bash
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=<generate-random-secret>
```

**To generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

**Important:**
- `NEXTAUTH_URL` must be your actual Vercel deployment URL (e.g., `https://hrmis.vercel.app`)
- Without these variables, you will get redirect loops or authentication errors

### 2. Okta Configuration (OPTIONAL)

Only add these if you want to enable Okta SSO. If not set, users can still sign in with local accounts:

```bash
OKTA_CLIENT_ID=your-okta-client-id
OKTA_CLIENT_SECRET=your-okta-client-secret
OKTA_ISSUER=https://your-domain.okta.com/oauth2/default
```

**If you DON'T configure Okta**, users can still use:
- Admin: `admin@example.com` / `password`
- Viewer: `viewer@example.com` / `password`

## Setting Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Click on "Settings"
3. Click on "Environment Variables"
4. Add each variable with the appropriate value
5. Select which environments (Production, Preview, Development)
6. Click "Save"
7. Redeploy your application

## Troubleshooting

### "Too Many Redirects" Error

This usually means `NEXTAUTH_URL` and/or `NEXTAUTH_SECRET` are not set in Vercel.

**Solution:**
1. Add both environment variables in Vercel settings
2. Ensure `NEXTAUTH_URL` matches your actual deployment URL
3. Redeploy the application

### "Configuration" Error

This means NextAuth encountered a configuration issue.

**Common causes:**
- Missing `NEXTAUTH_SECRET`
- Incorrect `NEXTAUTH_URL` format
- Okta credentials partially set (all 3 or none)

**Solution:**
1. Verify all required environment variables are set
2. Check that `NEXTAUTH_URL` starts with `https://` and has no trailing slash
3. If using Okta, ensure all 3 Okta variables are set correctly

### Okta Sign-In Not Available

If the "Sign in with Okta" button doesn't appear, it means Okta is not configured.

**This is normal if:**
- You haven't set Okta environment variables
- You only want to use local authentication

**To enable Okta:**
1. Set all 3 Okta environment variables in Vercel
2. Configure your Okta application with the redirect URI: `https://your-app.vercel.app/api/auth/callback/okta`
3. Redeploy

## Deployment Checklist

Before deploying:
- [ ] Generate `NEXTAUTH_SECRET` using `openssl rand -base64 32`
- [ ] Set `NEXTAUTH_URL` to your Vercel URL
- [ ] Set `NEXTAUTH_SECRET` in Vercel environment variables
- [ ] (Optional) Configure Okta variables if using SSO
- [ ] Commit and push code to trigger deployment
- [ ] After deployment, test signin with `admin@example.com` / `password`

## Default Accounts

These local accounts work without any Okta configuration:

- **Admin Account**
  - Email: `admin@example.com`
  - Password: `password`
  - Access: Full system access

- **Viewer Account**
  - Email: `viewer@example.com`
  - Password: `password`
  - Access: Read-only access

## Important: Data Persistence in Vercel

**⚠️ WARNING:** This application uses file-based storage which is **EPHEMERAL** in Vercel's serverless environment.

### What This Means

- Data is stored in `/tmp` directory on Vercel
- `/tmp` is cleared between deployments and periodically
- **All data (employees, settings, etc.) will be lost** when:
  - You redeploy the application
  - Vercel scales down/up serverless functions
  - The Lambda function is recycled (happens periodically)

### Demo/Testing Only

This Vercel deployment is suitable for:
- ✅ Testing authentication flows
- ✅ Demonstrating UI/UX
- ✅ Evaluating features
- ❌ **NOT for production use**
- ❌ **NOT for storing real data**

### For Production Use

To use this application in production, you need to replace file-based storage with a database:

1. **PostgreSQL** (Recommended)
   - Use Vercel Postgres
   - Migrate `lib/serverStorage.ts` to use database queries
   - Store all data in tables

2. **MongoDB**
   - Use MongoDB Atlas
   - Replace JSON file operations with MongoDB operations

3. **Other Options**
   - Vercel KV (Redis) for simple key-value storage
   - Supabase with PostgreSQL
   - PlanetScale with MySQL

## Security Notes

- Always use strong, randomly generated values for `NEXTAUTH_SECRET` in production
- Never commit `.env` files with real credentials to git
- Rotate secrets regularly
- Use Vercel's encrypted environment variables for sensitive data
- Consider using different secrets for Production vs Preview environments
