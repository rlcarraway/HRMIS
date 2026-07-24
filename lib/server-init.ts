// Server initialization - runs once when the server starts
import { checkAndRunDueSchedules } from './scheduler';

let initialized = false;
const POLL_INTERVAL_MS = 60_000;

export function initServer() {
  if (initialized) return;
  initialized = true;

  console.log('Initializing HRMIS server...');

  // Vercel functions are stateless/ephemeral — an in-process timer would never
  // reliably survive between invocations there. In production on Vercel,
  // scheduled exports are instead triggered by a Vercel Cron Job hitting
  // /api/cron/execute-due-schedules. Locally (and on any persistent Node
  // process), poll on an interval so schedules still fire automatically.
  if (!process.env.VERCEL) {
    setInterval(() => {
      checkAndRunDueSchedules().catch(err => console.error('Scheduled export poll failed:', err));
    }, POLL_INTERVAL_MS);
    console.log(`Started local export-schedule poller (every ${POLL_INTERVAL_MS / 1000}s)`);
  }

  console.log('Server initialization complete');
}

// Auto-initialize on server-side import
if (typeof window === 'undefined') {
  initServer();
}
