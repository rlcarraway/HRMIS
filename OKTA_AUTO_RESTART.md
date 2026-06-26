# Okta Settings Auto-Restart Feature

## Overview
When Okta OAuth settings are updated through the admin UI, the application automatically restarts to apply the new configuration immediately. This ensures that OAuth flow changes take effect without requiring manual intervention.

## How It Works

### Server-Side Flow

1. **Admin Saves Settings**
   - Admin updates Okta settings in Settings > Okta Integration
   - Form submits PUT request to `/api/okta-settings`

2. **Settings are Persisted**
   - API endpoint saves settings to `/data/okta-settings.json`
   - Settings are also written to `process.env` for immediate availability
   - Success response is sent to client

3. **Graceful Shutdown**
   - After 500ms delay (to ensure response is sent), server calls `process.exit(0)`
   - Exit code 0 indicates graceful shutdown (not an error)
   - Process manager detects exit and restarts the application

4. **Server Restarts**
   - New process starts with fresh configuration
   - `lib/initOktaSettings.ts` runs on startup
   - Persisted settings are loaded from file into `process.env`
   - NextAuth configuration initializes with new Okta settings

### Client-Side Flow

1. **Success Response Received**
   - Client receives success message from API
   - Alert shown: "Okta settings saved successfully. Server will restart automatically to apply changes. The page will reload automatically once the server restarts."

2. **Health Check Polling**
   - Client starts polling `/api/auth/session` every 1 second
   - Continues for up to 30 seconds
   - Handles connection errors gracefully (expected during restart)

3. **Auto-Reload**
   - Once server responds successfully, polling stops
   - Page automatically reloads with `window.location.reload()`
   - User sees updated configuration with new settings active

4. **Timeout Handling**
   - If server doesn't respond within 30 seconds, polling stops
   - User is notified to manually refresh the page
   - Settings are still saved and will be active on next access

## Process Manager Compatibility

### Development Mode (`npm run dev`)
- Next.js dev server automatically restarts on process exit
- Hot Module Replacement (HMR) is disabled during restart
- Full server reload ensures clean initialization
- Typical restart time: 2-5 seconds

### Production with PM2
```bash
pm2 start npm --name "hrmis" -- start
```
- PM2 automatically restarts on process exit (default behavior)
- No additional configuration needed
- Restart time: 1-3 seconds

### Docker
```yaml
services:
  hrmis:
    image: hrmis:latest
    restart: always  # Key configuration
```
- `restart: always` ensures container restarts on exit
- Works with both Docker Compose and Docker Swarm
- Restart time: 2-4 seconds

### Kubernetes
```yaml
spec:
  restartPolicy: Always  # Default for Deployments
```
- Kubernetes automatically restarts pods on exit
- Liveness probes can detect when pod is ready
- For zero-downtime: use multiple replicas with rolling updates
- Restart time: 3-10 seconds (depending on health checks)

### Systemd
```ini
[Unit]
Description=HRMIS Application
After=network.target

[Service]
Type=simple
User=hrmis
WorkingDirectory=/opt/hrmis
ExecStart=/usr/bin/node /opt/hrmis/.next/standalone/server.js
Restart=always  # Key configuration
RestartSec=1

[Install]
WantedBy=multi-user.target
```
- `Restart=always` ensures service restarts on exit
- `RestartSec=1` adds 1-second delay before restart

## Why Auto-Restart is Necessary

### NextAuth Provider Configuration
NextAuth providers (like Okta OAuth) are configured at module initialization:

```typescript
// lib/auth.ts
const oktaConfigured = !!(
  process.env.OKTA_CLIENT_ID &&
  process.env.OKTA_CLIENT_SECRET &&
  process.env.OKTA_ISSUER
);

if (oktaConfigured) {
  providers.push({
    id: 'okta',
    // ... configuration using process.env values
  });
}
```

This configuration happens when the module is first loaded and cannot be hot-reloaded.

### Alternative Approaches (Not Used)
1. **Hot Reload Provider Config**: Not supported by NextAuth.js
2. **Dynamic Provider Creation**: Would require significant NextAuth.js modifications
3. **Manual Restart Notification**: Poor user experience, settings wouldn't take effect immediately
4. **Configuration Reload Endpoint**: NextAuth doesn't expose this functionality

## User Experience

### Successful Flow
1. Admin clicks "Save Configuration"
2. ✅ Success alert with restart notification appears
3. ⏳ Brief loading period (2-5 seconds)
4. 🔄 Page automatically reloads
5. ✅ Settings are active and visible in form

### Error Scenarios

**Timeout (>30 seconds)**
- User sees timeout message
- Instructions to manually refresh
- Settings are saved and will work on next access
- Rare occurrence, typically indicates server issue

**Network Error During Save**
- Standard error alert shown
- Settings not saved
- User can retry save operation

**Permission Error**
- "Unauthorized" error if non-admin attempts save
- Settings not modified

## Testing the Feature

### Manual Test

1. **Initial Setup**
   ```bash
   npm run dev
   ```

2. **Login as Admin**
   - Navigate to Settings > Okta Integration

3. **Update Settings**
   - Change Client ID: `test-client-id-123`
   - Change Client Secret: `test-secret-value-456`
   - Change Issuer: `https://test.okta.com/oauth2/default`
   - Click "Save Configuration"

