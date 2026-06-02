// Core employee/contractor record
export interface Employee {
  id: string;
  type: 'employee' | 'contractor';
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  title: string;
  manager: string;
  status: 'active' | 'inactive' | 'terminated';
  startDate: string; // ISO date string
  endDate?: string; // ISO date string, for contractors
  customAttributes: Record<string, CustomAttributeValue>;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

// Custom attribute value (typed union)
export type CustomAttributeValue = string | number | boolean;

// Custom attribute definition
export interface CustomAttribute {
  id: string;
  name: string;
  dataType: 'string' | 'number' | 'date' | 'boolean' | 'currency';
  required: boolean;
}

// Change history entry
export interface ChangeHistory {
  id: string;
  employeeId: string;
  action: 'create' | 'update' | 'delete';
  changes: Record<string, { old: any; new: any }>;
  timestamp: string; // ISO date string
  changedBy: string;
}

// Filter options for employee list
export interface EmployeeFilters {
  search?: string;
  status?: Employee['status'] | 'all';
  type?: Employee['type'] | 'all';
  department?: string;
  fromDate?: string;
  toDate?: string;
}

// Statistics for dashboard
export interface EmployeeStats {
  total: number;
  active: number;
  inactive: number;
  terminated: number;
  employees: number;
  contractors: number;
  byDepartment: Record<string, number>;
}

// OAuth configuration for webhook authentication
export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  tokenUrl: string; // OAuth token endpoint
  scope?: string; // Optional OAuth scope
}

// Export schedule definition
export interface ExportSchedule {
  id: string;
  name: string;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'hourly' | 'minutes';
  scheduledTime?: string; // HH:mm format (e.g., "09:00") for once/daily/weekly/monthly (not used for hourly/minutes)
  scheduledDate?: string; // ISO date for 'once' type only
  dayOfWeek?: number; // 0-6 for 'weekly' (Sunday=0, Monday=1, etc.)
  dayOfMonth?: number; // 1-31 for 'monthly'
  intervalValue?: number; // Number of hours (1-24) or minutes (1-1440) for hourly/minutes frequency
  filters: EmployeeFilters;
  timezone: string; // IANA timezone (e.g., "America/New_York")
  enabled: boolean;
  exportType: 'full' | 'delta'; // Full export or delta (changes since last export)
  webhookUrl?: string; // Optional webhook to call when export completes
  webhookOAuth?: OAuthConfig; // Optional OAuth configuration for webhook
  lastExecuted?: string; // ISO timestamp
  lastExportedRecordIds?: string[]; // IDs of records in last export (for delta tracking)
  nextScheduled: string; // ISO timestamp (calculated)
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

// Export metadata for tracking
export interface ExportMetadata {
  lastExportTimestamp?: string; // ISO timestamp
  lastExportCount?: number; // Number of employees exported
  lastExportType?: 'manual' | 'scheduled'; // How export was triggered
  totalExportsCount: number;
  scheduledExportsCount: number;
  manualExportsCount: number;
}

// Scheduled export execution log
export interface ScheduledExportLog {
  id: string;
  scheduleId: string; // Reference to ExportSchedule
  executedAt: string; // ISO timestamp
  success: boolean;
  employeeCount: number;
  filename: string;
  exportType: 'full' | 'delta';
  webhookCalled?: boolean;
  webhookSuccess?: boolean;
  error?: string; // Error message if failed
}
