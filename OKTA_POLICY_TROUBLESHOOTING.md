# Okta "Policy evaluation failed" Error - Troubleshooting Guide

## Error Message
```
Error in authentication callback
access_denied: Policy evaluation failed for this request, please check the policy configurations.
```

## What This Means
This error is returned by **Okta**, not your application. It means:
- ✅ Your application is correctly configured
- ✅ OAuth flow is working properly
- ✅ PKCE is functioning correctly
- ❌ **Okta's authorization server policy is denying the request**

## Root Cause
Okta has access policies that control who can authenticate and which applications they can access. The policy is blocking your login attempt, which could be due to:

1. **User not assigned to the application**
2. **Authorization server policy too restrictive**
3. **Redirect URI not whitelisted**
4. **Application not activated**
5. **Rule conditions not met** (IP restrictions, group membership, etc.)

## How to Fix

### Step 1: Assign User to Application

1. **Log in to Okta Admin Console**
   - Navigate to: https://demo-moccasin-raven-34309.oktapreview.com/admin
   - (Or your Okta domain + `/admin`)

2. **Navigate to Applications**
   - Click **Applications** → **Applications** in the left sidebar

3. **Find Your Application**
   - Look for the application with Client ID: `0oa108fvpmlClVdJQ1d8`
   - Click on the application name

4. **Assign Users**
   - Click the **Assignments** tab
   - Click **Assign** → **Assign to People**
   - Find your user and click **Assign**
   - Click **Save and Go Back**
   - Click **Done**

### Step 2: Check Authorization Server Policy

1. **Navigate to Authorization Servers**
   - Click **Security** → **API** in the left sidebar
   - Click on **default** authorization server
   - (Or the one specified in your issuer URL)

2. **Check Access Policies**
   - Click the **Access Policies** tab
   - You should see one or more policies

3. **Review Policy Rules**
   - Click on the policy name
   - Check the rules within the policy
   - Ensure there's a rule that allows your users to authenticate

4. **Common Issues**:
   - **No rules exist**: Create a rule that allows authentication
   - **Rule has group restrictions**: Ensure your user is in the allowed group
   - **Rule has IP restrictions**: Ensure your IP is allowed

### Step 3: Verify Redirect URI

1. **In Your Application Settings**
   - Navigate to: **Applications** → Your Application
   - Click **General** tab
   - Scroll to **Sign-in redirect URIs**

2. **Verify These URIs are Listed**:
   ```
   http://localhost:3000/api/auth/callback/okta
   ```

   For production, also add:
   ```
   https://your-domain.com/api/auth/callback/okta
   ```

3. **Add Missing URI**:
   - Click **Edit** in the General Settings section
   - Add the URI to **Sign-in redirect URIs**
   - Click **Save**

### Step 4: Check Application Status

1. **In Your Application Settings**
   - Navigate to: **Applications** → Your Application
   - Check the status at the top

2. **Ensure Application is Active**
   - If status shows "Inactive", click **Activate**

### Step 5: Create/Update Access Policy (If Needed)

If no suitable policy exists:

1. **Create New Access Policy**
   - Go to **Security** → **API** → **default** authorization server
   - Click **Access Policies** tab
   - Click **Add New Access Policy**

2. **Configure Policy**
   - **Name**: `HRMIS Policy` (or any name)
   - **Description**: `Allow authentication for HRMIS application`
   - **Assign to**: Select your HRMIS application
   - Click **Create Policy**

3. **Add Rule to Policy**
   - Click **Add Rule**
   - **Rule Name**: `Allow All Users`
   - **IF Grant type is**: Select `Authorization Code` and `Refresh Token`
   - **AND User is**: `Any user assigned to the app`
   - **AND Scopes requested**: Select `Any scopes`
   - **THEN Access token lifetime is**: `1 Hour` (or your preference)
   - **THEN Refresh token lifetime is**: `90 Days` (or your preference)
   - Click **Create Rule**

### Step 6: Test Again

1. **Clear Browser Cookies** (optional but recommended)
   - This ensures you're starting fresh

2. **Try Okta Login Again**
   - Navigate to: http://localhost:3000/auth/signin
   - Click "Sign in with Okta"
   - You should now successfully authenticate

## Verification Commands

### Check Current Settings
```bash
cat data/okta-settings.json
```

### Check Server Logs
```bash
tail -f /private/tmp/claude-501/-Users-rob-carraway-Documents-Okta-AI-HRMIS/tasks/b49bab4.output
```

### Test Okta Configuration
You can test if Okta is reachable:
```bash
curl https://demo-moccasin-raven-34309.oktapreview.com/oauth2/default/.well-known/openid-configuration
```

This should return JSON with OAuth configuration details.

## Common Policy Configurations

### Development (Least Restrictive)
```
Rule Name: Allow All Development Users
- Grant type: Authorization Code, Refresh Token
- User: Any user assigned to the app
- Scopes: Any scopes
- Access token lifetime: 1 hour
- Refresh token lifetime: 90 days
```

### Production (More Restrictive)
```
Rule Name: Allow Authenticated Users
- Grant type: Authorization Code, Refresh Token
- User: Assigned users in group "HRMIS_Users"
- Scopes: openid, email, profile
- Access token lifetime: 30 minutes
- Refresh token lifetime: 7 days
- Network: Corporate IP range only (optional)
```

## Alternative: Use Local Authentication

If you need to access the application immediately while resolving Okta issues:

1. **Use Local Account**
   - Navigate to: http://localhost:3000/auth/signin
   - Select **"Local Account"** instead of Okta
   - Use default credentials:
     - Email: `admin@example.com`
     - Password: `admin123`

2. **This allows you to**:
   - Access the application as admin
   - Verify other features work
   - Continue development while fixing Okta

## Debugging Tips

### Enable Verbose Logging in Okta

1. Check System Log in Okta Admin:
   - Navigate to: **Reports** → **System Log**
   - Filter by your username or application
   - Look for "policy.evaluate_sign_on" events
   - Check the reason field for why policy failed

### Common Policy Failure Reasons

| Reason | Solution |
|--------|----------|
| `User not assigned to application` | Assign user to app (Step 1) |
| `No matching policy rule` | Create access policy rule (Step 5) |
| `Invalid redirect_uri` | Add redirect URI (Step 3) |
| `Application inactive` | Activate application (Step 4) |
| `User not in required group` | Add user to group or update policy rule |
| `IP address not allowed` | Update policy rule to allow your IP |

## Still Having Issues?

### Check These Additional Items

1. **Correct Issuer URL Format**
   ```
   https://your-domain.oktapreview.com/oauth2/default
   ```
   - Should end with `/oauth2/default` or your custom auth server ID
   - Should NOT have trailing slash

2. **Client Secret Validity**
   - Client secret might have been rotated in Okta
   - Generate new secret in Okta and update in HRMIS settings

3. **Application Type**
   - Should be "Web Application" (not SPA or Native)
   - Navigate to: Applications → Your App → General
   - Check "Application type"

4. **Grant Types Enabled**
   - In Application settings → General
   - "Grant types" should include:
     - ✅ Authorization Code
     - ✅ Refresh Token
   - Edit if needed

## Contact Information

For additional help:
- **Okta Documentation**: https://developer.okta.com/docs/guides/implement-grant-type/authcode/main/
- **Okta Support**: Available through your Okta admin console
- **HRMIS Documentation**: See `OKTA_PERSISTENCE.md` and `OKTA_AUTO_RESTART.md`

---
**Created**: 2026-06-17
**Last Updated**: 2026-06-17
**Status**: Troubleshooting Guide
