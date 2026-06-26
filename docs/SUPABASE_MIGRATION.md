# Supabase Migration Guide

This guide walks through migrating the HRMIS application from file-based storage to Supabase PostgreSQL.

## Overview

**Current Architecture:**
- File-based storage using `lib/serverStorage.ts`
- Data stored in `/tmp/data` (Vercel) or `./data` (local)
- Ephemeral storage in serverless environments

**Target Architecture:**
- Supabase PostgreSQL database
- Persistent storage across deployments
- Scalable for production use
- Real-time capabilities (optional)

## Step 1: Supabase Setup

### 1.1 Create Supabase Project

1. Go to https://supabase.com and sign up
2. Click "New Project"
3. Choose organization and set project details:
   - **Name**: hrmis-production (or your choice)
   - **Database Password**: Generate strong password (save this!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier works for development

### 1.2 Get Connection Details

After project creation, go to Project Settings → Database:
- **Connection String**: Copy the connection pooling string
- **API URL**: Found in Project Settings → API
- **API Keys**: Copy the `anon` public key and `service_role` secret key

## Step 2: Database Schema Design

### 2.1 Create Tables

Go to SQL Editor in Supabase and run this complete schema (also available in `SUPABASE_COMPLETE_SCHEMA.sql`):

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Employees table
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('employee', 'contractor')),
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  department VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  manager VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'inactive', 'terminated')),
  start_date DATE NOT NULL,
  end_date DATE,
  custom_attributes JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT end_date_after_start_date CHECK (end_date IS NULL OR end_date > start_date),
  CONSTRAINT contractor_requires_end_date CHECK (type != 'contractor' OR end_date IS NOT NULL)
);

-- Custom attributes table
CREATE TABLE custom_attributes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  data_type VARCHAR(20) NOT NULL CHECK (data_type IN ('string', 'number', 'date', 'boolean', 'currency')),
  required BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Core attributes configuration table
CREATE TABLE core_attributes (
  id VARCHAR(10) PRIMARY KEY,
  field_name VARCHAR(100) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  data_type VARCHAR(20) NOT NULL,
  required BOOLEAN NOT NULL DEFAULT FALSE,
  options JSONB,
  locked BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INTEGER NOT NULL
);

-- Change history table
CREATE TABLE change_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  changes JSONB NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by VARCHAR(255) NOT NULL,

  -- Index for employee lookups
  INDEX idx_change_history_employee_id ON change_history(employee_id),
  INDEX idx_change_history_timestamp ON change_history(timestamp DESC)
);

-- Export schedules table
CREATE TABLE export_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  schedule_type VARCHAR(20) NOT NULL CHECK (schedule_type IN ('daily', 'weekly', 'monthly')),
  time VARCHAR(10) NOT NULL,
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 31),
  format VARCHAR(10) NOT NULL CHECK (format IN ('csv', 'json')),
  include_fields JSONB NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  destination JSONB NOT NULL,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Export metadata table
CREATE TABLE export_metadata (
  id INTEGER PRIMARY KEY DEFAULT 1,
  total_exports_count INTEGER NOT NULL DEFAULT 0,
  scheduled_exports_count INTEGER NOT NULL DEFAULT 0,
  manual_exports_count INTEGER NOT NULL DEFAULT 0,

  -- Ensure only one row
  CONSTRAINT single_row_only CHECK (id = 1)
);

-- Insert default export metadata
INSERT INTO export_metadata (id) VALUES (1);

-- Export logs table
CREATE TABLE export_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id UUID REFERENCES export_schedules(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'error')),
  records_exported INTEGER,
  error_message TEXT,
  destination JSONB,

  INDEX idx_export_logs_schedule_id ON export_logs(schedule_id),
  INDEX idx_export_logs_timestamp ON export_logs(timestamp DESC)
);

-- Company settings table
CREATE TABLE company_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  logo TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure only one row
  CONSTRAINT single_row_only CHECK (id = 1)
);

-- Insert default company settings
INSERT INTO company_settings (id) VALUES (1);

-- Audit logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  details JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  INDEX idx_audit_logs_category ON audit_logs(category),
  INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC)
);

-- OAuth clients table
CREATE TABLE oauth_clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id VARCHAR(255) NOT NULL UNIQUE,
  client_secret_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

