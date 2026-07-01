# Deployment Checklist

Use this checklist to verify everything is configured correctly before deploying.

## Pre-Deployment

### Environment Variables
- [ ] `NEXTAUTH_URL` is set to your domain (not localhost)
- [ ] `NEXTAUTH_SECRET` is a random 32+ character string
- [ ] `NEXT_PUBLIC_SUPABASE_URL` is set to your Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set (keep this secret!)
- [ ] Okta variables are set (if using Okta):
  - [ ] `OKTA_CLIENT_ID`
  - [ ] `OKTA_CLIENT_SECRET`
  - [ ] `OKTA_ISSUER`

### Supabase Setup
- [ ] Supabase project created
- [ ] Database schema imported from `docs/SUPABASE_COMPLETE_SCHEMA.sql`
- [ ] All tables exist:
  - [ ] `employees`
  - [ ] `custom_attributes`
  - [ ] `change_history`
  - [ ] `local_users`
  - [ ] `federated_users`
  - [ ] `okta_settings`
  - [ ] `audit_logs`
  - [ ] `export_schedules`
  - [ ] `outbound_api_settings`
- [ ] Service role key has permissions (should be default)

### Okta Setup (if using Okta)
- [ ] Okta organization created
- [ ] OAuth 2.0 application created (Web Application type)
- [ ] Redirect URIs configured:
  - [ ] Development: `http://localhost:3000/api/auth/callback/okta`
  - [ ] Production: `https://yourdomain.com/api/auth/callback/okta`
  - [ ] Preview: `https://preview-*.yourdomain.com/api/auth/callback/okta` (for preview deployments)
- [ ] Client ID copied
- [ ] Client Secret copied (never expose this)
- [ ] Issuer URL copied (format: `https://your-domain.okta.com/oauth2/default`)

### Local Build Test
- [ ] `npm install` succeeds
- [ ] `npm run lint` passes (no errors)
- [ ] `npm run build` succeeds
- [ ] `npm run dev` starts without errors
- [ ] Can access http://localhost:3000
- [ ] Sign-in works with `admin@example.com / password`
- [ ] Dashboard displays correctly

### Vercel Deployment Setup
- [ ] Project connected to Vercel
- [ ] All environment variables added to Vercel project settings
- [ ] Environment variables set for:
  - [ ] Production
  - [ ] Preview
  - [ ] Development
- [ ] Node.js version set to 18 or higher

## Deployment

### Before Deploy
- [ ] All tests pass locally
- [ ] No console errors in browser
- [ ] Local sign-in works
- [ ] (If Okta) Okta button appears and redirect works

### Deploy Command
```bash
git push
# Vercel will automatically deploy
# Or manually deploy:
vercel deploy --prod
```

### After Deploy

#### Verify Deployment
- [ ] Visit production URL (no 500 errors)
- [ ] Sign-in page loads
- [ ] Local credentials sign-in works
- [ ] Okta button appears (if configured)
- [ ] Can create/edit/delete employees
- [ ] Can access settings page
- [ ] Audit logs are recording

#### Verify Okta (if applicable)
- [ ] Okta button visible on sign-in page
- [ ] Clicking "Sign in with Okta" redirects to Okta
- [ ] Can sign in with Okta credentials
- [ ] User is created in federated_users table
- [ ] User has viewer role by default

#### Verify Database
- [ ] Supabase connection works (check for errors in Vercel logs)
- [ ] Data persists after page reload
- [ ] Audit logs are being written
- [ ] New users created in Supabase

#### Check Logs
```bash
vercel logs --prod
```
Look for:
- [ ] No "Supabase not configured" warnings
- [ ] No database connection errors
- [ ] Authentication logs are clean
- [ ] No unhandled errors

## Post-Deployment

### Security
- [ ] NEXTAUTH_SECRET is not in source code or logs
- [ ] SUPABASE_SERVICE_ROLE_KEY is not in source code or logs
- [ ] OKTA_CLIENT_SECRET is not in source code or logs
- [ ] All secrets are in Vercel environment variables (not in .env files)
- [ ] Database backups are enabled in Supabase

### Monitoring
- [ ] Set up error tracking (Sentry recommended)
- [ ] Monitor Vercel function execution time
- [ ] Check Supabase database performance
- [ ] Monitor storage usage

### Backups
- [ ] Enable automated backups in Supabase (Settings → Backups)
- [ ] Test restore procedure
- [ ] Document backup/restore process

### Scaling
- [ ] Monitor database connection limits
- [ ] Review Supabase pricing for your usage
- [ ] Consider enabling read replicas if needed
- [ ] Monitor API response times

## Troubleshooting Deployment

### "Cannot find module" errors
- [ ] Run `npm install` and redeploy
- [ ] Check all dependencies are in `package.json`

### Environment variables not working
- [ ] Verify variables are set in Vercel (not .env files)
- [ ] Check variable names match exactly (case-sensitive)
- [ ] Redeploy after adding variables

### Supabase connection timeout
- [ ] Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- [ ] Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
- [ ] Check Supabase project is not paused
- [ ] Check database connection limits not exceeded

### Okta sign-in fails
- [ ] Verify redirect URIs in Okta app settings
- [ ] Verify OKTA_ISSUER format (includes `/oauth2/default`)
- [ ] Check OKTA_CLIENT_ID and OKTA_CLIENT_SECRET

### Sign-in works but redirects don't work
- [ ] Check NEXTAUTH_URL matches deployment domain
- [ ] Check browser cookies are not blocked
- [ ] Check for mixed HTTP/HTTPS issues

## Rollback

If deployment has critical issues:

```bash
# View previous deployments
vercel list

# Rollback to previous version
vercel rollback <deployment-id>
```

Or redeploy a specific commit:
```bash
git revert <commit-hash>
git push
```

## Performance Targets

- [ ] Sign-in page loads in < 2 seconds
- [ ] API responses < 500ms average
- [ ] Database queries < 100ms
- [ ] Supabase function execution < 10 seconds

## Security Checklist

- [ ] HTTPS enabled (Vercel default)
- [ ] Secure cookies enabled
- [ ] CORS configured correctly
- [ ] API rate limiting configured (if needed)
- [ ] No sensitive data in audit logs
- [ ] Password minimum requirements enforced
- [ ] Session timeout configured (30 days default)
- [ ] Logout clears all sessions

## Documentation

- [ ] README updated with deployment instructions
- [ ] Environment variables documented
- [ ] API endpoints documented
- [ ] Architecture documented
- [ ] Troubleshooting guide created

## After Everything Is Working

- [ ] Add domain to Okta app allowed origins (if using Okta)
- [ ] Set up monitoring alerts
- [ ] Document deployment process for team
- [ ] Create runbook for common issues
- [ ] Set up CI/CD pipeline (if not using Vercel)
