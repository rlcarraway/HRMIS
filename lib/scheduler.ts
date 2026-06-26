import cron, { ScheduledTask } from 'node-cron';
import { storage } from './storage';
import { exportToCSV } from './export';
import { ExportSchedule, Employee, OAuthConfig } from './types';
import { calculateNextScheduledTime, generateId } from './utils';
import fs from 'fs';
import path from 'path';

const activeJobs = new Map<string, ScheduledTask>();

// OAuth token cache to avoid requesting tokens too frequently
interface TokenCacheEntry {
  accessToken: string;
  expiresAt: number; // Unix timestamp
}
const tokenCache = new Map<string, TokenCacheEntry>();

export function registerSchedule(schedule: ExportSchedule) {
  // Remove existing job if any
  unregisterSchedule(schedule.id);

  if (!schedule.enabled) {
    return;
  }

  // Convert to cron expression
  const cronExpression = scheduleToCron(schedule);

  // Create job
  const job = cron.schedule(cronExpression, async () => {
    await executeScheduledExport(schedule.id);
  });

  activeJobs.set(schedule.id, job);
  console.log(`Registered schedule: ${schedule.name} (${cronExpression})`);
}

export function unregisterSchedule(scheduleId: string) {
  const job = activeJobs.get(scheduleId);
  if (job) {
    job.stop();
    activeJobs.delete(scheduleId);
    console.log(`Unregistered schedule: ${scheduleId}`);
  }
}

function scheduleToCron(schedule: ExportSchedule): string {
  switch (schedule.frequency) {
    case 'minutes':
      // Run every N minutes
      return `*/${schedule.intervalValue} * * * *`;

    case 'hourly':
      // Run every N hours at minute 0
      return `0 */${schedule.intervalValue} * * *`;

    case 'daily': {
      const [hours, minutes] = schedule.scheduledTime!.split(':');
      return `${minutes} ${hours} * * *`;
    }

    case 'weekly': {
      const [hours, minutes] = schedule.scheduledTime!.split(':');
      return `${minutes} ${hours} * * ${schedule.dayOfWeek}`;
    }

    case 'monthly': {
      const [hours, minutes] = schedule.scheduledTime!.split(':');
      return `${minutes} ${hours} ${schedule.dayOfMonth} * *`;
    }

    case 'once': {
      // For once, use date-based check
      const [hours, minutes] = schedule.scheduledTime!.split(':');
      return `${minutes} ${hours} * * *`; // Check daily, validate date in handler
    }
  }
}

