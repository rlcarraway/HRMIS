// Auth types and client-safe utilities
// This file can be safely imported by both client and server components
import type { User as NextAuthUser } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import type { Session } from 'next-auth';

// Define custom types for our user with roles
export interface CustomUser extends NextAuthUser {
  role?: 'admin' | 'viewer';
  accessToken?: string;
}

export interface CustomSession extends Session {
  user: CustomUser;
  accessToken?: string;
}

export interface CustomJWT extends JWT {
  role?: 'admin' | 'viewer';
  accessToken?: string;
}

// Role-based authorization helpers
export function isAdmin(session: CustomSession | null): boolean {
  return session?.user?.role === 'admin';
}

export function isViewer(session: CustomSession | null): boolean {
  return session?.user?.role === 'viewer';
}

export function isAuthenticated(session: CustomSession | null): boolean {
  return !!session?.user;
}

export function canViewEmployees(session: CustomSession | null): boolean {
  return isAuthenticated(session); // Both admin and viewer can view
}

export function canManageEmployees(session: CustomSession | null): boolean {
  return isAdmin(session); // Only admin can create/update/delete
}

export function canManageSettings(session: CustomSession | null): boolean {
  return isAdmin(session); // Only admin can modify settings
}
