import fs from 'fs';
import path from 'path';
import { Employee, CustomAttribute, ChangeHistory, ExportSchedule, ExportMetadata, ScheduledExportLog, CoreAttributeConfig } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILES = {
  EMPLOYEES: path.join(DATA_DIR, 'employees.json'),
  CUSTOM_ATTRIBUTES: path.join(DATA_DIR, 'custom_attributes.json'),
  CORE_ATTRIBUTES: path.join(DATA_DIR, 'core_attributes.json'),
  HISTORY: path.join(DATA_DIR, 'history.json'),
  EXPORT_SCHEDULES: path.join(DATA_DIR, 'export_schedules.json'),
  EXPORT_METADATA: path.join(DATA_DIR, 'export_metadata.json'),
  EXPORT_LOGS: path.join(DATA_DIR, 'export_logs.json'),
  LOGO: path.join(DATA_DIR, 'logo.txt'),
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

// Server-side file-based storage
class ServerStorage {
  constructor() {
    this.ensureDataDirectory();
  }

  private ensureDataDirectory(): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private readFile<T>(filePath: string, defaultValue: T): T {
    try {
      if (!fs.existsSync(filePath)) {
        return defaultValue;
      }
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`Error reading file "${filePath}":`, error);
      return defaultValue;
    }
  }

  private writeFile<T>(filePath: string, data: T): void {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error(`Error writing file "${filePath}":`, error);
    }
  }

  // Employee operations
  getEmployees(): Employee[] {
    return this.readFile<Employee[]>(DATA_FILES.EMPLOYEES, []);
  }

  setEmployees(employees: Employee[]): void {
    this.writeFile(DATA_FILES.EMPLOYEES, employees);
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
    return this.readFile<CustomAttribute[]>(DATA_FILES.CUSTOM_ATTRIBUTES, []);
  }

  setCustomAttributes(attributes: CustomAttribute[]): void {
    this.writeFile(DATA_FILES.CUSTOM_ATTRIBUTES, attributes);
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
    const history = this.readFile<ChangeHistory[]>(DATA_FILES.HISTORY, []);
    if (employeeId) {
      return history.filter(entry => entry.employeeId === employeeId);
    }
    return history;
  }

  addHistoryEntry(entry: ChangeHistory): void {
    const history = this.getHistory();
    history.push(entry);
    this.writeFile(DATA_FILES.HISTORY, history);
  }

  clearAllData(): void {
    this.writeFile(DATA_FILES.EMPLOYEES, []);
    this.writeFile(DATA_FILES.CUSTOM_ATTRIBUTES, []);
    this.writeFile(DATA_FILES.HISTORY, []);
  }

  // Export schedule operations
  getExportSchedules(): ExportSchedule[] {
    return this.readFile<ExportSchedule[]>(DATA_FILES.EXPORT_SCHEDULES, []);
  }

  setExportSchedules(schedules: ExportSchedule[]): void {
    this.writeFile(DATA_FILES.EXPORT_SCHEDULES, schedules);
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
    return this.readFile<ExportMetadata>(DATA_FILES.EXPORT_METADATA, {
      totalExportsCount: 0,
      scheduledExportsCount: 0,
      manualExportsCount: 0,
    });
  }

  updateExportMetadata(updates: Partial<ExportMetadata>): ExportMetadata {
    const metadata = this.getExportMetadata();
    const updated = { ...metadata, ...updates };
    this.writeFile(DATA_FILES.EXPORT_METADATA, updated);
    return updated;
  }

  // Export logs operations
  getExportLogs(scheduleId?: string): ScheduledExportLog[] {
    const logs = this.readFile<ScheduledExportLog[]>(DATA_FILES.EXPORT_LOGS, []);
    if (scheduleId) {
      return logs.filter(log => log.scheduleId === scheduleId);
    }
    return logs;
  }

  addExportLog(log: ScheduledExportLog): void {
    const logs = this.getExportLogs();
    logs.push(log);
    this.writeFile(DATA_FILES.EXPORT_LOGS, logs);
  }

  // Logo operations
  getLogo(): string | null {
    try {
      if (!fs.existsSync(DATA_FILES.LOGO)) {
        return null;
      }
      return fs.readFileSync(DATA_FILES.LOGO, 'utf-8');
    } catch (error) {
      console.error('Error reading logo:', error);
      return null;
    }
  }

  setLogo(logoDataUrl: string): void {
    try {
      fs.writeFileSync(DATA_FILES.LOGO, logoDataUrl, 'utf-8');
    } catch (error) {
      console.error('Error writing logo:', error);
    }
  }

  removeLogo(): void {
    try {
      if (fs.existsSync(DATA_FILES.LOGO)) {
        fs.unlinkSync(DATA_FILES.LOGO);
      }
    } catch (error) {
      console.error('Error removing logo:', error);
    }
  }

  // Core attributes configuration operations
  getCoreAttributes(): CoreAttributeConfig[] {
    const stored = this.readFile<CoreAttributeConfig[]>(DATA_FILES.CORE_ATTRIBUTES, []);
    return stored.length > 0 ? stored : DEFAULT_CORE_ATTRIBUTES;
  }

  setCoreAttributes(attributes: CoreAttributeConfig[]): void {
    this.writeFile(DATA_FILES.CORE_ATTRIBUTES, attributes);
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

export const serverStorage = new ServerStorage();