-- Update trigger for employees
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_export_schedules_updated_at
  BEFORE UPDATE ON export_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON company_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 2.2 Set Up Row Level Security (RLS)

For production, enable RLS on all tables:

```sql
-- Enable RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_clients ENABLE ROW LEVEL SECURITY;

-- Create policies (example for service role - adjust based on your auth)
-- For now, allow service_role full access
CREATE POLICY "Service role has full access" ON employees
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access" ON custom_attributes
  FOR ALL USING (auth.role() = 'service_role');

-- Repeat for other tables...
```

## Step 3: Install Dependencies

```bash
npm install @supabase/supabase-js
```

Update `package.json`:
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0"
  }
}
```

## Step 4: Environment Variables

Add to `.env.local` (local development):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Add to Vercel environment variables (production):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Step 5: Create Supabase Client

Create `lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY');
}

// Server-side client with service role (bypasses RLS)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Client-side client with anon key (for future client-side features)
export const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

## Step 6: Update Storage Layer

Replace `lib/serverStorage.ts` with database operations:

```typescript
import { supabaseAdmin } from './supabase';
import { Employee, CustomAttribute, ChangeHistory, ExportSchedule, ExportMetadata, ScheduledExportLog, CoreAttributeConfig } from './types';

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

    return data.map(this.mapEmployeeFromDb);
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
    const { data, error } = await supabaseAdmin
      .from('employees')
      .update({
        ...this.mapEmployeeToDb(updates as Employee),
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
    // For bulk operations, delete all and insert
    await supabaseAdmin.from('employees').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    if (employees.length > 0) {
      const { error } = await supabaseAdmin
        .from('employees')
        .insert(employees.map(this.mapEmployeeToDb));

      if (error) {
        console.error('Error setting employees:', error);
        throw error;
      }
    }
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

    return data.map(this.mapCustomAttributeFromDb);
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
    const { data, error } = await supabaseAdmin
      .from('custom_attributes')
      .update(this.mapCustomAttributeToDb(updates as CustomAttribute))
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
    await supabaseAdmin.from('custom_attributes').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    if (attributes.length > 0) {
      const { error } = await supabaseAdmin
        .from('custom_attributes')
        .insert(attributes.map(this.mapCustomAttributeToDb));

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

    return data.map(this.mapHistoryFromDb);
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

    return data.map(this.mapExportScheduleFromDb);
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
    const { data, error } = await supabaseAdmin
      .from('export_schedules')
      .update({
        ...this.mapExportScheduleToDb(updates as ExportSchedule),
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
    await supabaseAdmin.from('export_schedules').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    if (schedules.length > 0) {
      const { error } = await supabaseAdmin
        .from('export_schedules')
        .insert(schedules.map(this.mapExportScheduleToDb));

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
      totalExportsCount: data.total_exports_count,
      scheduledExportsCount: data.scheduled_exports_count,
      manualExportsCount: data.manual_exports_count,
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
      totalExportsCount: data.total_exports_count,
      scheduledExportsCount: data.scheduled_exports_count,
      manualExportsCount: data.manual_exports_count,
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

    return data.map(this.mapExportLogFromDb);
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
      .upsert({ id: 1, logo: logoDataUrl });

    if (error) {
      console.error('Error setting logo:', error);
      throw error;
    }
  }

  async removeLogo(): Promise<void> {
    const { error } = await supabaseAdmin
      .from('company_settings')
      .update({ logo: null })
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
      return this.getDefaultCoreAttributes();
    }

    if (!data || data.length === 0) {
      // Initialize with defaults
      await this.initializeDefaultCoreAttributes();
      return this.getDefaultCoreAttributes();
    }

    return data.map(this.mapCoreAttributeFromDb);
  }

  async setCoreAttributes(attributes: CoreAttributeConfig[]): Promise<void> {
    await supabaseAdmin.from('core_attributes').delete().neq('id', '0');

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

    const { data, error } = await supabaseAdmin
      .from('core_attributes')
      .update(this.mapCoreAttributeToDb(updated, index))
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
    if (employee.id) mapped.id = employee.id;
    if (employee.type) mapped.type = employee.type;
    if (employee.firstName) mapped.first_name = employee.firstName;
    if (employee.lastName) mapped.last_name = employee.lastName;
    if (employee.email) mapped.email = employee.email;
    if (employee.department) mapped.department = employee.department;
    if (employee.title) mapped.title = employee.title;
    if (employee.manager) mapped.manager = employee.manager;
    if (employee.status) mapped.status = employee.status;
    if (employee.startDate) mapped.start_date = employee.startDate;
    if (employee.endDate !== undefined) mapped.end_date = employee.endDate;
    if (employee.customAttributes) mapped.custom_attributes = employee.customAttributes;
    if (employee.createdAt) mapped.created_at = employee.createdAt;
    if (employee.updatedAt) mapped.updated_at = employee.updatedAt;
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
    if (attr.id) mapped.id = attr.id;
    if (attr.name) mapped.name = attr.name;
    if (attr.dataType) mapped.data_type = attr.dataType;
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
      description: data.description,
      scheduleType: data.schedule_type,
      time: data.time,
      dayOfWeek: data.day_of_week,
      dayOfMonth: data.day_of_month,
      format: data.format,
      includeFields: data.include_fields,
      enabled: data.enabled,
      destination: data.destination,
      lastRunAt: data.last_run_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapExportScheduleToDb(schedule: Partial<ExportSchedule>): any {
    const mapped: any = {};
    if (schedule.id) mapped.id = schedule.id;
    if (schedule.name) mapped.name = schedule.name;
    if (schedule.description !== undefined) mapped.description = schedule.description;
    if (schedule.scheduleType) mapped.schedule_type = schedule.scheduleType;
    if (schedule.time) mapped.time = schedule.time;
    if (schedule.dayOfWeek !== undefined) mapped.day_of_week = schedule.dayOfWeek;
    if (schedule.dayOfMonth !== undefined) mapped.day_of_month = schedule.dayOfMonth;
    if (schedule.format) mapped.format = schedule.format;
    if (schedule.includeFields) mapped.include_fields = schedule.includeFields;
    if (schedule.enabled !== undefined) mapped.enabled = schedule.enabled;
    if (schedule.destination) mapped.destination = schedule.destination;
    if (schedule.lastRunAt !== undefined) mapped.last_run_at = schedule.lastRunAt;
    if (schedule.createdAt) mapped.created_at = schedule.createdAt;
    if (schedule.updatedAt) mapped.updated_at = schedule.updatedAt;
    return mapped;
  }

  private mapExportLogFromDb(data: any): ScheduledExportLog {
    return {
      id: data.id,
      scheduleId: data.schedule_id,
      timestamp: data.timestamp,
      status: data.status,
      recordsExported: data.records_exported,
      errorMessage: data.error_message,
      destination: data.destination,
    };
  }

  private mapExportLogToDb(log: ScheduledExportLog): any {
    return {
      id: log.id,
      schedule_id: log.scheduleId,
      timestamp: log.timestamp,
      status: log.status,
      records_exported: log.recordsExported,
      error_message: log.errorMessage,
      destination: log.destination,
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

  private getDefaultCoreAttributes(): CoreAttributeConfig[] {
    return [
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
  }

  private async initializeDefaultCoreAttributes(): Promise<void> {
    const defaults = this.getDefaultCoreAttributes();
    await this.setCoreAttributes(defaults);
  }
}

export const serverStorage = new ServerStorage();
```

