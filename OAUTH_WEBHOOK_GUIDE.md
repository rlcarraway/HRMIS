# OAuth Webhook Authentication Guide

## Overview

The HRMIS export scheduler now supports OAuth 2.0 Client Credentials flow for webhook authentication. This allows scheduled exports to securely call APIs that require OAuth access tokens.

## Features

- **OAuth 2.0 Client Credentials Flow**: Automatic token acquisition using client ID and secret
- **Token Caching**: Tokens are cached with automatic expiry handling (5-minute buffer before expiry)
- **Secure Storage**: OAuth credentials are stored with the schedule configuration
- **Automatic Retry**: If token acquisition fails, the webhook call is skipped and logged

## Configuration

### 1. Setting Up OAuth for a Webhook

When creating or editing an export schedule:

1. Enter the **Webhook URL** (the API endpoint to call)
2. Click **"+ Add OAuth Authentication"**
3. Fill in the OAuth configuration:
   - **Client ID**: Your OAuth client identifier
   - **Client Secret**: Your OAuth client secret (stored securely)
   - **Token URL**: The OAuth token endpoint (e.g., `https://auth.example.com/oauth/token`)
   - **Scope** (optional): Space-separated scopes if required by the API

### 2. OAuth Flow

When an export completes, the system:

1. Checks if OAuth is configured for the webhook
2. Checks the token cache for a valid, non-expired token
3. If no cached token or expired:
   - Makes a POST request to the token URL
   - Uses Basic Authentication with Base64-encoded `client_id:client_secret`
   - Sends `grant_type=client_credentials` in the request body
   - Caches the received access token with expiry time
4. Calls the webhook URL with the access token in the Authorization header

### 3. Token Request Format

The system sends the following request to the token URL:

```http
POST /oauth/token HTTP/1.1
Host: auth.example.com
Content-Type: application/x-www-form-urlencoded
Authorization: Basic <base64(client_id:client_secret)>

grant_type=client_credentials&scope=read%20write
```

Expected response:

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "read write"
}
```

### 4. Webhook Request Format

The webhook is called with the access token:

```http
POST /webhook HTTP/1.1
Host: example.com
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
User-Agent: HRMIS-Export-Scheduler/1.0

{
  "scheduleId": "abc-123",
  "scheduleName": "Daily Export",
  "executedAt": "2024-01-15T09:00:00.000Z",
  "success": true,
  "employeeCount": 150,
  "filename": "export-full-Daily-Export-2024-01-15T09-00-00.csv",
  "exportType": "full",
  "filepath": "/path/to/exports/export-full-Daily-Export-2024-01-15T09-00-00.csv"
}
```

## Security Considerations

### Client Secret Storage

⚠️ **Important**: In the current implementation, OAuth credentials are stored in localStorage, which is not secure for production use.

**For Production Deployments**:
- Store credentials in a secure backend database
- Encrypt client secrets at rest
- Use environment variables for system-level OAuth credentials
- Implement key rotation policies
- Use a secrets management service (AWS Secrets Manager, HashiCorp Vault, etc.)

### Token Security

- Tokens are cached in memory only (not persisted)
- Tokens automatically expire based on the `expires_in` value from the OAuth server
- A 5-minute buffer is applied before expiry to avoid edge cases
- Tokens are never logged or exposed in error messages

## Testing OAuth Integration

### Using the Test Webhook Endpoint

The application includes a test webhook endpoint at `/api/test-webhook` that logs received requests.

1. **Setup a test schedule**:
   - Webhook URL: `http://localhost:3000/api/test-webhook`
   - No OAuth needed for local testing

2. **Test with OAuth** (using a mock OAuth server):
   - Deploy a test OAuth server (or use a service like Auth0, Okta)
   - Configure the schedule with OAuth credentials
   - Trigger the export manually
   - Check server logs for token acquisition and webhook call

### Example Mock OAuth Server

```javascript
// mock-oauth-server.js
const express = require('express');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.post('/oauth/token', (req, res) => {
  const authHeader = req.headers.authorization;

  // Decode Basic auth
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).json({ error: 'invalid_client' });
  }

  const credentials = Buffer.from(authHeader.slice(6), 'base64').toString();
  const [clientId, clientSecret] = credentials.split(':');

  // Validate credentials (replace with your test credentials)
  if (clientId !== 'test-client-id' || clientSecret !== 'test-client-secret') {
    return res.status(401).json({ error: 'invalid_client' });
  }

  // Return access token
  res.json({
    access_token: 'mock-access-token-' + Date.now(),
    token_type: 'Bearer',
    expires_in: 3600,
    scope: req.body.scope || 'default'
  });
});

app.post('/api/secured-endpoint', (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  console.log('Received webhook call:', req.body);
  res.json({ success: true, message: 'Webhook received' });
});

app.listen(3001, () => {
  console.log('Mock OAuth server running on http://localhost:3001');
});
```

