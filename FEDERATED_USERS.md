# Federated User Management

## Overview

The HRMIS application now automatically records and manages users who authenticate through Okta (federated users). When a user logs in via Okta for the first time, their account is created in the system and can be managed by administrators.

## How It Works

### Automatic User Creation

1. **First Login**: When a user successfully authenticates through Okta for the first time, their information is automatically saved to the system
2. **Default Role**: New federated users are assigned the **Viewer** role by default
3. **Persistent Storage**: User information is stored in `/data/federated-users.json`
4. **Tracked Information**:
   - User ID (internal)
   - Name
   - Email address
   - Role (admin or viewer)
   - Provider (okta)
   - Provider ID (Okta sub claim)
   - Created timestamp
   - Last updated timestamp
   - Last login timestamp

### Role Updates

When a federated user logs in again:
- Their last login timestamp is updated
- Their existing role is preserved (if admin promoted them, they remain admin)
- Their profile information (name, email) is updated if changed in Okta

## User Management Interface

Administrators can manage all users (both local and federated) through the Settings page:

### Accessing User Management

1. Log in as an admin user
2. Navigate to **Settings** → **Users** tab
3. View all users in the system

### Managing Federated Users

The Users tab displays:
- **Name**: User's full name from Okta
- **Email**: User's email address
- **Type**: "Federated (okta)" badge for Okta users, "Local" for manually created users
- **Role**: Dropdown to change between Admin and Viewer
- **Last Login**: Timestamp of most recent login
- **Actions**: Delete button

#### Changing User Roles

1. Find the user in the list
2. Use the **Role** dropdown to select:
   - **Admin**: Full access to manage employees, attributes, settings, and users
   - **Viewer**: Read-only access to employee data
3. Role change takes effect immediately
4. User will have new permissions on their next request

#### Deleting Federated Users

1. Click the trash icon in the Actions column
2. Confirm the deletion
3. **Note**: If the user logs in through Okta again, their account will be recreated with the default Viewer role

## API Endpoints

### Get All Federated Users
```
GET /api/federated-users
```

**Authorization**: Admin only

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "federated-1234567890-abc123",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "viewer",
      "provider": "okta",
      "providerId": "00u1a2b3c4d5e6f7g8h9",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-16T14:20:00.000Z",
      "lastLoginAt": "2024-01-16T14:20:00.000Z"
    }
  ],
  "count": 1
}
```

### Get Single Federated User
```
GET /api/federated-users/{id}
```

**Authorization**: Admin only

### Update Federated User Role
```
PATCH /api/federated-users/{id}
```

**Authorization**: Admin only

**Request Body**:
```json
{
  "role": "admin"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "federated-1234567890-abc123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "admin",
    "provider": "okta",
    "providerId": "00u1a2b3c4d5e6f7g8h9",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-16T14:25:00.000Z",
    "lastLoginAt": "2024-01-16T14:20:00.000Z"
  },
  "message": "User role updated successfully"
}
```

### Delete Federated User
```
DELETE /api/federated-users/{id}
```

**Authorization**: Admin only

**Response**:
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

## Data Storage

### File Location
Federated users are stored in:
```
/data/federated-users.json
```

### Data Structure
```json
[
  {
    "id": "federated-1234567890-abc123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "viewer",
    "provider": "okta",
    "providerId": "00u1a2b3c4d5e6f7g8h9",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-16T14:20:00.000Z",
    "lastLoginAt": "2024-01-16T14:20:00.000Z"
  }
]
```

## Authentication Flow

### Login Process with Federated User Tracking

1. User clicks "Sign in with Okta"
2. User is redirected to Okta for authentication
3. User authenticates with Okta credentials
4. Okta redirects back with authorization code
5. Application exchanges code for access token
6. **Application calls profile callback**:
   - Extracts user info from Okta profile (sub, email, name)
   - Calls `createOrUpdateFederatedUser()` to save/update user
   - Returns user object with saved role
7. **JWT callback receives user**:
   - Fetches latest role from storage (in case admin updated it)
   - Sets role in JWT token
8. User session is created with correct role
9. User is redirected to dashboard

### Subsequent Logins

1-5. Same as above
6. **Application updates existing record**:
   - Finds existing user by provider ID (sub claim)
   - Updates last login timestamp
   - Updates name/email if changed in Okta
   - **Preserves existing role** (doesn't reset to viewer)
7-9. Same as above

## Security Considerations

### Role Persistence
- Federated user roles are stored separately from Okta
- Okta profile does NOT control HRMIS roles
- Only HRMIS admins can change federated user roles
- Roles persist across logins

### Provider ID Mapping
- Users are uniquely identified by Okta's `sub` claim (provider ID)
- Even if email changes in Okta, the same user record is maintained
- Prevents duplicate accounts if user email is updated

### Admin Protection
- At least one admin must exist in the system
- Local admin accounts provide backup access if Okta is unavailable

## Migration from Local to Federated

If you have existing local users and want to enable Okta:

1. **Keep Local Accounts**: Local accounts continue to work alongside Okta
2. **Admin Setup**: Ensure at least one local admin exists as backup
3. **Promote Federated Users**: After users log in via Okta, promote trusted users to admin
4. **Delete Local Accounts**: Optionally remove local accounts once federated users are established

## Troubleshooting

### User Not Created After Okta Login

**Check**:
1. Authentication completed successfully (no error page)
2. Check `/data/federated-users.json` exists and is writable
3. Check server logs for errors during profile callback

### User Has Wrong Role

**Check**:
1. Verify role in Settings → Users tab
2. User must log out and log back in for role changes to take effect
3. Check JWT callback is fetching latest role from storage

### Can't Change Federated User Role

**Check**:
1. You are logged in as an admin
2. API endpoint `/api/federated-users/{id}` is accessible
3. Check browser console for errors

### Deleted User Keeps Coming Back

This is expected behavior:
- Deleting a federated user removes them from HRMIS
- If they log in via Okta again, a new account is created
- New account will have default Viewer role
- To permanently block access, remove user from Okta application assignment

## Best Practices

### Role Assignment Strategy

1. **Default to Viewer**: All new federated users start as viewers
2. **Promote as Needed**: Admins manually promote trusted users
3. **Regular Audits**: Periodically review user list and roles
4. **Least Privilege**: Only grant admin to users who need it

### User Lifecycle

1. **Onboarding**:
   - New employee logs in via Okta → Viewer role created
   - Admin reviews and promotes if needed

2. **Role Changes**:
   - Employee promoted → Admin updates role in HRMIS
   - Role takes effect on next login

3. **Offboarding**:
   - Remove from Okta application (prevents login)
   - Optionally delete from HRMIS Users tab
   - Employee data remains intact

### Backup Access

Always maintain at least one local admin account:
- Provides access if Okta is unavailable
- Allows emergency access during configuration issues
- Default admin@example.com account serves this purpose

## Related Documentation

- **OKTA_PERSISTENCE.md**: Okta settings storage and configuration
- **OKTA_AUTO_RESTART.md**: Automatic restart after settings changes
- **OKTA_POLICY_TROUBLESHOOTING.md**: Troubleshooting Okta authentication issues
- **CLAUDE.md**: Complete application documentation

---
**Created**: 2026-06-17
**Last Updated**: 2026-06-17
**Status**: Active Feature
