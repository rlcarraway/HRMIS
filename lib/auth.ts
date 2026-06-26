import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { validateLocalUser } from './serverLocalUsers';
import { createOrUpdateFederatedUser, getFederatedUserByProviderId } from './serverFederatedUsers';
import type { CustomUser, CustomSession, CustomJWT } from './authTypes';
import { logUserAction } from './serverAuditLog';

// Re-export types and helpers for convenience
export type { CustomUser, CustomSession, CustomJWT } from './authTypes';
export {
  isAdmin,
  isViewer,
  isAuthenticated,
  canViewEmployees,
  canManageEmployees,
  canManageSettings,
} from './authTypes';

// Check if Okta is configured (from environment variables)
const oktaConfigured = !!(
  process.env.OKTA_CLIENT_ID &&
  process.env.OKTA_CLIENT_SECRET &&
  process.env.OKTA_ISSUER
);

// Build providers array dynamically based on configuration
const providers: any[] = [
  // Local credentials provider (always available)
  CredentialsProvider({
    id: 'credentials',
    name: 'Local Account',
    credentials: {
      email: { label: 'Email', type: 'email', placeholder: 'admin@example.com' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        return null;
      }

      const user = validateLocalUser(credentials.email, credentials.password);
      if (!user) {
        // Log failed login attempt
        logUserAction(
          'user.login',
          `Failed login attempt for ${credentials.email}`,
          {
            userId: credentials.email,
            userEmail: credentials.email,
            success: false,
            details: {
              provider: 'credentials',
              reason: 'invalid_credentials',
            },
          }
        );
        return null;
      }

      // Log successful login
      logUserAction(
        'user.login',
        `User logged in: ${user.email}`,
        {
          userId: user.email,
          userName: user.name,
          userEmail: user.email,
          success: true,
          details: {
            provider: 'credentials',
            role: user.role,
          },
        }
      );

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      };
    },
  }),
];

// Add Okta provider only if configured
if (oktaConfigured) {
  providers.push({
    id: 'okta',
    name: 'Okta',
    type: 'oauth',
    wellKnown: `${process.env.OKTA_ISSUER}/.well-known/openid-configuration`,
    authorization: {
      params: {
        scope: 'openid email profile',
        code_challenge_method: 'S256' // Enable PKCE with SHA-256
      }
    },
    clientId: process.env.OKTA_CLIENT_ID || '',
    clientSecret: process.env.OKTA_CLIENT_SECRET || '',
    issuer: process.env.OKTA_ISSUER,
    checks: ['pkce', 'state'], // Enable PKCE and state parameter checks
    profile(profile: any) {
      // Save or update federated user in persistent storage
      const federatedUser = createOrUpdateFederatedUser({
        providerId: profile.sub,
        email: profile.email,
        name: profile.name || profile.email,
        provider: 'okta',
      });

      // Log successful Okta login
      logUserAction(
        'user.login',
        `User logged in via Okta: ${federatedUser.email}`,
        {
          userId: federatedUser.email,
          userName: federatedUser.name,
          userEmail: federatedUser.email,
          success: true,
          details: {
            provider: 'okta',
            role: federatedUser.role,
            providerId: profile.sub,
          },
        }
      );

      return {
        id: federatedUser.id,
        name: federatedUser.name,
        email: federatedUser.email,
        image: null,
        role: federatedUser.role,
      };
    },
  });
}

// NextAuth configuration
export const authOptions: NextAuthOptions = {
  providers,
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // Initial sign in
      if (account && user) {
        const customUser = user as CustomUser;
        token.role = customUser.role || 'viewer';
        token.accessToken = account.access_token;

        // For federated users, ensure we have the latest role from storage
        if (account.provider === 'okta' && profile) {
          const federatedUser = getFederatedUserByProviderId((profile as any).sub);
          if (federatedUser) {
            token.role = federatedUser.role;
          }
        }
      }
      return token as CustomJWT;
    },
    async session({ session, token }) {
      const customToken = token as CustomJWT;
      const customSession = session as CustomSession;

      if (customSession.user) {
        customSession.user.role = customToken.role || 'viewer';
        customSession.accessToken = customToken.accessToken;
      }
      return customSession;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};
