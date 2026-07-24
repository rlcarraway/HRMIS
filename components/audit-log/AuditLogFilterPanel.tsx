'use client';

import { useState, useEffect } from 'react';
import { AuditLogFilters } from '@/hooks/useAuditLogs';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Filter, X } from 'lucide-react';

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'user.create', label: 'User: Create' },
  { value: 'user.update', label: 'User: Update' },
  { value: 'user.delete', label: 'User: Delete' },
  { value: 'user.login', label: 'User: Login' },
  { value: 'user.logout', label: 'User: Logout' },
  { value: 'user.role_change', label: 'User: Role Change' },
  { value: 'employee.create', label: 'Employee: Create' },
  { value: 'employee.update', label: 'Employee: Update' },
  { value: 'employee.delete', label: 'Employee: Delete' },
  { value: 'employee.view', label: 'Employee: View' },
  { value: 'employee.export', label: 'Employee: Export' },
  { value: 'employee.import', label: 'Employee: Import' },
  { value: 'api.outbound.call', label: 'API: Outbound Call' },
  { value: 'api.outbound.success', label: 'API: Outbound Success' },
  { value: 'api.outbound.failure', label: 'API: Outbound Failure' },
  { value: 'api.inbound.request', label: 'API: Inbound Request' },
  { value: 'api.inbound.success', label: 'API: Inbound Success' },
  { value: 'api.inbound.failure', label: 'API: Inbound Failure' },
  { value: 'config.okta.update', label: 'Config: Okta Update' },
  { value: 'config.outbound_api.update', label: 'Config: Outbound API Update' },
  { value: 'config.attribute.create', label: 'Config: Attribute Create' },
  { value: 'config.attribute.update', label: 'Config: Attribute Update' },
  { value: 'config.attribute.delete', label: 'Config: Attribute Delete' },
  { value: 'config.logo.upload', label: 'Config: Logo Upload' },
  { value: 'config.logo.remove', label: 'Config: Logo Remove' },
  { value: 'config.export_schedule.create', label: 'Config: Export Schedule Create' },
  { value: 'config.export_schedule.update', label: 'Config: Export Schedule Update' },
  { value: 'config.export_schedule.delete', label: 'Config: Export Schedule Delete' },
  { value: 'system.startup', label: 'System: Startup' },
  { value: 'system.error', label: 'System: Error' },
];

const DEFAULT_FILTERS: AuditLogFilters = {
  search: '',
  action: '',
  level: undefined,
  success: 'all',
  fromDate: '',
  toDate: '',
};

interface AuditLogFilterPanelProps {
  onFilterChange: (filters: AuditLogFilters) => void;
  initialFilters?: AuditLogFilters;
}

export function AuditLogFilterPanel({ onFilterChange, initialFilters }: AuditLogFilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<AuditLogFilters>(DEFAULT_FILTERS);

  // Only run on mount, mirroring FilterPanel's initial-filters behavior
  useEffect(() => {
    if (initialFilters && Object.keys(initialFilters).length > 0) {
      setFilters({ ...DEFAULT_FILTERS, ...initialFilters });
      setIsOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = (field: keyof AuditLogFilters, value: any) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    onFilterChange(DEFAULT_FILTERS);
  };

  const hasActiveFilters = !!(
    filters.search || filters.action || filters.level ||
    (filters.success && filters.success !== 'all') ||
    filters.fromDate || filters.toDate
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 flex items-center justify-between">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium"
        >
          <Filter size={20} />
          Filters
          {hasActiveFilters && (
            <span className="bg-primary text-white text-xs px-2 py-0.5 rounded-full">
              Active
            </span>
          )}
        </button>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X size={16} className="mr-1" />
            Clear All
          </Button>
        )}
      </div>

      {isOpen && (
        <div className="p-4 border-t border-gray-200 space-y-4">
          <Input
            label="Search"
            placeholder="Search by description, action, user, or error message..."
            value={filters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Action"
              value={filters.action || ''}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              options={ACTION_OPTIONS}
            />

            <Select
              label="Level"
              value={filters.level || ''}
              onChange={(e) => handleFilterChange('level', e.target.value || undefined)}
              options={[
                { value: '', label: 'All Levels' },
                { value: 'success', label: 'Success' },
                { value: 'info', label: 'Info' },
                { value: 'warning', label: 'Warning' },
                { value: 'error', label: 'Error' },
              ]}
            />

            <Select
              label="Status"
              value={filters.success || 'all'}
              onChange={(e) => handleFilterChange('success', e.target.value)}
              options={[
                { value: 'all', label: 'All' },
                { value: 'true', label: 'Success' },
                { value: 'false', label: 'Failed' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="From Date"
              type="datetime-local"
              value={filters.fromDate || ''}
              onChange={(e) => handleFilterChange('fromDate', e.target.value)}
            />

            <Input
              label="To Date"
              type="datetime-local"
              value={filters.toDate || ''}
              onChange={(e) => handleFilterChange('toDate', e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
