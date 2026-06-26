// Server-side audit log system
import fs from 'fs';
import path from 'path';

export type AuditAction =
  // User operations
  | 'user.create'
  | 'user.update'
  | 'user.delete'
  | 'user.login'
  | 'user.logout'
  | 'user.role_change'
  // Employee operations
  | 'employee.create'
  | 'employee.update'
  | 'employee.delete'
  | 'employee.view'
  | 'employee.export'
  | 'employee.import'
  // API operations
  | 'api.outbound.call'
  | 'api.outbound.success'
  | 'api.outbound.failure'
  | 'api.inbound.request'
  | 'api.inbound.success'
  | 'api.inbound.failure'
  // Configuration operations
  | 'config.okta.update'
  | 'config.outbound_api.update'
  | 'config.attribute.create'
  | 'config.attribute.update'
  | 'config.attribute.delete'
  | 'config.logo.upload'
  | 'config.logo.remove'
  | 'config.export_schedule.create'
  | 'config.export_schedule.update'
  | 'config.export_schedule.delete'
  // System operations
  | 'system.startup'
  | 'system.error';

export type AuditLevel = 'info' | 'warning' | 'error' | 'success';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: AuditAction;
  level: AuditLevel;
  userId?: string;
  userName?: string;
  userEmail?: string;
  description: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  duration?: number; // in milliseconds
  success: boolean;
  errorMessage?: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const AUDIT_LOG_FILE = path.join(DATA_DIR, 'audit-log.json');

