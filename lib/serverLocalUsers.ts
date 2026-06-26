// Server-side local user store for authentication
// This file is for server-side use only (API routes, etc.)
// For client-side, use localUsers.ts

export interface LocalUser {
  id: string;
  email: string;
  password: string; // In production, this should be hashed with bcrypt
  name: string;
  role: 'admin' | 'viewer';
  lastLogin?: string; // ISO 8601 timestamp of last login
}

// Default users (password is "password" for both)
// In production, use bcrypt or similar to hash passwords
const defaultUsers: LocalUser[] = [
  {
    id: 'admin-1',
    email: 'admin@example.com',
    password: 'password', // In production: await bcrypt.hash('password', 10)
    name: 'Admin User',
    role: 'admin',
  },
  {
    id: 'viewer-1',
    email: 'viewer@example.com',
    password: 'password', // In production: await bcrypt.hash('password', 10)
    name: 'Viewer User',
    role: 'viewer',
  },
];

// In-memory store for server-side
// In production, replace with database queries
let localUsers: LocalUser[] = [...defaultUsers];

export function getLocalUsers(): LocalUser[] {
  return localUsers;
}

export function getLocalUser(email: string): LocalUser | undefined {
  return localUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
}

export function getLocalUserById(id: string): LocalUser | undefined {
  return localUsers.find(u => u.id === id);
}

export function validateLocalUser(email: string, password: string): LocalUser | null {
  const user = getLocalUser(email);
  if (!user) {
    return null;
  }

  // In production, use: await bcrypt.compare(password, user.password)
  if (user.password !== password) {
    return null;
  }

  // Update last login timestamp
  updateLastLogin(user.id);

  // Return user with updated last login
  return getLocalUser(email) || user;
}

export function updateLastLogin(id: string): boolean {
  const index = localUsers.findIndex(u => u.id === id);
  if (index === -1) return false;

  localUsers[index].lastLogin = new Date().toISOString();
  return true;
}

export function addLocalUser(user: Omit<LocalUser, 'id'>): LocalUser {
  const newUser: LocalUser = {
    ...user,
    id: `user-${Date.now()}`,
  };
  localUsers.push(newUser);
  return newUser;
}

export function updateLocalUser(id: string, updates: Partial<Omit<LocalUser, 'id'>>): LocalUser | null {
  const index = localUsers.findIndex(u => u.id === id);
  if (index === -1) return null;

  localUsers[index] = { ...localUsers[index], ...updates };
  return localUsers[index];
}

export function deleteLocalUser(id: string): boolean {
  // Prevent deleting the last admin
  const user = localUsers.find(u => u.id === id);
  if (user?.role === 'admin') {
    const adminCount = localUsers.filter(u => u.role === 'admin').length;
    if (adminCount <= 1) {
      return false; // Cannot delete the last admin
    }
  }

  const index = localUsers.findIndex(u => u.id === id);
  if (index === -1) return false;

  localUsers.splice(index, 1);
  return true;
}

// Check if Okta is configured
export function isOktaConfigured(): boolean {
  return !!(
    process.env.OKTA_CLIENT_ID &&
    process.env.OKTA_CLIENT_SECRET &&
    process.env.OKTA_ISSUER
  );
}
