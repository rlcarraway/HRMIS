'use client';

import { useState } from 'react';
import { EmployeeFilters } from '@/lib/types';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Filter, X } from 'lucide-react';

interface FilterPanelProps {
  onFilterChange: (filters: EmployeeFilters) => void;
  departments: string[];
}

export function FilterPanel({ onFilterChange, departments }: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<EmployeeFilters>({
    search: '',
    status: 'all',
    type: 'all',
    department: '',
    fromDate: '',
    toDate: '',
  });

  const handleFilterChange = (field: keyof EmployeeFilters, value: any) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters: EmployeeFilters = {
      search: '',
      status: 'all',
      type: 'all',
      department: '',
      fromDate: '',
      toDate: '',
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  const hasActiveFilters = filters.search || filters.status !== 'all' || filters.type !== 'all' ||
    filters.department || filters.fromDate || filters.toDate;

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
            placeholder="Search by name or email..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Status"
              value={filters.status || 'all'}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'terminated', label: 'Terminated' },
              ]}
            />

            <Select
              label="Type"
              value={filters.type || 'all'}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              options={[
                { value: 'all', label: 'All Types' },
                { value: 'employee', label: 'Employee' },
                { value: 'contractor', label: 'Contractor' },
              ]}
            />

            <Select
              label="Department"
              value={filters.department || ''}
              onChange={(e) => handleFilterChange('department', e.target.value)}
              options={[
                { value: '', label: 'All Departments' },
                ...departments.map(dept => ({ value: dept, label: dept })),
              ]}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Start Date From"
              type="date"
              value={filters.fromDate}
              onChange={(e) => handleFilterChange('fromDate', e.target.value)}
            />

            <Input
              label="Start Date To"
              type="date"
              value={filters.toDate}
              onChange={(e) => handleFilterChange('toDate', e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
