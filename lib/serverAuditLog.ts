// Server-side audit log system stored in Supabase
import { serverStorage } from './serverStorage';

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

// Add a log entry
export async function addAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
  await serverStorage.addAuditLog({
    action: entry.action,
    level: entry.level,
    userId: entry.userId,
    userName: entry.userName,
    userEmail: entry.userEmail,
    description: entry.description,
    details: entry.details,
    ipAddress: entry.ipAddress,
    userAgent: entry.userAgent,
    duration: entry.duration,
    success: entry.success,
    errorMessage: entry.errorMessage,
  });
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

export async function getAuditLogs(filter?: AuditLogFilter): Promise<{ logs: AuditLogEntry[]; total: number }> {
  const result = await serverStorage.getAuditLogs(filter);
  return {
    logs: result.logs as AuditLogEntry[],
    total: result.total,
  };
}

// Get audit log by ID
export async function getAuditLogById(id: string): Promise<AuditLogEntry | undefined> {
  const result = await serverStorage.getAuditLogs({ limit: 1 });
  return result.logs.find(log => log.id === id) as AuditLogEntry | undefined;
}

// Clear old logs (older than specified days)
export async function clearOldLogs(daysToKeep: number): Promise<number> {
  const deletedCount = await serverStorage.clearOldAuditLogs(daysToKeep);

  if (deletedCount > 0) {
    // Log the cleanup action
    await addAuditLog({
      action: 'system.startup',
      level: 'info',
      description: `Cleared ${deletedCount} old audit log entries (older than ${daysToKeep} days)`,
      success: true,
    });
  }

  return deletedCount;
}

// Helper function to log user actions
export async function logUserAction(
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
): Promise<void> {
  await addAuditLog({
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
export async function logApiCall(
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
): Promise<void> {
  await addAuditLog({
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
export async function logConfigChange(
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
): Promise<void> {
  await addAuditLog({
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
export async function getAuditLogStats(): Promise<{
  total: number;
  byLevel: Record<AuditLevel, number>;
  byAction: Record<string, number>;
  successRate: number;
}> {
  const result = await serverStorage.getAuditLogs({});
  const logs = result.logs;

  const byLevel: Record<AuditLevel, number> = {
    info: 0,
    success: 0,
    warning: 0,
    error: 0,
  };

  const byAction: Record<string, number> = {};
  let successCount = 0;

  logs.forEach(log => {
    byLevel[log.level as AuditLevel]++;
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