Run with: `node mock-oauth-server.js`

Then configure your schedule:
- Webhook URL: `http://localhost:3001/api/secured-endpoint`
- Client ID: `test-client-id`
- Client Secret: `test-client-secret`
- Token URL: `http://localhost:3001/oauth/token`

## Common OAuth Providers

### Auth0

```
Token URL: https://YOUR_DOMAIN.auth0.com/oauth/token
Client ID: Your Auth0 Application Client ID
Client Secret: Your Auth0 Application Client Secret
Scope: (as configured in your Auth0 API)
```

### Okta

```
Token URL: https://YOUR_DOMAIN.okta.com/oauth2/default/v1/token
Client ID: Your Okta Application Client ID
Client Secret: Your Okta Application Client Secret
Scope: (as configured in your Okta Authorization Server)
```

### Azure AD

```
Token URL: https://login.microsoftonline.com/YOUR_TENANT_ID/oauth2/v2.0/token
Client ID: Your Azure Application (client) ID
Client Secret: Your Azure Client Secret
Scope: https://YOUR_API/.default
```

### Google Cloud

```
Token URL: https://oauth2.googleapis.com/token
Client ID: Your Google Cloud OAuth Client ID
Client Secret: Your Google Cloud Client Secret
Scope: https://www.googleapis.com/auth/your.scope
```

## Troubleshooting

### Token Acquisition Fails

**Symptoms**: Webhook is not called, logs show "Failed to acquire OAuth token"

**Solutions**:
1. Verify token URL is correct and accessible
2. Check client ID and client secret are correct
3. Ensure the OAuth server supports Client Credentials flow
4. Check if the scope is valid for your client
5. Review OAuth server logs for detailed error messages

### Webhook Returns 401 Unauthorized

**Symptoms**: Token is acquired but webhook call fails with 401

**Solutions**:
1. Verify the webhook API accepts Bearer tokens
2. Check if the token has the required scopes
3. Ensure the token hasn't expired (cache issue)
4. Verify the audience/resource parameter if required

### Token Not Cached

**Symptoms**: New token requested on every webhook call

**Solutions**:
1. Check if `expires_in` is being returned by the OAuth server
2. Verify the cache key is consistent (based on client ID and token URL)
3. Check server memory/restart issues that clear the cache

## Monitoring

### Log Messages

The system logs the following OAuth-related events:

```
✓ Using cached OAuth token
✓ Requesting OAuth token from https://auth.example.com/oauth/token
✓ OAuth token acquired successfully
✗ OAuth token request failed: 401 {"error":"invalid_client"}
✗ Failed to acquire OAuth token for webhook
✓ Webhook called: https://example.com/webhook - Success
✗ Webhook call failed: 401 Unauthorized
```

### Export Logs

Each export execution is logged with webhook status:
- `webhookCalled`: boolean indicating if webhook was attempted
- `webhookSuccess`: boolean indicating if webhook call succeeded
- `error`: error message if webhook call failed

Access logs via the Export Schedules UI or through the storage layer.

## API Schema

### ExportSchedule with OAuth

```typescript
interface ExportSchedule {
  // ... other fields
  webhookUrl?: string;
  webhookOAuth?: {
    clientId: string;
    clientSecret: string;
    tokenUrl: string;
    scope?: string;
  };
}
```

### Webhook Payload

```typescript
interface WebhookPayload {
  scheduleId: string;
  scheduleName: string;
  executedAt: string;
  success: boolean;
  employeeCount: number;
  filename: string;
  exportType: 'full' | 'delta';
  filepath: string;
}
```

## Best Practices

1. **Use HTTPS**: Always use HTTPS for token URLs and webhook URLs in production
2. **Rotate Secrets**: Regularly rotate OAuth client secrets
3. **Limit Scope**: Request only the minimum required scopes
4. **Monitor Tokens**: Log token acquisition failures and set up alerts
5. **Test Thoroughly**: Test with real OAuth providers before deploying
6. **Handle Errors**: The system gracefully handles OAuth failures without stopping the export
7. **Secure Logs**: Ensure tokens are never logged (current implementation doesn't log tokens)

## Future Enhancements

Potential improvements for production deployments:

- Support for other OAuth flows (Authorization Code, PKCE)
- Token refresh support for longer-lived operations
- Multiple authentication methods (API keys, JWT)
- Webhook retry logic with exponential backoff
- Webhook signature verification (HMAC)
- Rate limiting for token requests
- Distributed token cache (Redis)
- Credential encryption in storage
- Audit logging for token usage
- Webhook health checks

---

**Version**: 1.0
**Last Updated**: 2024-01-15
