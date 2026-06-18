// Unified API authentication - supports both NextAuth sessions and Okta OAuth tokens
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { extractBearerToken, validateTokenWithScope, ValidatedToken } from '@/lib/oktaAuth';

export interface AuthenticatedUser {
  id?: string;
  email: string;
  name: string;
  role?: 'admin' | 'viewer';
  authType: 'session' | 'oauth';
  clientId?: string; // For OAuth client credentials
  scopes?: string[];
}

export interface AuthResult {
  authenticated: boolean;
  user?: AuthenticatedUser;
  error?: string;
}

/**
 * Authenticate API request - supports both NextAuth session and Okta OAuth tokens
 * Priority: OAuth Bearer token first, then NextAuth session
 */
export async function authenticateApiRequest(
  request: NextRequest,
  options?: {
    requiredRole?: 'admin' | 'viewer';
    requiredScope?: string;
  }
): Promise<AuthResult> {
  // Try OAuth Bearer token first
  const bearerToken = extractBearerToken(request);

  if (bearerToken) {
    // Validate OAuth token
    const validation: ValidatedToken = await validateTokenWithScope(
      bearerToken,
      options?.requiredScope
    );

    if (!validation.valid) {
      return {
        authenticated: false,
        error: validation.error || 'Invalid OAuth token',
      };
    }

    // OAuth token is valid
    return {
      authenticated: true,
      user: {
        email: validation.payload?.email || validation.payload?.sub || 'oauth-client',
        name: validation.payload?.name || validation.clientId || 'OAuth Client',
        role: 'admin', // OAuth clients are treated as admin by default
        authType: 'oauth',
        clientId: validation.clientId,
        scopes: validation.scopes,
      },
    };
  }

  // No OAuth token, try NextAuth session
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return {
        authenticated: false,
        error: 'No valid session or OAuth token',
      };
    }

    const user = session.user as any;

    // Check role requirement
    if (options?.requiredRole) {
      if (options.requiredRole === 'admin' && user.role !== 'admin') {
        return {
          authenticated: false,
          error: 'Admin access required',
        };
      }
    }

    return {
      authenticated: true,
      user: {
        id: user.id,
        email: user.email || 'unknown',
        name: user.name || 'User',
        role: user.role || 'viewer',
        authType: 'session',
      },
    };
  } catch (error) {
    console.error('Error checking session:', error);
    return {
      authenticated: false,
      error: 'Authentication failed',
    };
  }
}

/**
 * Helper to check if user is admin (works for both session and OAuth)
 */
export function isAdmin(user: AuthenticatedUser): boolean {
  if (user.authType === 'oauth') {
    // OAuth clients are admin by default, but you could check scopes
    return true;
  }
  return user.role === 'admin';
}

/**
 * Helper to check if user has specific scope (OAuth only)
 */
export function hasScope(user: AuthenticatedUser, scope: string): boolean {
  if (user.authType !== 'oauth' || !user.scopes) {
    return false;
  }
  return user.scopes.includes(scope);
}
