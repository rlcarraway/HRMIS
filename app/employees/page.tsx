'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEmployees } from '@/hooks/useEmployees';
import { useCustomAttributes } from '@/hooks/useCustomAttributes';
import { useExportSchedules } from '@/hooks/useExportSchedules';
import { Employee, EmployeeFilters, ExportSchedule } from '@/lib/types';
import { Table, Column } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { FilterPanel } from '@/components/employees/FilterPanel';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { ImportModal } from '@/components/employees/ImportModal';
import { ExportSchedulerModal } from '@/components/employees/ExportSchedulerModal';
import { ExportSchedulesList } from '@/components/employees/ExportSchedulesList';
import { formatDate } from '@/lib/utils';
import { downloadCSV } from '@/lib/export';
import { Plus, Download, Upload, Eye, Edit, Trash2, ChevronDown, Columns, FlaskConical } from 'lucide-react';
import Link from 'next/link';
import { ColumnCustomizer } from '@/components/employees/ColumnCustomizer';
import { canManageEmployees } from '@/lib/authTypes';
import { FIRST_NAMES, LAST_NAMES, DEPARTMENTS, TITLES_BY_DEPARTMENT, COMMON_MANAGERS, getRandomItem, getRandomDate, getFutureDate } from '@/lib/testDataNames';