**Note:** All methods are now async. You'll need to add `await` everywhere serverStorage is used.

## Step 7: Update API Routes

All API routes need to be updated to use async storage operations:

```typescript
// Example: app/api/employees/route.ts
export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request);
  if (!auth.authenticated || !auth.user) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const employees = await serverStorage.getEmployees(); // Now async!

    logApiCall(
      'api.inbound.success',
      `GET /api/employees - Retrieved ${employees.length} employees`,
      {
        userId: auth.user.email,
        // ...
      }
    );

    return NextResponse.json({
      success: true,
      data: employees,
      count: employees.length,
    });
  } catch (error) {
    console.error('Error in GET /api/employees:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch employees' },
      { status: 500 }
    );
  }
}
```

Update all API routes similarly:
- `app/api/employees/route.ts`
- `app/api/employees/[id]/route.ts`
- `app/api/custom-attributes/route.ts`
- `app/api/custom-attributes/[id]/route.ts`
- All other API routes using serverStorage

## Step 8: Data Migration

Create a migration script `scripts/migrate-to-supabase.ts`:

```typescript
import fs from 'fs';
import path from 'path';
import { supabaseAdmin } from '../lib/supabase';

interface LocalData {
  employees: any[];
  customAttributes: any[];
  history: any[];
  exportSchedules: any[];
  exportLogs: any[];
  coreAttributes: any[];
}

async function migrateData() {
  console.log('Starting migration to Supabase...');

  // Read local data
  const dataDir = path.join(process.cwd(), 'data');
  const localData: LocalData = {
    employees: readJsonFile(path.join(dataDir, 'employees.json'), []),
    customAttributes: readJsonFile(path.join(dataDir, 'custom_attributes.json'), []),
    history: readJsonFile(path.join(dataDir, 'history.json'), []),
    exportSchedules: readJsonFile(path.join(dataDir, 'export_schedules.json'), []),
    exportLogs: readJsonFile(path.join(dataDir, 'export_logs.json'), []),
    coreAttributes: readJsonFile(path.join(dataDir, 'core_attributes.json'), []),
  };

  console.log('Found local data:');
  console.log(`- ${localData.employees.length} employees`);
  console.log(`- ${localData.customAttributes.length} custom attributes`);
  console.log(`- ${localData.history.length} history entries`);
  console.log(`- ${localData.exportSchedules.length} export schedules`);

  // Migrate custom attributes first (referenced by employees)
  if (localData.customAttributes.length > 0) {
    console.log('\nMigrating custom attributes...');
    const { error } = await supabaseAdmin
      .from('custom_attributes')
      .insert(localData.customAttributes.map(mapCustomAttributeToDb));

    if (error) {
      console.error('Error migrating custom attributes:', error);
    } else {
      console.log('✓ Custom attributes migrated');
    }
  }

  // Migrate employees
  if (localData.employees.length > 0) {
    console.log('\nMigrating employees...');
    const { error } = await supabaseAdmin
      .from('employees')
      .insert(localData.employees.map(mapEmployeeToDb));

    if (error) {
      console.error('Error migrating employees:', error);
    } else {
      console.log('✓ Employees migrated');
    }
  }

  // Migrate history
  if (localData.history.length > 0) {
    console.log('\nMigrating history...');
    const { error } = await supabaseAdmin
      .from('change_history')
      .insert(localData.history.map(mapHistoryToDb));

    if (error) {
      console.error('Error migrating history:', error);
    } else {
      console.log('✓ History migrated');
    }
  }

  // Migrate export schedules
  if (localData.exportSchedules.length > 0) {
    console.log('\nMigrating export schedules...');
    const { error } = await supabaseAdmin
      .from('export_schedules')
      .insert(localData.exportSchedules.map(mapExportScheduleToDb));

    if (error) {
      console.error('Error migrating export schedules:', error);
    } else {
      console.log('✓ Export schedules migrated');
    }
  }

  // Migrate core attributes
  if (localData.coreAttributes.length > 0) {
    console.log('\nMigrating core attributes...');
    const { error } = await supabaseAdmin
      .from('core_attributes')
      .insert(localData.coreAttributes.map((attr: any, index: number) => ({
        ...mapCoreAttributeToDb(attr),
        display_order: index
      })));

    if (error) {
      console.error('Error migrating core attributes:', error);
    } else {
      console.log('✓ Core attributes migrated');
    }
  }

  console.log('\n✓ Migration complete!');
}

function readJsonFile(filePath: string, defaultValue: any): any {
  try {
    if (!fs.existsSync(filePath)) {
      return defaultValue;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return defaultValue;
  }
}

// Mapper functions (same as in serverStorage.ts)
function mapEmployeeToDb(emp: any): any {
  return {
    id: emp.id,
    type: emp.type,
    first_name: emp.firstName,
    last_name: emp.lastName,
    email: emp.email,
    department: emp.department,
    title: emp.title,
    manager: emp.manager,
    status: emp.status,
    start_date: emp.startDate,
    end_date: emp.endDate,
    custom_attributes: emp.customAttributes || {},
    created_at: emp.createdAt,
    updated_at: emp.updatedAt,
  };
}

function mapCustomAttributeToDb(attr: any): any {
  return {
    id: attr.id,
    name: attr.name,
    data_type: attr.dataType,
    required: attr.required,
  };
}

function mapHistoryToDb(entry: any): any {
  return {
    id: entry.id,
    employee_id: entry.employeeId,
    action: entry.action,
    changes: entry.changes,
    timestamp: entry.timestamp,
    changed_by: entry.changedBy,
  };
}

function mapExportScheduleToDb(schedule: any): any {
  return {
    id: schedule.id,
    name: schedule.name,
    description: schedule.description,
    schedule_type: schedule.scheduleType,
    time: schedule.time,
    day_of_week: schedule.dayOfWeek,
    day_of_month: schedule.dayOfMonth,
    format: schedule.format,
    include_fields: schedule.includeFields,
    enabled: schedule.enabled,
    destination: schedule.destination,
    last_run_at: schedule.lastRunAt,
    created_at: schedule.createdAt,
    updated_at: schedule.updatedAt,
  };
}

function mapCoreAttributeToDb(attr: any): any {
  return {
    id: attr.id,
    field_name: attr.fieldName,
    display_name: attr.displayName,
    data_type: attr.dataType,
    required: attr.required,
    options: attr.options || null,
    locked: attr.locked,
  };
}

// Run migration
migrateData().catch(console.error);
```

