# HRMIS - HR Management Information System

A modern, full-featured HR management web application built with Next.js 14, TypeScript, and Tailwind CSS. Manage employee and contractor on-boarding, changes, and termination with dynamic custom attributes, change history tracking, and comprehensive analytics.

## Features

- **Employee Management**: Complete CRUD operations for employees and contractors
- **Dynamic Custom Attributes**: Define and manage custom fields for any data type
- **Change History Tracking**: Automatic tracking of all changes with detailed audit trail
- **Advanced Filtering**: Multi-field filtering by status, type, department, and date ranges
- **Data Export**: Export filtered results to CSV format
- **REST API**: Full REST API for programmatic access
- **Responsive Design**: Mobile-friendly interface with professional UI
- **Dashboard Analytics**: Real-time statistics and recent changes
- **localStorage Backend**: Demo-ready with browser-based data persistence

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form
- **Validation**: Zod
- **Icons**: Lucide React
- **Date Handling**: date-fns

## Project Structure

```
hrmis/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout with navigation
│   ├── page.tsx                 # Dashboard
│   ├── employees/               # Employee pages
│   │   ├── page.tsx            # Employee list
│   │   ├── new/page.tsx        # Add new employee
│   │   └── [id]/
│   │       ├── page.tsx        # Employee detail/edit
│   │       └── history/page.tsx # Change history
│   ├── settings/
│   │   └── page.tsx            # Custom attributes management
│   └── api/
│       └── employees/           # REST API endpoints
├── components/
│   ├── ui/                      # Reusable UI components
│   ├── employees/               # Employee-specific components
│   ├── dashboard/               # Dashboard components
│   └── Navigation.tsx           # Main navigation
├── hooks/                       # Custom React hooks
│   ├── useEmployees.ts         # Employee data management
│   ├── useCustomAttributes.ts  # Custom attributes management
│   └── useHistory.ts           # Change history tracking
├── lib/                         # Utility libraries
│   ├── types.ts                # TypeScript type definitions
│   ├── storage.ts              # localStorage wrapper
│   ├── utils.ts                # Utility functions
│   ├── validation.ts           # Form validation schemas
│   └── export.ts               # CSV export logic
└── public/                      # Static assets
```

## Installation

1. **Clone or navigate to the project directory**:
   ```bash
   cd /Users/rob.carraway/Documents/Okta/AI/HRMIS
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

   If you encounter npm registry issues, try:
   ```bash
   npm config set registry https://registry.npmjs.org/
   npm install
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage Guide

### Dashboard
- View real-time statistics (total employees, active, inactive, terminated, etc.)
- See department breakdown
- Monitor recent changes
- Quick access to common actions

### Employee Management
1. **Add Employee**: Click "Add Employee" button
   - Fill in required fields (name, email, department, title, manager, dates)
   - Select type (Employee or Contractor)
   - Contractors require an end date
   - Add custom attribute values if defined

2. **View Employees**: Navigate to Employees page
   - Use search to find by name or email
   - Apply filters for status, type, department, or date ranges
   - Click on any row to view details

3. **Edit Employee**: Click edit icon or view employee detail
   - Modify any field
   - Changes are automatically tracked in history

4. **Delete Employee**: Click delete icon
   - Confirm deletion in modal
   - Deletion is tracked in history

5. **Export Data**: Click "Export CSV" button
   - Exports currently filtered results
   - Includes all custom attributes

### Custom Attributes
1. Navigate to Settings page
2. Click "Add Attribute"
3. Define:
   - Name (e.g., "Salary", "Hire Date")
   - Data Type (Text, Number, Date, Yes/No, Currency)
   - Required (checkbox)
4. Custom attributes appear in employee forms automatically

### Change History
- Click "View History" on employee detail page
- Timeline view shows all changes chronologically
- See what changed, old vs new values, when, and by whom

## REST API

Base URL: `http://localhost:3000/api`

### Endpoints

#### Get All Employees
```bash
GET /api/employees
GET /api/employees?fromDate=2024-01-01
```

Response:
```json
{
  "success": true,
  "data": [...],
  "count": 10
}
```

#### Get Single Employee
```bash
GET /api/employees/{id}
```

#### Create Employee
```bash
POST /api/employees
Content-Type: application/json

{
  "type": "employee",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "department": "Engineering",
  "title": "Software Engineer",
  "manager": "Jane Smith",
  "status": "active",
  "startDate": "2024-01-15",
  "customAttributes": {
    "Salary": "100000"
  }
}
```

#### Update Employee
```bash
PUT /api/employees/{id}
Content-Type: application/json

{
  "title": "Senior Software Engineer",
  "status": "active"
}
```

#### Delete Employee
```bash
DELETE /api/employees/{id}
```

### API Testing Examples

```bash
# Create an employee
curl -X POST http://localhost:3000/api/employees \
  -H "Content-Type: application/json" \
  -d '{
    "type": "employee",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "department": "Engineering",
    "title": "Software Engineer",
    "manager": "Jane Smith",
    "status": "active",
    "startDate": "2024-01-15"
  }'

# Get all employees
curl http://localhost:3000/api/employees

# Get employees from a specific date
curl http://localhost:3000/api/employees?fromDate=2024-01-01

# Get single employee (replace {id} with actual ID)
curl http://localhost:3000/api/employees/{id}

# Update employee
curl -X PUT http://localhost:3000/api/employees/{id} \
  -H "Content-Type: application/json" \
  -d '{"title": "Senior Engineer"}'

# Delete employee
curl -X DELETE http://localhost:3000/api/employees/{id}
```

## Data Model

### Employee
```typescript
{
  id: string;                    // UUID
  type: 'employee' | 'contractor';
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  title: string;
  manager: string;
  status: 'active' | 'inactive' | 'terminated';
  startDate: string;            // ISO date
  endDate?: string;             // Required for contractors
  customAttributes: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}
```

### Custom Attribute
```typescript
{
  id: string;
  name: string;
  dataType: 'string' | 'number' | 'date' | 'boolean' | 'currency';
  required: boolean;
}
```

### Change History
```typescript
{
  id: string;
  employeeId: string;
  action: 'create' | 'update' | 'delete';
  changes: Record<string, { old: any; new: any }>;
  timestamp: string;
  changedBy: string;
}
```

## Build for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

## Design System

### Colors
- **Primary**: Blue (#3B82F6) - Actions, links, active states
- **Secondary**: Slate (#64748B) - Text, borders
- **Success**: Green (#10B981) - Active status, positive actions
- **Warning**: Amber (#F59E0B) - Inactive status, warnings
- **Danger**: Red (#EF4444) - Delete, terminated status

### Components
- Rounded corners (rounded-lg)
- Subtle shadows (shadow-sm with hover:shadow-md)
- Consistent spacing (p-4, p-6, gap-3, gap-4)
- Focus states for accessibility
- Responsive breakpoints (sm, md, lg)

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Notes

- All data is stored in localStorage (browser-based)
- Data persists between sessions but is browser-specific
- Clear browser data will reset the application
- For production use, replace localStorage with a real database

## License

MIT

## Author

Built with Next.js 14, TypeScript, and Tailwind CSS
