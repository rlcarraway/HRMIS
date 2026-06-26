import fs from 'fs';
import path from 'path';
import { supabaseAdmin } from '../lib/supabase';

interface LocalData {
  employees: any[];
  customAttributes: any[];
  history: any[];
  exportSchedules: any[];
  exportMetadata: any;
  exportLogs: any[];
  coreAttributes: any[];
  logo: string | null;
}

async function migrateData() {
  console.log('='.repeat(80));
  console.log('Starting migration to Supabase...');
  console.log('='.repeat(80));
  console.log();

  // Read local data
  const dataDir = path.join(process.cwd(), 'data');
  console.log(`Reading data from: ${dataDir}`);
  console.log();

  const localData: LocalData = {
    employees: readJsonFile(path.join(dataDir, 'employees.json'), []),
    customAttributes: readJsonFile(path.join(dataDir, 'custom_attributes.json'), []),
    history: readJsonFile(path.join(dataDir, 'history.json'), []),
    exportSchedules: readJsonFile(path.join(dataDir, 'export_schedules.json'), []),
    exportMetadata: readJsonFile(path.join(dataDir, 'export_metadata.json'), {
      totalExportsCount: 0,
      scheduledExportsCount: 0,
      manualExportsCount: 0,
    }),
    exportLogs: readJsonFile(path.join(dataDir, 'export_logs.json'), []),
    coreAttributes: readJsonFile(path.join(dataDir, 'core_attributes.json'), []),
    logo: readTextFile(path.join(dataDir, 'logo.txt')),
  };

  console.log('Found local data:');
  console.log(`  • ${localData.employees.length} employees`);
  console.log(`  • ${localData.customAttributes.length} custom attributes`);
  console.log(`  • ${localData.history.length} history entries`);
  console.log(`  • ${localData.exportSchedules.length} export schedules`);
  console.log(`  • ${localData.exportLogs.length} export logs`);
  console.log(`  • ${localData.coreAttributes.length} core attributes`);
  console.log(`  • Company logo: ${localData.logo ? 'Yes' : 'No'}`);
  console.log();

  if (localData.employees.length === 0 && localData.customAttributes.length === 0) {
    console.log('⚠️  No data found to migrate. Exiting...');
    return;
  }

  // Ask for confirmation
  console.log('⚠️  WARNING: This will insert data into your Supabase database.');
  console.log('Make sure you have:');
  console.log('  1. Created a Supabase project');
  console.log('  2. Run the SQL schema from docs/SUPABASE_MIGRATION.md');
  console.log('  3. Set environment variables in .env.local');
  console.log();

  // Migrate custom attributes first (referenced by employees)
  if (localData.customAttributes.length > 0) {
    console.log('Migrating custom attributes...');
    try {
      const { error } = await supabaseAdmin
        .from('custom_attributes')
        .insert(localData.customAttributes.map(mapCustomAttributeToDb));

      if (error) {
        console.error('❌ Error migrating custom attributes:', error.message);
        throw error;
      }
      console.log(`✓ Migrated ${localData.customAttributes.length} custom attributes`);
      console.log();
    } catch (error) {
      console.error('Failed to migrate custom attributes');
      throw error;
    }
  }

  // Migrate core attributes
  if (localData.coreAttributes.length > 0) {
    console.log('Migrating core attributes...');
    try {
      const { error } = await supabaseAdmin
        .from('core_attributes')
        .insert(localData.coreAttributes.map((attr: any, index: number) =>
          mapCoreAttributeToDb(attr, index)
        ));

      if (error) {
        console.error('❌ Error migrating core attributes:', error.message);
        throw error;
      }
      console.log(`✓ Migrated ${localData.coreAttributes.length} core attributes`);
      console.log();
    } catch (error) {
      console.error('Failed to migrate core attributes');
      throw error;
    }
  }

  // Migrate employees
  if (localData.employees.length > 0) {
    console.log('Migrating employees...');
    try {
      const { error } = await supabaseAdmin
        .from('employees')
        .insert(localData.employees.map(mapEmployeeToDb));

      if (error) {
        console.error('❌ Error migrating employees:', error.message);
        throw error;
      }
      console.log(`✓ Migrated ${localData.employees.length} employees`);
      console.log();
    } catch (error) {
      console.error('Failed to migrate employees');
      throw error;
    }
  }

  // Migrate history (references employees)
  if (localData.history.length > 0) {
    console.log('Migrating change history...');
    try {
      const { error } = await supabaseAdmin
        .from('change_history')
        .insert(localData.history.map(mapHistoryToDb));

      if (error) {
        console.error('❌ Error migrating history:', error.message);
        throw error;
      }
      console.log(`✓ Migrated ${localData.history.length} history entries`);
      console.log();
    } catch (error) {
      console.error('Failed to migrate history');
      throw error;
    }
  }

  // Migrate export schedules
  if (localData.exportSchedules.length > 0) {
    console.log('Migrating export schedules...');
    try {
      const { error } = await supabaseAdmin
        .from('export_schedules')
        .insert(localData.exportSchedules.map(mapExportScheduleToDb));

      if (error) {
        console.error('❌ Error migrating export schedules:', error.message);
        throw error;
      }
      console.log(`✓ Migrated ${localData.exportSchedules.length} export schedules`);
      console.log();
    } catch (error) {
      console.error('Failed to migrate export schedules');
      throw error;
    }
  }

  // Migrate export logs (references schedules)
  if (localData.exportLogs.length > 0) {
    console.log('Migrating export logs...');
    try {
      const { error } = await supabaseAdmin
        .from('export_logs')
        .insert(localData.exportLogs.map(mapExportLogToDb));

      if (error) {
        console.error('❌ Error migrating export logs:', error.message);
        throw error;
      }
      console.log(`✓ Migrated ${localData.exportLogs.length} export logs`);
      console.log();
    } catch (error) {
      console.error('Failed to migrate export logs');
      throw error;
    }
  }

  // Migrate export metadata
  if (localData.exportMetadata) {
    console.log('Migrating export metadata...');
    try {
      const { error } = await supabaseAdmin
        .from('export_metadata')
        .update({
          total_exports_count: localData.exportMetadata.totalExportsCount || 0,
          scheduled_exports_count: localData.exportMetadata.scheduledExportsCount || 0,
          manual_exports_count: localData.exportMetadata.manualExportsCount || 0,
        })
        .eq('id', 1);

      if (error) {
        console.error('❌ Error migrating export metadata:', error.message);
        throw error;
      }
      console.log('✓ Migrated export metadata');
      console.log();
    } catch (error) {
      console.error('Failed to migrate export metadata');
      throw error;
    }
  }

  // Migrate company logo
  if (localData.logo) {
    console.log('Migrating company logo...');
    try {
      const { error } = await supabaseAdmin
        .from('company_settings')
        .upsert({
          id: 1,
          logo: localData.logo,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('❌ Error migrating logo:', error.message);
        throw error;
      }
      console.log('✓ Migrated company logo');
      console.log();
    } catch (error) {
      console.error('Failed to migrate logo');
      throw error;
    }
  }

  console.log('='.repeat(80));
  console.log('✓ Migration complete!');
  console.log('='.repeat(80));
  console.log();
  console.log('Next steps:');
  console.log('  1. Verify data in Supabase dashboard');
  console.log('  2. Test API endpoints with migrated data');
  console.log('  3. Update lib/serverStorage.ts to use Supabase');
  console.log('  4. Deploy to production');
  console.log();
}

// Helper functions

function readJsonFile(filePath: string, defaultValue: any): any {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`  ⚠️  File not found: ${path.basename(filePath)}`);
      return defaultValue;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`  ❌ Error reading ${filePath}:`, error);
    return defaultValue;
  }
}

