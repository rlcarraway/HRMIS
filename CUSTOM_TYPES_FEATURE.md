# Custom Employee Types Feature

## Overview

The application now supports **custom employee types** beyond the default 'employee' and 'contractor' options. Users can add new types (e.g., 'intern', 'consultant', 'vendor') through the Settings page.

## Changes Made

### 1. Type Definition Updates

**File: `lib/types.ts`**
- Changed `Employee.type` from `'employee' | 'contractor'` to `string`
  - Now accepts any string value for custom types
  - Comment added: "Type is configurable (e.g., 'employee', 'contractor', or custom types)"

- Updated `EmployeeFilters.type` from `Employee['type'] | 'all'` to `string | 'all'`
  - Allows filtering by any custom type value

- Added `byType` field to `EmployeeStats` interface
  - Tracks count of each type including custom types
  - Format: `Record<string, number>` (e.g., `{ employee: 10, contractor: 5, intern: 3 }`)

### 2. Statistics Calculation

**File: `lib/utils.ts`**
- Updated `calculateStats()` function:
  - Added `byType: {}` to track all types
  - Kept legacy `employees` and `contractors` counters for backward compatibility
  - New logic: `stats.byType[emp.type] = (stats.byType[emp.type] || 0) + 1`
  - All types (including custom) are now tracked in the `byType` object

### 3. UI Components

**File: `app/employees/page.tsx`**

#### a) Page Title Updated
- Changed from "Employees" to "Manage Employees"

#### b) Added "Manage Custom Attributes" Button
- Moved from dashboard to employees page
- Appears next to Import/Export/Add buttons
- Allows quick access to configure custom types

#### c) Type Badge Rendering
- Updated `getTypeBadge()` function to handle custom types:
  ```typescript
  const colors: Record<string, string> = {
    employee: 'bg-blue-100 text-blue-800',
    contractor: 'bg-purple-100 text-purple-800',
  };
  // Use mapped color or default gray for custom types
  const colorClass = colors[type.toLowerCase()] || 'bg-gray-100 text-gray-800';
  ```
- Default types ('employee', 'contractor') have specific colors
- Custom types display with gray badge

#### d) URL Parameter Filtering
- Removed hardcoded type validation in query parameter handling
- Now accepts any type value from URL (e.g., `?type=intern`)

### 4. Navigation Update

**File: `components/Navigation.tsx`**
- Changed navigation label from "Employees" to "Manage Employees"

### 5. Dashboard Update

**File: `app/page.tsx`**
- Removed "Manage Custom Attributes" button from Quick Actions section
- Button moved to employees page for better workflow

## How to Add Custom Types

Users can now add custom employee types through the Settings page:

1. **Navigate to Settings** (http://localhost:3000/settings)
2. **Locate Core Attributes Section**
3. **Find the "Type" attribute** (should be the first core attribute)
4. **Click Edit** (pencil icon)
5. **Add New Options**:
   - Enter new type name in the "Add Option" field (e.g., "Intern")
   - Click "Add Option" or press Enter
   - Repeat for additional types
6. **Save Changes**
7. **New types immediately available** in employee forms

## Current Type Configuration

The type field is configured in `lib/storage.ts` as a core attribute:

```typescript
{
  id: '1',
  fieldName: 'type',
  displayName: 'Type',
  dataType: 'select',
  required: true,
  options: ['employee', 'contractor'], // Can be extended via Settings UI
  locked: true
}
```

- **Default Options**: ['employee', 'contractor']
- **Editable**: Yes, through Settings UI
- **Required**: Yes
- **Locked**: Cannot be deleted (critical field)

## Technical Details

### Type Storage
- Types are stored in `lib/storage.ts` under `STORAGE_KEYS.CORE_ATTRIBUTES`
- The options array can be modified through the Settings UI
- Changes persist in browser localStorage

### Type Validation
- No compile-time type checking (TypeScript now uses `string` instead of union type)
- Runtime validation happens in forms and API routes
- Empty type values are rejected (required field)

### Backward Compatibility
- Existing employees with 'employee' or 'contractor' types continue to work
- Legacy `stats.employees` and `stats.contractors` counters maintained
- Dashboard cards for "Employees" and "Contractors" still functional
- New `stats.byType` object provides comprehensive type breakdown

## Examples

### Creating Employee with Custom Type

**Via UI:**
1. Add custom type in Settings (e.g., "Intern")
2. Go to "Add Employee" form
3. Select "Intern" from Type dropdown
4. Fill other fields and save

**Via API:**
```bash
curl -X POST http://localhost:3000/api/employees \
  -H "Content-Type: application/json" \
  -d '{
    "type": "intern",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "department": "Engineering",
    "title": "Summer Intern",
    "manager": "manager@example.com",
    "status": "active",
    "startDate": "2024-06-01",
    "customAttributes": {}
  }'
```

### Filtering by Custom Type

**Via URL:**
```
http://localhost:3000/employees?type=intern
```

**Via API:**
```bash
curl "http://localhost:3000/api/employees?type=intern"
```

## Display Behavior

### Type Badges
- **employee**: Blue badge
- **contractor**: Purple badge
- **Custom types**: Gray badge (default)
- All badges show the type name in the badge

### Dashboard Statistics
- Legacy cards show counts for 'employee' and 'contractor'
- Custom types are tracked in `stats.byType` object
- Can be displayed in future dashboard enhancements

### Filtering
- Type dropdown in filter panel dynamically shows all available types
- URL parameters support any custom type
- API endpoints filter by any type value

## Future Enhancements

Potential improvements for custom types:

1. **Custom Badge Colors**: Allow users to assign colors to custom types
2. **Dashboard Cards**: Auto-generate stat cards for custom types
3. **Type Icons**: Allow custom icons for each type
4. **Type-Specific Fields**: Show/hide fields based on type selection
5. **Type Hierarchy**: Support parent-child type relationships
6. **Type Permissions**: Role-based access by type
7. **Migration to Database**: Store types in database table for better scalability

## Testing

To test the custom types feature:

1. **Add a custom type** in Settings
2. **Create an employee** with the new type
3. **Verify badge display** in employee list (gray badge)
4. **Test filtering** by the custom type
5. **Check API response** includes custom type
6. **Verify statistics** track the new type in `byType` object

## Notes

- Custom types are case-sensitive in storage but displayed as entered
- Type badge colors are case-insensitive ('Employee' and 'employee' get same color)
- The type field cannot be removed (locked core attribute)
- Deleting a type option does NOT delete employees with that type
- Employees keep their type value even if the option is removed from the list
