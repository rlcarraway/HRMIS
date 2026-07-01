# Authentication Architecture

This document explains how authentication works in HRMIS, including both local credentials and Okta OAuth.

## Overview

HRMIS supports two authentication methods:

1. **Local Credentials** - Username/password stored in Supabase
2. **Okta OAuth** - Single Sign-On via Okta (optional)

Both methods use **NextAuth.js** for session management.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Sign-In Page                              │
│                   (/auth/signin)                                 │
└──────────────────────┬──────────────────────────────────────────┘
                       │
         ┌─────────────┴──────────────┐
         ▼                            ▼
    ┌─────────────┐        ┌──────────────────┐
    │ Local Login │        │ Check if Okta    │
    │ (Email/Pwd) │        │ is Configured    │
    └──────┬──────┘        └────────┬─────────┘
           │                        │
           │            ┌───────────▼──────────┐
           │            │ /api/okta-configured │
           │            │ (GET)                │
           │            └───────────┬──────────┘
           │                        │
           │          ┌─────────────▼──────────────┐
           │          │ Query Supabase            │
           │          │ okta_settings table       │
           │          └─────────────┬──────────────┘
           │                        │
           │    ┌───────────────────┼────────────────────┐
           │    │                   │                    │
      ┌────▼────▼───────┐    ┌──────▼────────┐    ┌─────▼──────────┐
      │  Submit Email   │    │ Settings      │    │ Settings Not   │
      │  + Password     │    │ Exist         │    │ Found (or      │
      │                 │    │               │    │ missing fields)│
      │ POST /api/auth/ │    │ Show Okta     │    │                │
      │ signin/         │    │ Button        │    │ Hide Okta      │
      │ credentials     │    │               │    │ Button         │
      └────┬──────────┬─┘    └───────────────┘    └────────────────┘
           │          │
      ┌────▼───┐  ┌───▼────────────────┐
      │ Valid  │  │ Invalid            │
      │ Creds? │  │ Credentials        │
      └────┬───┘  └────────┬───────────┘
           │               │
       ┌───▼────────┐   ┌──▼──────────┐
       │ Load Role  │   │ Error Page  │
       │ from DB    │   │ (/auth/     │
       │ (local_    │   │  error)     │
       │ users      │   │             │
       │ table)     │   └─────────────┘
       └───┬────────┘
           │
       ┌───▼──────────────────┐
       │ Create NextAuth      │
       │ Session             │
       │ - User ID           │
       │ - Email             │
       │ - Role (viewer,     │
       │   admin, etc)       │
       │ - Auth provider     │
       └───┬──────────────────┘
           │
       ┌───▼──────────┐
       │ Redirect to  │
       │ Dashboard    │
       └──────────────┘
```

## Authentication Flow: Okta Path

When "Sign in with Okta" button is clicked:

```
1. User clicks "Sign in with Okta"
          ↓
2. Frontend calls signIn('okta', { callbackUrl })
          ↓
3. NextAuth redirects to Okta login page
   URL: https://your-domain.okta.com/oauth2/v1/authorize?
        client_id=...&redirect_uri=.../api/auth/callback/okta&...
          ↓
4. User enters Okta credentials
          ↓
5. Okta validates and redirects back to app
   URL: /api/auth/callback/okta?code=...&state=...
          ↓
6. NextAuth exchanges code for tokens
   POST https://your-domain.okta.com/oauth2/v1/token
          ↓
7. Okta returns access token + user info
   {
     "sub": "user-id",
     "email": "user@example.com",
     "name": "User Name"
   }
          ↓
8. Okta provider profile callback executes:
   - Calls createOrUpdateFederatedUser()
   - Saves user to federated_users table
   - Assigns default role: "viewer"
          ↓
9. NextAuth creates JWT token with:
   - User ID
   - Email
   - Role
   - Auth provider (okta)
          ↓
10. JWT stored in secure HTTP-only cookie
          ↓
11. Redirect to dashboard with session
```

## Data Models

### Session Storage (JWT)

**JWT Token Contents:**
```typescript
{
  id: string;           // User ID (from federated_users table)
  email: string;        // User email
  role: string;         // "admin", "manager", "viewer", etc.
  authProvider: string; // "okta" or "credentials"
}
```

**Session Object (in React components):**
```typescript
{
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    image?: string;
  },
  accessToken?: string;  // OAuth access token
  expires: string;       // ISO 8601 timestamp
}
```

### Database Tables

#### `local_users` (for local authentication)
```
id            | uuid PRIMARY KEY
email         | varchar UNIQUE NOT NULL
password_hash | varchar NOT NULL         -- Bcrypt hashed
role          | varchar DEFAULT 'viewer' -- admin, manager, viewer
created_at    | timestamptz DEFAULT now()
updated_at    | timestamptz DEFAULT now()
```

#### `federated_users` (for Okta and other OAuth providers)
```
id            | uuid PRIMARY KEY
provider_id   | varchar NOT NULL         -- Okta sub claim
provider      | varchar NOT NULL         -- "okta", "google", etc
email         | varchar UNIQUE NOT NULL
name          | varchar
role          | varchar DEFAULT 'viewer'
created_at    | timestamptz DEFAULT now()
updated_at    | timestamptz DEFAULT now()
```

#### `okta_settings` (configuration)
```
id            | integer PRIMARY KEY (always 1)
client_id     | varchar
client_secret | varchar
issuer        | varchar
updated_at    | timestamptz DEFAULT now()
```

## Authorization Checks

### JWT Token Callback
Runs on every request that has a session:
```typescript
async jwt({ token, user, account, profile }) {
  // Initial sign in
  if (account && user) {
    token.role = user.role || 'viewer';
    token.accessToken = account.access_token;

    // For Okta users, get latest role from DB
    if (account.provider === 'okta' && profile) {
      const federatedUser = await getFederatedUserByProviderId(profile.sub);
      if (federatedUser) {
        token.role = federatedUser.role;
      }
    }
  }
  return token;
}
```

### Session Callback
Runs when session is requested from client:
```typescript
async session({ session, token }) {
  if (session.user) {
    session.user.role = token.role || 'viewer';
    session.accessToken = token.accessToken;
  }
  return session;
}
```

## Role-Based Access Control

### Available Roles
- **admin** - Full system access
- **manager** - Can manage employees in their department
- **viewer** - Read-only access

### Permission Checks

**In API Routes:**
```typescript
const auth = await authenticateApiRequest(request, {
  requiredRole: 'admin'
});

