import { Employee, CustomAttribute, ChangeHistory, ExportSchedule, ExportMetadata, ScheduledExportLog, CoreAttributeConfig } from './types';

const STORAGE_KEYS = {
  EMPLOYEES: 'hrmis_employees',
  CUSTOM_ATTRIBUTES: 'hrmis_custom_attributes',
  CORE_ATTRIBUTES: 'hrmis_core_attributes',
  HISTORY: 'hrmis_history',
  EXPORT_SCHEDULES: 'hrmis_export_schedules',
  EXPORT_METADATA: 'hrmis_export_metadata',
  EXPORT_LOGS: 'hrmis_export_logs',
  LOGO: 'hrmis_logo',
} as const;

// Default core attributes configuration
const DEFAULT_CORE_ATTRIBUTES: CoreAttributeConfig[] = [
  { id: '1', fieldName: 'type', displayName: 'Type', dataType: 'select', required: true, options: ['employee', 'contractor'], locked: true },
  { id: '2', fieldName: 'firstName', displayName: 'First Name', dataType: 'string', required: true, locked: true },
  { id: '3', fieldName: 'lastName', displayName: 'Last Name', dataType: 'string', required: true, locked: true },
  { id: '4', fieldName: 'email', displayName: 'Email', dataType: 'string', required: true, locked: true },
  { id: '5', fieldName: 'department', displayName: 'Department', dataType: 'string', required: true },
  { id: '6', fieldName: 'title', displayName: 'Title', dataType: 'string', required: true },
  { id: '7', fieldName: 'manager', displayName: 'Manager', dataType: 'string', required: true },
  { id: '8', fieldName: 'status', displayName: 'Status', dataType: 'select', required: true, options: ['active', 'inactive', 'terminated'], locked: true },
  { id: '9', fieldName: 'startDate', displayName: 'Start Date', dataType: 'date', required: true },
  { id: '10', fieldName: 'endDate', displayName: 'End Date', dataType: 'date', required: false },
];

// Type-safe localStorage wrapper
class Storage {
  private isClient = typeof window !== 'undefined';

