'use client';

import { useCallback, useEffect, useState } from 'react';

export type AuditLevel = 'info' | 'warning' | 'error' | 'success';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  level: AuditLevel;
  userId?: string;
  userName?: string;
  userEmail?: string;
  description: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  duration?: number;
  success: boolean;
  errorMessage?: string;
}

export interface AuditLogFilters {
  search?: string;
  action?: string;
  level?: AuditLevel;
  userId?: string;
  success?: 'all' | 'true' | 'false';
  fromDate?: string;
  toDate?: string;
}

// Server-driven: filters/pagination are sent to the API rather than applied client-side,
// unlike useEmployees which loads everything and filters in memory.
export function useAuditLogs(filters: AuditLogFilters, page: number, limit: number = 50) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.action) params.append('action', filters.action);
      if (filters.level) params.append('level', filters.level);
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.success && filters.success !== 'all') params.append('success', filters.success);
      if (filters.fromDate) params.append('fromDate', filters.fromDate);
      if (filters.toDate) params.append('toDate', filters.toDate);
      params.append('limit', limit.toString());
      params.append('offset', (page * limit).toString());

      const response = await fetch(`/api/audit-logs?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  return { logs, total, loading, refresh: load };
}