// Maximum number of log entries to keep (prevent file from growing too large)
const MAX_LOG_ENTRIES = 10000;

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Read audit log from file
function readAuditLogFile(): AuditLogEntry[] {
  ensureDataDir();

  try {
    if (fs.existsSync(AUDIT_LOG_FILE)) {
      const data = fs.readFileSync(AUDIT_LOG_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading audit log file:', error);
  }

  return [];
}

// Write audit log to file
function writeAuditLogFile(entries: AuditLogEntry[]): void {
  ensureDataDir();

  try {
    // Keep only the most recent entries to prevent file from growing too large
    const trimmedEntries = entries.slice(-MAX_LOG_ENTRIES);
    fs.writeFileSync(AUDIT_LOG_FILE, JSON.stringify(trimmedEntries, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing audit log file:', error);
    throw error;
  }
}

// Add a log entry
export function addAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
  const logs = readAuditLogFile();

  const newEntry: AuditLogEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };

  logs.push(newEntry);
  writeAuditLogFile(logs);

  return newEntry;
}

// Get audit logs with filtering
export interface AuditLogFilter {
  search?: string;
  action?: AuditAction;
  level?: AuditLevel;
  userId?: string;
  fromDate?: string;
  toDate?: string;
  success?: boolean;
  limit?: number;
  offset?: number;
}

export function getAuditLogs(filter?: AuditLogFilter): { logs: AuditLogEntry[]; total: number } {
  let logs = readAuditLogFile();

  // Apply filters
  if (filter) {
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      logs = logs.filter(log =>
        log.description.toLowerCase().includes(searchLower) ||
        log.action.toLowerCase().includes(searchLower) ||
        log.userName?.toLowerCase().includes(searchLower) ||
        log.userEmail?.toLowerCase().includes(searchLower) ||
        log.errorMessage?.toLowerCase().includes(searchLower)
      );
    }

    if (filter.action) {
      logs = logs.filter(log => log.action === filter.action);
    }

    if (filter.level) {
      logs = logs.filter(log => log.level === filter.level);
    }

    if (filter.userId) {
      logs = logs.filter(log => log.userId === filter.userId);
    }

    if (filter.fromDate) {
      logs = logs.filter(log => log.timestamp >= filter.fromDate!);
    }

    if (filter.toDate) {
      logs = logs.filter(log => log.timestamp <= filter.toDate!);
    }

    if (filter.success !== undefined) {
      logs = logs.filter(log => log.success === filter.success);
    }
  }

  // Sort by timestamp descending (newest first)
  logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const total = logs.length;

  // Apply pagination
  if (filter?.offset !== undefined) {
    logs = logs.slice(filter.offset);
  }

  if (filter?.limit !== undefined) {
    logs = logs.slice(0, filter.limit);
  }

  return { logs, total };
}

// Get audit log by ID
export function getAuditLogById(id: string): AuditLogEntry | undefined {
  const logs = readAuditLogFile();
  return logs.find(log => log.id === id);
}

// Clear old logs (older than specified days)
export function clearOldLogs(daysToKeep: number): number {
  const logs = readAuditLogFile();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const filteredLogs = logs.filter(log => new Date(log.timestamp) >= cutoffDate);
  const deletedCount = logs.length - filteredLogs.length;

  if (deletedCount > 0) {
    writeAuditLogFile(filteredLogs);

    // Log the cleanup action
    addAuditLog({
      action: 'system.startup',
      level: 'info',
      description: `Cleared ${deletedCount} old audit log entries (older than ${daysToKeep} days)`,
      success: true,
    });
  }

  return deletedCount;
}

// Helper function to log user actions
export function logUserAction(
  action: AuditAction,
  description: string,
  options: {
    userId?: string;
    userName?: string;
    userEmail?: string;
    success: boolean;
    level?: AuditLevel;
    details?: Record<string, any>;
    errorMessage?: string;
    duration?: number;
  }
): AuditLogEntry {
  return addAuditLog({
    action,
    description,
    level: options.level || (options.success ? 'success' : 'error'),
    userId: options.userId,
    userName: options.userName,
    userEmail: options.userEmail,
    success: options.success,
    details: options.details,
    errorMessage: options.errorMessage,
    duration: options.duration,
  });
}

// Helper function to log API calls
export function logApiCall(
  action: AuditAction,
  description: string,
  options: {
    userId?: string;
    userName?: string;
    userEmail?: string;
    success: boolean;
    url?: string;
    method?: string;
    statusCode?: number;
    duration?: number;
    errorMessage?: string;
    requestDetails?: Record<string, any>;
    responseDetails?: Record<string, any>;
  }
): AuditLogEntry {
  return addAuditLog({
    action,
    description,
    level: options.success ? 'success' : 'error',
    userId: options.userId,
    userName: options.userName,
    userEmail: options.userEmail,
    success: options.success,
    duration: options.duration,
    errorMessage: options.errorMessage,
    details: {
      url: options.url,
      method: options.method,
      statusCode: options.statusCode,
      request: options.requestDetails,
      response: options.responseDetails,
    },
  });
}

// Helper function to log configuration changes
export function logConfigChange(
  action: AuditAction,
  description: string,
  options: {
    userId?: string;
    userName?: string;
    userEmail?: string;
    oldValue?: any;
    newValue?: any;
    success: boolean;
    errorMessage?: string;
    details?: Record<string, any>;
  }
): AuditLogEntry {
  return addAuditLog({
    action,
    description,
    level: options.success ? 'success' : 'error',
    userId: options.userId,
    userName: options.userName,
    userEmail: options.userEmail,
    success: options.success,
    errorMessage: options.errorMessage,
    details: {
      oldValue: options.oldValue,
      newValue: options.newValue,
      ...options.details,
    },
  });
}

// Get audit log statistics
export function getAuditLogStats(): {
  total: number;
  byLevel: Record<AuditLevel, number>;
  byAction: Record<string, number>;
  successRate: number;
} {
  const logs = readAuditLogFile();

  const byLevel: Record<AuditLevel, number> = {
    info: 0,
    success: 0,
    warning: 0,
    error: 0,
  };

  const byAction: Record<string, number> = {};
  let successCount = 0;

  logs.forEach(log => {
    byLevel[log.level]++;
    byAction[log.action] = (byAction[log.action] || 0) + 1;
    if (log.success) successCount++;
  });

  return {
    total: logs.length,
    byLevel,
    byAction,
    successRate: logs.length > 0 ? (successCount / logs.length) * 100 : 0,
  };
}
