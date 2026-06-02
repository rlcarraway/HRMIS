import { Employee } from './types';
import { formatDate } from './utils';

// Convert employees to CSV format
export function exportToCSV(employees: Employee[]): string {
  if (employees.length === 0) return '';

  // Get all custom attribute keys
  const customAttrKeys = new Set<string>();
  employees.forEach(emp => {
    Object.keys(emp.customAttributes || {}).forEach(key => customAttrKeys.add(key));
  });

  // Define CSV headers
  const headers = [
    'ID',
    'Type',
    'First Name',
    'Last Name',
    'Email',
    'Department',
    'Title',
    'Manager',
    'Status',
    'Start Date',
    'End Date',
    'Created At',
    'Updated At',
    ...Array.from(customAttrKeys),
  ];

  // Build CSV rows
  const rows = employees.map(emp => {
    const baseRow = [
      emp.id,
      emp.type,
      emp.firstName,
      emp.lastName,
      emp.email,
      emp.department,
      emp.title,
      emp.manager,
      emp.status,
      formatDate(emp.startDate, 'yyyy-MM-dd'),
      emp.endDate ? formatDate(emp.endDate, 'yyyy-MM-dd') : '',
      formatDate(emp.createdAt, 'yyyy-MM-dd HH:mm:ss'),
      formatDate(emp.updatedAt, 'yyyy-MM-dd HH:mm:ss'),
    ];

    // Add custom attributes
    const customAttrValues = Array.from(customAttrKeys).map(key => {
      const value = emp.customAttributes?.[key];
      return value !== undefined ? String(value) : '';
    });

    return [...baseRow, ...customAttrValues];
  });

  // Escape CSV values
  const escapeCsvValue = (value: string): string => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  // Build CSV string
  const csvLines = [
    headers.map(escapeCsvValue).join(','),
    ...rows.map(row => row.map(escapeCsvValue).join(',')),
  ];

  return csvLines.join('\n');
}

// Trigger CSV download in browser
export function downloadCSV(employees: Employee[], filename: string = 'employees.csv'): void {
  const csv = exportToCSV(employees);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
