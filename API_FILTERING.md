# API Query Parameter Filtering

The HRMIS API now supports comprehensive filtering through query parameters on the `GET /api/employees` endpoint.

## Overview

You can combine multiple query parameters to filter employee records by type, status, attributes, dates, and more. All filters are applied as AND operations (all conditions must match).

## Available Query Parameters

### Record Type Filters
- **`type`** - Filter by record type
  - Values: `employee` | `contractor`
  - Example: `?type=contractor`

- **`status`** - Filter by employment status
  - Values: `active` | `inactive` | `terminated`
  - Example: `?status=active`

### Personal Information Filters
All text filters support case-insensitive partial matching.

- **`firstName`** - Filter by first name
  - Example: `?firstName=john`
  - Matches: "John", "Johnny", "Johnathan"

- **`lastName`** - Filter by last name
  - Example: `?lastName=smith`
  - Matches: "Smith", "Smithson"

- **`email`** - Filter by email address
  - Example: `?email=@example.com`
  - Matches any email containing the string

### Job Information Filters

- **`department`** - Filter by department (case-insensitive exact match)
  - Example: `?department=Engineering`

- **`title`** - Filter by job title (case-insensitive partial match)
  - Example: `?title=engineer`
  - Matches: "Software Engineer", "Senior Engineer", etc.

- **`manager`** - Filter by manager name (case-insensitive partial match)
  - Example: `?manager=jane`

### Date Filters

- **`fromDate`** - Filter employees starting on or after this date
  - Format: `YYYY-MM-DD`
  - Example: `?fromDate=2024-01-01`
  - Returns: Employees with `startDate >= 2024-01-01`

- **`toDate`** - Filter employees starting on or before this date
  - Format: `YYYY-MM-DD`
  - Example: `?toDate=2024-12-31`
  - Returns: Employees with `startDate <= 2024-12-31`

### Search Filter

- **`search`** - Global search across name and email
  - Example: `?search=john`
  - Searches: firstName, lastName, and email fields

### Custom Attributes

Filter by any custom attribute using dot notation:

- **`customAttributes.{fieldName}`** - Filter by custom attribute value
  - Example: `?customAttributes.location=Remote`
  - Example: `?customAttributes.certified=true`
  - Supports: string (partial match), number (exact), boolean (true/false), date, currency

## Example Queries

### Basic Filtering

**Get all contractors:**
```
GET /api/employees?type=contractor
```

**Get all active employees:**
```
GET /api/employees?status=active
```

**Get all terminated records:**
```
GET /api/employees?status=terminated
```

### Department and Role Filtering

**Get all Engineering employees:**
```
GET /api/employees?department=Engineering
```

**Get all engineers (by title):**
```
GET /api/employees?title=engineer
```

**Get all employees under a specific manager:**
```
GET /api/employees?manager=Jane%20Smith
```

### Date Range Filtering

**Get employees who started in 2024:**
```
GET /api/employees?fromDate=2024-01-01&toDate=2024-12-31
```

**Get employees hired after a specific date:**
```
GET /api/employees?fromDate=2024-06-01
```

### Combined Filters

**Active contractors in Engineering:**
```
GET /api/employees?type=contractor&status=active&department=Engineering
```

**Search for "john" in active employees:**
```
GET /api/employees?search=john&status=active
```

**Engineers hired in Q1 2024:**
```
GET /api/employees?title=engineer&fromDate=2024-01-01&toDate=2024-03-31
```

### Custom Attribute Filtering

**Filter by remote location:**
```
GET /api/employees?customAttributes.location=Remote
```

**Filter by certification status:**
```
GET /api/employees?customAttributes.certified=true
```

**Filter by skill level:**
```
GET /api/employees?customAttributes.level=Senior
```

## Response Format

All filtered queries return the same response format:

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "employee",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "department": "Engineering",
      "title": "Software Engineer",
      "manager": "Jane Smith",
      "status": "active",
      "startDate": "2024-01-15",
      "customAttributes": {},
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

## Implementation Details

### Filter Behavior
- All filters use AND logic (all conditions must match)
- Text filters are case-insensitive
- Name, email, title, and manager support partial matching
- Department requires exact match (case-insensitive)
- Date filters use ISO 8601 string comparison
- Custom attribute filters handle different data types appropriately

### URL Encoding
Remember to URL-encode special characters:
- Space: `%20`
- @: `%40`
- /: `%2F`

Example:
```
/api/employees?manager=Jane%20Smith&email=%40example.com
```

## Testing with API Test Console

The HRMIS includes a built-in API Test Console at `/api-test` that provides:

1. **Query Parameter Builder** - Visual interface for adding filters
2. **Pre-defined Parameter Options** - Dropdown with all available filters
3. **URL Preview** - See the constructed URL before sending
4. **Example Values** - Helpful placeholders for each parameter type
5. **Response Display** - Clean visualization of filtered results

### Using the Query Parameter Builder

1. Navigate to http://localhost:3000/api-test
2. Select "GET" method
3. Set endpoint to `/api/employees`
4. Click "+ Add Parameter"
5. Select parameter from dropdown (e.g., "type")
6. Enter value (e.g., "contractor")
7. Add more parameters as needed
8. Click "Send Request"

The console will show:
- Constructed URL with all parameters
- Response status and timing
- Filtered data payload
- Full response details

## Error Handling

The API returns standard error responses for invalid requests:

**400 Bad Request** - Invalid parameter values
```json
{
  "success": false,
  "error": "Error message"
}
```

**500 Internal Server Error** - Server error during filtering
```json
{
  "success": false,
  "error": "Failed to fetch employees"
}
```

## Important: Storage Limitation

**CRITICAL**: This application uses browser localStorage for data persistence. This means:

- Data is stored per-browser, per-domain
- API calls made from external tools (curl, Postman, etc.) will NOT see data created in the browser UI
- API calls made from the browser (via API Test Console) will share the same localStorage
- Server-side API routes cannot persist data when called externally

**To test the API:**
1. Use the built-in API Test Console at `/api-test` (runs in browser, shares localStorage)
2. First create employees via the UI at `/employees` or via the API Test Console
3. Then test filtering with GET requests in the API Test Console

**For Production:**
Replace localStorage with a proper database (PostgreSQL, MongoDB, etc.) to enable:
- Persistent data storage
- External API access
- Multi-user support
- Real-time data sharing

## Performance Notes

- All filtering happens in-memory (currently using localStorage)
- No query optimization or indexing (sequential scan)
- For production use with large datasets, consider:
  - Database-backed storage with indexes
  - Pagination for large result sets
  - Query result caching
  - Field-specific search indexes

## Future Enhancements

Potential improvements for the filtering system:

1. **OR Logic** - Support for alternative conditions
2. **Range Queries** - Greater than, less than operators for numbers
3. **Regex Support** - Advanced pattern matching
4. **Sorting** - Order results by any field
5. **Pagination** - Limit and offset parameters
6. **Field Selection** - Return only specific fields
7. **Aggregations** - Count, group by, etc.