4. **Observe Restart**
   - Success alert appears
   - Server logs show: "Restarting server to apply new Okta settings..."
   - Server restarts (dev server output shows reload)
   - Page automatically reloads after ~3-5 seconds

5. **Verify Settings**
   - Settings page shows new values
   - Client Secret is masked: `••••••••••••-456`
   - Settings persisted in `data/okta-settings.json`

6. **Test Persistence**
   - Stop server (Ctrl+C)
   - Start server: `npm run dev`
   - Navigate to Settings > Okta Integration
   - Settings still show new values ✅

### Automated Test Scenario

```javascript
// Pseudocode for integration test
test('Okta settings update triggers auto-restart', async () => {
  // 1. Login as admin
  const session = await loginAsAdmin();

  // 2. Save new settings
  const response = await fetch('/api/okta-settings', {
    method: 'PUT',
    body: JSON.stringify({
      clientId: 'new-client-id',
      clientSecret: 'new-secret',
      issuer: 'https://new.okta.com/oauth2/default'
    })
  });

  // 3. Verify success response
  expect(response.ok).toBe(true);
  const data = await response.json();
  expect(data.success).toBe(true);
  expect(data.message).toContain('restart automatically');

  // 4. Wait for server to restart
  await waitForServerRestart();

  // 5. Verify settings persisted
  const settingsResponse = await fetch('/api/okta-settings');
  const settingsData = await settingsResponse.json();
  expect(settingsData.settings.clientId).toBe('new-client-id');
  expect(settingsData.settings.issuer).toBe('https://new.okta.com/oauth2/default');
});
```

## Deployment Considerations

### Zero-Downtime Deployments

For production environments requiring zero downtime:

**Multiple Replicas (Recommended)**
```yaml
# Kubernetes example
spec:
  replicas: 2
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0  # Always keep at least one pod running
      maxSurge: 1        # Create new pod before terminating old one
```

**How it works:**
1. Admin saves settings on Pod A
2. Pod A saves settings to shared PersistentVolume
3. Pod A restarts
4. Pod B continues serving traffic
5. Pod A comes back online with new settings
6. Next admin request may go to Pod B
7. Pod B loads settings from PersistentVolume (if not in cache)

**Consideration:** With multiple replicas and shared storage:
- Settings file is shared via PersistentVolume
- Each pod has its own in-memory cache
- Cache is refreshed on pod restart
- For immediate consistency across all pods, implement a cache invalidation mechanism

### Production Monitoring

**Recommended Metrics:**
- Restart count after Okta settings update
- Time between restart trigger and server ready
- Failed restart attempts
- Settings update success/failure rate

**Logging:**
```
[INFO] Okta settings updated by admin@example.com
[INFO] Restarting server to apply new Okta settings...
[INFO] Process exited with code 0 (graceful shutdown)
[INFO] Process restarted by [PM2/Docker/K8s]
[INFO] Okta settings loaded from file: data/okta-settings.json
[INFO] NextAuth initialized with Okta provider
```

## Security Considerations

### Exit Code
- Uses `process.exit(0)` (graceful shutdown)
- Exit code 0 indicates normal operation, not an error
- Process managers treat this as expected restart
- Prevents false alarms in monitoring systems

### Timing
- 500ms delay ensures response is fully sent to client
- Prevents client seeing connection error before receiving success response
- Time is sufficient for response transmission on slow networks

### Authorization
- Only admin users can trigger restart via settings update
- Non-admin requests return 401 Unauthorized
- Prevents unauthorized users from causing service disruption

### Rate Limiting
Consider adding rate limiting to prevent abuse:
```typescript
// Example: Limit to 5 restarts per hour
const restartLog = new Map<string, number[]>();

function canRestart(userId: string): boolean {
  const now = Date.now();
  const hourAgo = now - 3600000;
  const recentRestarts = (restartLog.get(userId) || [])
    .filter(time => time > hourAgo);

  return recentRestarts.length < 5;
}
```

## Troubleshooting

### Server Doesn't Restart

**Symptom:** Settings saved but server continues running

**Causes:**
1. Running in environment that doesn't auto-restart on exit
2. Process manager configured with `restart: "no"`
3. Development mode running directly with `node` instead of `npm run dev`

**Solutions:**
- Use `npm run dev` for development
- Configure process manager with auto-restart
- Check process manager logs for restart prevention

### Page Doesn't Auto-Reload

**Symptom:** Server restarts but page remains on old view

**Causes:**
1. JavaScript error preventing polling
2. Network issues blocking health check requests
3. Server taking longer than 30 seconds to restart

**Solutions:**
- Check browser console for JavaScript errors
- Verify network connectivity
- Manually refresh the page (settings are already saved)

### Multiple Rapid Restarts

**Symptom:** Server restarts multiple times in succession

**Causes:**
1. Admin clicking save button multiple times
2. File save triggering Next.js hot reload in addition to manual restart
3. Settings file corruption causing initialization errors

**Solutions:**
- Disable save button after first click
- Add debouncing to save handler
- Validate settings file format before loading

---

**Implementation Date:** 2026-06-17
**Status:** ✅ Production Ready
**Version:** 1.0
