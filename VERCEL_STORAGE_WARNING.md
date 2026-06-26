# ⚠️ Vercel Deployment - Data Storage Warning

## Critical Information

When deployed to Vercel, this application uses **EPHEMERAL STORAGE** which means:

### Data Will Be Lost

All data stored in the application (employees, custom attributes, settings, history, etc.) will be **PERMANENTLY DELETED** in these scenarios:

1. **Every time you redeploy** - Any new deployment clears all data
2. **When Vercel scales** - Serverless functions can be recycled at any time
3. **Periodically** - Lambda functions are automatically recycled by AWS
4. **After inactivity** - Cold starts may result in data loss

### Why This Happens

- The application uses file-based storage (`/tmp` directory on Vercel)
- Vercel runs on AWS Lambda, which is stateless
- `/tmp` is the only writable directory, but it's ephemeral
- File system storage doesn't persist in serverless environments

## Current Setup

```
Local Development: ./data directory (persistent)
Vercel Production:  /tmp/data directory (EPHEMERAL - NOT PERSISTENT)
```

## What You Can Use This For

✅ **Acceptable Uses:**
- Testing authentication (login/logout)
- Demonstrating UI/UX to stakeholders
- Evaluating features and workflows
- Short-term testing (within a single session)
- Proof of concept demonstrations

❌ **NOT Acceptable For:**
- Production use with real employee data
- Long-term testing across multiple days
- Any scenario where data loss is unacceptable
- Production HR management system

## Solution: Migrate to Database

For production use, you must migrate from file-based storage to a database:

### Option 1: Vercel Postgres (Recommended)
```bash
# Install Vercel Postgres
vercel postgres create

# Add to your project
vercel link
vercel env pull
```

Then update `lib/serverStorage.ts` to use SQL queries instead of JSON files.

### Option 2: MongoDB Atlas
```bash
npm install mongodb
```

Update `lib/serverStorage.ts` to use MongoDB operations.

### Option 3: Supabase
```bash
npm install @supabase/supabase-js
```

Configure Supabase client and update storage layer.

## Quick Test in Vercel

If you want to quickly test with some data:

1. Deploy to Vercel
2. Sign in with `admin@example.com` / `password`
3. Add test employees
4. **Use immediately** - data persists during active session
5. **Expect data loss** after:
   - 15+ minutes of inactivity
   - Any new deployment
   - Vercel function recycling

## Migration Guide

See `docs/DATABASE_MIGRATION.md` (to be created) for step-by-step instructions on migrating to a persistent database.

## Questions?

- For Vercel deployment: See `VERCEL_DEPLOYMENT.md`
- For local development: Data persists in `./data` directory
- For production setup: Plan database migration before deploying
