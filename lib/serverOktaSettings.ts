// Server-side Okta settings storage
// This file is for server-side use only (API routes, auth config, etc.)
import fs from 'fs';
import path from 'path';

export interface OktaSettings {
  clientId: string;
  clientSecret: string;
  issuer: string;
}

// Path to store Okta settings
// Use /tmp on Vercel (read-only filesystem), ./data locally
const DATA_DIR = process.env.VERCEL ? '/tmp/data' : path.join(process.cwd(), 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'okta-settings.json');

// Ensure data directory exists
function ensureDataDirectory() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (error) {
    console.error('Warning: Could not create data directory:', error);
    // Continue anyway - file operations will fail gracefully
  }
}

// Load settings from file or use environment variables as defaults
function loadSettingsFromFile(): OktaSettings {
  try {
    ensureDataDirectory();

    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading Okta settings file:', error);
  }

  // Return environment variables as defaults
  return {
    clientId: process.env.OKTA_CLIENT_ID || '',
    clientSecret: process.env.OKTA_CLIENT_SECRET || '',
    issuer: process.env.OKTA_ISSUER || '',
  };
}

// Save settings to file
function saveSettingsToFile(settings: OktaSettings): boolean {
  try {
    ensureDataDirectory();
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing Okta settings file:', error);
    return false;
  }
}

// In-memory cache of settings
let cachedSettings: OktaSettings | null = null;

// Get current Okta settings (from cache, file, or environment variables)
export function getOktaSettings(): OktaSettings {
  if (!cachedSettings) {
    cachedSettings = loadSettingsFromFile();
  }
  return cachedSettings;
}

// Update Okta settings
export function updateOktaSettings(settings: Partial<OktaSettings>): boolean {
  const currentSettings = getOktaSettings();

  const updatedSettings: OktaSettings = {
    clientId: settings.clientId ?? currentSettings.clientId,
    clientSecret: settings.clientSecret ?? currentSettings.clientSecret,
    issuer: settings.issuer ?? currentSettings.issuer,
  };

  const saved = saveSettingsToFile(updatedSettings);
  if (saved) {
    cachedSettings = updatedSettings;
  }
  return saved;
}

// Check if Okta is configured (has all required settings)
export function isOktaConfigured(): boolean {
  const settings = getOktaSettings();
  return !!(settings.clientId && settings.clientSecret && settings.issuer);
}

// Get masked client secret (show only last 4 characters)
export function getMaskedClientSecret(): string {
  const settings = getOktaSettings();
  const secret = settings.clientSecret;

  if (!secret) return '';
  if (secret.length <= 4) return '••••';

  return '••••••••••••' + secret.slice(-4);
}
