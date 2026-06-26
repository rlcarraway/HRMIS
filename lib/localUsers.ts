// Local user store for authentication when Okta is not configured
export interface LocalUser {
  id: string;
  email: string;
  password: string; // In production, this should be hashed
  name: string;
  role: 'admin' | 'viewer';
}

// Default users (password is "password" for both)
// In production, use bcrypt or similar to hash passwords
const defaultUsers: LocalUser[] = [
  {
    id: 'admin-1',
    email: 'admin@example.com',
    password: 'password',
    name: 'Admin User',
    role: 'admin',
  },
  {
    id: 'viewer-1',
    email: 'viewer@example.com',
    password: 'password',
    name: 'Viewer User',
    role: 'viewer',
  },
];

// Simple in-memory store (replace with database in production)
let localUsers: LocalUser[] = [...defaultUsers];

// Load from localStorage in browser or use defaults
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('hrmis_local_users');
  if (stored) {
    try {
      localUsers = JSON.parse(stored);
    } catch (e) {
      console.error('Failed to load local users:', e);
    }
  }
}

export function getLocalUsers(): LocalUser[] {
  return localUsers;
}

export function getLocalUser(email: string): LocalUser | undefined {
  return localUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
}

export function validateLocalUser(email: string, password: string): LocalUser | null {
  const user = getLocalUser(email);
  if (!user || user.password !== password) {
    return null;
  }
  return user;
}

export function addLocalUser(user: Omit<LocalUser, 'id'>): LocalUser {
  const newUser: LocalUser = {
    ...user,
    id: `user-${Date.now()}`,
  };
  localUsers.push(newUser);
  saveLocalUsers();
  return newUser;
}

export function updateLocalUser(id: string, updates: Partial<Omit<LocalUser, 'id'>>): LocalUser | null {
  const index = localUsers.findIndex(u => u.id === id);
  if (index === -1) return null;

  localUsers[index] = { ...localUsers[index], ...updates };
  saveLocalUsers();
  return localUsers[index];
}

export function deleteLocalUser(id: string): boolean {
  const index = localUsers.findIndex(u => u.id === id);
  if (index === -1) return false;

  localUsers.splice(index, 1);
  saveLocalUsers();
  return true;
}

function saveLocalUsers() {
  if (typeof window !== 'undefined') {
    localStorage.setItem('hrmis_local_users', JSON.stringify(localUsers));
  }
}

// Check if Okta is configured
export function isOktaConfigured(): boolean {
  return !!(
    process.env.OKTA_CLIENT_ID &&
    process.env.OKTA_CLIENT_SECRET &&
    process.env.OKTA_ISSUER
  );
}
