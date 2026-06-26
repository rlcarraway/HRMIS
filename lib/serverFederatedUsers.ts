// Server-side federated user store for Okta-authenticated users
// This file is for server-side use only (API routes, etc.)

import fs from 'fs';
import path from 'path';

export interface FederatedUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'viewer';
  provider: 'okta';
  providerId: string; // Okta sub claim
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
}

// Use /tmp on Vercel (read-only filesystem), ./data locally
const DATA_DIR = process.env.VERCEL ? '/tmp/data' : path.join(process.cwd(), 'data');
const FEDERATED_USERS_FILE = path.join(DATA_DIR, 'federated-users.json');

// Ensure data directory exists
function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (error) {
    console.error('Warning: Could not create data directory:', error);
  }
}

// Read federated users from file
function readFederatedUsersFile(): FederatedUser[] {
  try {
    ensureDataDir();
    if (!fs.existsSync(FEDERATED_USERS_FILE)) {
      return [];
    }
    const data = fs.readFileSync(FEDERATED_USERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading federated users file:', error);
    return [];
  }
}

// Write federated users to file
function writeFederatedUsersFile(users: FederatedUser[]): boolean {
  try {
    ensureDataDir();
    fs.writeFileSync(FEDERATED_USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error writing federated users file:', error);
    return false;
  }
}

export function getFederatedUsers(): FederatedUser[] {
  return readFederatedUsersFile();
}

export function getFederatedUser(id: string): FederatedUser | undefined {
  const users = readFederatedUsersFile();
  return users.find(u => u.id === id);
}

export function getFederatedUserByProviderId(providerId: string): FederatedUser | undefined {
  const users = readFederatedUsersFile();
  return users.find(u => u.providerId === providerId);
}

export function getFederatedUserByEmail(email: string): FederatedUser | undefined {
  const users = readFederatedUsersFile();
  return users.find(u => u.email.toLowerCase() === email.toLowerCase());
}

export function createOrUpdateFederatedUser(data: {
  providerId: string;
  email: string;
  name: string;
  provider: 'okta';
  role?: 'admin' | 'viewer';
}): FederatedUser {
  const users = readFederatedUsersFile();
  const now = new Date().toISOString();

  // Check if user already exists
  const existingUser = users.find(u => u.providerId === data.providerId);

  if (existingUser) {
    // Update existing user
    existingUser.email = data.email;
    existingUser.name = data.name;
    existingUser.lastLoginAt = now;
    existingUser.updatedAt = now;
    // Keep existing role unless specified
    if (data.role) {
      existingUser.role = data.role;
    }

    writeFederatedUsersFile(users);
    return existingUser;
  } else {
    // Create new user
    const newUser: FederatedUser = {
      id: `federated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      email: data.email,
      name: data.name,
      role: data.role || 'viewer', // Default to viewer
      provider: data.provider,
      providerId: data.providerId,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    };

    users.push(newUser);
    writeFederatedUsersFile(users);
    return newUser;
  }
}

export function updateFederatedUserRole(id: string, role: 'admin' | 'viewer'): FederatedUser | null {
  const users = readFederatedUsersFile();
  const index = users.findIndex(u => u.id === id);

  if (index === -1) return null;

  users[index].role = role;
  users[index].updatedAt = new Date().toISOString();

  writeFederatedUsersFile(users);
  return users[index];
}

export function deleteFederatedUser(id: string): boolean {
  const users = readFederatedUsersFile();
  const index = users.findIndex(u => u.id === id);

  if (index === -1) return false;

  users.splice(index, 1);
  writeFederatedUsersFile(users);
  return true;
}
