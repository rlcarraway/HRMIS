// Okta OAuth token validation for API access
import { NextRequest } from 'next/server';

export interface OktaTokenPayload {
  sub: string;
  email?: string;
  name?: string;
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  scp?: string[];
  cid?: string; // client_id for client credentials
}

export interface ValidatedToken {
  valid: boolean;
  payload?: OktaTokenPayload;
  error?: string;
  clientId?: string;
  scopes?: string[];
}

/**
 * Extract Bearer token from Authorization header
 */
export function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;

  return parts[1];
}

/**
 * Validate Okta access token
 * This validates the token with Okta's introspection endpoint
 */
export async function validateOktaToken(token: string): Promise<ValidatedToken> {
  try {
    const oktaIssuer = process.env.OKTA_ISSUER;
    const clientId = process.env.OKTA_CLIENT_ID;
    const clientSecret = process.env.OKTA_CLIENT_SECRET;

    if (!oktaIssuer || !clientId || !clientSecret) {
      return {
        valid: false,
        error: 'Okta OAuth is not configured. Configure Okta settings to use OAuth API authentication.',
      };
    }

    // Use Okta's introspection endpoint to validate the token
    const introspectionUrl = `${oktaIssuer}/v1/introspect`;

    const response = await fetch(introspectionUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        token: token,
        token_type_hint: 'access_token',
      }),
    });

    if (!response.ok) {
      return {
        valid: false,
        error: `Okta introspection failed: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();

    // Check if token is active
    if (!data.active) {
      return {
        valid: false,
        error: 'Token is not active or has expired',
      };
    }

    // Verify the token is for our client/audience
    if (data.client_id !== clientId && data.aud !== clientId) {
      return {
        valid: false,
        error: 'Token audience does not match',
      };
    }

    // Token is valid
    return {
      valid: true,
      payload: {
        sub: data.sub,
        email: data.username || data.sub,
        name: data.username || data.sub,
        iss: data.iss,
        aud: data.aud,
        exp: data.exp,
        iat: data.iat,
        scp: data.scope ? data.scope.split(' ') : [],
        cid: data.client_id,
      },
      clientId: data.client_id,
      scopes: data.scope ? data.scope.split(' ') : [],
    };
  } catch (error) {
    console.error('Error validating Okta token:', error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Token validation failed',
    };
  }
}

/**
 * Check if token has required scope
 */
export function hasRequiredScope(scopes: string[] | undefined, requiredScope: string): boolean {
  if (!scopes) return false;
  return scopes.includes(requiredScope);
}

/**
 * Validate token and check for required scope
 */
export async function validateTokenWithScope(
  token: string,
  requiredScope?: string
): Promise<ValidatedToken> {
  const validation = await validateOktaToken(token);

  if (!validation.valid) {
    return validation;
  }

  // If a scope is required, check for it
  if (requiredScope && !hasRequiredScope(validation.scopes, requiredScope)) {
    return {
      valid: false,
      error: `Missing required scope: ${requiredScope}`,
    };
  }

  return validation;
}
