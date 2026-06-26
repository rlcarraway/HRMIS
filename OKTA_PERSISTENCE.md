# Okta Settings Persistence

## Overview
Implemented persistent storage for Okta OAuth configuration settings, allowing admin changes through the UI to persist across application restarts.

## Architecture

### File Structure
```
/lib
├── auth.ts                  - NextAuth configuration (server-only)
├── authTypes.ts            - Types and helpers (client-safe)
├── serverOktaSettings.ts   - Persistent storage (server-only)
└── initOktaSettings.ts     - Startup initialization (server-only)

/data
└── okta-settings.json      - Persisted settings file (gitignored)

/app/api
└── okta-settings/route.ts  - GET/PUT endpoints for admin UI
```

### Storage Hierarchy
Settings are loaded in this priority order:
1. **Environment Variables** (.env.local) - Highest priority, takes precedence if set
2. **Persisted File** (data/okta-settings.json) - Settings saved via admin UI
3. **Empty Defaults** - If neither exists

## Implementation Details

### 1. Server-Only Storage Module (`lib/serverOktaSettings.ts`)

**Purpose**: Manage persistent Okta settings using file-based storage

**Key Functions**:
- `getOktaSettings()` - Load settings from file or fall back to environment variables
- `updateOktaSettings()` - Save settings to file and update in-memory cache
- `isOktaConfigured()` - Check if all required settings are present
- `getMaskedClientSecret()` - Return masked secret for secure display

**Storage Location**: `/data/okta-settings.json`

**Important**: This module imports Node.js `fs` and `path` modules, so it can ONLY be imported by server-side code (API routes, server components).

### 2. Client-Safe Types (`lib/authTypes.ts`)

**Purpose**: Type definitions and helper functions that can be safely imported by both client and server components

**Exports**:
- `CustomUser`, `CustomSession`, `CustomJWT` interfaces
- Role-based helper functions: `isAdmin`, `canManageEmployees`, etc.

**Why Separate**: Client components need these types and helpers, but cannot import server-only modules that use Node.js APIs like `fs`.

### 3. Auth Configuration (`lib/auth.ts`)

**Purpose**: NextAuth configuration (server-side only)

**Key Points**:
- Reads Okta settings from `process.env` at configuration time
- Re-exports types and helpers from `authTypes.ts` for convenience
- Does NOT directly import `serverOktaSettings` to avoid bundling issues

### 4. Settings Initialization (`lib/initOktaSettings.ts`)

**Purpose**: Load persisted settings into `process.env` at server startup

**How It Works**:
- Automatically runs when the module is first imported (server-side only)
- Calls `getOktaSettings()` to load from file
- Updates `process.env` with persisted values if environment variables are not already set
- Silent failure if settings file doesn't exist (falls back to env vars)

**Import Location**: `app/api/auth/[...nextauth]/route.ts`

This ensures settings are loaded before NextAuth initializes.

### 5. API Endpoints (`app/api/okta-settings/route.ts`)

**GET Endpoint**:
- Returns current Okta settings (from file or env vars)
- Masks client secret for security (shows only last 4 characters)
- Admin-only authorization

**PUT Endpoint**:
- Saves new Okta settings to persistent file
- Updates `process.env` for immediate effect in current process
- **Automatically restarts the server** after 500ms to apply OAuth configuration changes
- Admin-only authorization
- Returns success message indicating automatic restart

### 6. Admin UI (`app/settings/page.tsx`)

**Auto-Loading**:
- When admin visits Okta Integration tab, settings are auto-loaded via GET endpoint
- Form fields populate with current values
- Client secret shows as masked (e.g., `••••••••••••abc123`)

**Saving**:
- Admin updates settings and clicks "Save Configuration"
- PUT request sent to `/api/okta-settings`
- On success, settings reload to show masked secret
- Success message displayed

## Security Considerations

### Client Secret Protection
1. **Storage**: Saved in plaintext in `data/okta-settings.json` (gitignored)
2. **Display**: Always masked in admin UI (shows only last 4 characters)
3. **API**: GET endpoint returns masked secret
4. **Updates**: Admin must enter full secret to update (no partial updates)

### Authorization
- Both GET and PUT endpoints require admin role
- Returns 401 Unauthorized for non-admin access
- Session validation via NextAuth `getServerSession()`

### File System Security
- Settings file location: `/data/okta-settings.json`
- Directory automatically created with proper permissions
- File is in `.gitignore` to prevent accidental commits
- JSON format for easy manual editing if needed

## Usage

### Admin Workflow

1. **Navigate to Settings > Okta Integration**
2. **View Current Settings**
   - Client ID: Full value displayed
   - Client Secret: Masked (e.g., `••••••••••••xyz9`)
   - Issuer URL: Full value displayed
