# Authentication and Authorization Feature

## Overview
The HRMIS application now includes full authentication integration with Okta using NextAuth.js, providing role-based access control with three distinct permission levels.

## Permission Levels

### 1. Unauthenticated Users
**Access**: Dashboard only (read-only)
- ✅ Can view dashboard statistics
- ✅ Can see company logo
- ❌ Cannot access employee list
- ❌ Cannot access employee details
- ❌ Cannot access settings
- ❌ Cannot access API endpoints
- **Redirect**: Attempting to access protected pages redirects to sign-in

### 2. Viewer Role (Authenticated)
**Access**: Read-only access to employee data
- ✅ Can view dashboard
- ✅ Can view employee list
- ✅ Can view employee details
- ✅ Can view employee change history
- ✅ Can export employee data
- ✅ Can customize table columns
- ✅ Can filter and search employees
- ❌ Cannot create new employees
- ❌ Cannot edit existing employees
- ❌ Cannot delete employees
- ❌ Cannot access settings
- ❌ Cannot manage custom attributes
- ❌ Cannot import data
- ❌ Cannot schedule exports

### 3. Admin Role (Authenticated)
**Access**: Full control over all features
- ✅ All viewer permissions, plus:
- ✅ Can create new employees
- ✅ Can edit existing employees
- ✅ Can delete employees
- ✅ Can access settings
- ✅ Can manage custom attributes
- ✅ Can import employee data
- ✅ Can schedule automated exports
- ✅ Can manage company logo
- ✅ Full API access (POST, PUT, DELETE)

## Implementation Details

### Architecture

#### NextAuth.js Configuration
**Location**: `/lib/auth.ts`

```typescript
export const authOptions: NextAuthOptions = {
  providers: [
    {
      id: 'okta',
      name: 'Okta',
      type: 'oauth',
      wellKnown: `${process.env.OKTA_ISSUER}/.well-known/openid-configuration`,
      authorization: { params: { scope: 'openid email profile' } },
      clientId: process.env.OKTA_CLIENT_ID,
      clientSecret: process.env.OKTA_CLIENT_SECRET,
      issuer: process.env.OKTA_ISSUER,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name || profile.email,
          email: profile.email,
          image: null,
          role: profile.role || 'viewer', // Default to viewer
        };
      },
    },
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (account && user) {
        token.role = user.role || 'viewer';
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.role = token.role || 'viewer';
      session.accessToken = token.accessToken;
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};
```

#### Custom Types
```typescript
export interface CustomUser extends NextAuthUser {
  role?: 'admin' | 'viewer';
  accessToken?: string;
}

export interface CustomSession extends Session {
  user: CustomUser;
  accessToken?: string;
}

export interface CustomJWT extends JWT {
  role?: 'admin' | 'viewer';
  accessToken?: string;
}
```

### Helper Functions

#### Authorization Helpers
**Location**: `/lib/auth.ts`

```typescript
// Check if user is authenticated
export function isAuthenticated(session: CustomSession | null): boolean {
  return !!session?.user;
}

// Check if user has admin role
export function isAdmin(session: CustomSession | null): boolean {
  return session?.user?.role === 'admin';
}

// Check if user has viewer role
export function isViewer(session: CustomSession | null): boolean {
  return session?.user?.role === 'viewer';
}

// Check if user can view employees
export function canViewEmployees(session: CustomSession | null): boolean {
  return isAuthenticated(session);
}

// Check if user can manage employees (create, update, delete)
export function canManageEmployees(session: CustomSession | null): boolean {
  return isAdmin(session);
}

// Check if user can manage settings
export function canManageSettings(session: CustomSession | null): boolean {
  return isAdmin(session);
}
```

### Route Protection

#### Middleware
**Location**: `/middleware.ts`

The middleware intercepts all requests and enforces authentication:

1. **Public Routes**: Dashboard and auth pages are accessible to all
2. **Protected Routes**: Require authentication
   - `/employees/*` - Requires authentication (any role)
   - `/settings` - Requires admin role
   - `/employees/new` - Requires admin role
   - `/employees/[id]/edit` - Requires admin role
3. **Unauthorized Access**: Redirects to sign-in page with return URL

```typescript
export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;

    // Allow unauthenticated access to dashboard
    if (req.nextUrl.pathname === '/') {
      return NextResponse.next();
    }

    // Require authentication for all other pages
    if (!isAuth) {
      return NextResponse.redirect(
        new URL(`/auth/signin?from=${encodeURIComponent(req.nextUrl.pathname)}`, req.url)
      );
    }

    // Check admin-only routes
    const isAdminRoute = /* ... */;
    if (isAdminRoute && token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/', req.url));
    }

    return NextResponse.next();
  }
);
```

### UI Protection

#### Navigation Component
**Location**: `/components/Navigation.tsx`

- Filters navigation items based on user role
- Shows sign-in button when not authenticated
- Shows user name, role, and sign-out button when authenticated
- Hides admin-only menu items from viewers