if (!auth.authenticated) {
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
  );
}
```

**In React Components:**
```typescript
const session = await getServerSession(authOptions);

if (session?.user?.role !== 'admin') {
  return <AccessDenied />;
}
```

## Error Handling

### Non-Blocking Audit Logging
Audit logging failures don't break authentication:
```typescript
async authorize(credentials) {
  // ... validate credentials ...

  try {
    await logUserAction('user.login', 'Login successful', {...});
  } catch (error) {
    console.error('Logging failed:', error);
    // Don't return error - auth succeeded even if logging failed
  }

  return { /* user */ };
}
```

This ensures:
- Authentication works even if Supabase is down
- Audit logs are best-effort, not critical path
- User experience isn't affected by database issues

## Security Considerations

### Password Storage (Local Auth)
```
Raw password → Bcrypt hash → Store in DB
              (10 rounds, autosalt)
```

When logging in:
```
User enters password → Hash with stored salt → Compare hashes
                                              → Match = valid
```

### OAuth Token Security
- Access tokens stored in NextAuth's JWT
- JWT signed with `NEXTAUTH_SECRET`
- Stored in HTTP-only cookie (not accessible via JavaScript)
- PKCE enabled for OAuth authorization code flow

### Okta Issuer Validation
NextAuth validates:
- Token signature matches Okta's public key
- Token issuer matches configured `OKTA_ISSUER`
- Token is not expired
- Token audience matches client ID

## Configuration

### Required Environment Variables

**For Local Auth (always available):**
```env
NEXTAUTH_URL=http://localhost:3000      # Your app URL
NEXTAUTH_SECRET=<32-char-random-string> # Session signing key
```

**For Okta OAuth (optional):**
```env
OKTA_CLIENT_ID=<from-okta-app>
OKTA_CLIENT_SECRET=<from-okta-app>
OKTA_ISSUER=https://your-domain.okta.com/oauth2/default
```

**For Database Storage:**
```env
NEXT_PUBLIC_SUPABASE_URL=<your-project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-secret>
```

### Default Local Users

For development, these accounts exist by default:

| Email | Password | Role |
|-------|----------|------|
| admin@example.com | password | admin |
| viewer@example.com | password | viewer |

These are configured in `lib/serverLocalUsers.ts`.

## Session Lifespan

- **JWT expires**: 30 days (configurable in `lib/auth.ts`)
- **Refresh token**: Not used (simple JWT strategy)
- **Cookie strategy**: HTTP-only, Secure, SameSite=Lax

## Logging

All authentication events are logged to `audit_logs` table:

```
Event: user.login (local credentials)
  ✓ Success: Details include user email, role, provider
  ✗ Failed: Details include reason (invalid_credentials, etc)

Event: user.login (Okta OAuth)
  ✓ Success: Details include Okta provider ID, role
  ✗ Errors caught and logged (non-blocking)

Event: config.okta.update
  Changes: Before/after Okta configuration
  User: Admin who made the change
```

## Testing Checklist

- [ ] Local sign-in works with default credentials
- [ ] Invalid credentials rejected properly
- [ ] Okta button appears when configured
- [ ] Okta sign-in redirects to Okta login
- [ ] User created in federated_users table after Okta sign-in
- [ ] Session contains correct role
- [ ] Role-restricted pages/APIs reject non-authorized users
- [ ] Admin can change user roles
- [ ] Sessions persist across page reloads
- [ ] Logout clears session
- [ ] Audit logs record all auth events

## Troubleshooting

### "Not authenticated" error
- Check NEXTAUTH_SECRET is set
- Verify session cookies are not blocked in browser
- Check `session.user` in component (may be undefined on first render)

### Okta button not showing
- See `OKTA_SETUP_GUIDE.md`
- Check `/api/okta-configured` returns `{ configured: true }`
- Verify Supabase connection

### Cannot sign in with Okta
- Check Okta app redirect URIs include your app URL
- Verify OKTA_CLIENT_ID, OKTA_CLIENT_SECRET, OKTA_ISSUER are correct
- Check browser console for errors during redirect

### Session lost after page reload
- Check browser storage quota
- Check cookies are not being cleared
- Verify NEXTAUTH_URL matches current deployment domain

## References

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Okta OAuth 2.0 Documentation](https://developer.okta.com/docs/guides/implement-grant-type/authcode/main/)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
