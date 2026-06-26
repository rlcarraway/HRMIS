import { supabaseAdmin } from './supabase';
import { Employee, CustomAttribute, ChangeHistory, ExportSchedule, ExportMetadata, ScheduledExportLog, CoreAttributeConfig } from './types';

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

/**
 * Server-side storage using Supabase PostgreSQL
 * All operations are async and use the Supabase admin client
 */
class ServerStorage {
  // Employee operations
  async getEmployees(): Promise<Employee[]> {
    const { data, error } = await supabaseAdmin
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching employees:', error);
      return [];
    }

    return (data || []).map(this.mapEmployeeFromDb);
  }

  async getEmployee(id: string): Promise<Employee | null> {
    const { data, error } = await supabaseAdmin
      .from('employees')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching employee:', error);
      return null;
    }

    return data ? this.mapEmployeeFromDb(data) : null;
  }

  async addEmployee(employee: Employee): Promise<void> {
    const { error } = await supabaseAdmin
      .from('employees')
      .insert([this.mapEmployeeToDb(employee)]);

    if (error) {
      console.error('Error adding employee:', error);
      throw error;
    }
  }

  async updateEmployee(id: string, updates: Partial<Employee>): Promise<Employee | null> {
    const dbUpdates = this.mapEmployeeToDb(updates as Employee);
    // Remove undefined values
    Object.keys(dbUpdates).forEach(key => {
      if (dbUpdates[key] === undefined) {
        delete dbUpdates[key];
      }
    });

    const { data, error } = await supabaseAdmin
      .from('employees')
      .update({
        ...dbUpdates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating employee:', error);
      return null;
    }

    return data ? this.mapEmployeeFromDb(data) : null;
  }

  async deleteEmployee(id: string): Promise<boolean> {
    const { error } = await supabaseAdmin
      .from('employees')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting employee:', error);
      return false;
    }

    return true;
  }

  async setEmployees(employees: Employee[]): Promise<void> {
    // Delete all existing employees
    await supabaseAdmin
      .from('employees')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (employees.length > 0) {
      const { error } = await supabaseAdmin
        .from('employees')
        .insert(employees.map(emp => this.mapEmployeeToDb(emp)));

      if (error) {
        console.error('Error setting employees:', error);
        throw error;
      }
    }
  }

  async updateEmployees(employees: Employee[]): Promise<void> {
    await this.setEmployees(employees);
  }

  // Custom attributes operations
  async getCustomAttributes(): Promise<CustomAttribute[]> {
    const { data, error } = await supabaseAdmin
      .from('custom_attributes')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching custom attributes:', error);
      return [];
    }

    return (data || []).map(this.mapCustomAttributeFromDb);
  }

  async addCustomAttribute(attribute: CustomAttribute): Promise<void> {
    const { error } = await supabaseAdmin
      .from('custom_attributes')
      .insert([this.mapCustomAttributeToDb(attribute)]);

    if (error) {
      console.error('Error adding custom attribute:', error);
      throw error;
    }
  }

  async updateCustomAttribute(id: string, updates: Partial<CustomAttribute>): Promise<CustomAttribute | null> {
    const dbUpdates = this.mapCustomAttributeToDb(updates as CustomAttribute);
    // Remove undefined values
    Object.keys(dbUpdates).forEach(key => {
      if (dbUpdates[key] === undefined) {
        delete dbUpdates[key];
      }
    });

    const { data, error } = await supabaseAdmin
      .from('custom_attributes')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating custom attribute:', error);
      return null;
    }

    return data ? this.mapCustomAttributeFromDb(data) : null;
  }

  async deleteCustomAttribute(id: string): Promise<boolean> {
    const { error } = await supabaseAdmin
      .from('custom_attributes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting custom attribute:', error);
      return false;
    }

    return true;
  }

  async setCustomAttributes(attributes: CustomAttribute[]): Promise<void> {
    // Delete all existing attributes
    await supabaseAdmin
      .from('custom_attributes')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (attributes.length > 0) {
      const { error } = await supabaseAdmin
        .from('custom_attributes')
        .insert(attributes.map(attr => this.mapCustomAttributeToDb(attr)));

      if (error) {
        console.error('Error setting custom attributes:', error);
        throw error;
      }
    }
  }

  // History operations
  async getHistory(employeeId?: string): Promise<ChangeHistory[]> {
    let query = supabaseAdmin
      .from('change_history')
      .select('*')
      .order('timestamp', { ascending: false });

    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching history:', error);
      return [];
    }

    return (data || []).map(this.mapHistoryFromDb);
  }

  async addHistoryEntry(entry: ChangeHistory): Promise<void> {
    const { error } = await supabaseAdmin
      .from('change_history')
      .insert([this.mapHistoryToDb(entry)]);

    if (error) {
      console.error('Error adding history entry:', error);
      throw error;
    }
  }

  // Export schedules operations
  async getExportSchedules(): Promise<ExportSchedule[]> {
    const { data, error } = await supabaseAdmin
      .from('export_schedules')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching export schedules:', error);
      return [];
    }

    return (data || []).map(this.mapExportScheduleFromDb);
  }

  async getExportSchedule(id: string): Promise<ExportSchedule | null> {
    const { data, error } = await supabaseAdmin
      .from('export_schedules')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching export schedule:', error);
      return null;
    }

    return data ? this.mapExportScheduleFromDb(data) : null;
  }

  async addExportSchedule(schedule: ExportSchedule): Promise<void> {
    const { error } = await supabaseAdmin
      .from('export_schedules')
      .insert([this.mapExportScheduleToDb(schedule)]);

    if (error) {
      console.error('Error adding export schedule:', error);
      throw error;
    }
  }

  async updateExportSchedule(id: string, updates: Partial<ExportSchedule>): Promise<ExportSchedule | null> {
    const dbUpdates = this.mapExportScheduleToDb(updates as ExportSchedule);
    // Remove undefined values
    Object.keys(dbUpdates).forEach(key => {
      if (dbUpdates[key] === undefined) {
        delete dbUpdates[key];
      }
    });

    const { data, error } = await supabaseAdmin
      .from('export_schedules')
      .update({
        ...dbUpdates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating export schedule:', error);
      return null;
    }

    return data ? this.mapExportScheduleFromDb(data) : null;
  }

  async deleteExportSchedule(id: string): Promise<boolean> {
    const { error } = await supabaseAdmin
      .from('export_schedules')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting export schedule:', error);
      return false;
    }

    return true;
  }

  async setExportSchedules(schedules: ExportSchedule[]): Promise<void> {
    // Delete all existing schedules
    await supabaseAdmin
      .from('export_schedules')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (schedules.length > 0) {
      const { error } = await supabaseAdmin
        .from('export_schedules')
        .insert(schedules.map(schedule => this.mapExportScheduleToDb(schedule)));

      if (error) {
        console.error('Error setting export schedules:', error);
        throw error;
      }
    }
  }

  // Export metadata operations
  async getExportMetadata(): Promise<ExportMetadata> {
    const { data, error } = await supabaseAdmin
      .from('export_metadata')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) {
      console.error('Error fetching export metadata:', error);
      return {
        totalExportsCount: 0,
        scheduledExportsCount: 0,
        manualExportsCount: 0,
      };
    }

    return {
      totalExportsCount: data.total_exports_count || 0,
      scheduledExportsCount: data.scheduled_exports_count || 0,
      manualExportsCount: data.manual_exports_count || 0,
    };
  }

  async updateExportMetadata(updates: Partial<ExportMetadata>): Promise<ExportMetadata> {
    const dbUpdates: any = {};
    if (updates.totalExportsCount !== undefined) {
      dbUpdates.total_exports_count = updates.totalExportsCount;
    }
    if (updates.scheduledExportsCount !== undefined) {
      dbUpdates.scheduled_exports_count = updates.scheduledExportsCount;
    }
    if (updates.manualExportsCount !== undefined) {
      dbUpdates.manual_exports_count = updates.manualExportsCount;
    }

    const { data, error } = await supabaseAdmin
      .from('export_metadata')
      .update(dbUpdates)
      .eq('id', 1)
      .select()
      .single();

    if (error) {
      console.error('Error updating export metadata:', error);
      return this.getExportMetadata();
    }

    return {
      totalExportsCount: data.total_exports_count || 0,
      scheduledExportsCount: data.scheduled_exports_count || 0,
      manualExportsCount: data.manual_exports_count || 0,
    };
  }

  // Export logs operations
  async getExportLogs(scheduleId?: string): Promise<ScheduledExportLog[]> {
    let query = supabaseAdmin
      .from('export_logs')
      .select('*')
      .order('timestamp', { ascending: false });

    if (scheduleId) {
      query = query.eq('schedule_id', scheduleId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching export logs:', error);
      return [];
    }

    return (data || []).map(this.mapExportLogFromDb);
  }

  async addExportLog(log: ScheduledExportLog): Promise<void> {
    const { error } = await supabaseAdmin
      .from('export_logs')
      .insert([this.mapExportLogToDb(log)]);

    if (error) {
      console.error('Error adding export log:', error);
      throw error;
    }
  }

  // Logo operations
  async getLogo(): Promise<string | null> {
    const { data, error } = await supabaseAdmin
      .from('company_settings')
      .select('logo')
      .eq('id', 1)
      .single();

    if (error) {
      console.error('Error fetching logo:', error);
      return null;
    }

    return data?.logo || null;
  }

  async setLogo(logoDataUrl: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('company_settings')
      .upsert({
        id: 1,
        logo: logoDataUrl,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error setting logo:', error);
      throw error;
    }
  }

  async removeLogo(): Promise<void> {
    const { error } = await supabaseAdmin
      .from('company_settings')
      .update({
        logo: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', 1);

    if (error) {
      console.error('Error removing logo:', error);
      throw error;
    }
  }

  // Core attributes operations
  async getCoreAttributes(): Promise<CoreAttributeConfig[]> {
    const { data, error } = await supabaseAdmin
      .from('core_attributes')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching core attributes:', error);
      return DEFAULT_CORE_ATTRIBUTES;
    }

    if (!data || data.length === 0) {
      // Initialize with defaults
      await this.initializeDefaultCoreAttributes();
      return DEFAULT_CORE_ATTRIBUTES;
    }

    return data.map(this.mapCoreAttributeFromDb);
  }

  async setCoreAttributes(attributes: CoreAttributeConfig[]): Promise<void> {
    // Delete all existing core attributes
    await supabaseAdmin
      .from('core_attributes')
      .delete()
      .neq('id', '0');

    if (attributes.length > 0) {
      const { error } = await supabaseAdmin
        .from('core_attributes')
        .insert(attributes.map((attr, index) => this.mapCoreAttributeToDb(attr, index)));

      if (error) {
        console.error('Error setting core attributes:', error);
        throw error;
      }
    }
  }

  async updateCoreAttribute(id: string, updates: Partial<CoreAttributeConfig>): Promise<CoreAttributeConfig | null> {
    const current = await this.getCoreAttributes();
    const index = current.findIndex(attr => attr.id === id);
    if (index === -1) return null;

    const updated = { ...current[index], ...updates };
    const dbUpdates = this.mapCoreAttributeToDb(updated, index);

    const { data, error } = await supabaseAdmin
      .from('core_attributes')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating core attribute:', error);
      return null;
    }

    return data ? this.mapCoreAttributeFromDb(data) : null;
  }

  async clearAllData(): Promise<void> {
    await supabaseAdmin.from('employees').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('custom_attributes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('change_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }

  // Private helper methods

  private async initializeDefaultCoreAttributes(): Promise<void> {
    await this.setCoreAttributes(DEFAULT_CORE_ATTRIBUTES);
  }

  // Mapper functions (camelCase to snake_case and vice versa)

  private mapEmployeeFromDb(data: any): Employee {
    return {
      id: data.id,
      type: data.type,
      firstName: data.first_name,
      lastName: data.last_name,
      email: data.email,
      department: data.department,
      title: data.title,
      manager: data.manager,
      status: data.status,
      startDate: data.start_date,
      endDate: data.end_date,
      customAttributes: data.custom_attributes || {},
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapEmployeeToDb(employee: Partial<Employee>): any {
    const mapped: any = {};
    if (employee.id !== undefined) mapped.id = employee.id;
    if (employee.type !== undefined) mapped.type = employee.type;
    if (employee.firstName !== undefined) mapped.first_name = employee.firstName;
    if (employee.lastName !== undefined) mapped.last_name = employee.lastName;
    if (employee.email !== undefined) mapped.email = employee.email;
    if (employee.department !== undefined) mapped.department = employee.department;
    if (employee.title !== undefined) mapped.title = employee.title;
    if (employee.manager !== undefined) mapped.manager = employee.manager;
    if (employee.status !== undefined) mapped.status = employee.status;
    if (employee.startDate !== undefined) mapped.start_date = employee.startDate;
    if (employee.endDate !== undefined) mapped.end_date = employee.endDate;
    if (employee.customAttributes !== undefined) mapped.custom_attributes = employee.customAttributes;
    if (employee.createdAt !== undefined) mapped.created_at = employee.createdAt;
    if (employee.updatedAt !== undefined) mapped.updated_at = employee.updatedAt;
    return mapped;
  }

  private mapCustomAttributeFromDb(data: any): CustomAttribute {
    return {
      id: data.id,
      name: data.name,
      dataType: data.data_type,
      required: data.required,
    };
  }

  private mapCustomAttributeToDb(attr: Partial<CustomAttribute>): any {
    const mapped: any = {};
    if (attr.id !== undefined) mapped.id = attr.id;
    if (attr.name !== undefined) mapped.name = attr.name;
    if (attr.dataType !== undefined) mapped.data_type = attr.dataType;
    if (attr.required !== undefined) mapped.required = attr.required;
    return mapped;
  }

  private mapHistoryFromDb(data: any): ChangeHistory {
    return {
      id: data.id,
      employeeId: data.employee_id,
      action: data.action,
      changes: data.changes,
      timestamp: data.timestamp,
      changedBy: data.changed_by,
    };
  }

  private mapHistoryToDb(entry: ChangeHistory): any {
    return {
      id: entry.id,
      employee_id: entry.employeeId,
      action: entry.action,
      changes: entry.changes,
      timestamp: entry.timestamp,
      changed_by: entry.changedBy,
    };
  }

  private mapExportScheduleFromDb(data: any): ExportSchedule {
    return {
      id: data.id,
      name: data.name,
      frequency: data.frequency,
      scheduledTime: data.scheduled_time,
      scheduledDate: data.scheduled_date,
      dayOfWeek: data.day_of_week,
      dayOfMonth: data.day_of_month,
      intervalValue: data.interval_value,
      filters: data.filters || {},
      timezone: data.timezone || 'America/New_York',
      enabled: data.enabled,
      exportType: data.export_type || 'full',
      webhookUrl: data.webhook_url,
      webhookOAuth: data.webhook_oauth,
      lastExecuted: data.last_executed,
      lastExportedRecordIds: data.last_exported_record_ids,
      nextScheduled: data.next_scheduled,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapExportScheduleToDb(schedule: Partial<ExportSchedule>): any {
    const mapped: any = {};
    if (schedule.id !== undefined) mapped.id = schedule.id;
    if (schedule.name !== undefined) mapped.name = schedule.name;
    if (schedule.frequency !== undefined) mapped.frequency = schedule.frequency;
    if (schedule.scheduledTime !== undefined) mapped.scheduled_time = schedule.scheduledTime;
    if (schedule.scheduledDate !== undefined) mapped.scheduled_date = schedule.scheduledDate;
    if (schedule.dayOfWeek !== undefined) mapped.day_of_week = schedule.dayOfWeek;
    if (schedule.dayOfMonth !== undefined) mapped.day_of_month = schedule.dayOfMonth;
    if (schedule.intervalValue !== undefined) mapped.interval_value = schedule.intervalValue;
    if (schedule.filters !== undefined) mapped.filters = schedule.filters;
    if (schedule.timezone !== undefined) mapped.timezone = schedule.timezone;
    if (schedule.enabled !== undefined) mapped.enabled = schedule.enabled;
    if (schedule.exportType !== undefined) mapped.export_type = schedule.exportType;
    if (schedule.webhookUrl !== undefined) mapped.webhook_url = schedule.webhookUrl;
    if (schedule.webhookOAuth !== undefined) mapped.webhook_oauth = schedule.webhookOAuth;
    if (schedule.lastExecuted !== undefined) mapped.last_executed = schedule.lastExecuted;
    if (schedule.lastExportedRecordIds !== undefined) mapped.last_exported_record_ids = schedule.lastExportedRecordIds;
    if (schedule.nextScheduled !== undefined) mapped.next_scheduled = schedule.nextScheduled;
    if (schedule.createdAt !== undefined) mapped.created_at = schedule.createdAt;
    if (schedule.updatedAt !== undefined) mapped.updated_at = schedule.updatedAt;
    return mapped;
  }

  private mapExportLogFromDb(data: any): ScheduledExportLog {
    return {
      id: data.id,
      scheduleId: data.schedule_id,
      executedAt: data.executed_at,
      success: data.success,
      employeeCount: data.employee_count,
      filename: data.filename,
      exportType: data.export_type || 'full',
      webhookCalled: data.webhook_called,
      webhookSuccess: data.webhook_success,
      error: data.error,
    };
  }

  private mapExportLogToDb(log: ScheduledExportLog): any {
    return {
      id: log.id,
      schedule_id: log.scheduleId,
      executed_at: log.executedAt,
      success: log.success,
      employee_count: log.employeeCount,
      filename: log.filename,
      export_type: log.exportType,
      webhook_called: log.webhookCalled,
      webhook_success: log.webhookSuccess,
      error: log.error,
    };
  }

  private mapCoreAttributeFromDb(data: any): CoreAttributeConfig {
    return {
      id: data.id,
      fieldName: data.field_name,
      displayName: data.display_name,
      dataType: data.data_type,
      required: data.required,
      options: data.options,
      locked: data.locked,
    };
  }

  private mapCoreAttributeToDb(attr: CoreAttributeConfig, displayOrder: number): any {
    return {
      id: attr.id,
      field_name: attr.fieldName,
      display_name: attr.displayName,
      data_type: attr.dataType,
      required: attr.required,
      options: attr.options || null,
      locked: attr.locked,
      display_order: displayOrder,
    };
  }

  // Okta Settings operations
  async getOktaSettings(): Promise<{ clientId: string; clientSecret: string; issuer: string } | null> {
    const { data, error } = await supabaseAdmin
      .from('okta_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) {
      console.error('Error fetching Okta settings:', error);
      return null;
    }

    if (!data) return null;

    return {
      clientId: data.client_id,
      clientSecret: data.client_secret,
      issuer: data.issuer,
    };
  }

  async setOktaSettings(settings: { clientId: string; clientSecret: string; issuer: string }): Promise<void> {
    const { error } = await supabaseAdmin
      .from('okta_settings')
      .upsert({
        id: 1,
        client_id: settings.clientId,
        client_secret: settings.clientSecret,
        issuer: settings.issuer,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error setting Okta settings:', error);
      throw error;
    }
  }

  // Outbound API Settings operations
  async getOutboundApiSettings(): Promise<{
    enabled: boolean;
    url: string;
    headers: Array<{ key: string; value: string }>;
    operations: { create: boolean; update: boolean; delete: boolean };
  }> {
    const { data, error } = await supabaseAdmin
      .from('outbound_api_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) {
      console.error('Error fetching outbound API settings:', error);
      return {
        enabled: false,
        url: '',
        headers: [],
        operations: { create: false, update: false, delete: false },
      };
    }

    return {
      enabled: data.enabled,
      url: data.url,
      headers: data.headers || [],
      operations: data.operations || { create: false, update: false, delete: false },
    };
  }

  async setOutboundApiSettings(settings: {
    enabled: boolean;
    url: string;
    headers: Array<{ key: string; value: string }>;
    operations: { create: boolean; update: boolean; delete: boolean };
  }): Promise<void> {
    const { error } = await supabaseAdmin
      .from('outbound_api_settings')
      .upsert({
        id: 1,
        enabled: settings.enabled,
        url: settings.url,
        headers: settings.headers,
        operations: settings.operations,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error setting outbound API settings:', error);
      throw error;
    }
  }

  // Federated Users operations
  async getFederatedUsers(): Promise<Array<{
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'viewer';
    provider: string;
    providerId: string;
    createdAt: string;
    updatedAt: string;
    lastLoginAt: string;
  }>> {
    const { data, error } = await supabaseAdmin
      .from('federated_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching federated users:', error);
      return [];
    }

    return (data || []).map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      provider: user.provider,
      providerId: user.provider_id,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      lastLoginAt: user.last_login_at,
    }));
  }

  async getFederatedUserByProviderId(providerId: string): Promise<{
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'viewer';
    provider: string;
    providerId: string;
    createdAt: string;
    updatedAt: string;
    lastLoginAt: string;
  } | null> {
    const { data, error } = await supabaseAdmin
      .from('federated_users')
      .select('*')
      .eq('provider_id', providerId)
      .single();

    if (error) {
      console.error('Error fetching federated user:', error);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      role: data.role,
      provider: data.provider,
      providerId: data.provider_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      lastLoginAt: data.last_login_at,
    };
  }

  async upsertFederatedUser(user: {
    providerId: string;
    email: string;
    name: string;
    provider: string;
    role?: 'admin' | 'viewer';
  }): Promise<{
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'viewer';
    provider: string;
    providerId: string;
    createdAt: string;
    updatedAt: string;
    lastLoginAt: string;
  }> {
    // Check if user exists
    const existing = await this.getFederatedUserByProviderId(user.providerId);

    if (existing) {
      // Update existing user
      const { data, error } = await supabaseAdmin
        .from('federated_users')
        .update({
          email: user.email,
          name: user.name,
          role: user.role || existing.role,
          updated_at: new Date().toISOString(),
          last_login_at: new Date().toISOString(),
        })
        .eq('provider_id', user.providerId)
        .select()
        .single();

      if (error) {
        console.error('Error updating federated user:', error);
        throw error;
      }

      return {
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role,
        provider: data.provider,
        providerId: data.provider_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        lastLoginAt: data.last_login_at,
      };
    } else {
      // Create new user
      const { data, error } = await supabaseAdmin
        .from('federated_users')
        .insert({
          email: user.email,
          name: user.name,
          role: user.role || 'viewer',
          provider: user.provider,
          provider_id: user.providerId,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating federated user:', error);
        throw error;
      }

      return {
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role,
        provider: data.provider,
        providerId: data.provider_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        lastLoginAt: data.last_login_at,
      };
    }
  }

  async updateFederatedUserRole(id: string, role: 'admin' | 'viewer'): Promise<boolean> {
    const { error } = await supabaseAdmin
      .from('federated_users')
      .update({
        role,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating federated user role:', error);
      return false;
    }

    return true;
  }

  async deleteFederatedUser(id: string): Promise<boolean> {
    const { error } = await supabaseAdmin
      .from('federated_users')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting federated user:', error);
      return false;
    }

    return true;
  }

  // Audit Logs operations
  async getAuditLogs(filters?: {
    search?: string;
    action?: string;
    level?: string;
    userId?: string;
    fromDate?: string;
    toDate?: string;
    success?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: Array<{
    id: string;
    timestamp: string;
    action: string;
    level: string;
    userId?: string;
    userName?: string;
    userEmail?: string;
    description: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
    duration?: number;
    success: boolean;
    errorMessage?: string;
  }>; total: number }> {
    let query = supabaseAdmin
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('timestamp', { ascending: false });

    // Apply filters
    if (filters?.action) {
      query = query.eq('action', filters.action);
    }
    if (filters?.level) {
      query = query.eq('level', filters.level);
    }
    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }
    if (filters?.fromDate) {
      query = query.gte('timestamp', filters.fromDate);
    }
    if (filters?.toDate) {
      query = query.lte('timestamp', filters.toDate);
    }
    if (filters?.success !== undefined) {
      query = query.eq('success', filters.success);
    }
    if (filters?.search) {
      query = query.or(`description.ilike.%${filters.search}%,action.ilike.%${filters.search}%,user_email.ilike.%${filters.search}%`);
    }

    // Apply pagination
    if (filters?.offset !== undefined) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
    } else if (filters?.limit !== undefined) {
      query = query.limit(filters.limit);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching audit logs:', error);
      return { logs: [], total: 0 };
    }

    const logs = (data || []).map(log => ({
      id: log.id,
      timestamp: log.timestamp,
      action: log.action,
      level: log.level,
      userId: log.user_id,
      userName: log.user_name,
      userEmail: log.user_email,
      description: log.description,
      details: log.details,
      ipAddress: log.ip_address,
      userAgent: log.user_agent,
      duration: log.duration,
      success: log.success,
      errorMessage: log.error_message,
    }));

    return { logs, total: count || 0 };
  }

  async addAuditLog(log: {
    action: string;
    level: string;
    userId?: string;
    userName?: string;
    userEmail?: string;
    description: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
    duration?: number;
    success: boolean;
    errorMessage?: string;
  }): Promise<void> {
    const { error } = await supabaseAdmin
      .from('audit_logs')
      .insert({
        action: log.action,
        level: log.level,
        user_id: log.userId,
        user_name: log.userName,
        user_email: log.userEmail,
        description: log.description,
        details: log.details,
        ip_address: log.ipAddress,
        user_agent: log.userAgent,
        duration: log.duration,
        success: log.success,
        error_message: log.errorMessage,
      });

    if (error) {
      console.error('Error adding audit log:', error);
      throw error;
    }
  }

  async clearOldAuditLogs(daysToKeep: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const { data: logsToDelete, error: selectError } = await supabaseAdmin
      .from('audit_logs')
      .select('id')
      .lt('timestamp', cutoffDate.toISOString());

    if (selectError) {
      console.error('Error fetching old audit logs:', selectError);
      return 0;
    }

    const deleteCount = logsToDelete?.length || 0;

    if (deleteCount > 0) {
      const { error: deleteError } = await supabaseAdmin
        .from('audit_logs')
        .delete()
        .lt('timestamp', cutoffDate.toISOString());

      if (deleteError) {
        console.error('Error deleting old audit logs:', deleteError);
        return 0;
      }
    }

    return deleteCount;
  }
}

export const serverStorage = new ServerStorage();
