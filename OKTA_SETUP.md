# Okta Integration Setup Guide

## Overview
This application uses NextAuth.js with Okta as the OAuth provider to implement role-based access control. Users can be assigned either an "admin" or "viewer" role.

## User Roles

### Unauthenticated Users
- Can only view the dashboard
- Cannot access employee lists or details
- Cannot access settings

### Viewer Role (authenticated)
- Can view dashboard
- Can view employee list and details
- Can export data
- Can customize columns
- Cannot create, update, or delete employees
- Cannot access settings

### Admin Role (authenticated)
- Full access to all features
- Can create, update, and delete employees
- Can manage settings (custom attributes)
- Can import/export data
- Can schedule exports

## Okta Setup Steps

### 1. Create an Okta Account
1. Go to [Okta Developer](https://developer.okta.com/)
2. Sign up for a free developer account
3. Note your Okta domain (e.g., `dev-12345678.okta.com`)

### 2. Create an OAuth Application
1. Log in to your Okta Admin Console
2. Navigate to **Applications** → **Applications**
3. Click **Create App Integration**
4. Select:
   - **Sign-in method**: OIDC - OpenID Connect
   - **Application type**: Web Application
5. Click **Next**

### 3. Configure Application Settings
1. **App integration name**: HRMIS
2. **Grant type**: Check "Authorization Code"
3. **Sign-in redirect URIs**:
   - `http://localhost:3000/api/auth/callback/okta` (for development)
   - `https://your-domain.com/api/auth/callback/okta` (for production)
4. **Sign-out redirect URIs**:
   - `http://localhost:3000` (for development)
   - `https://your-domain.com` (for production)
5. **Controlled access**: Choose "Allow everyone in your organization to access" or configure specific groups
6. Click **Save**

### 4. Get OAuth Credentials
1. After creating the app, you'll see the **Client ID** and **Client Secret**
2. Copy these values - you'll need them for the `.env` file

### 5. Configure Custom Claims (For Roles)
To add roles to the user profile:

#### Option A: Using Groups (Recommended)
1. Navigate to **Directory** → **Groups**
2. Create two groups:
   - `HRMIS-Admins`
   - `HRMIS-Viewers`
3. Add users to the appropriate groups
4. Navigate to **Security** → **API** → **Authorization Servers**
5. Select your authorization server (usually "default")
6. Go to the **Claims** tab
7. Click **Add Claim**:
   - **Name**: `role`
   - **Include in token type**: ID Token, Always
   - **Value type**: Expression
   - **Value**:
   ```javascript
   isMemberOfGroupName("HRMIS-Admins") ? "admin" : "viewer"
   ```
   - **Include in**: The following scopes: `openid`
8. Click **Create**

#### Option B: Using Custom User Attributes
1. Navigate to **Directory** → **Profile Editor**
2. Select the **Okta** profile (default user profile)
3. Click **Add Attribute**:
   - **Data type**: string
   - **Display name**: HRMIS Role
   - **Variable name**: `hrmisRole`
   - **Enum**: Check this box
   - **Attribute members**:
     - `admin` (Display name: Admin)
     - `viewer` (Display name: Viewer)
4. For each user:
   - Navigate to **Directory** → **People**
   - Select the user
   - Click **Profile** → **Edit**
   - Set the **HRMIS Role** attribute
5. Add a custom claim as in Option A, but use:
   - **Value**: `user.hrmisRole != null ? user.hrmisRole : "viewer"`

### 6. Set Environment Variables
1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Update the values in `.env.local`:
   ```env
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=<generate-a-secret>
   OKTA_CLIENT_ID=<your-client-id>
   OKTA_CLIENT_SECRET=<your-client-secret>
   OKTA_ISSUER=https://your-domain.okta.com/oauth2/default
   ```

### 7. Generate NextAuth Secret
Run this command to generate a secure secret:
```bash
openssl rand -base64 32
```
Copy the output and use it as your `NEXTAUTH_SECRET`.

## Testing the Integration

### 1. Start the Application
```bash
npm run dev
```

### 2. Test Unauthenticated Access
1. Open `http://localhost:3000`
2. You should see the dashboard
3. Try to access `/employees` - you should be redirected to sign in

### 3. Test Viewer Role
1. Click "Sign In" in the navigation
2. Sign in with a user assigned the "viewer" role
3. Verify:
   - ✅ Can view dashboard
   - ✅ Can view employees list
   - ✅ Can view employee details
   - ✅ Can export data
   - ❌ Cannot see "Add Employee" button
   - ❌ Cannot see Edit/Delete buttons on employee rows
   - ❌ Cannot see "Manage Custom Attributes" button
   - ❌ Cannot access `/settings` page
   - ❌ Cannot access `/employees/new` page

### 4. Test Admin Role
1. Sign out
2. Sign in with a user assigned the "admin" role
3. Verify:
   - ✅ Can view dashboard
   - ✅ Can view employees list
   - ✅ Can view employee details
   - ✅ Can export data
   - ✅ Can see "Add Employee" button
   - ✅ Can see Edit/Delete buttons on employee rows
   - ✅ Can see "Manage Custom Attributes" button
   - ✅ Can access `/settings` page
   - ✅ Can access `/employees/new` page
   - ✅ Can create, update, and delete employees

### 5. Test API Protection
Try accessing API endpoints without authentication:
```bash
# Should return 401 Unauthorized
curl http://localhost:3000/api/employees

# Should return 403 Forbidden (if not admin)
curl -X POST http://localhost:3000/api/employees \
  -H "Content-Type: application/json" \
  -d '{"type":"employee","firstName":"Test",...}'
```

## Troubleshooting

### Error: "Configuration" Error on Auth Error Page
**Cause**: Missing or incorrect environment variables.
**Solution**: Verify all required environment variables are set in `.env.local`.

### Error: "AccessDenied" on Sign In
**Cause**: User is not assigned to the application in Okta.
**Solution**:
1. Go to Okta Admin Console
2. Navigate to **Applications** → **Applications** → **HRMIS**
3. Go to **Assignments** tab
4. Click **Assign** → **Assign to People** or **Assign to Groups**
5. Assign the user

### User Always Gets "viewer" Role
**Cause**: Custom claim not configured or user not in the right group.
**Solution**:
1. Verify the custom claim is created correctly
2. Verify the user is in the correct group (if using groups)
3. Verify the user has the attribute set (if using attributes)
4. Try signing out and back in to refresh the token

### Redirect URI Mismatch Error
**Cause**: The redirect URI in Okta doesn't match the one in the application.
**Solution**:
1. Go to Okta Admin Console
2. Navigate to **Applications** → **Applications** → **HRMIS**
3. Go to **General** tab
4. Verify **Sign-in redirect URIs** includes:
   - `http://localhost:3000/api/auth/callback/okta`

### Session Not Persisting
**Cause**: Missing `NEXTAUTH_SECRET` or incorrect `NEXTAUTH_URL`.
**Solution**:
1. Verify `NEXTAUTH_SECRET` is set and is a secure random string
2. Verify `NEXTAUTH_URL` matches your application URL exactly

## Security Best Practices

### Production Deployment
1. **Use HTTPS**: Always use HTTPS in production
2. **Secure Secrets**: Never commit `.env.local` or `.env` files
3. **Rotate Secrets**: Regularly rotate `NEXTAUTH_SECRET` and OAuth credentials
4. **Least Privilege**: Assign users the minimum required role
5. **Audit Logs**: Enable Okta system logs to track authentication events
6. **Session Timeout**: Consider reducing session max age for sensitive applications

### Environment Variables in Production
For production deployments (Vercel, Netlify, etc.):
1. Set environment variables in the hosting platform's dashboard
2. Never use `.env.local` in production
3. Use environment-specific values:
   ```env
   NEXTAUTH_URL=https://your-production-domain.com
   OKTA_ISSUER=https://your-production-okta-domain.okta.com/oauth2/default
   ```

## Advanced Configuration

### Multiple Authorization Servers
If you have multiple authorization servers in Okta:
1. Navigate to **Security** → **API** → **Authorization Servers**
2. Create a new authorization server for HRMIS
3. Update `OKTA_ISSUER` to use your custom server:
   ```env
   OKTA_ISSUER=https://your-domain.okta.com/oauth2/aus123456789
   ```

### Custom Sign-In Page
To customize the sign-in experience:
1. Edit `/app/auth/signin/page.tsx`
2. Add your branding, logos, and styling
3. The sign-in flow will remain the same

### Role from JWT Token
If you want to derive the role from a different JWT claim:
1. Edit `/lib/auth.ts`
2. Update the `profile()` function:
   ```typescript
   profile(profile) {
     return {
       id: profile.sub,
       name: profile.name || profile.email,
       email: profile.email,
       image: null,
       role: profile.customClaim || 'viewer', // Use your custom claim
     };
   }
   ```

## API Reference

### Auth Helper Functions
Located in `/lib/auth.ts`:

```typescript
// Check if user is authenticated
isAuthenticated(session: CustomSession | null): boolean

// Check if user has admin role
isAdmin(session: CustomSession | null): boolean

// Check if user has viewer role
isViewer(session: CustomSession | null): boolean

// Check if user can view employees
canViewEmployees(session: CustomSession | null): boolean

// Check if user can manage employees (create, update, delete)
canManageEmployees(session: CustomSession | null): boolean

// Check if user can manage settings
canManageSettings(session: CustomSession | null): boolean
```

### Using in Components
```typescript
import { useSession } from 'next-auth/react';
import { canManageEmployees } from '@/lib/auth';

export function MyComponent() {
  const { data: session } = useSession();
  const isAdmin = canManageEmployees(session as any);

  return (
    <>
      {isAdmin && <AdminOnlyButton />}
    </>
  );
}
```

### Using in API Routes
```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  if (session.user?.role !== 'admin') {
    return NextResponse.json(
      { success: false, error: 'Admin access required' },
      { status: 403 }
    );
  }

  // Handle request...
}
```

## Support

For issues with:
- **NextAuth.js**: [NextAuth Documentation](https://next-auth.js.org/)
- **Okta Integration**: [Okta Developer Docs](https://developer.okta.com/docs/)
- **This Application**: Check the main README.md or contact your administrator

## Summary

After completing this setup:
1. ✅ Okta OAuth application created and configured
2. ✅ User roles configured (admin and viewer)
3. ✅ Environment variables set
4. ✅ Application routes protected by authentication
5. ✅ UI controls hidden based on role
6. ✅ API endpoints protected with session validation

Users can now sign in with Okta, and the application will enforce role-based access control throughout.
