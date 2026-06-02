// Server initialization - runs once when the server starts
import { initializeScheduler } from './scheduler';

let initialized = false;

export function initServer() {
  if (initialized) return;

  console.log('Initializing HRMIS server...');

  // Initialize the export scheduler
  initializeScheduler();

  initialized = true;
  console.log('Server initialization complete');
}

// Auto-initialize on server-side import
if (typeof window === 'undefined') {
  initServer();
}
