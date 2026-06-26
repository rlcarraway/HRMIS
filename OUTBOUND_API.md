# Outbound API Integration

## Overview

The Outbound API feature allows HRMIS to automatically send employee data to external systems when create, update, or delete operations occur. This enables seamless integration with other HR systems, data warehouses, or custom applications.

## Features

- **Configurable Target URL**: Specify the endpoint that will receive employee data
- **Custom Headers**: Add authentication tokens, content-type, and other HTTP headers
- **Operation Toggles**: Choose which operations trigger API calls (create, update, delete)
- **Enable/Disable**: Global toggle to enable or disable all outbound API calls
- **Test Connection**: Verify your API configuration with a test payload
- **Automatic Payload Formatting**: Employee data is automatically formatted as JSON

## Configuration

### Accessing Settings

1. Navigate to **Settings** → **Outbound API** tab
2. Only admin users can configure outbound API settings

### Basic Configuration

1. **Enable Outbound API**: Toggle the switch to enable the feature
2. **Target API URL**: Enter the full URL of your external API endpoint
   - Example: `https://api.example.com/employees`
   - Must be a valid HTTPS URL for production use

### Headers Configuration

Add custom HTTP headers that your external API requires:

1. Click **Add Header** to add a new header
2. Enter the header name (e.g., `Authorization`, `X-API-Key`)
3. Enter the header value (e.g., `Bearer token123`)
4. Default header: `Content-Type: application/json`

Common headers:
- `Authorization: Bearer YOUR_TOKEN` - JWT authentication
- `X-API-Key: YOUR_API_KEY` - API key authentication
- `Content-Type: application/json` - JSON payload format

### Operation Toggles

Choose which operations trigger outbound API calls:

- **Create Employee**: Send data when a new employee is created
- **Update Employee**: Send data when an employee is updated
- **Delete Employee**: Send data when an employee is deleted

You can enable any combination of these operations based on your integration needs.

### Testing the Configuration

Before saving, test your configuration:

1. Click **Test Connection**
2. A test payload will be sent to your configured URL
3. View the response status, duration, and response body
4. Verify that your external API receives and processes the test data correctly

### Saving Settings

Click **Save Settings** to persist your configuration. Settings are stored in `/data/outbound-api-settings.json`.

## Payload Format

When an operation occurs, HRMIS sends a POST request with this JSON structure:

```json
{
  "operation": "create" | "update" | "delete",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "id": "emp-123",
    "type": "employee",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "department": "Engineering",
    "title": "Software Engineer",
    "manager": "Jane Smith",
    "status": "active",
    "startDate": "2024-01-01",
    "endDate": null,
    "customAttributes": {
      "shirtSize": "M",
      "certifications": "AWS Certified"
    },
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Payload Fields

- **operation**: The type of operation (`create`, `update`, or `delete`)
- **timestamp**: ISO 8601 timestamp when the operation occurred
- **data**: Complete employee object with all fields

## Implementation Details

### Files Created

1. **lib/serverOutboundApi.ts**
   - Storage and configuration management
   - `sendToOutboundApi()` function to make HTTP requests
   - Settings persistence in `/data/outbound-api-settings.json`

2. **app/api/outbound-api/route.ts**
   - GET: Retrieve current settings
   - PUT: Update settings
   - Admin-only access

3. **app/api/outbound-api/test/route.ts**
   - POST: Test connection with sample payload
   - Returns status, duration, and response

### Files Modified

1. **app/api/employees/route.ts**
   - POST endpoint calls `sendToOutboundApi('create', employee)` after creating employee

2. **app/api/employees/[id]/route.ts**
   - PUT endpoint calls `sendToOutboundApi('update', employee)` after updating
   - DELETE endpoint calls `sendToOutboundApi('delete', employee)` before removing

3. **app/settings/page.tsx**
   - Added "Outbound API" tab with full configuration UI
   - Test connection functionality
   - Real-time settings management

## Security Considerations

1. **HTTPS Required**: Always use HTTPS URLs in production to encrypt data in transit
2. **Authentication**: Use secure authentication methods (Bearer tokens, API keys)
3. **API Key Storage**: Store sensitive API keys securely, consider using environment variables
4. **Rate Limiting**: External API should implement rate limiting to prevent abuse
5. **Error Handling**: Failed API calls are logged but don't block HRMIS operations
6. **Timeout**: API calls have reasonable timeouts to prevent blocking

## Error Handling

- If the outbound API call fails, HRMIS logs a warning but continues with the operation
- The employee create/update/delete operation completes successfully even if the outbound API fails
- Errors are logged to the console for troubleshooting
- Test connection feature helps identify configuration issues before going live

## Use Cases

### 1. Data Warehouse Integration
Automatically sync employee data to your data warehouse for analytics and reporting.

```
Target URL: https://warehouse.example.com/api/employees
Headers: Authorization: Bearer dwh_token_123
Operations: Create, Update, Delete
```

### 2. Slack Notifications
Send notifications to Slack when employees are added or updated.

```
Target URL: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
Headers: Content-Type: application/json
Operations: Create, Update
```

### 3. Custom HR System
Integrate with a legacy HR system that accepts employee data via REST API.

```
Target URL: https://legacy.hr.example.com/api/v1/employees
Headers:
  - X-API-Key: legacy_api_key_456
  - Content-Type: application/json
