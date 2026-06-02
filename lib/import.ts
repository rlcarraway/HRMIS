import { Employee, CustomAttribute, CustomAttributeValue } from './types';
import { employeeSchema } from './validation';
import { z } from 'zod';

// Validation error structure
export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

// Import result structure
export interface ImportResult {
  successful: Array<Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>>;
  errors: ValidationError[];
}

// Parse CSV string into 2D array, handling quoted fields
export function parseCSV(csvString: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < csvString.length; i++) {
    const char = csvString[i];
    const nextChar = csvString[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote
        currentField += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote mode
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      // Field separator
      currentRow.push(currentField.trim());
      currentField = '';
    } else if (char === '\n' && !insideQuotes) {
      // Row separator
      currentRow.push(currentField.trim());
      if (currentRow.some(field => field !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else if (char === '\r' && nextChar === '\n' && !insideQuotes) {
      // Windows line ending
      currentRow.push(currentField.trim());
      if (currentRow.some(field => field !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
      i++; // Skip \n
    } else {
      currentField += char;
    }
  }

  // Handle last field and row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(field => field !== '')) {
      rows.push(currentRow);
    }
  }

  return rows;
}

// Map CSV column name to employee field
function mapColumnToField(columnName: string): string | null {
  const mapping: Record<string, string> = {
    'Type': 'type',
    'First Name': 'firstName',
    'Last Name': 'lastName',
    'Email': 'email',
    'Department': 'department',
    'Title': 'title',
    'Manager': 'manager',
    'Status': 'status',
    'Start Date': 'startDate',
    'End Date': 'endDate',
  };

  return mapping[columnName] || null;
}

// Parse custom attribute value based on data type
function parseCustomAttributeValue(
  value: string,
  dataType: CustomAttribute['dataType']
): CustomAttributeValue | null {
  if (!value || value === '') return null;

  try {
    switch (dataType) {
      case 'number':
      case 'currency':
        const num = parseFloat(value);
        if (isNaN(num)) throw new Error('Invalid number');
        return num;

      case 'boolean':
        const lower = value.toLowerCase().trim();
        if (['true', 'yes', '1'].includes(lower)) return true;
        if (['false', 'no', '0'].includes(lower)) return false;
        throw new Error('Invalid boolean value');

      case 'date':
        // Validate date format
        const date = new Date(value);
        if (isNaN(date.getTime())) throw new Error('Invalid date');
        return value; // Keep as ISO string

      case 'string':
      default:
        return value;
    }
  } catch (e) {
    return null;
  }
}

// Validate and map a single CSV row to employee object
export function validateAndMapRow(
  row: string[],
  headers: string[],
  customAttributes: CustomAttribute[]
): { employee?: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  const employeeData: Record<string, any> = {
    customAttributes: {},
  };

  // Map standard fields
  headers.forEach((header, index) => {
    const value = row[index]?.trim() || '';
    const fieldName = mapColumnToField(header);

    if (fieldName) {
      // Skip ID, Created At, Updated At (system generates these)
      if (['id', 'createdAt', 'updatedAt'].includes(fieldName)) {
        return;
      }

      employeeData[fieldName] = value;
    } else {
      // Check if it's a custom attribute
      const customAttr = customAttributes.find(attr => attr.name === header);
      if (customAttr) {
        if (value) {
          const parsedValue = parseCustomAttributeValue(value, customAttr.dataType);
          if (parsedValue !== null) {
            employeeData.customAttributes[customAttr.name] = parsedValue;
          } else {
            errors.push({
              row: 0, // Will be set by caller
              field: customAttr.name,
              message: `Invalid ${customAttr.dataType} value: "${value}"`,
            });
          }
        } else if (customAttr.required) {
          errors.push({
            row: 0, // Will be set by caller
            field: customAttr.name,
            message: `Required custom attribute "${customAttr.name}" is missing`,
          });
        }
      }
      // Ignore unknown columns
    }
  });

  // Validate required custom attributes
  customAttributes.forEach(attr => {
    if (attr.required && !employeeData.customAttributes[attr.name]) {
      errors.push({
        row: 0, // Will be set by caller
        field: attr.name,
        message: `Required custom attribute "${attr.name}" is missing`,
      });
    }
  });

  // Validate using Zod schema (for standard fields)
  try {
    const validationData = {
      type: employeeData.type,
      firstName: employeeData.firstName,
      lastName: employeeData.lastName,
      email: employeeData.email,
      department: employeeData.department,
      title: employeeData.title,
      manager: employeeData.manager,
      status: employeeData.status,
      startDate: employeeData.startDate,
      endDate: employeeData.endDate,
    };

    employeeSchema.parse(validationData);
  } catch (e) {
    if (e instanceof z.ZodError) {
      e.errors.forEach(err => {
        errors.push({
          row: 0, // Will be set by caller
          field: err.path[0]?.toString() || 'unknown',
          message: err.message,
        });
      });
    }
  }

  if (errors.length > 0) {
    return { errors };
  }

  return {
    employee: employeeData as Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>,
    errors: [],
  };
}

// Main import function
export function importEmployeesFromCSV(
  csvString: string,
  customAttributes: CustomAttribute[]
): ImportResult {
  const successful: Array<Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>> = [];
  const errors: ValidationError[] = [];

  // Parse CSV
  const rows = parseCSV(csvString);
  if (rows.length === 0) {
    errors.push({
      row: 0,
      field: 'file',
      message: 'CSV file is empty',
    });
    return { successful, errors };
  }

  // Extract headers
  const headers = rows[0];
  if (headers.length === 0) {
    errors.push({
      row: 1,
      field: 'headers',
      message: 'No headers found in CSV',
    });
    return { successful, errors };
  }

  // Validate required headers
  const requiredHeaders = ['Type', 'First Name', 'Last Name', 'Email', 'Department', 'Title', 'Manager', 'Status', 'Start Date'];
  const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
  if (missingHeaders.length > 0) {
    errors.push({
      row: 1,
      field: 'headers',
      message: `Missing required columns: ${missingHeaders.join(', ')}`,
    });
    return { successful, errors };
  }

  // Process data rows
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 1;

    // Skip empty rows
    if (row.every(cell => !cell)) continue;

    const result = validateAndMapRow(row, headers, customAttributes);

    if (result.employee) {
      successful.push(result.employee);
    }

    if (result.errors.length > 0) {
      result.errors.forEach(err => {
        errors.push({
          ...err,
          row: rowNumber,
        });
      });
    }
  }

  return { successful, errors };
}