```typescript
const navItems = [
  { href: '/', label: 'Dashboard', icon: Home, requiresAuth: false },
  { href: '/employees', label: 'Manage Employees', icon: Users, requiresAuth: true },
  { href: '/settings', label: 'Settings', icon: Settings, requiresAuth: true, adminOnly: true },
];

// Filter items based on role
const visibleItems = navItems.filter(item => {
  if (!item.requiresAuth) return true;
  if (!session) return false;
  if (item.adminOnly && session.user?.role !== 'admin') return false;
  return true;
});
```

#### Employee List Page
**Location**: `/app/employees/page.tsx`

Admin-only UI elements:
- "Add Employee" button
- "Manage Custom Attributes" button
- "Import CSV" button
- Edit button on each employee row
- Delete button on each employee row
- "Schedule Export" option in export menu
- "View Schedules" option in export menu

All viewers see:
- Employee list (read-only)
- View button on each employee row
- "Customize Columns" button
- "Export CSV" button (export now only)

```typescript
const { data: session } = useSession();
const isAdmin = canManageEmployees(session as any);

// Conditionally render admin-only buttons
{isAdmin && (
  <Link href="/employees/new">
    <Button variant="primary">
      <Plus size={18} className="mr-2" />
      Add Employee
    </Button>
  </Link>
)}
```

### API Protection

#### Employee Collection API
**Location**: `/app/api/employees/route.ts`

```typescript
// GET - Requires authentication (any role)
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }
  // ... fetch and return employees
}

// POST - Requires admin role
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json(
      { success: false, error: 'Admin access required' },
      { status: 403 }
    );
  }
  // ... create employee
}
```

#### Individual Employee API
**Location**: `/app/api/employees/[id]/route.ts`

```typescript
// GET - Requires authentication (any role)
export async function GET(_request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }
  // ... fetch and return employee
}

// PUT - Requires admin role
export async function PUT(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json(
      { success: false, error: 'Admin access required' },
      { status: 403 }
    );
  }
  // ... update employee
}

// DELETE - Requires admin role
export async function DELETE(_request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json(
      { success: false, error: 'Admin access required' },
      { status: 403 }
    );
  }
  // ... delete employee
}
```

## User Workflows

### Workflow 1: Unauthenticated User
1. User visits the application
2. Sees the dashboard with statistics
3. Clicks "Sign In" button in navigation
4. Redirected to `/auth/signin`
5. Clicks "Sign in with Okta"
6. Redirected to Okta login page
7. Enters credentials
8. Okta verifies and redirects back to application
9. User is now authenticated with their assigned role

### Workflow 2: Viewer Accessing Employees
1. Viewer signs in with Okta
2. Navigation shows "Manage Employees" link
3. Clicks "Manage Employees"
4. Sees employee list with all data
5. Can click "View" button to see details
6. Can export data to CSV
7. Can customize which columns are visible
8. Cannot see "Add Employee" button
9. Cannot see Edit/Delete buttons on rows

### Workflow 3: Admin Managing Employees
1. Admin signs in with Okta
2. Navigation shows all links including "Settings"
3. Clicks "Manage Employees"
4. Sees employee list with all controls
5. Can click "Add Employee" to create new
6. Can click Edit button to modify existing
7. Can click Delete button to remove employee
8. Can access "Manage Custom Attributes"
9. Can import data from CSV
10. Can schedule automated exports

### Workflow 4: Session Expiration
1. User's session expires (after 30 days)
2. Next request triggers session refresh
3. If refresh fails, user is redirected to sign-in
4. After signing in, user returns to original page

## Files Created/Modified

### New Files
1. `/lib/auth.ts` - NextAuth configuration and helper functions
2. `/app/api/auth/[...nextauth]/route.ts` - NextAuth API route
3. `/app/providers.tsx` - SessionProvider wrapper
4. `/app/auth/signin/page.tsx` - Custom sign-in page
5. `/app/auth/error/page.tsx` - Authentication error page
6. `/middleware.ts` - Route protection middleware
7. `.env.example` - Environment variable template
8. `OKTA_SETUP.md` - Complete Okta setup guide
9. `AUTHENTICATION_FEATURE.md` - This file

### Modified Files
1. `/app/layout.tsx` - Added SessionProvider wrapper
2. `/components/Navigation.tsx` - Added authentication UI and role filtering
3. `/app/employees/page.tsx` - Added role-based UI controls
4. `/app/api/employees/route.ts` - Added authentication checks
5. `/app/api/employees/[id]/route.ts` - Added authentication checks

## Environment Variables

