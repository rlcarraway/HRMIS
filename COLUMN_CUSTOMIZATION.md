# Column Customization Feature

## Overview

The employee list on the Manage Employees page now supports **column customization** and **column resizing**, giving users full control over which attributes they want to see and how much space each column takes up.

## Features

### 1. Show/Hide Columns
- **Select which columns to display** in the employee table
- **Toggle visibility** for any attribute (core or custom)
- **Actions column always visible** (cannot be hidden)
- Settings persist across sessions in localStorage

### 2. Reorder Columns
- **Drag and drop columns** to reorder them
- Changes apply immediately to the table
- Custom order is saved automatically

### 3. Resize Columns
- **Drag column borders** to adjust width
- **Minimum width** of 100px to ensure readability
- **Hover indicator** shows which border is draggable
- **Blue highlight** when actively resizing
- Width preferences saved in localStorage

### 4. Custom Attributes Support
- **Automatically includes all custom attributes** as available columns
- Custom attribute columns can be shown/hidden like core columns
- Proper formatting for different data types:
  - **Boolean**: "Yes" / "No"
  - **Date**: Formatted date (e.g., "Jan 15, 2024")
  - **Currency**: Dollar format (e.g., "$50,000")
  - **Others**: Display as-is

## How to Use

### Customize Columns

1. **Open Column Customizer**
   - Click the "Customize Columns" button in the action bar
   - Button shows the Columns icon (⊞)

2. **Show/Hide Columns**
   - Check/uncheck boxes next to column names
   - Changes apply immediately when you close the modal
   - Actions column is always checked and disabled

3. **Reorder Columns**
   - Drag the grip icon (⋮⋮) next to visible columns
   - Drop at desired position
   - Order updates in real-time

4. **Reset to Default**
   - Click "Reset to Default" button in the modal
   - Restores original column order and visibility
   - Clears all saved preferences

### Resize Columns

1. **Hover over column border** in the table header
2. **Cursor changes** to resize cursor (↔)
3. **Click and drag** to adjust width
4. **Release** to set the new width
5. Width is **automatically saved** to localStorage

## Available Columns

### Core Attributes (Always Available)
- **Name** (firstName + lastName combined)
- **Email**
- **Type** (employee, contractor, or custom types)
- **Department**
- **Title**
- **Status** (active, inactive, terminated)
- **Start Date**
- **End Date** (shows "-" if not set)
- **Manager**
- **Actions** (View, Edit, Delete buttons)

### Custom Attributes (Dynamic)
- All custom attributes defined in Settings appear as columns
- Column key format: `custom_{attributeId}`
- Header shows the attribute name
- Values formatted based on data type

## Default Configuration

### Default Visible Columns
1. Name
2. Email
3. Type
4. Department
5. Title
6. Status
7. Start Date
8. Actions

### Hidden by Default
- End Date
- Manager
- All custom attributes

Users can show these columns using the Column Customizer.

## Technical Implementation

### Components

**ColumnCustomizer Component**
- Location: `/components/employees/ColumnCustomizer.tsx`
- Modal dialog with drag-and-drop interface
- Checkbox list of all available columns
- Visual indicators for visible/hidden state
- Drag handles for reordering

**Enhanced Table Component**
- Location: `/components/ui/Table.tsx`
- Added `resizable` prop to enable column resizing
- Added `columnWidths` prop for controlled widths
- Added `onColumnWidthChange` callback
- Resize handles between column headers
- Mouse event handling for drag operations
- Fixed table layout when resizable is enabled

**Updated Employees Page**
- Location: `/app/employees/page.tsx`
- State management for visible columns and widths
- Integration with ColumnCustomizer modal
- Dynamic column generation including custom attributes
- localStorage persistence

### Data Persistence

**localStorage Keys**
```javascript
'employeeTableColumns' // Array of visible column keys
'employeeTableWidths'  // Object mapping column keys to widths
```

**Example Storage**
```json
// employeeTableColumns
["firstName", "email", "type", "department", "title", "status", "actions"]

// employeeTableWidths
{
  "firstName": 200,
  "email": 250,
  "type": 120,
  "department": 180,
  "title": 200,
  "status": 120,
  "actions": 150
}
```

### Column Definition Structure

```typescript
interface Column<T> {
  key: string;           // Unique identifier
  header: string;        // Display name
  sortable?: boolean;    // Enable sorting
  render?: (item: T) => ReactNode;  // Custom renderer
  width?: number;        // Default width in pixels
  minWidth?: number;     // Minimum width when resizing
}
```

### Custom Attribute Column Generation

```typescript
// Custom attribute columns are dynamically generated
customAttributes.map(attr => ({
  key: `custom_${attr.id}`,
  header: attr.name,
  sortable: true,
  render: (emp: Employee) => {
    const value = emp.customAttributes?.[attr.name];
    if (value === undefined || value === null) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (attr.dataType === 'date') return formatDate(value);
    if (attr.dataType === 'currency') return `$${value.toLocaleString()}`;
    return String(value);
  },
}))
```

## User Experience

### Visual Feedback