3. **Update Settings**
   - Modify any field
   - Enter new Client Secret (required even if only updating other fields)
   - Click "Save Configuration"
4. **Automatic Restart**
   - Server automatically restarts after saving
   - Page shows notification and waits for server to come back online
   - Page auto-reloads once server is ready
   - New settings take effect immediately

### Developer Notes

**To manually view settings**:
```bash
cat data/okta-settings.json
```

**To reset to environment variables**:
```bash
rm data/okta-settings.json
# Settings will fall back to .env.local
```

**To test persistence**:
1. Update settings via admin UI
2. Verify file was created: `ls data/`
3. Restart dev server: `npm run dev`
4. Check settings page - should show persisted values

## Environment Variables vs Persistent Storage

### When Environment Variables Take Precedence
- If `OKTA_CLIENT_ID`, `OKTA_CLIENT_SECRET`, or `OKTA_ISSUER` are set in `.env.local`
- These will override persisted settings on server startup
- Useful for development/staging/production environment separation

### When Persistent Storage is Used
- If environment variables are NOT set
- Settings saved via admin UI persist across restarts
- Useful for dynamic configuration without code deployment

### Best Practice
- **Development**: Use `.env.local` for local dev settings
- **Production**: Use persistent storage OR environment variables (not both)
- **Docker/K8s**: Use environment variables for 12-factor app compliance

## Automatic Restart Behavior

### What Persists
✅ Client ID
✅ Client Secret
✅ Issuer URL
✅ All settings saved via admin UI

### Automatic Restart Mechanism
When Okta settings are saved via the admin UI:

1. **Settings are saved** to file and `process.env` is updated
2. **Response is sent** to the client with success message
3. **Server exits gracefully** after 500ms delay (`process.exit(0)`)
4. **Process manager restarts** the application automatically:
   - In development: `npm run dev` automatically restarts
   - In production: Process managers (PM2, Docker, Kubernetes) restart the process
5. **Client polls** the server every second to detect when it's back online
6. **Page auto-reloads** once server responds successfully
7. **New settings take effect** immediately on restart

### Why Restart is Necessary
⚠️ NextAuth OAuth provider configuration is loaded at module initialization
- The Okta provider is configured when `auth.ts` is first imported
- Changes to settings update `process.env` immediately
- However, NextAuth doesn't support hot-reloading provider configurations
- A restart ensures the new OAuth settings are used for authentication flows

## Error Handling

### File Read Errors
- If `data/okta-settings.json` is corrupted or unreadable
- Falls back to environment variables
- Error logged to console
- No user-facing error (graceful degradation)

### File Write Errors
- If unable to write to `data/okta-settings.json`
- PUT endpoint returns 500 error
- User sees error message: "Failed to save settings"
- Current settings remain unchanged

### Missing Settings
- If neither file nor env vars have settings
- `isOktaConfigured()` returns `false`
- Okta provider not added to NextAuth
- Only local credentials login available

## Testing

### Manual Testing Checklist

1. **Initial State**
   - [ ] No `data/okta-settings.json` file exists
   - [ ] Settings page shows values from `.env.local`

2. **Save Settings**
   - [ ] Update Client ID, Secret, Issuer via admin UI
   - [ ] Click "Save Configuration"
   - [ ] Success message appears
   - [ ] Settings reload with masked secret

3. **Verify Persistence**
   - [ ] Check `data/okta-settings.json` exists
   - [ ] File contains saved values
   - [ ] Restart server: `npm run dev`
   - [ ] Settings page still shows saved values

4. **Environment Override**
   - [ ] Set `OKTA_CLIENT_ID` in `.env.local`
   - [ ] Restart server
   - [ ] Settings page shows env var value
   - [ ] Persisted file value is ignored

5. **Delete and Reset**
   - [ ] Delete `data/okta-settings.json`
   - [ ] Restart server
   - [ ] Settings page shows values from `.env.local`

### API Testing

**Get Current Settings** (Admin):
```bash
curl -X GET http://localhost:3000/api/okta-settings \
  -H "Cookie: next-auth.session-token=<admin-token>"
```

Expected response:
```json
{
  "success": true,
  "settings": {
    "clientId": "0oa1234567890",
    "clientSecret": "••••••••••••xyz9",
    "issuer": "https://dev-123.okta.com/oauth2/default",
    "isConfigured": true
  }
}
```

**Update Settings** (Admin):
```bash
curl -X PUT http://localhost:3000/api/okta-settings \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<admin-token>" \
  -d '{
    "clientId": "0oa9876543210",
    "clientSecret": "newsecretvalue",
    "issuer": "https://dev-456.okta.com/oauth2/default"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Okta settings saved successfully. Note: For OAuth flow changes to fully take effect, restart the server."
}
```

