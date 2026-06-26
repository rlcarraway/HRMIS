// Server-side initialization of Okta settings
// This file should only be imported by server-side code (API routes, middleware, etc.)
import { getOktaSettings } from './serverOktaSettings';

/**
 * Loads persisted Okta settings and updates process.env
 * This ensures that settings saved via the admin UI persist across restarts
 *
 * Call this at server startup or in API routes before using Okta configuration
 */
export async function initializeOktaSettings(): Promise<void> {
  try {
    const persistedSettings = await getOktaSettings();

    // Only update env vars if persisted settings exist and env vars are not already set
    // This allows .env.local to take precedence over persisted settings
    if (persistedSettings.clientId && !process.env.OKTA_CLIENT_ID) {
      process.env.OKTA_CLIENT_ID = persistedSettings.clientId;
    }
    if (persistedSettings.clientSecret && !process.env.OKTA_CLIENT_SECRET) {
      process.env.OKTA_CLIENT_SECRET = persistedSettings.clientSecret;
    }
    if (persistedSettings.issuer && !process.env.OKTA_ISSUER) {
      process.env.OKTA_ISSUER = persistedSettings.issuer;
    }
  } catch (error) {
    console.error('Error initializing Okta settings:', error);
    // Fail silently - settings will fall back to environment variables
  }
}

// Auto-initialize on module load (server-side only)
if (typeof window === 'undefined') {
  initializeOktaSettings().catch(error => {
    console.error('Error auto-initializing Okta settings:', error);
  });
}