### Required
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generated-secret>
OKTA_CLIENT_ID=<okta-client-id>
OKTA_CLIENT_SECRET=<okta-client-secret>
OKTA_ISSUER=https://your-domain.okta.com/oauth2/default
```

### Generating Secrets
```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32
```

## Testing Checklist

### Authentication Flow
- [ ] Can access dashboard without signing in
- [ ] Sign-in button appears in navigation when not authenticated
- [ ] Clicking sign-in redirects to Okta
- [ ] Okta login works correctly
- [ ] Redirected back to application after login
- [ ] User name and role displayed in navigation
- [ ] Sign-out button works correctly
- [ ] Signing out redirects to dashboard

### Viewer Role
- [ ] Can view dashboard
- [ ] Can access employee list
- [ ] Can view employee details
- [ ] Can export employee data
- [ ] Cannot see "Add Employee" button
- [ ] Cannot see Edit/Delete buttons
- [ ] Cannot see "Manage Custom Attributes" button
- [ ] Cannot access `/settings` route
- [ ] Cannot access `/employees/new` route
- [ ] API GET requests succeed
- [ ] API POST requests return 403
- [ ] API PUT requests return 403
- [ ] API DELETE requests return 403

### Admin Role
- [ ] All viewer permissions work
- [ ] Can see "Add Employee" button
- [ ] Can see Edit/Delete buttons
- [ ] Can see "Manage Custom Attributes" button
- [ ] Can access `/settings` route
- [ ] Can access `/employees/new` route
- [ ] Can create new employees
- [ ] Can edit existing employees
- [ ] Can delete employees
- [ ] Can manage custom attributes
- [ ] API POST requests succeed
- [ ] API PUT requests succeed
- [ ] API DELETE requests succeed

### Route Protection
- [ ] Accessing `/employees` without auth redirects to sign-in
- [ ] Accessing `/settings` as viewer redirects to dashboard
- [ ] Accessing `/employees/new` as viewer redirects to dashboard
- [ ] Return URL preserved after sign-in redirect
- [ ] Middleware doesn't block static assets

### API Protection
- [ ] GET `/api/employees` without auth returns 401
- [ ] POST `/api/employees` without auth returns 401
- [ ] POST `/api/employees` as viewer returns 403
- [ ] PUT `/api/employees/[id]` without auth returns 401
- [ ] PUT `/api/employees/[id]` as viewer returns 403
- [ ] DELETE `/api/employees/[id]` without auth returns 401
- [ ] DELETE `/api/employees/[id]` as viewer returns 403

## Security Considerations

### Session Management
- JWT-based sessions (no server-side storage required)
- 30-day session expiration
- Secure, httpOnly cookies
- CSRF protection built-in

### OAuth Security
- Authorization Code flow (most secure)
- Client secret never exposed to browser
- State parameter for CSRF protection
- PKCE support (if enabled in Okta)

### API Security
- Session validation on every API request
- Role-based authorization for mutations
- Error messages don't leak sensitive info
- Proper HTTP status codes (401 vs 403)

### Production Best Practices
1. Always use HTTPS
2. Set secure environment variables
3. Regularly rotate secrets
4. Enable Okta audit logs
5. Monitor authentication failures
6. Implement rate limiting
7. Use environment-specific Okta apps

## Troubleshooting

### Common Issues

#### "Configuration" Error
**Symptom**: Redirected to error page with "Configuration" error
**Cause**: Missing or incorrect environment variables
**Solution**: Verify all required env vars are set in `.env.local`

#### "Authentication required" on Dashboard
**Symptom**: Dashboard is inaccessible without auth
**Cause**: Middleware configuration error
**Solution**: Check middleware allows `/` route without auth

#### User Always Gets "viewer" Role
**Symptom**: Admin users see viewer UI
**Cause**: Role not configured in Okta
**Solution**: Set up custom claim in Okta (see OKTA_SETUP.md)

#### Session Not Persisting
**Symptom**: Signed out immediately after sign in
**Cause**: Missing NEXTAUTH_SECRET or incorrect NEXTAUTH_URL
**Solution**: Verify environment variables match your deployment

## Future Enhancements

### Potential Improvements
1. **Team/Department-based Access**: Users can only see their department
2. **Custom Roles**: Define more granular permissions
3. **Audit Trail**: Track who made what changes
4. **Multi-Factor Authentication**: Enforce MFA for admins
5. **Session Analytics**: Track login patterns and usage
6. **Single Sign-On**: Integrate with other enterprise systems
7. **Role Management UI**: Admin interface to assign roles
8. **Permission Templates**: Pre-defined permission sets

### User Requests
- Manager role (can edit direct reports only)
- Department admin (can manage department employees)
- Time-based access (temporary admin access)
- IP-based restrictions
- Device trust

## Support

### Documentation
- `OKTA_SETUP.md` - Detailed Okta configuration guide
- `.env.example` - Environment variable template
- NextAuth.js docs: https://next-auth.js.org/
- Okta docs: https://developer.okta.com/

### Getting Help
1. Check environment variables are set correctly
2. Verify Okta application configuration
3. Check browser console for errors
4. Review server logs for auth errors
5. Test with Okta debugging tools

## Conclusion

The authentication integration provides enterprise-grade security with:
- ✅ Industry-standard OAuth 2.0 / OpenID Connect
- ✅ Role-based access control (RBAC)
- ✅ Protected UI and API endpoints
- ✅ Session management with JWT
- ✅ Customizable sign-in flow
- ✅ Production-ready security

The system scales from development to enterprise deployment and integrates seamlessly with existing Okta infrastructure.
