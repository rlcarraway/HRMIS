'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEmployees } from '@/hooks/useEmployees';
import { useCustomAttributes } from '@/hooks/useCustomAttributes';
import { useExportSchedules } from '@/hooks/useExportSchedules';
import { Employee, EmployeeFilters, ExportSchedule } from '@/lib/types';
import { Table, Column } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { FilterPanel } from '@/components/employees/FilterPanel';
import { Modal } from '@/components/ui/Modal';
import { ImportModal } from '@/components/employees/ImportModal';
import { ExportSchedulerModal } from '@/components/employees/ExportSchedulerModal';
import { ExportSchedulesList } from '@/components/employees/ExportSchedulesList';
import { formatDate } from '@/lib/utils';
import { downloadCSV } from '@/lib/export';
import { Plus, Download, Upload, Eye, Edit, Trash2, ChevronDown } from 'lucide-react';
import Link from 'next/link';

export default function EmployeesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { employees, loading, deleteEmployee, bulkCreateEmployees, filterEmployees } = useEmployees();
  const { customAttributes } = useCustomAttributes();
  const { schedules, createSchedule, updateSchedule, deleteSchedule, executeSchedule, refreshMetadata } = useExportSchedules();
  const [filters, setFilters] = useState<EmployeeFilters>({});

  // Apply URL query parameters as initial filters
  useEffect(() => {
    const initialFilters: EmployeeFilters = {};

    const status = searchParams.get('status');
    if (status && (status === 'active' || status === 'inactive' || status === 'terminated')) {
      initialFilters.status = status;
    }

    const type = searchParams.get('type');
    if (type && (type === 'employee' || type === 'contractor')) {
      initialFilters.type = type;
    }

    const department = searchParams.get('department');
    if (department) {
      initialFilters.department = department;
    }

    if (Object.keys(initialFilters).length > 0) {
      setFilters(initialFilters);
    }
  }, [searchParams]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showSchedulerModal, setShowSchedulerModal] = useState(false);
  const [showSchedulesListModal, setShowSchedulesListModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ExportSchedule | undefined>(undefined);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; employee: Employee | null }>({
    isOpen: false,
    employee: null,
  });

  const filteredEmployees = useMemo(() => {
    return filterEmployees(filters);
  }, [employees, filters, filterEmployees]);

  const departments = useMemo(() => {
    return Array.from(new Set(employees.map(emp => emp.department))).sort();
  }, [employees]);

  const handleDelete = () => {
    if (deleteModal.employee) {
      deleteEmployee(deleteModal.employee.id);
      setDeleteModal({ isOpen: false, employee: null });
    }
  };

  const handleExport = async () => {
    downloadCSV(filteredEmployees, `employees-${new Date().toISOString().split('T')[0]}.csv`);

    // Update metadata via API
    try {
      await fetch('/api/export-metadata', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lastExportTimestamp: new Date().toISOString(),
          lastExportCount: filteredEmployees.length,
          lastExportType: 'manual',
        }),
      });
      refreshMetadata();
    } catch (error) {
      console.error('Failed to update export metadata:', error);
    }

    setShowExportMenu(false);
  };

  const handleImport = (employees: Array<Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>>) => {
    bulkCreateEmployees(employees);
  };

  const handleScheduleExport = async (scheduleData: Omit<ExportSchedule, 'id' | 'createdAt' | 'updatedAt' | 'nextScheduled' | 'lastExecuted' | 'lastExportedRecordIds'>) => {
    if (editingSchedule) {
      await updateSchedule(editingSchedule.id, scheduleData);
    } else {
      await createSchedule(scheduleData);
    }
    setShowSchedulerModal(false);
    setEditingSchedule(undefined);
  };

  const handleScheduleAndRunNow = async (scheduleData: Omit<ExportSchedule, 'id' | 'createdAt' | 'updatedAt' | 'nextScheduled' | 'lastExecuted' | 'lastExportedRecordIds'>) => {
    const schedule = await createSchedule(scheduleData);
    await executeSchedule(schedule.id);
    setShowSchedulerModal(false);
  };

  const handleEditSchedule = (schedule: ExportSchedule) => {
    setEditingSchedule(schedule);
    setShowSchedulesListModal(false);
    setShowSchedulerModal(true);
  };

  const getStatusBadge = (status: Employee['status']) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-amber-100 text-amber-800',
      terminated: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status]}`}>
        {status}
      </span>
    );
  };

  const getTypeBadge = (type: Employee['type']) => {
    const colors = {
      employee: 'bg-blue-100 text-blue-800',
      contractor: 'bg-purple-100 text-purple-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[type]}`}>
        {type}
      </span>
    );
  };

  const columns: Column<Employee>[] = [
    {
      key: 'firstName',
      header: 'Name',
      sortable: true,
      render: (emp) => `${emp.firstName} ${emp.lastName}`,
    },
    {
      key: 'email',
      header: 'Email',
      sortable: true,
    },
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      render: (emp) => getTypeBadge(emp.type),
    },
    {
      key: 'department',
      header: 'Department',
      sortable: true,
    },
    {
      key: 'title',
      header: 'Title',
      sortable: true,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (emp) => getStatusBadge(emp.status),
    },
    {
      key: 'startDate',
      header: 'Start Date',
      sortable: true,
      render: (emp) => formatDate(emp.startDate),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (emp) => (
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/employees/${emp.id}`);
            }}
            className="text-blue-600 hover:text-blue-800"
            title="View"
          >
            <Eye size={18} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/employees/${emp.id}`);
            }}
            className="text-green-600 hover:text-green-800"
            title="Edit"
          >
            <Edit size={18} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteModal({ isOpen: true, employee: emp });
            }}
            className="text-red-600 hover:text-red-800"
            title="Delete"
          >
            <Trash2 size={18} />
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Employees</h1>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => setShowImportModal(true)}>
            <Upload size={18} className="mr-2" />
            Import CSV
          </Button>

          {/* Export dropdown menu */}
          <div className="relative">
            <Button
              variant="ghost"
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={filteredEmployees.length === 0}
            >
              <Download size={18} className="mr-2" />
              Export CSV
              <ChevronDown size={16} className="ml-1" />
            </Button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                <button
                  onClick={handleExport}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Export Now
                </button>
                <button
                  onClick={() => {
                    setShowExportMenu(false);
                    setShowSchedulerModal(true);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Schedule Export
                </button>
                <button
                  onClick={() => {
                    setShowExportMenu(false);
                    setShowSchedulesListModal(true);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  View Schedules ({schedules.length})
                </button>
              </div>
            )}
          </div>

          <Link href="/employees/new">
            <Button variant="primary">
              <Plus size={18} className="mr-2" />
              Add Employee
            </Button>
          </Link>
        </div>
      </div>

      <FilterPanel onFilterChange={setFilters} departments={departments} initialFilters={filters} />

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <p className="text-sm text-gray-600">
            Showing {filteredEmployees.length} of {employees.length} employees
          </p>
        </div>
        <Table
          data={filteredEmployees}
          columns={columns}
          onRowClick={(emp) => router.push(`/employees/${emp.id}`)}
          emptyMessage="No employees found. Add your first employee to get started."
        />
      </div>

      {/* Import Modal */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        customAttributes={customAttributes}
        onImport={handleImport}
      />

      {/* Export Scheduler Modal */}
      <ExportSchedulerModal
        isOpen={showSchedulerModal}
        onClose={() => {
          setShowSchedulerModal(false);
          setEditingSchedule(undefined);
        }}
        onSave={handleScheduleExport}
        onScheduleNow={handleScheduleAndRunNow}
        initialSchedule={editingSchedule}
        currentFilters={filters}
      />

      {/* Export Schedules List Modal */}
      <ExportSchedulesList
        isOpen={showSchedulesListModal}
        onClose={() => setShowSchedulesListModal(false)}
        schedules={schedules}
        onEdit={handleEditSchedule}
        onDelete={deleteSchedule}
        onExecute={executeSchedule}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, employee: null })}
        title="Delete Employee"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteModal({ isOpen: false, employee: null })}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-gray-700">
          Are you sure you want to delete{' '}
          <strong>
            {deleteModal.employee?.firstName} {deleteModal.employee?.lastName}
          </strong>
          ? This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