Run migration:
```bash
npx tsx scripts/migrate-to-supabase.ts
```

## Step 9: Testing

### 9.1 Test Locally

```bash
# Set environment variables
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials

# Start dev server
npm run dev

# Test CRUD operations
# - Create employee
# - Update employee
# - Delete employee
# - Export data
# - View history
```

### 9.2 Test API Endpoints

```bash
# Test with OAuth
curl -X GET http://localhost:3000/api/employees \
  -H "Authorization: Bearer YOUR_OAUTH_TOKEN"

# Test with session (in browser with cookies)
```

### 9.3 Verify Database

Check Supabase dashboard:
- Table Editor → employees → Verify data
- SQL Editor → Run queries to check data integrity

## Step 10: Deploy to Vercel

1. Add environment variables in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

2. Push code and deploy:
```bash
git add .
git commit -m "Migrate to Supabase for persistent storage"
git push
```

3. Verify deployment:
   - Check Vercel logs
   - Test login
   - Test CRUD operations
   - Verify data persists after redeployment

## Step 11: Cleanup

After successful migration:

1. Remove old storage files:
```bash
rm -rf data/
```

2. Remove file-based storage warning docs:
```bash
rm VERCEL_STORAGE_WARNING.md
```

3. Update documentation:
```bash
# Update CLAUDE.md, README.md
# Remove references to ephemeral storage
# Add Supabase setup instructions
```

