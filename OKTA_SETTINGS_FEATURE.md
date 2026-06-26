# Okta Settings Display Feature

## Overview
Implemented automatic loading and display of current Okta OAuth configuration when admins access the Okta Integration settings tab.

## Implementation Summary

### 1. API Endpoint (`/app/api/okta-settings/route.ts`)
Created a new GET endpoint that:
- Requires admin authentication
- Reads current Okta configuration from environment variables
- Masks the client secret for security (shows only last 4 characters)
- Returns configuration status

**Response Format:**
```json
{
  "success": true,
  "settings": {
    "clientId": "0oa1234567890abcdef",
    "clientSecret": "••••••••••••xyz9",
    "issuer": "https://dev-123456.okta.com/oauth2/default",
    "isConfigured": true
  }
}
```

### 2. Settings Page Updates (`/app/settings/page.tsx`)

#### State Management
Added new state variables:
- `oktaLoading` - Tracks loading state while fetching settings
- Updated `oktaSettings` initialization to empty strings (loaded dynamically)

#### Auto-Loading Logic
```typescript
useEffect(() => {
  if (activeTab === 'okta') {
    loadOktaSettings();
  }
}, [activeTab]);
```

The `loadOktaSettings()` function:
- Fetches current configuration from `/api/okta-settings`
- Updates form fields with loaded values
- Handles errors gracefully

#### UI Enhancements
- Shows "Loading current settings..." message while fetching
- Displays loaded Client ID, Issuer URL, and masked Client Secret
- Shows helpful note: "Current secret is masked for security. Enter a new value to update it."
- Form fields are pre-populated with current values

### 3. Security Features

#### Client Secret Masking
- Full secret never exposed through API
- Only last 4 characters visible: `••••••••••••xyz9`
- Helps admins verify which credential is configured
- Requires re-entry of full secret to update

#### Authorization
- Endpoint restricted to admin users only
- Returns 401 Unauthorized for non-admin access
- Validates session before returning sensitive data

### 4. User Experience Flow

1. **Admin navigates to Settings > Okta Integration**
2. **Loading state appears** (brief)
3. **Form fields populate** with current values:
   - Client ID: Full value from `OKTA_CLIENT_ID`
   - Client Secret: Masked (e.g., `••••••••••••abc123`)
   - Issuer URL: Full value from `OKTA_ISSUER`
4. **Admin can review** current configuration
5. **To update**: Admin enters new values and clicks "Save Configuration"

### 5. Benefits

✅ **Better Admin Experience**
- No need to remember or look up current Client ID
- No need to remember Issuer URL
- Can verify configuration at a glance

✅ **Security Maintained**
- Client secret never fully exposed
- Masking helps verify without compromising security
- Admin authentication required

✅ **Configuration Validation**
- Admins can see if Okta is configured
- Easy to verify correct Issuer URL format
- Prevents accidental overwrites with wrong values

## Testing

### Manual Test Steps:
1. Set Okta environment variables in `.env.local`:
   ```env
   OKTA_CLIENT_ID=0oa1234567890
   OKTA_CLIENT_SECRET=supersecretvalue
   OKTA_ISSUER=https://dev-123.okta.com/oauth2/default
   ```

2. Start application and log in as admin

3. Navigate to Settings > Okta Integration tab

4. Verify:
   - Form fields show current Client ID
   - Client Secret shows as masked: `••••••••••••alue`
   - Issuer URL shows current value
   - Note appears: "Current secret is masked for security..."

5. Test update:
   - Change Client ID or Issuer
   - Enter new Client Secret
   - Click "Save Configuration"
   - Verify success message appears

### API Test:
```bash
# Should return 401 (not authenticated)
curl http://localhost:3000/api/okta-settings

# Should return 401 (viewer role)
curl -H "Cookie: next-auth.session-token=<viewer-token>" \
  http://localhost:3000/api/okta-settings

# Should return 200 with settings (admin role)
curl -H "Cookie: next-auth.session-token=<admin-token>" \
  http://localhost:3000/api/okta-settings
```

## Files Modified

1. **New File**: `/app/api/okta-settings/route.ts`
   - GET endpoint for fetching Okta configuration
   - Admin authorization check
   - Client secret masking logic

2. **Modified**: `/app/settings/page.tsx`
   - Added `oktaLoading` state
   - Added `loadOktaSettings()` function
   - Added useEffect to auto-load on tab change
   - Updated form to show loading state
   - Added masked secret helper text

3. **Modified**: `/CLAUDE.md`
   - Added Okta Settings Management section
   - Documented API endpoint and security considerations

## Future Enhancements

Potential improvements:
- [ ] Add ability to test Okta connection before saving
- [ ] Show connection status indicator (connected/disconnected)
- [ ] Add validation for Issuer URL format
- [ ] Support updating .env.local file directly (with proper permissions)
- [ ] Add audit log for Okta configuration changes

---
**Status**: ✅ Implemented and Tested
**Version**: 1.0
**Date**: 2025-06-17
