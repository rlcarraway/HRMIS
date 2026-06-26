// Server-side outbound API configuration store
import fs from 'fs';
import path from 'path';
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

const DATA_DIR = path.join(process.cwd(), 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'outbound-api-settings.json');

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Default settings
const defaultSettings: OutboundApiSettings = {
  enabled: false,
  url: '',
  headers: [
    { key: 'Content-Type', value: 'application/json' }
  ],
  operations: {
    create: false,
    update: false,
    delete: false,
  },
};

// Read settings from file
function readSettingsFile(): OutboundApiSettings {
  ensureDataDir();

  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading outbound API settings file:', error);
  }

  return defaultSettings;
}

// Write settings to file
function writeSettingsFile(settings: OutboundApiSettings): void {
  ensureDataDir();

  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing outbound API settings file:', error);
    throw error;
  }
}

// Get current settings
export function getOutboundApiSettings(): OutboundApiSettings {
  return readSettingsFile();
}

// Update settings
export function updateOutboundApiSettings(settings: OutboundApiSettings): OutboundApiSettings {
  writeSettingsFile(settings);
  return settings;
}

// Send data to outbound API
export async function sendToOutboundApi(
  operation: 'create' | 'update' | 'delete',
  data: any
): Promise<{ success: boolean; error?: string; response?: any }> {
  const settings = getOutboundApiSettings();

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
    logApiCall(
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
      logApiCall(
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
    logApiCall(
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
    logApiCall(
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