  private getItem<T>(key: string): T | null {
    if (!this.isClient) return null;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error reading from localStorage key "${key}":`, error);
      return null;
    }
  }

  private setItem<T>(key: string, value: T): void {
    if (!this.isClient) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error writing to localStorage key "${key}":`, error);
    }
  }

  // Employee operations
  getEmployees(): Employee[] {
    return this.getItem<Employee[]>(STORAGE_KEYS.EMPLOYEES) || [];
  }

  setEmployees(employees: Employee[]): void {
    this.setItem(STORAGE_KEYS.EMPLOYEES, employees);
  }

  updateEmployees(employees: Employee[]): void {
    this.setEmployees(employees);
  }

  getEmployee(id: string): Employee | null {
    const employees = this.getEmployees();
    return employees.find(emp => emp.id === id) || null;
  }

  addEmployee(employee: Employee): void {
    const employees = this.getEmployees();
    employees.push(employee);
    this.setEmployees(employees);
  }

  updateEmployee(id: string, updates: Partial<Employee>): Employee | null {
    const employees = this.getEmployees();
    const index = employees.findIndex(emp => emp.id === id);
    if (index === -1) return null;

    employees[index] = { ...employees[index], ...updates, updatedAt: new Date().toISOString() };
    this.setEmployees(employees);
    return employees[index];
  }

  deleteEmployee(id: string): boolean {
    const employees = this.getEmployees();
    const filtered = employees.filter(emp => emp.id !== id);
    if (filtered.length === employees.length) return false;
    this.setEmployees(filtered);
    return true;
  }

  // Custom attributes operations
  getCustomAttributes(): CustomAttribute[] {
    return this.getItem<CustomAttribute[]>(STORAGE_KEYS.CUSTOM_ATTRIBUTES) || [];
  }

  setCustomAttributes(attributes: CustomAttribute[]): void {
    this.setItem(STORAGE_KEYS.CUSTOM_ATTRIBUTES, attributes);
  }

  addCustomAttribute(attribute: CustomAttribute): void {
    const attributes = this.getCustomAttributes();
    attributes.push(attribute);
    this.setCustomAttributes(attributes);
  }

  updateCustomAttribute(id: string, updates: Partial<CustomAttribute>): CustomAttribute | null {
    const attributes = this.getCustomAttributes();
    const index = attributes.findIndex(attr => attr.id === id);
    if (index === -1) return null;

    attributes[index] = { ...attributes[index], ...updates };
    this.setCustomAttributes(attributes);
    return attributes[index];
  }

  deleteCustomAttribute(id: string): boolean {
    const attributes = this.getCustomAttributes();
    const filtered = attributes.filter(attr => attr.id !== id);
    if (filtered.length === attributes.length) return false;
    this.setCustomAttributes(filtered);
    return true;
  }

  // History operations
  getHistory(employeeId?: string): ChangeHistory[] {
    const history = this.getItem<ChangeHistory[]>(STORAGE_KEYS.HISTORY) || [];
    if (employeeId) {
      return history.filter(entry => entry.employeeId === employeeId);
    }
    return history;
  }

  addHistoryEntry(entry: ChangeHistory): void {
    const history = this.getHistory();
    history.push(entry);
    this.setItem(STORAGE_KEYS.HISTORY, history);
  }

  clearAllData(): void {
    if (!this.isClient) return;
    localStorage.removeItem(STORAGE_KEYS.EMPLOYEES);
    localStorage.removeItem(STORAGE_KEYS.CUSTOM_ATTRIBUTES);
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
  }

  // Export schedule operations
  getExportSchedules(): ExportSchedule[] {
    return this.getItem<ExportSchedule[]>(STORAGE_KEYS.EXPORT_SCHEDULES) || [];
  }

  setExportSchedules(schedules: ExportSchedule[]): void {
    this.setItem(STORAGE_KEYS.EXPORT_SCHEDULES, schedules);
  }

  getExportSchedule(id: string): ExportSchedule | null {
    const schedules = this.getExportSchedules();
    return schedules.find(schedule => schedule.id === id) || null;
  }

  addExportSchedule(schedule: ExportSchedule): void {
    const schedules = this.getExportSchedules();
    schedules.push(schedule);
    this.setExportSchedules(schedules);
  }

  updateExportSchedule(id: string, updates: Partial<ExportSchedule>): ExportSchedule | null {
    const schedules = this.getExportSchedules();
    const index = schedules.findIndex(schedule => schedule.id === id);
    if (index === -1) return null;

    schedules[index] = { ...schedules[index], ...updates, updatedAt: new Date().toISOString() };
    this.setExportSchedules(schedules);
    return schedules[index];
  }

  deleteExportSchedule(id: string): boolean {
    const schedules = this.getExportSchedules();
    const filtered = schedules.filter(schedule => schedule.id !== id);
    if (filtered.length === schedules.length) return false;
    this.setExportSchedules(filtered);
    return true;
  }

  // Export metadata operations
  getExportMetadata(): ExportMetadata {
    return this.getItem<ExportMetadata>(STORAGE_KEYS.EXPORT_METADATA) || {
      totalExportsCount: 0,
      scheduledExportsCount: 0,
      manualExportsCount: 0,
    };
  }

  updateExportMetadata(updates: Partial<ExportMetadata>): ExportMetadata {
    const metadata = this.getExportMetadata();
    const updated = { ...metadata, ...updates };
    this.setItem(STORAGE_KEYS.EXPORT_METADATA, updated);
    return updated;
  }

  // Export logs operations
  getExportLogs(scheduleId?: string): ScheduledExportLog[] {
    const logs = this.getItem<ScheduledExportLog[]>(STORAGE_KEYS.EXPORT_LOGS) || [];
    if (scheduleId) {
      return logs.filter(log => log.scheduleId === scheduleId);
    }
    return logs;
  }

  addExportLog(log: ScheduledExportLog): void {
    const logs = this.getExportLogs();
    logs.push(log);
    this.setItem(STORAGE_KEYS.EXPORT_LOGS, logs);
  }

  // Logo operations
  getLogo(): string | null {
    return this.getItem<string>(STORAGE_KEYS.LOGO);
  }

  setLogo(logoDataUrl: string): void {
    this.setItem(STORAGE_KEYS.LOGO, logoDataUrl);
  }

  removeLogo(): void {
    if (!this.isClient) return;
    localStorage.removeItem(STORAGE_KEYS.LOGO);
  }

  // Core attributes configuration operations
  getCoreAttributes(): CoreAttributeConfig[] {
    const stored = this.getItem<CoreAttributeConfig[]>(STORAGE_KEYS.CORE_ATTRIBUTES);
    // Return stored config or default if none exists
    return stored || DEFAULT_CORE_ATTRIBUTES;
  }

  setCoreAttributes(attributes: CoreAttributeConfig[]): void {
    this.setItem(STORAGE_KEYS.CORE_ATTRIBUTES, attributes);
  }

  updateCoreAttribute(id: string, updates: Partial<CoreAttributeConfig>): CoreAttributeConfig | null {
    const attributes = this.getCoreAttributes();
    const index = attributes.findIndex(attr => attr.id === id);
    if (index === -1) return null;

    attributes[index] = { ...attributes[index], ...updates };
    this.setCoreAttributes(attributes);
    return attributes[index];
  }
}

export const storage = new Storage();