## Benefits of Supabase

✅ **Persistent Storage**: Data survives deployments and scaling
✅ **Scalable**: PostgreSQL scales to millions of records
✅ **Real-time**: Optional real-time subscriptions for live updates
✅ **Backups**: Automatic daily backups
✅ **Security**: Row Level Security (RLS) policies
✅ **Queries**: Powerful SQL queries and joins
✅ **Free Tier**: 500MB database, 2GB bandwidth, 50K API requests

## Cost Estimates

**Free Tier (sufficient for MVP):**
- 500 MB database storage
- 5 GB bandwidth
- 50,000 monthly active users
- Unlimited API requests

**Pro Tier ($25/month):**
- 8 GB database storage
- 250 GB bandwidth
- 100,000 monthly active users
- Daily backups for 7 days

## Alternative: Direct PostgreSQL

If you prefer not to use Supabase, you can use any PostgreSQL database:

1. **Vercel Postgres** (recommended for Vercel deployments)
2. **Railway** (easy setup, generous free tier)
3. **Heroku Postgres** (mature, reliable)
4. **AWS RDS** (full control, more expensive)
5. **DigitalOcean Managed Postgres** (good value)

The migration process is similar - just replace the Supabase client with a PostgreSQL client like `pg` or use an ORM like Prisma.

## Support

- Supabase Docs: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- PostgreSQL Docs: https://www.postgresql.org/docs

## Summary

This migration takes your HRMIS application from ephemeral file-based storage to persistent PostgreSQL storage with Supabase. The storage layer abstraction means minimal changes to your API routes and business logic - just adding `await` to storage calls.

Total migration time: 2-4 hours
