// Server-side federated user store for Okta-authenticated users stored in Supabase
// This file is for server-side use only (API routes, etc.)

import { serverStorage } from './serverStorage';

export interface FederatedUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'viewer';
  provider: string;
  providerId: string; // Okta sub claim
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
}

export async function getFederatedUsers(): Promise<FederatedUser[]> {
  return await serverStorage.getFederatedUsers();
}

export async function getFederatedUser(id: string): Promise<FederatedUser | undefined> {
  const users = await serverStorage.getFederatedUsers();
  return users.find(u => u.id === id);
}

export async function getFederatedUserByProviderId(providerId: string): Promise<FederatedUser | undefined> {
  const user = await serverStorage.getFederatedUserByProviderId(providerId);
  return user || undefined;
}

export async function getFederatedUserByEmail(email: string): Promise<FederatedUser | undefined> {
  const users = await serverStorage.getFederatedUsers();
  return users.find(u => u.email.toLowerCase() === email.toLowerCase());
}

export async function createOrUpdateFederatedUser(data: {
  providerId: string;
  email: string;
  name: string;
  provider: string;
  role?: 'admin' | 'viewer';
}): Promise<FederatedUser> {
  return await serverStorage.upsertFederatedUser(data);
}

export async function updateFederatedUserRole(id: string, role: 'admin' | 'viewer'): Promise<FederatedUser | null> {
  const success = await serverStorage.updateFederatedUserRole(id, role);
  if (!success) return null;

  const user = await getFederatedUser(id);
  return user || null;
}

export async function deleteFederatedUser(id: string): Promise<boolean> {
  return await serverStorage.deleteFederatedUser(id);
}
