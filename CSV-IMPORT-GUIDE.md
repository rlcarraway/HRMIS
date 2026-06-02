# CSV Import Feature Guide

## Overview

The HRMIS application now supports bulk importing of employee and contractor records via CSV files. This feature allows you to quickly populate the system with multiple records while maintaining data validation and audit history.

## Features

- ✅ Bulk import multiple employees/contractors from a single CSV file
- ✅ Automatic validation of all required fields
- ✅ Support for custom attributes (dynamically detected from CSV headers)
- ✅ Row-by-row error reporting with specific field-level feedback
- ✅ Type coercion for custom attributes (number, boolean, date, currency, string)
- ✅ Automatic history tracking for all imported records
- ✅ Preview and validation before import
- ✅ Compatible with exported CSV format (export → import round trip)

## CSV Format

### Required Columns

The following columns **must** be present in your CSV file (exact header names):

- `Type` - Either "employee" or "contractor"
- `First Name` - Employee's first name
- `Last Name` - Employee's last name
- `Email` - Valid email address
- `Department` - Department name
- `Title` - Job title
- `Manager` - Manager's name
- `Status` - One of: "active", "inactive", "terminated"
- `Start Date` - Date in YYYY-MM-DD format

### Optional Columns

- `End Date` - Required for contractors, optional for employees (YYYY-MM-DD format)
- `ID` - Will be ignored (system generates new IDs)
- `Created At` - Will be ignored (system generates timestamps)
- `Updated At` - Will be ignored (system generates timestamps)

### Custom Attribute Columns

Any additional columns will be treated as custom attributes if they match the name of a custom attribute defined in the system (Settings page). The system will:

1. Match column headers to custom attribute names (case-sensitive)
2. Apply type coercion based on the attribute's data type
3. Validate required custom attributes
4. Ignore unknown columns (columns that don't match any custom attribute)

### Example CSV

```csv
Type,First Name,Last Name,Email,Department,Title,Manager,Status,Start Date,End Date,Clearance Level,Years Experience
employee,Jane,Smith,jane.smith@example.com,Engineering,Senior Software Engineer,John Doe,active,2023-01-15,,Top Secret,8
contractor,Bob,Johnson,bob.j@contractor.com,Marketing,Marketing Consultant,Alice Williams,active,2024-03-01,2024-12-31,Public,3
employee,Carol,Davis,carol.d@example.com,HR,HR Manager,Jane Smith,active,2022-06-01,,Secret,12
```

## Using the Import Feature

### Step 1: Prepare Your CSV File

1. Ensure all required columns are present
2. Use proper date format (YYYY-MM-DD)
3. Contractors must have an End Date
4. Use valid status values: active, inactive, or terminated
5. Use valid type values: employee or contractor

### Step 2: Define Custom Attributes (Optional)

Before importing, define any custom attributes in the Settings page:

1. Go to Settings
2. Add custom attributes with appropriate data types
3. Mark required attributes as required
4. Note: Custom attribute names in CSV must match exactly

### Step 3: Import the CSV

1. Navigate to the Employees page
2. Click "Import CSV" button
3. Select your CSV file
4. Review the validation summary:
   - Green badge: Number of valid rows
   - Red badge: Number of errors (if any)
5. If errors exist, click "Show Details" to see row-by-row issues
6. Fix errors in your CSV and re-upload
7. When all rows are valid, click "Import" button

### Step 4: Verify Import

1. Check that all employees appear in the employee list
2. Click on individual employees to verify custom attributes
3. Check employee history to see "CSV Import" entries

## Data Type Handling

### Standard Fields

All standard fields are validated using the same rules as manual entry:

- **Email**: Must be a valid email format
- **Dates**: Must be valid dates in YYYY-MM-DD format
- **Status**: Must be one of: active, inactive, terminated
- **Type**: Must be either employee or contractor
- **Contractor End Date**: Required for type=contractor, must be after Start Date

### Custom Attributes

Custom attributes are automatically type-coerced based on their defined data type:

| Data Type | Valid CSV Values | Examples |
|-----------|------------------|----------|
| String | Any text | "Top Secret", "Engineering" |
| Number | Numeric values | 8, 5.5, 1000 |
| Currency | Numeric values | 75000, 80000.50 |
| Date | YYYY-MM-DD format | 2024-01-15 |
| Boolean | true/false, yes/no, 1/0 | true, yes, 1 |

**Note**: Invalid values will produce validation errors with specific messages.

## CSV Edge Cases

The parser handles the following CSV edge cases correctly:

### Commas in Fields

Use double quotes around fields containing commas:
```csv
First Name,Last Name,Title
John,"Smith, Jr.",Engineer
```

### Quotes in Fields

Escape quotes by doubling them:
```csv
First Name,Last Name,Notes
John,Smith,"He said ""hello"" to me"
```

### Empty Optional Fields

Leave fields empty or use empty quotes:
```csv
Type,First Name,Last Name,End Date
employee,John,Smith,
employee,Jane,Doe,""
```

## Validation and Error Handling

### Validation Process

The import feature validates **all rows** before importing **any rows**. This transactional approach ensures:

1. You see all errors at once (not just the first error)
2. No partial imports (either all rows import or none)
3. No cleanup needed if validation fails

### Common Validation Errors

| Error Message | Cause | Solution |
|---------------|-------|----------|
| "First name is required" | Missing or empty First Name field | Ensure all rows have a first name |
| "Invalid email address" | Email format invalid | Use format: user@domain.com |
| "End date is required for contractors" | Contractor missing End Date | Add end date for type=contractor |
| "End date must be after start date" | End date before start date | Ensure end date > start date |
| "Invalid number value" | Non-numeric value for number field | Use numeric values only |
| "Invalid boolean value" | Invalid boolean format | Use: true/false, yes/no, or 1/0 |
| "Required custom attribute X is missing" | Required custom field empty | Fill in required custom attributes |
| "Missing required columns: X, Y" | CSV missing required headers | Add all required column headers |

### Error Display

When validation errors occur:

1. Red badge shows total error count
2. Click "Show Details" to expand error table
3. Each error shows:
   - Row number (matching CSV line number)
   - Field name with error
   - Specific error message
4. Import button is disabled until all errors are resolved

## Sample CSV File

A sample CSV file is provided at the project root: `sample-import.csv`

This file includes:
- Mix of employees and contractors
- Both required and optional fields
- Custom attributes (Clearance Level, Years Experience)
- Valid data demonstrating proper format

You can use this file to:
1. Test the import feature
2. Reference correct CSV structure
3. Create your own CSV templates

## Export-Import Round Trip

The import feature is designed to work seamlessly with the export feature:

1. Export employees to CSV (Export CSV button)
2. Edit the CSV file as needed
3. Import the modified CSV
4. All data (including custom attributes) preserved

**Note**: ID, Created At, and Updated At columns from exports are ignored on import. The system generates fresh IDs and timestamps for imported records.

## History Tracking

Each imported employee automatically creates a history entry:

- **Action**: create
- **Changed By**: "CSV Import" (distinguishes from manual creation)
- **Timestamp**: Import time
- **Changes**: Empty (standard for create actions)

View import history:
1. Navigate to employee detail page
2. Click "View History" link
3. See "CSV Import" entry for imported employees

## Best Practices

1. **Start Small**: Test with a small CSV (5-10 rows) before bulk importing
2. **Define Custom Attributes First**: Create custom attributes before importing
3. **Use Export as Template**: Export existing data to get correct CSV structure
4. **Validate Dates**: Ensure all dates use YYYY-MM-DD format
5. **Check Required Fields**: Verify all required columns are present and filled
6. **Test Custom Attributes**: Import a test file with custom attributes to verify type handling
7. **Review Validation Errors**: Fix all validation errors before importing
8. **Verify After Import**: Check a few imported records to ensure data accuracy

## Limitations

1. **No Duplicate Detection**: Import does not check for duplicate emails
2. **No Update on Import**: Import only creates new records (no update of existing)
3. **Case-Sensitive Custom Attributes**: CSV column names must match custom attribute names exactly
4. **No File Size Limit**: Large CSV files (>1000 rows) may slow down the browser
5. **No Rollback**: Once imported, records must be deleted individually (no bulk rollback)

## Troubleshooting

### Import button is disabled

- Check for validation errors in red badge
- Click "Show Details" to see specific errors
- Fix errors in CSV and re-upload

### Custom attributes not appearing

- Ensure custom attributes are defined in Settings first
- Verify CSV column names match custom attribute names exactly (case-sensitive)
- Check that custom attribute data types match CSV values

### "Missing required columns" error

- Compare CSV headers with required columns list
- Ensure headers are in the first row
- Check for typos in column names (e.g., "FirstName" vs "First Name")

### Dates not importing correctly

- Use YYYY-MM-DD format only
- Avoid date formats like MM/DD/YYYY or DD-MM-YYYY
- Ensure dates are valid (no February 30th, etc.)

### Server errors or blank page

- Check browser console for errors
- Verify CSV file is valid and not corrupted
- Try smaller CSV file to isolate issue
- Check dev server is running: `npm run dev`

## Technical Details

### Architecture

The import feature consists of:

1. **Parser** (`lib/import.ts`):
   - `parseCSV()`: Parses CSV text handling quotes, commas, newlines
   - `validateAndMapRow()`: Validates and maps CSV rows to employee objects
   - `importEmployeesFromCSV()`: Main import orchestration function

2. **UI** (`components/employees/ImportModal.tsx`):
   - File upload with validation preview
   - Error display with expandable details
   - Success/error badges
   - Disabled state when errors present

3. **Hook** (`hooks/useEmployees.ts`):
   - `bulkCreateEmployees()`: Bulk employee creation with history tracking

4. **Integration** (`app/employees/page.tsx`):
   - Import CSV button
   - Modal integration
   - Custom attributes context

### Type Coercion Logic

Custom attribute type coercion is handled in `parseCustomAttributeValue()`:

```typescript
'number' | 'currency' → parseFloat(value)
'boolean' → true/false/yes/no/1/0 → boolean
'date' → validate ISO date, keep as string
'string' → keep as-is
```

### Validation Strategy

Uses Zod schemas from `lib/validation.ts`:
- Standard fields validated with `employeeSchema`
- Custom attributes validated by type
- All rows validated before any import
- Row-level error aggregation

## Future Enhancements

Potential improvements for future versions:

- Duplicate email detection with skip/update options
- Update existing records on import (upsert functionality)
- Import validation API endpoint for large files
- Progress bar for large imports
- Bulk rollback functionality
- CSV template download with custom attributes
- Import preview with sample data display
- Column mapping UI for flexible CSV formats

---

For more information, see the main documentation in `CLAUDE.md` and `README.md`.
