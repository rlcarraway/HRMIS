import cron, { ScheduledTask } from 'node-cron';
import { storage } from './storage';
import { exportToCSV } from './export';
import { ExportSchedule, Employee } from './types';
import { calculateNextScheduledTime, generateId } from './utils';
import fs from 'fs';
import path from 'path';

const activeJobs = new Map<string, ScheduledTask>();

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
    const filepath = path.join(process.cwd(), 'exports', filename);

    // Ensure exports directory exists
    fs.mkdirSync(path.join(process.cwd(), 'exports'), { recursive: true });
    fs.writeFileSync(filepath, csv);

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
      webhookSuccess = await callWebhook(schedule.webhookUrl, {
        scheduleId: schedule.id,
        scheduleName: schedule.name,
        executedAt,
        success: true,
        employeeCount: employees.length,
        filename,
        exportType: schedule.exportType,
        filepath: filepath,
      });
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

// Call webhook with export details
async function callWebhook(webhookUrl: string, payload: any): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'HRMIS-Export-Scheduler/1.0',
      },
      body: JSON.stringify(payload),
    });

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