function readTextFile(filePath: string): string | null {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error(`  ❌ Error reading ${filePath}:`, error);
    return null;
  }
}

// Mapper functions (camelCase to snake_case)

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
    end_date: emp.endDate || null,
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
    description: schedule.description || null,
    schedule_type: schedule.scheduleType,
    time: schedule.time,
    day_of_week: schedule.dayOfWeek !== undefined ? schedule.dayOfWeek : null,
    day_of_month: schedule.dayOfMonth !== undefined ? schedule.dayOfMonth : null,
    format: schedule.format,
    include_fields: schedule.includeFields,
    enabled: schedule.enabled,
    destination: schedule.destination,
    last_run_at: schedule.lastRunAt || null,
    created_at: schedule.createdAt,
    updated_at: schedule.updatedAt,
  };
}

function mapExportLogToDb(log: any): any {
  return {
    id: log.id,
    schedule_id: log.scheduleId,
    timestamp: log.timestamp,
    status: log.status,
    records_exported: log.recordsExported || null,
    error_message: log.errorMessage || null,
    destination: log.destination,
  };
}

function mapCoreAttributeToDb(attr: any, displayOrder: number): any {
  return {
    id: attr.id,
    field_name: attr.fieldName,
    display_name: attr.displayName,
    data_type: attr.dataType,
    required: attr.required,
    options: attr.options || null,
    locked: attr.locked || false,
    display_order: displayOrder,
  };
}

// Run migration
migrateData()
  .then(() => {
    console.log('Migration script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error();
    console.error('='.repeat(80));
    console.error('❌ Migration failed!');
    console.error('='.repeat(80));
    console.error(error);
    console.error();
    process.exit(1);
  });