export async function executeScheduledExport(scheduleId: string): Promise<{ success: boolean; filename?: string; count?: number; error?: string }> {
  const schedule = storage.getExportSchedule(scheduleId);
  if (!schedule || !schedule.enabled) {
    return { success: false, error: 'Schedule not found or disabled' };
  }

  // For 'once' type, check if date matches
  if (schedule.frequency === 'once') {
    const today = new Date().toISOString().split('T')[0];
    if (schedule.scheduledDate !== today) {
      return { success: false, error: 'Not scheduled for today' };
    }

    // Disable after execution
    storage.updateExportSchedule(scheduleId, { enabled: false });
    unregisterSchedule(scheduleId);
  }

  const executedAt = new Date().toISOString();
  let webhookCalled = false;
  let webhookSuccess = false;

  try {
    // Get employees with filters
    let employees = storage.getEmployees();

    // Apply filters
    if (schedule.filters) {
      employees = applyFilters(employees, schedule.filters);
    }

    // Handle delta export
    if (schedule.exportType === 'delta') {
      employees = filterDeltaRecords(employees, schedule);
    }

    // Generate CSV
    const csv = exportToCSV(employees);

    // Save to file system
    const timestamp = executedAt.replace(/[:.]/g, '-');
    const exportTypePrefix = schedule.exportType === 'delta' ? 'delta' : 'full';
    const filename = `export-${exportTypePrefix}-${schedule.name.replace(/\s+/g, '-')}-${timestamp}.csv`;

    // Use /tmp on Vercel (read-only filesystem), ./exports locally
    const exportsDir = process.env.VERCEL ? '/tmp/exports' : path.join(process.cwd(), 'exports');
    const filepath = path.join(exportsDir, filename);

    // Ensure exports directory exists
    try {
      fs.mkdirSync(exportsDir, { recursive: true });
      fs.writeFileSync(filepath, csv);
    } catch (error) {
      console.error('Warning: Could not write export file:', error);
      throw error; // Re-throw since this is critical
    }

    // Update metadata
    const metadata = storage.getExportMetadata();
    storage.updateExportMetadata({
      lastExportTimestamp: executedAt,
      lastExportCount: employees.length,
      lastExportType: 'scheduled',
      totalExportsCount: metadata.totalExportsCount + 1,
      scheduledExportsCount: metadata.scheduledExportsCount + 1,
    });

    // Update schedule with exported record IDs (for delta tracking)
    const exportedIds = employees.map(emp => emp.id);
    storage.updateExportSchedule(scheduleId, {
      lastExecuted: executedAt,
      lastExportedRecordIds: exportedIds,
      nextScheduled: calculateNextScheduledTime(schedule),
    });

    // Call webhook if configured
    if (schedule.webhookUrl) {
      webhookCalled = true;
      webhookSuccess = await callWebhook(
        schedule.webhookUrl,
        {
          scheduleId: schedule.id,
          scheduleName: schedule.name,
          executedAt,
          success: true,
          employeeCount: employees.length,
          filename,
          exportType: schedule.exportType,
          filepath: filepath,
        },
        schedule.webhookOAuth
      );
    }

    // Log execution
    storage.addExportLog({
      id: generateId(),
      scheduleId,
      executedAt,
      success: true,
      employeeCount: employees.length,
      filename,
      exportType: schedule.exportType,
      webhookCalled,
      webhookSuccess,
    });

    console.log(`Export executed: ${filename} (${employees.length} employees, type: ${schedule.exportType})`);
    if (webhookCalled) {
      console.log(`Webhook called: ${schedule.webhookUrl} - ${webhookSuccess ? 'Success' : 'Failed'}`);
    }

    return { success: true, filename, count: employees.length };
  } catch (error) {
    console.error('Export failed:', error);

    // Log failure
    storage.addExportLog({
      id: generateId(),
      scheduleId,
      executedAt,
      success: false,
      employeeCount: 0,
      filename: '',
      exportType: schedule.exportType,
      webhookCalled,
      webhookSuccess,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Filter records for delta export (only records created/updated since last export)
function filterDeltaRecords(employees: Employee[], schedule: ExportSchedule): Employee[] {
  if (!schedule.lastExecuted) {
    // First time running, export all records
    return employees;
  }

  const lastExportTime = new Date(schedule.lastExecuted);
  const lastExportedIds = new Set(schedule.lastExportedRecordIds || []);

  return employees.filter(emp => {
    // Include if created after last export
    const createdAt = new Date(emp.createdAt);
    if (createdAt > lastExportTime) {
      return true;
    }

    // Include if updated after last export
    const updatedAt = new Date(emp.updatedAt);
    if (updatedAt > lastExportTime) {
      return true;
    }

    // Include if was in last export but now has different data (updated)
    if (lastExportedIds.has(emp.id)) {
      const updatedAfterExport = updatedAt > lastExportTime;
      return updatedAfterExport;
    }

    return false;
  });
}

// Get OAuth access token (with caching)
async function getOAuthToken(oauthConfig: OAuthConfig): Promise<string | null> {
  const cacheKey = `${oauthConfig.clientId}:${oauthConfig.tokenUrl}`;

  // Check cache
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    console.log('Using cached OAuth token');
    return cached.accessToken;
  }

  try {
    console.log(`Requesting OAuth token from ${oauthConfig.tokenUrl}`);

    // Request new token using client credentials flow
    const tokenResponse = await fetch(oauthConfig.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${oauthConfig.clientId}:${oauthConfig.clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        ...(oauthConfig.scope && { scope: oauthConfig.scope }),
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('OAuth token request failed:', tokenResponse.status, errorText);
      return null;
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in || 3600; // Default 1 hour

    // Cache token (with 5 minute buffer before expiry)
    const expiresAt = Date.now() + (expiresIn - 300) * 1000;
    tokenCache.set(cacheKey, { accessToken, expiresAt });

    console.log('OAuth token acquired successfully');
    return accessToken;
  } catch (error) {
    console.error('OAuth token acquisition failed:', error);
    return null;
  }
}

// Call webhook with export details
async function callWebhook(
  webhookUrl: string,
  payload: any,
  oauthConfig?: OAuthConfig
): Promise<boolean> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'HRMIS-Export-Scheduler/1.0',
    };

    // Get OAuth token if configured
    if (oauthConfig) {
      const token = await getOAuthToken(oauthConfig);
      if (!token) {
        console.error('Failed to acquire OAuth token for webhook');
        return false;
      }
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Webhook call failed: ${response.status} ${errorText}`);
    }

    return response.ok;
  } catch (error) {
    console.error('Webhook call failed:', error);
    return false;
  }
}

function applyFilters(employees: Employee[], filters: ExportSchedule['filters']): Employee[] {
  return employees.filter(emp => {
    // Search filter
    if (filters.search) {
      const search = filters.search.toLowerCase();
      const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
      const email = emp.email.toLowerCase();
      if (!fullName.includes(search) && !email.includes(search)) {
        return false;
      }
    }

    // Status filter
    if (filters.status && filters.status !== 'all' && emp.status !== filters.status) {
      return false;
    }

    // Type filter
    if (filters.type && filters.type !== 'all' && emp.type !== filters.type) {
      return false;
    }

    // Department filter
    if (filters.department && filters.department !== 'all' && emp.department !== filters.department) {
      return false;
    }

    // Date range filter
    if (filters.fromDate && emp.startDate < filters.fromDate) {
      return false;
    }
    if (filters.toDate && emp.startDate > filters.toDate) {
      return false;
    }

    return true;
  });
}

// Initialize all schedules on server start
export function initializeScheduler() {
  const schedules = storage.getExportSchedules();
  console.log(`Initializing scheduler with ${schedules.length} schedules`);
  schedules.forEach(schedule => {
    if (schedule.enabled) {
      registerSchedule(schedule);
    }
  });
}
