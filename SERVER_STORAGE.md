# Server-Side Storage Implementation

## Overview

The HRMIS application has been refactored to use **server-side file-based storage** instead of browser localStorage. This allows the REST API to work properly with persistent data that can be accessed via API calls from any client (curl, Postman, browser, etc.).

## What Changed

### 1. New Storage Layer
- **File**: `lib/serverStorage.ts`
- **Type**: File-based JSON storage
- **Location**: `/data` directory (created automatically)
- **Persistence**: Data persists between server restarts

### 2. Storage Files
All data is stored in the `/data` directory as JSON files:
- `employees.json` - Employee/contractor records
- `history.json` - Change history/audit trail
- `custom_attributes.json` - Custom field definitions
- `core_attributes.json` - Core field configurations
- `export_schedules.json` - Export schedules
- `export_metadata.json` - Export metadata
- `export_logs.json` - Export execution logs
- `logo.txt` - Company logo (base64)

### 3. Updated API Routes
Both API routes now use `serverStorage` instead of browser `storage`:
- `/app/api/employees/route.ts` - Collection endpoints (GET all, POST)
- `/app/api/employees/[id]/route.ts` - Individual endpoints (GET, PUT, DELETE)

### 4. gitignore
Added `/data` to `.gitignore` to prevent committing user data to version control.

## How It Works

### Architecture
```
Client (Browser/curl/Postman)
    ↓ HTTP Request
API Route (Next.js Server)
    ↓
serverStorage (lib/serverStorage.ts)
    ↓
File System (/data/*.json)
```

### Storage Class Methods
The `ServerStorage` class provides the same interface as the previous localStorage-based storage:

```typescript
// Employee operations
getEmployees(): Employee[]
setEmployees(employees: Employee[]): void
getEmployee(id: string): Employee | null
addEmployee(employee: Employee): void
updateEmployee(id: string, updates: Partial<Employee>): Employee | null
deleteEmployee(id: string): boolean

// History operations
getHistory(employeeId?: string): ChangeHistory[]
addHistoryEntry(entry: ChangeHistory): void

// Custom attributes, schedules, etc.
```

## Testing the API

### Using curl

**Create an employee:**
```bash
curl -X POST http://localhost:3000/api/employees \
  -H "Content-Type: application/json" \
  -d '{
    "type": "employee",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "department": "Engineering",
    "title": "Software Engineer",
    "manager": "jane.smith@example.com",
    "status": "active",
    "startDate": "2024-01-15",
    "customAttributes": {}
  }'
```

**Get all employees:**
```bash
curl http://localhost:3000/api/employees
```

**Get filtered employees:**
```bash
# Filter by type
curl "http://localhost:3000/api/employees?type=employee"

# Filter by department
curl "http://localhost:3000/api/employees?department=Engineering"

# Filter by status
curl "http://localhost:3000/api/employees?status=active"
```

**Get single employee:**
```bash
curl http://localhost:3000/api/employees/{employee-id}
```

**Update employee:**
```bash
curl -X PUT http://localhost:3000/api/employees/{employee-id} \
  -H "Content-Type: application/json" \
  -d '{"title": "Senior Software Engineer"}'
```

**Delete employee:**
```bash
curl -X DELETE http://localhost:3000/api/employees/{employee-id}
```

### Using the API Test Page

1. Navigate to http://localhost:3000/api-test
2. Select HTTP method (GET, POST, PUT, DELETE)
3. Enter endpoint (e.g., `/api/employees`)
4. Add query parameters for filtering (optional)
5. Add request body for POST/PUT (optional)
6. Click "Send Request"
7. View results in the "Data Payload" section

## Current Data

The system currently has **12 employees** stored in `/data/employees.json`:
1. John Doe - Software Engineer
2. Jane Smith - Engineering Manager
3. Alice Williams - Marketing Consultant (Contractor)
4. Bob Johnson - VP of Sales
5-12. Employee1-8 Test1-8 (test data)

## Benefits of Server-Side Storage

### Previous Architecture (localStorage)
- ❌ Data only accessible in browser
- ❌ Each browser has separate data
- ❌ API routes couldn't access data (server-side has no browser)
- ❌ curl/Postman couldn't persist data
- ❌ Lost on browser clear/private mode

### New Architecture (File-based)
- ✅ Data accessible from any client
- ✅ Single source of truth on server
- ✅ API routes have direct access
- ✅ curl/Postman work properly
- ✅ Persists between server restarts
- ✅ Can be backed up easily
- ✅ Easy to migrate to database later

## Migration Path to Database

When ready to use a real database (PostgreSQL, MongoDB, etc.), the migration is straightforward:

1. Install database client library
2. Update `lib/serverStorage.ts` methods to use database queries
3. Keep the same method signatures (interface)
4. No changes needed to API routes or other code

Example for PostgreSQL:
```typescript
async getEmployees(): Promise<Employee[]> {
  const result = await db.query('SELECT * FROM employees');
  return result.rows;
}
```

## File Structure

```
/data/
  ├── employees.json          # Current: 12 records
  ├── history.json           # Change tracking
  ├── custom_attributes.json # Custom fields
  ├── core_attributes.json   # Core field configs
  ├── export_schedules.json  # Scheduled exports
  ├── export_metadata.json   # Export stats
  ├── export_logs.json       # Export history
  └── logo.txt              # Company logo
```

## Notes

- The `/data` directory is created automatically on first use
- Data files use pretty-printed JSON (2-space indentation) for readability
- All write operations are synchronous to ensure data integrity
- Error handling includes console logging for debugging
- Default values are returned if files don't exist or are corrupted

## Troubleshooting

### Data not persisting
- Check server is running: `npm run dev`
- Check `/data` directory exists
- Check file permissions (should be writable)
- Check disk space

### API returning old data
- Server caches are cleared on each request
- Files are read fresh on each API call
- Check you're not reading from browser cache

### File corruption
- Delete corrupted file
- It will be recreated with default values
- Backup files regularly if using in production

## Security Considerations

For production use:
1. Move data storage to proper database
2. Add authentication/authorization
3. Add rate limiting
4. Validate all inputs
5. Sanitize file paths
6. Encrypt sensitive data
7. Set up proper backups
8. Use environment variables for configuration

## Performance

Current implementation:
- Fast for < 1000 records
- Acceptable for < 10,000 records
- For larger datasets, migrate to database

File operations are synchronous but fast for typical HRMIS use cases. JSON parsing is efficient for moderate data sizes.