**Column Customizer Modal**
- ✓ Visible columns have checkmarks
- ✗ Hidden columns grayed out
- ⋮⋮ Drag handles on visible columns
- 👁 Eye icon shows visibility state
- Counter shows "X of Y columns visible"

**Resizable Columns**
- Hover effect on column borders
- Blue highlight during active resize
- Smooth width transitions
- Text overflow with ellipsis when content doesn't fit

### Responsive Behavior
- Table scrolls horizontally if columns exceed viewport
- Column customizer modal adapts to mobile screens
- Touch-friendly drag-and-drop on mobile devices
- Minimum column widths prevent too-narrow columns

## Best Practices

### For Users

1. **Start with default columns** and add more as needed
2. **Keep Actions column visible** for quick access to buttons
3. **Resize wider for text-heavy columns** (email, title)
4. **Hide rarely-used columns** to reduce clutter
5. **Use custom attributes selectively** - not all need to be visible

### For Developers

1. **Always include an "Actions" column** that cannot be hidden
2. **Set reasonable default widths** for each column type
3. **Implement proper overflow handling** for long text
4. **Test with many custom attributes** to ensure performance
5. **Provide reset functionality** to recover from bad configurations

## Performance Considerations

### Optimization
- Column visibility filtered before rendering
- Width calculations cached per render
- localStorage updates batched (not on every mouse move)
- Drag-and-drop uses native browser APIs

### Limitations
- Very large numbers of columns (50+) may impact performance
- Horizontal scrolling required when many columns visible
- localStorage has ~5MB limit (shouldn't be an issue for column preferences)

## Troubleshooting

### Columns Not Saving
- **Check localStorage permissions** in browser settings
- **Verify not in incognito/private mode**
- **Clear localStorage** and try again: `localStorage.clear()`

### Resize Not Working
- **Ensure `resizable={true}`** prop on Table component
- **Check mouse events** are not blocked by other elements
- **Verify column borders** have proper positioning

### Custom Attributes Not Showing
- **Verify custom attributes exist** in Settings
- **Check attribute has a name** (required field)
- **Refresh employee list** after adding attributes
- **Open Column Customizer** and enable the column

### Drag and Drop Not Working
- **Use visible columns only** - can't drag hidden columns
- **Check browser supports drag events** (all modern browsers do)
- **Ensure grip icon is clickable** and not covered

## Future Enhancements

Potential improvements:

1. **Column Groups**: Group related columns (Personal Info, Employment, Custom)
2. **Column Presets**: Save/load multiple column configurations
3. **Export Column Config**: Share column settings between users
4. **Auto-fit Columns**: Automatically size columns based on content
5. **Column Search**: Search/filter in column customizer for large lists
6. **Keyboard Navigation**: Arrow keys to reorder columns
7. **Column Templates**: Pre-defined layouts (Compact, Detailed, etc.)
8. **Conditional Visibility**: Show/hide columns based on filters
9. **Column Stats**: Show data statistics in column headers
10. **Frozen Columns**: Pin important columns to left/right

## Examples

### Scenario 1: Focus on Basic Info
**Visible Columns**: Name, Email, Type, Status, Actions
**Use Case**: Quick overview of workforce
**Benefits**: Clean, minimal view; fast scanning

### Scenario 2: Contractor Management
**Visible Columns**: Name, Type, Department, Start Date, End Date, Manager, Actions
**Use Case**: Track contractor assignments and end dates
**Benefits**: All relevant contractor info visible

### Scenario 3: Custom Attribute Heavy
**Visible Columns**: Name, Email, Clearance Level (custom), Remote Status (custom), Emergency Contact (custom), Actions
**Use Case**: Organizations with unique data requirements
**Benefits**: Tailored view for specific business needs

### Scenario 4: Recruitment View
**Visible Columns**: Name, Email, Title, Status, Start Date, Hiring Manager (custom), Actions
**Use Case**: HR team tracking new hires
**Benefits**: Focused on onboarding-relevant data

## API Integration

The column customization is entirely client-side, but if you want to sync preferences across devices:

### Potential API Endpoints
```typescript
GET /api/user-preferences/table-columns
POST /api/user-preferences/table-columns
DELETE /api/user-preferences/table-columns
```

### Storage Format
```json
{
  "userId": "user-123",
  "preferences": {
    "employeeTable": {
      "visibleColumns": ["firstName", "email", "type", ...],
      "columnWidths": { "firstName": 200, ... },
      "sortKey": "firstName",
      "sortDirection": "asc"
    }
  }
}
```

This would allow preferences to follow the user across different browsers/devices.

## Conclusion

The column customization feature provides a flexible, user-friendly way to tailor the employee list to individual needs. Users can show exactly what they need, in the order they want, with the sizing that works for their workflow.

Key benefits:
- ✅ **Flexibility**: Full control over column visibility and order
- ✅ **Persistence**: Preferences saved automatically
- ✅ **Usability**: Intuitive drag-and-drop interface
- ✅ **Extensibility**: Automatically includes custom attributes
- ✅ **Performance**: Optimized for smooth interaction

The feature scales well from simple deployments with just core attributes to complex organizations with dozens of custom fields.