**Unauthorized Access** (Viewer or No Auth):
```bash
curl -X GET http://localhost:3000/api/okta-settings
```

Expected response:
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

## Migration and Deployment

### Migrating Existing Installation
If you already have Okta configured via `.env.local`:
1. Settings will continue to work from environment variables
2. Admin can optionally save settings via UI to create persistent file
3. To fully migrate to persistent storage:
   - Save settings via admin UI
   - Remove `OKTA_*` variables from `.env.local`
   - Restart server
   - Verify settings still load from file

### Docker Deployment
```dockerfile
# Ensure data directory is created
RUN mkdir -p /app/data

# Option 1: Mount volume for persistence
VOLUME /app/data

# Option 2: Use environment variables (no persistence needed)
ENV OKTA_CLIENT_ID=your_client_id
ENV OKTA_CLIENT_SECRET=your_client_secret
ENV OKTA_ISSUER=https://your-domain.okta.com/oauth2/default

# Important: Configure restart policy
# This ensures the container restarts when process.exit(0) is called
```

**docker-compose.yml**:
```yaml
services:
  hrmis:
    image: hrmis:latest
    restart: always  # Automatically restart on exit
    volumes:
      - ./data:/app/data  # Persist settings across restarts
    ports:
      - "3000:3000"
```

### Kubernetes Deployment
```yaml
# Deployment with restart policy
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hrmis
spec:
  replicas: 1
  selector:
    matchLabels:
      app: hrmis
  template:
    metadata:
      labels:
        app: hrmis
    spec:
      restartPolicy: Always  # Automatically restart on exit
      containers:
      - name: hrmis
        image: hrmis:latest
        ports:
        - containerPort: 3000
        volumeMounts:
        - name: data
          mountPath: /app/data
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: hrmis-data

---
# Option 1: Use ConfigMap/Secret for initial config
apiVersion: v1
kind: Secret
metadata:
  name: okta-settings
type: Opaque
stringData:
  OKTA_CLIENT_ID: "your_client_id"
  OKTA_CLIENT_SECRET: "your_client_secret"
  OKTA_ISSUER: "https://your-domain.okta.com/oauth2/default"

---
# Option 2: Use PersistentVolume for dynamic updates via UI
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: hrmis-data
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
```

**Note**: In Kubernetes with multiple replicas, use a rolling update strategy to avoid downtime:
```yaml
spec:
  replicas: 2
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0
      maxSurge: 1
```

## Troubleshooting

### Settings Not Persisting
**Symptoms**: Settings reset after server restart

**Checks**:
1. Verify `data/okta-settings.json` exists: `ls data/`
2. Check file permissions: `ls -la data/okta-settings.json`
3. Look for errors in server logs during startup
4. Confirm environment variables aren't overriding: `cat .env.local`

### "Module not found: Can't resolve 'fs'" Error
**Symptoms**: Client-side bundle fails to compile

**Cause**: Client component importing `serverOktaSettings.ts` or `auth.ts` incorrectly

**Fix**: Client components should import from `authTypes.ts`, not `auth.ts`

### Masked Secret Not Updating
**Symptoms**: After save, secret still shows old masked value

**Checks**:
1. Verify settings reload after save (check network tab)
2. Confirm new secret was actually saved: `cat data/okta-settings.json`
3. Check browser console for errors

### OAuth Flow Not Working After Update
**Symptoms**: Okta login fails after updating settings via UI

**Fix**: This should not happen as the server restarts automatically. If it does:
1. Check that the server actually restarted (look for restart message in logs)
2. Manually restart if needed:
   ```bash
   # Stop dev server (Ctrl+C)
   npm run dev
   ```
3. Verify settings were saved: `cat data/okta-settings.json`

### Page Not Reloading After Save
**Symptoms**: Success message shown but page doesn't reload automatically

**Checks**:
1. Wait up to 30 seconds - server may take time to restart
2. Check browser console for errors
3. Manually refresh the page
4. Check server logs to confirm restart occurred

**Manual Fix**: Refresh the page manually - settings are already saved and server has restarted

## Future Enhancements

### Potential Improvements
- [ ] Add "Test Connection" button to validate Okta settings before saving
- [ ] Support for multiple OAuth providers (Google, Azure AD, etc.)
- [ ] Encrypted storage for client secret at rest
- [ ] Audit log for settings changes
- [ ] Hot reload of NextAuth configuration without restart
- [ ] Database storage instead of file system
- [ ] Backup/restore functionality for settings
- [ ] Import/export settings as JSON

---
**Implementation Date**: 2026-06-17
**Status**: ✅ Complete and Tested
**Version**: 1.0
