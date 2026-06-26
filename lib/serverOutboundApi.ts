// Server-side outbound API configuration stored in Supabase
import { serverStorage } from './serverStorage';
import { logApiCall } from './serverAuditLog';

export interface OutboundApiSettings {
  enabled: boolean;
  url: string;
  headers: Array<{ key: string; value: string }>;
  operations: {
    create: boolean;
    update: boolean;
    delete: boolean;
  };
}

// Get current settings
export async function getOutboundApiSettings(): Promise<OutboundApiSettings> {
  return await serverStorage.getOutboundApiSettings();
}

// Update settings
export async function updateOutboundApiSettings(settings: OutboundApiSettings): Promise<OutboundApiSettings> {
  await serverStorage.setOutboundApiSettings(settings);
  return settings;
}

// Send data to outbound API
export async function sendToOutboundApi(
  operation: 'create' | 'update' | 'delete',
  data: any
): Promise<{ success: boolean; error?: string; response?: any }> {
  const settings = await getOutboundApiSettings();

  // Check if outbound API is enabled
  if (!settings.enabled) {
    return { success: true }; // Not an error, just not configured
  }

  // Check if this operation should trigger the API call
  if (!settings.operations[operation]) {
    return { success: true }; // Not an error, operation not enabled
  }

  // Check if URL is configured
  if (!settings.url || settings.url.trim() === '') {
    return { success: false, error: 'Outbound API URL not configured' };
  }

  const startTime = Date.now();

  try {
    // Build headers object
    const headers: Record<string, string> = {};
    settings.headers.forEach(header => {
      if (header.key && header.value) {
        headers[header.key] = header.value;
      }
    });

    // Prepare the payload
    const payload = {
      operation,
      timestamp: new Date().toISOString(),
      data,
    };

    // Log the API call attempt
    await logApiCall(
      'api.outbound.call',
      `Outbound API call - ${operation} operation for ${data.email || data.id}`,
      {
        success: true,
        url: settings.url,
        method: 'POST',
        requestDetails: {
          operation,
          employeeId: data.id,
          employeeEmail: data.email,
        },
      }
    );

    // Make the API call
    const response = await fetch(settings.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const duration = Date.now() - startTime;
    const responseData = await response.text();
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseData);
    } catch {
      parsedResponse = responseData;
    }

    if (!response.ok) {
      // Log failure
      await logApiCall(
        'api.outbound.failure',
        `Outbound API failed - ${operation} operation`,
        {
          success: false,
          url: settings.url,
          method: 'POST',
          statusCode: response.status,
          duration,
          errorMessage: `API returned ${response.status}: ${response.statusText}`,
          responseDetails: parsedResponse,
        }
      );

      return {
        success: false,
        error: `API returned ${response.status}: ${response.statusText}`,
        response: parsedResponse,
      };
    }

    // Log success
    await logApiCall(
      'api.outbound.success',
      `Outbound API success - ${operation} operation for ${data.email || data.id}`,
      {
        success: true,
        url: settings.url,
        method: 'POST',
        statusCode: response.status,
        duration,
        responseDetails: parsedResponse,
      }
    );

    return {
      success: true,
      response: parsedResponse,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    console.error('Error calling outbound API:', error);

    // Log error
    await logApiCall(
      'api.outbound.failure',
      `Outbound API error - ${operation} operation`,
      {
        success: false,
        url: settings.url,
        method: 'POST',
        duration,
        errorMessage,
      }
    );

    return {
      success: false,
      error: errorMessage,
    };
  }
}