Operations: Create, Update
```

### 4. Compliance Logging
Send employee changes to a compliance logging system for audit trails.

```
Target URL: https://compliance.example.com/api/events
Headers: Authorization: Bearer compliance_token
Operations: Create, Update, Delete
```

## Troubleshooting

### Connection Test Fails

1. Verify the target URL is correct and accessible
2. Check that all required headers are present
3. Ensure your external API is running and accepting requests
4. Check firewall rules and network connectivity

### API Calls Not Being Sent

1. Verify that "Enable Outbound API" toggle is ON
2. Check that the specific operation toggles (create/update/delete) are enabled
3. Review browser console for any JavaScript errors
4. Check server logs for any error messages

### External API Not Receiving Data

1. Use the test connection feature to verify connectivity
2. Check your external API's logs to see if requests are arriving
3. Verify the payload format matches what your API expects
4. Ensure authentication headers are correct

### Settings Not Saving

1. Verify you're logged in as an admin user
2. Check that the `/data` directory is writable
3. Review server logs for permission errors

## API Reference

### GET /api/outbound-api

Retrieve current outbound API settings.

**Authentication**: Admin only

**Response**:
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "url": "https://api.example.com/employees",
    "headers": [
      { "key": "Content-Type", "value": "application/json" },
      { "key": "Authorization", "value": "Bearer token123" }
    ],
    "operations": {
      "create": true,
      "update": true,
      "delete": false
    }
  }
}
```

### PUT /api/outbound-api

Update outbound API settings.

**Authentication**: Admin only

**Request Body**:
```json
{
  "enabled": true,
  "url": "https://api.example.com/employees",
  "headers": [
    { "key": "Content-Type", "value": "application/json" }
  ],
  "operations": {
    "create": true,
    "update": true,
    "delete": false
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": { /* updated settings */ },
  "message": "Outbound API settings updated successfully"
}
```

### POST /api/outbound-api/test

Test the outbound API connection.

**Authentication**: Admin only

**Request Body**:
```json
{
  "url": "https://api.example.com/employees",
  "headers": [
    { "key": "Content-Type", "value": "application/json" }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "statusCode": 200,
  "statusText": "OK",
  "duration": "145ms",
  "response": { /* API response */ }
}
```

## Future Enhancements

Potential improvements for future versions:

1. **Retry Logic**: Automatic retry on failed API calls with exponential backoff
2. **Queue System**: Queue failed requests for later retry
3. **Webhook Support**: Support for webhook-style payloads with HMAC signatures
4. **Multiple Endpoints**: Configure different endpoints for different operations
5. **Custom Payload Templates**: Allow customization of the payload structure
6. **Batch Operations**: Send multiple changes in a single API call
7. **Event Filtering**: More granular control over which changes trigger API calls
8. **Audit Trail**: Track all outbound API calls and their results

---

Last updated: 2024-06-17
