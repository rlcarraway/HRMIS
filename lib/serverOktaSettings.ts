// Server-side Okta settings stored in Supabase
// This file is for server-side use only (API routes, auth config, etc.)
import { serverStorage } from './serverStorage';

export interface OktaSettings {
  clientId: string;
  clientSecret: string;
  issuer: string;
}

// In-memory cache of settings
let cachedSettings: OktaSettings | null = null;

// Get current Okta settings (from cache, database, or environment variables)
export async function getOktaSettings(): Promise<OktaSettings> {
  if (!cachedSettings) {
    const dbSettings = await serverStorage.getOktaSettings();

    if (dbSettings) {
      cachedSettings = dbSettings;
    } else {
      // Return environment variables as defaults
      cachedSettings = {
        clientId: process.env.OKTA_CLIENT_ID || '',
        clientSecret: process.env.OKTA_CLIENT_SECRET || '',
        issuer: process.env.OKTA_ISSUER || '',
      };
    }
  }
  return cachedSettings;
}

// Update Okta settings
export async function updateOktaSettings(settings: Partial<OktaSettings>): Promise<boolean> {
  const currentSettings = await getOktaSettings();

  const updatedSettings: OktaSettings = {
    clientId: settings.clientId ?? currentSettings.clientId,
    clientSecret: settings.clientSecret ?? currentSettings.clientSecret,
    issuer: settings.issuer ?? currentSettings.issuer,
  };

  try {
    await serverStorage.setOktaSettings(updatedSettings);
    cachedSettings = updatedSettings;
    return true;
  } catch (error) {
    console.error('Error updating Okta settings:', error);
    return false;
  }
}

// Check if Okta is configured (has all required settings)
export async function isOktaConfigured(): Promise<boolean> {
  const settings = await getOktaSettings();
  return !!(settings.clientId && settings.clientSecret && settings.issuer);
}

// Get masked client secret (show only last 4 characters)
export async function getMaskedClientSecret(): Promise<string> {
  const settings = await getOktaSettings();
  const secret = settings.clientSecret;

  if (!secret) return '';
  if (secret.length <= 4) return '••••';

  return '••••••••••••' + secret.slice(-4);
}
