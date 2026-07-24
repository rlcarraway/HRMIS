'use client';

import { useState } from 'react';
import { useAuditLogs, AuditLogEntry, AuditLogFilters } from '@/hooks/useAuditLogs';
import { AuditLogFilterPanel } from '@/components/audit-log/AuditLogFilterPanel';
import { Table, Column } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';

const LIMIT = 50;

const LEVEL_BADGE_COLORS: Record<string, string> = {
  success: 'bg-green-100 text-green-800',
  error: 'bg-red-100 text-red-800',
  warning: 'bg-yellow-100 text-yellow-800',
  info: 'bg-blue-100 text-blue-800',
};

export default function AuditLogPage() {
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [page, setPage] = useState(0);

  const handleFilterChange = (newFilters: AuditLogFilters) => {
    setFilters(newFilters);
    setPage(0);
  };

  const { logs, total, loading } = useAuditLogs(filters, page, LIMIT);

  const columns: Column<AuditLogEntry>[] = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      render: (log) => new Date(log.timestamp).toLocaleString(),
    },
    {
      key: 'level',
      header: 'Level',
      render: (log) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${LEVEL_BADGE_COLORS[log.level] || LEVEL_BADGE_COLORS.info}`}>
          {log.level}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (log) => <span className="font-mono">{log.action}</span>,
    },
    {
      key: 'user',
      header: 'User',
      render: (log) => log.userName || log.userEmail || '-',
    },
    {
      key: 'description',
      header: 'Description',
      render: (log) => (
        <div className="max-w-md">
          <div className="truncate" title={log.description}>
            {log.description}
          </div>
          {log.errorMessage && (
            <div className="text-xs text-red-600 mt-1 truncate" title={log.errorMessage}>
              Error: {log.errorMessage}
            </div>
          )}
          {log.details && Object.keys(log.details).length > 0 && (
            <details className="mt-2">
              <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                View Details
              </summary>
              <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto max-h-40">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            </details>
          )}
        </div>
      ),
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (log) => (log.duration ? `${log.duration}ms` : '-'),
    },
    {
      key: 'success',
      header: 'Status',
      render: (log) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${log.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {log.success ? 'Success' : 'Failed'}
        </span>
      ),
    },
  ];

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-sm text-gray-600 mt-1">
          View detailed audit trail of all system operations including user actions, API calls, and configuration changes.
        </p>
      </div>

      <AuditLogFilterPanel onFilterChange={handleFilterChange} />

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <p className="text-sm text-gray-600">
            Showing {logs.length} of {total} log entries
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading audit logs...</div>
        ) : (
          <Table
            data={logs}
            columns={columns}
            emptyMessage="No audit log entries found"
          />
        )}

        {logs.length > 0 && (
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Page {page + 1} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                onClick={() => setPage(page + 1)}
                disabled={(page + 1) * LIMIT >= total}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