export default function EmployeesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { employees, loading, deleteEmployee, bulkCreateEmployees, filterEmployees } = useEmployees();
  const { customAttributes } = useCustomAttributes();
  const { schedules, createSchedule, updateSchedule, deleteSchedule, executeSchedule, refreshMetadata } = useExportSchedules();
  const [filters, setFilters] = useState<EmployeeFilters>({});
  const [showColumnCustomizer, setShowColumnCustomizer] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});

  const isAdmin = canManageEmployees(session as any);

  // Load column preferences from localStorage
  useEffect(() => {
    const savedColumns = localStorage.getItem('employeeTableColumns');
    const savedWidths = localStorage.getItem('employeeTableWidths');

    if (savedColumns) {
      setVisibleColumns(JSON.parse(savedColumns));
    } else {
      // Default visible columns
      setVisibleColumns(['firstName', 'email', 'type', 'department', 'title', 'status', 'startDate', 'actions']);
    }

    if (savedWidths) {
      setColumnWidths(JSON.parse(savedWidths));
    }
  }, []);

  // Apply URL query parameters as initial filters
  useEffect(() => {
    const initialFilters: EmployeeFilters = {};

    const status = searchParams.get('status');
    if (status && (status === 'active' || status === 'inactive' || status === 'terminated')) {
      initialFilters.status = status;
    }

    const type = searchParams.get('type');
    if (type) {
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
  const [showTestDataModal, setShowTestDataModal] = useState(false);
  const [testDataTab, setTestDataTab] = useState<'generate' | 'delete'>('generate');
  const [testDataCount, setTestDataCount] = useState<string>('10');
  const [generatingTestData, setGeneratingTestData] = useState(false);
  const [bulkDeleteFilters, setBulkDeleteFilters] = useState<EmployeeFilters>({});
  const [bulkDeletePreview, setBulkDeletePreview] = useState<Employee[]>([]);
  const [_showOperationsMenu, _setShowOperationsMenu] = useState(false);

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

      // Log the export operation
      await fetch('/api/employee-operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'export',
          count: filteredEmployees.length,
          details: {
            exportType: 'manual',
            filterApplied: Object.keys(filters).length > 0,
          },
        }),
      });
    } catch (error) {
      console.error('Failed to update export metadata:', error);
    }

    setShowExportMenu(false);
  };

  const handleImport = async (employees: Array<Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>>) => {
    const created = await bulkCreateEmployees(employees);

    // Log the import operation
    try {
      await fetch('/api/employee-operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'import',
          count: created.length,
          details: {
            totalRows: employees.length,
            successfulRows: created.length,
            failedRows: employees.length - created.length,
          },
        }),
      });
    } catch (error) {
      console.error('Failed to log import operation:', error);
    }
  };

  const generateTestData = async () => {
    const count = parseInt(testDataCount, 10);
    if (isNaN(count) || count < 1 || count > 1000) {
      alert('Please enter a valid number between 1 and 1000');
      return;
    }

    setGeneratingTestData(true);

    try {
      const testEmployees: Array<Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>> = [];

      for (let i = 0; i < count; i++) {
        const firstName = getRandomItem(FIRST_NAMES);
        const lastName = getRandomItem(LAST_NAMES);
        const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
        const department = getRandomItem(DEPARTMENTS);
        const titles = TITLES_BY_DEPARTMENT[department] || ['Employee'];
        const title = getRandomItem(titles);
        const status = getRandomItem(['active', 'active', 'active', 'inactive'] as const);
        const type = getRandomItem(['employee', 'employee', 'employee', 'contractor'] as const);
        const startDate = getRandomDate(2020, 2024);
        const manager = getRandomItem(COMMON_MANAGERS);

        const employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'> = {
          type,
          firstName,
          lastName,
          email,
          department,
          title,
          manager,
          status,
          startDate,
          customAttributes: {},
        };

        // Add end date for contractors
        if (type === 'contractor') {
          employee.endDate = getFutureDate(6 + Math.floor(Math.random() * 18)); // 6-24 months
        }

        testEmployees.push(employee);
      }

      const created = await bulkCreateEmployees(testEmployees);

      // Log the operation
      await fetch('/api/employee-operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'import',
          count: created.length,
          details: {
            type: 'test_data_generation',
            totalRows: testEmployees.length,
            successfulRows: created.length,
          },
        }),
      });

      setShowTestDataModal(false);
      setTestDataCount('10');
    } catch (error) {
      console.error('Error generating test data:', error);
      alert('Failed to generate test data');
    } finally {
      setGeneratingTestData(false);
    }
  };

  const handleBulkDelete = async () => {
    if (bulkDeletePreview.length === 0) {
      alert('No employees match the selected filters');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${bulkDeletePreview.length} employee(s)? This cannot be undone.`)) {
      return;
    }

    for (const emp of bulkDeletePreview) {
      await deleteEmployee(emp.id);
    }

    setShowTestDataModal(false);
    setTestDataTab('generate');
    setBulkDeleteFilters({});
    setBulkDeletePreview([]);
  };

  const handleCloseTestDataModal = () => {
    setShowTestDataModal(false);
    setTestDataTab('generate');
    setBulkDeleteFilters({});
    setBulkDeletePreview([]);
    setTestDataCount('10');
  };

  // Update bulk delete preview when filters change
  useEffect(() => {
    if (showTestDataModal && testDataTab === 'delete') {
      const preview = filterEmployees(bulkDeleteFilters);
      setBulkDeletePreview(preview);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulkDeleteFilters, showTestDataModal, testDataTab]);

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

  const handleColumnToggle = (columnKey: string) => {
    setVisibleColumns(prev => {
      const newColumns = prev.includes(columnKey)
        ? prev.filter(key => key !== columnKey)
        : [...prev, columnKey];
      localStorage.setItem('employeeTableColumns', JSON.stringify(newColumns));
      return newColumns;
    });
  };

  const handleColumnReorder = (fromIndex: number, toIndex: number) => {
    setVisibleColumns(prev => {
      const newColumns = [...prev];
      const [removed] = newColumns.splice(fromIndex, 1);
      newColumns.splice(toIndex, 0, removed);
      localStorage.setItem('employeeTableColumns', JSON.stringify(newColumns));
      return newColumns;
    });
  };

  const handleColumnWidthChange = (columnKey: string, width: number) => {
    setColumnWidths(prev => {
      const newWidths = { ...prev, [columnKey]: width };
      localStorage.setItem('employeeTableWidths', JSON.stringify(newWidths));
      return newWidths;
    });
  };

  const handleResetColumns = () => {
    const defaultColumns = ['firstName', 'email', 'type', 'department', 'title', 'status', 'startDate', 'actions'];
    setVisibleColumns(defaultColumns);
    setColumnWidths({});
    localStorage.removeItem('employeeTableColumns');
    localStorage.removeItem('employeeTableWidths');
  };

  const getTypeBadge = (type: Employee['type']) => {
    const colors: Record<string, string> = {
      employee: 'bg-blue-100 text-blue-800',
      contractor: 'bg-purple-100 text-purple-800',
    };
    // Use mapped color or default gray for custom types
    const colorClass = colors[type.toLowerCase()] || 'bg-gray-100 text-gray-800';
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
        {type}
      </span>
    );
  };

  // All available columns including custom attributes
  const allColumns: Column<Employee>[] = [
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
      key: 'endDate',
      header: 'End Date',
      sortable: true,
      render: (emp) => emp.endDate ? formatDate(emp.endDate) : '-',
    },
    {
      key: 'manager',
      header: 'Manager',
      sortable: true,
    },
    // Custom attribute columns
    ...customAttributes.map(attr => ({
      key: `custom_${attr.id}`,
      header: attr.name,
      sortable: true,
      render: (emp: Employee) => {
        const value = emp.customAttributes?.[attr.name];
        if (value === undefined || value === null) return '-';
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        if (attr.dataType === 'date' && typeof value === 'string') return formatDate(value);
        if (attr.dataType === 'currency' && typeof value === 'number') return `$${value.toLocaleString()}`;
        return String(value);
      },
    })),
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
            className="p-2 bg-blue-100 text-blue-700 hover:bg-blue-200 hover:text-blue-900 rounded-lg transition-colors"
            title="View"
          >
            <Eye size={18} />
          </button>
          {isAdmin && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/employees/${emp.id}`);
                }}
                className="p-2 bg-green-100 text-green-700 hover:bg-green-200 hover:text-green-900 rounded-lg transition-colors"
                title="Edit"
              >
                <Edit size={18} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteModal({ isOpen: true, employee: emp });
                }}
                className="p-2 bg-red-100 text-red-700 hover:bg-red-200 hover:text-red-900 rounded-lg transition-colors"
                title="Delete"
              >
                <Trash2 size={18} />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  // Filter columns based on visibility settings
  const displayedColumns = allColumns.filter(col => visibleColumns.includes(col.key));

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
        <h1 className="text-3xl font-bold text-gray-900">Manage Employees</h1>
        <div className="flex gap-3">
          {isAdmin && (
            <>
              <Link href="/settings?tab=attributes">
                <Button variant="secondary">Manage Custom Attributes</Button>
              </Link>
              <Button variant="secondary" onClick={() => setShowImportModal(true)}>
                <Upload size={18} className="mr-2" />
                Import CSV
              </Button>

              {/* Export dropdown menu */}
              <div className="relative">
                <Button
                  variant="secondary"
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

              <Button variant="secondary" onClick={() => setShowTestDataModal(true)}>
                <FlaskConical size={18} className="mr-2" />
                Bulk Data
              </Button>

              <Link href="/employees/new">
                <Button variant="primary">
                  <Plus size={18} className="mr-2" />
                  Add Employee
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <FilterPanel onFilterChange={setFilters} departments={departments} initialFilters={filters} />
        </div>
        <div className="flex items-start">
          <Button variant="secondary" onClick={() => setShowColumnCustomizer(true)}>
            <Columns size={18} className="mr-2" />
            Customize Columns
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <p className="text-sm text-gray-600">
            Showing {filteredEmployees.length} of {employees.length} employees
          </p>
        </div>
        <Table
          data={filteredEmployees}
          columns={displayedColumns}
          onRowClick={(emp) => router.push(`/employees/${emp.id}`)}
          emptyMessage="No employees found. Add your first employee to get started."
          resizable={true}
          columnWidths={columnWidths}
          onColumnWidthChange={handleColumnWidthChange}
        />
      </div>

      {/* Column Customizer Modal */}
      <ColumnCustomizer
        isOpen={showColumnCustomizer}
        onClose={() => setShowColumnCustomizer(false)}
        availableColumns={allColumns}
        visibleColumns={visibleColumns}
        onColumnToggle={handleColumnToggle}
        onReorder={handleColumnReorder}
        onReset={handleResetColumns}
      />

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

      {/* Test Data Management Modal */}
      <Modal
        isOpen={showTestDataModal}
        onClose={handleCloseTestDataModal}
        title="Bulk Data Management"
        footer={
          testDataTab === 'generate' ? (
            <>
              <Button variant="ghost" onClick={handleCloseTestDataModal}>
                Cancel
              </Button>
              <Button variant="primary" onClick={generateTestData} disabled={generatingTestData}>
                {generatingTestData ? 'Generating...' : 'Generate'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={handleCloseTestDataModal}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleBulkDelete}
                disabled={bulkDeletePreview.length === 0}
              >
                Delete {bulkDeletePreview.length} Employee(s)
              </Button>
            </>
          )
        }
      >
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setTestDataTab('generate')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                testDataTab === 'generate'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Generate Data
            </button>
            <button
              onClick={() => setTestDataTab('delete')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                testDataTab === 'delete'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Bulk Delete
            </button>
          </div>

          {/* Generate Tab Content */}
          {testDataTab === 'generate' && (
            <div className="space-y-4">
              <p className="text-gray-700">
                Generate random employee records for testing purposes. Each employee will have:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 ml-4">
                <li>Random first and last name from a pool of 300+ names</li>
                <li>Email address formatted as firstname.lastname@example.com</li>
                <li>Random department and appropriate job title</li>
                <li>Random status (mostly active)</li>
                <li>Random start date (2020-2024)</li>
                <li>End date for contractors (6-24 months from now)</li>
              </ul>
              <Input
                label="Number of Employees (1-1000)"
                type="number"
                value={testDataCount}
                onChange={(e) => setTestDataCount(e.target.value)}
                min="1"
                max="1000"
              />
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  This will create {testDataCount} new employee records in the system.
                </p>
              </div>
            </div>
          )}

          {/* Delete Tab Content */}
          {testDataTab === 'delete' && (
            <div className="space-y-4">
              <p className="text-gray-700">
                Select filters to identify employees to delete. Preview the results before confirming.
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800 font-semibold">
                  Warning: This action cannot be undone!
                </p>
              </div>
              <FilterPanel
                onFilterChange={setBulkDeleteFilters}
                departments={departments}
                initialFilters={bulkDeleteFilters}
              />
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Preview</h3>
                <p className="text-sm text-gray-600 mb-2">
                  {bulkDeletePreview.length} employee(s) will be deleted
                </p>
                {bulkDeletePreview.length > 0 && (
                  <div className="max-h-60 overflow-y-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left">Name</th>
                          <th className="px-3 py-2 text-left">Email</th>
                          <th className="px-3 py-2 text-left">Department</th>
                          <th className="px-3 py-2 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {bulkDeletePreview.map((emp) => (
                          <tr key={emp.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2">{emp.firstName} {emp.lastName}</td>
                            <td className="px-3 py-2">{emp.email}</td>
                            <td className="px-3 py-2">{emp.department}</td>
                            <td className="px-3 py-2">{emp.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>

    </div>
  );
}
