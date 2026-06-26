# HRMIS - Development Documentation

## Overview
This is a complete HR Employee Management Information System built with Next.js 14, TypeScript, and Tailwind CSS. The application provides comprehensive employee and contractor management with dynamic custom attributes, change history tracking, analytics dashboard, and REST API access.

## Quick Start

### Installation
```bash
cd /Users/rob.carraway/Documents/Okta/AI/HRMIS

# Note: If you encounter npm registry issues due to OCM shim, use the direct npm path:
/Users/rob.carraway/.nvm/versions/node/v24.13.0/bin/npm install

# Or if standard npm works:
npm install
```

### Running the Application
```bash
# Development mode
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Lint code
npm run lint
```

The application will be available at http://localhost:3000

## Architecture

### Technology Stack
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS with custom design system
- **State Management**: React hooks with localStorage persistence
- **Form Handling**: Controlled components with validation
- **Validation**: Zod schemas
- **Icons**: Lucide React
- **Date Handling**: date-fns

### Design Patterns
1. **Custom Hooks**: Centralized data management (`useEmployees`, `useCustomAttributes`, `useHistory`)
2. **Compound Components**: Reusable UI components with consistent API
3. **Storage Abstraction**: Type-safe localStorage wrapper for easy backend migration
4. **Change Tracking**: Deep object comparison for automatic audit trail
5. **Client-Side Rendering**: All data operations happen client-side for demo purposes

### Data Flow
```
User Action → Component → Hook → Storage Layer → localStorage
                ↓
            History Tracking
```

## Project Structure Details

### `/app` - Next.js App Router
- `layout.tsx` - Root layout with navigation and global styles
- `page.tsx` - Dashboard with statistics and recent changes
- `employees/page.tsx` - Employee list with filtering and export
- `employees/new/page.tsx` - Add new employee form
- `employees/[id]/page.tsx` - View/edit employee details
- `employees/[id]/history/page.tsx` - Change history timeline
- `settings/page.tsx` - Manage custom attributes
- `api/employees/route.ts` - REST API for employee collection
- `api/employees/[id]/route.ts` - REST API for individual employee

### `/components` - React Components

#### UI Components (`/ui`)
- `Button.tsx` - Consistent button with variants (primary, secondary, danger, ghost)
- `Input.tsx` - Text input with label and error display
- `Select.tsx` - Dropdown with label and error display
- `Modal.tsx` - Accessible modal dialog with backdrop
- `Table.tsx` - Sortable table with customizable columns

#### Employee Components (`/employees`)
- `EmployeeForm.tsx` - Dynamic form that adapts to custom attributes
- `FilterPanel.tsx` - Multi-field filtering interface
- `HistoryTimeline.tsx` - Visual timeline of changes

#### Dashboard Components (`/dashboard`)
- `StatCard.tsx` - Statistics display card with icon
- `RecentChanges.tsx` - Feed of recent activity

#### Other
- `Navigation.tsx` - Main navigation bar with active state

### `/hooks` - Custom React Hooks
- `useEmployees.ts` - CRUD operations, filtering, history integration
- `useCustomAttributes.ts` - Manage custom field definitions
- `useHistory.ts` - Change tracking and retrieval

### `/lib` - Utility Libraries
- `types.ts` - TypeScript interfaces for all data models
- `storage.ts` - Type-safe localStorage wrapper
- `utils.ts` - Formatting, statistics, diff calculation
- `validation.ts` - Zod validation schemas
- `export.ts` - CSV export with proper escaping

## Key Features

### 1. Employee Management
- Create, read, update, delete employees and contractors
- Required fields: type, name, email, department, title, manager, status, start date
- Contractors must have end date
- Email validation
- Date validation (end date after start date)

### 2. Custom Attributes
- Define unlimited custom fields
- Supported data types:
  - String (text input)
  - Number (numeric input)
  - Date (date picker)
  - Boolean (checkbox)
  - Currency (numeric with formatting)
- Mark fields as required or optional
- Automatically appear in employee forms

### 3. Change History
- Automatic tracking of all changes
- Records action type (create, update, delete)
- Stores old and new values for updates
- Timestamp and user attribution
- Visual timeline display

### 4. Filtering & Search
- Text search by name or email
- Filter by status (active, inactive, terminated)
- Filter by type (employee, contractor)
- Filter by department
- Filter by start date range
- Combine multiple filters

### 5. Data Export
- Export to CSV format
- Exports currently filtered results
- Includes all standard and custom fields
- Proper CSV escaping for special characters

### 6. Dashboard Analytics
- Total employee count
- Count by status (active, inactive, terminated)
- Count by type (employee, contractor)
- Breakdown by department
- Recent changes feed
- Quick action buttons

### 7. REST API
Full CRUD API with proper HTTP methods and status codes:
- GET /api/employees - List all employees (optional `?fromDate=` filter)
- POST /api/employees - Create new employee
- GET /api/employees/[id] - Get single employee
- PUT /api/employees/[id] - Update employee
- DELETE /api/employees/[id] - Delete employee

Response format:
```json
{
  "success": true,
  "data": { ... },
  "count": 10  // for list endpoints
}
```

Error format:
```json
{
  "success": false,
  "error": "Error message"
}
```

## Data Models

### Employee
```typescript
interface Employee {
  id: string;                    // UUID v4
  type: 'employee' | 'contractor';
  firstName: string;
  lastName: string;
  email: string;                 // Validated format
  department: string;
  title: string;
  manager: string;
  status: 'active' | 'inactive' | 'terminated';
  startDate: string;            // ISO 8601 date
  endDate?: string;             // Required for contractors
  customAttributes: Record<string, CustomAttributeValue>;
  createdAt: string;            // ISO 8601 timestamp
  updatedAt: string;            // ISO 8601 timestamp
}
```

### CustomAttribute
```typescript
interface CustomAttribute {
  id: string;                    // UUID v4
  name: string;                  // Display name
  dataType: 'string' | 'number' | 'date' | 'boolean' | 'currency';
  required: boolean;
}
```

### ChangeHistory
```typescript
interface ChangeHistory {
  id: string;                    // UUID v4
  employeeId: string;            // Reference to employee
  action: 'create' | 'update' | 'delete';
  changes: Record<string, { old: any; new: any }>;
  timestamp: string;             // ISO 8601 timestamp
  changedBy: string;             // Currently "System" or "API"
}
```

## Storage Implementation

### localStorage Keys
- `hrmis_employees` - Array of Employee objects
- `hrmis_custom_attributes` - Array of CustomAttribute objects
- `hrmis_history` - Array of ChangeHistory objects

### Migration Path
To replace localStorage with a database:
1. Update `/lib/storage.ts` methods to call API endpoints
2. Keep the same interface (getEmployees, addEmployee, etc.)
3. Add async/await to storage methods
4. Update hooks to handle async storage operations
5. No component changes needed

## Design System

### Colors
```css
Primary: #3B82F6 (blue-500)
Primary Dark: #2563EB (blue-600)
Primary Light: #60A5FA (blue-400)

Secondary: #64748B (slate-500)
Secondary Dark: #475569 (slate-600)
Secondary Light: #94A3B8 (slate-400)

Success: #10B981 (green-500)
Warning: #F59E0B (amber-500)
Danger: #EF4444 (red-500)
```

### Typography
- Headings: font-semibold or font-bold
- Body: font-normal
- Small text: text-sm
- Large headings: text-xl to text-3xl

### Spacing
- Page padding: px-4 sm:px-6 lg:px-8
- Section spacing: space-y-6 or space-y-8
- Component padding: p-4 or p-6
- Gap between elements: gap-3 or gap-4

### Components
- Border radius: rounded-lg (8px)
- Shadows: shadow-sm with hover:shadow-md
- Transitions: transition-colors (150ms)
- Focus rings: focus:ring-2 focus:ring-primary

## Testing Checklist

### Manual Testing
1. **Dashboard**
   - [ ] Statistics display correctly
   - [ ] Recent changes appear
   - [ ] Quick actions work

2. **Employee CRUD**
   - [ ] Create employee with all fields
   - [ ] Create contractor with end date
   - [ ] View employee details
   - [ ] Edit employee
   - [ ] Delete employee
   - [ ] Validation errors display

3. **Filtering**
   - [ ] Search by name
   - [ ] Search by email
   - [ ] Filter by status
   - [ ] Filter by type
   - [ ] Filter by department
   - [ ] Filter by date range
   - [ ] Combine multiple filters
   - [ ] Clear filters

4. **Custom Attributes**
   - [ ] Add text attribute
   - [ ] Add number attribute
   - [ ] Add date attribute
   - [ ] Add boolean attribute
   - [ ] Add currency attribute
   - [ ] Mark as required
   - [ ] Edit attribute
   - [ ] Delete attribute
   - [ ] Appears in employee form

5. **Change History**
   - [ ] Create tracked in history
   - [ ] Updates show old/new values
   - [ ] Delete tracked in history
   - [ ] Timeline displays correctly

6. **Export**
   - [ ] Export all employees
   - [ ] Export filtered results
   - [ ] Custom attributes included
   - [ ] CSV format correct

7. **API**
   - [ ] GET all employees
   - [ ] GET with date filter
   - [ ] GET single employee
   - [ ] POST create employee
   - [ ] PUT update employee
   - [ ] DELETE employee
   - [ ] Error handling

8. **Responsive**
   - [ ] Mobile navigation
   - [ ] Mobile tables
   - [ ] Mobile forms
   - [ ] Touch interactions

## Known Limitations

1. **localStorage Only**: Data is browser-specific and limited to ~5-10MB
2. **No Authentication**: No user login or role-based access control
3. **No Backend**: All operations are client-side
4. **No File Uploads**: Cannot attach documents or photos
5. **Single User**: "changedBy" is hardcoded to "System" or "API"
6. **No Real-time Updates**: No WebSocket or polling for multi-user scenarios
7. **No Search Indexing**: Search is basic string matching
8. **No Pagination**: All data loads at once (performance issue with large datasets)

## Future Enhancements

### High Priority
- Real database backend (PostgreSQL, MongoDB)
- User authentication (NextAuth.js)
- Role-based permissions (Admin, Manager, Employee)
- File upload for documents/photos
- Email notifications for changes
- Advanced search with fuzzy matching
- Pagination for large datasets

### Medium Priority
- Bulk operations (bulk update, bulk delete)
- Data import from CSV
- Advanced analytics and reporting
- Custom workflows and approvals
- Calendar view for start/end dates
- Organizational chart visualization

### Low Priority
- Dark mode support
- Multi-language support (i18n)
- Mobile app (React Native)
- Integration with HR systems
- Automated backup and restore
- Activity feed with filtering

## Troubleshooting

### npm install fails
- Use direct npm path: `/Users/rob.carraway/.nvm/versions/node/v24.13.0/bin/npm install`
- Check .npmrc file exists with registry URL
- Ensure OCM shim is not interfering

### Dev server won't start
- Check port 3000 is available: `lsof -i :3000`
- Kill existing process: `lsof -ti :3000 | xargs kill -9`
- Clear .next directory: `rm -rf .next`

### localStorage not persisting
- Check browser privacy settings
- Ensure not in incognito/private mode
- Check browser storage quota

### Styles not loading
- Rebuild: `npm run build`
- Check globals.css is imported in layout.tsx
- Verify Tailwind config includes all component paths

### TypeScript errors
- Run type check: `npx tsc --noEmit`
- Ensure all dependencies installed
- Check tsconfig.json paths configuration

## File Count Summary
Total files created: ~40

### Core Files (5)
- package.json, tsconfig.json, tailwind.config.ts, postcss.config.js, next.config.js

### Library Files (5)
- lib/types.ts, lib/storage.ts, lib/utils.ts, lib/validation.ts, lib/export.ts

### Hooks (3)
- hooks/useEmployees.ts, hooks/useCustomAttributes.ts, hooks/useHistory.ts

### UI Components (5)
- components/ui/Button.tsx, Input.tsx, Select.tsx, Modal.tsx, Table.tsx

### Feature Components (4)
- components/Navigation.tsx, dashboard/StatCard.tsx, dashboard/RecentChanges.tsx, employees/EmployeeForm.tsx, employees/FilterPanel.tsx, employees/HistoryTimeline.tsx

### Pages (9)
- app/layout.tsx, page.tsx, employees/page.tsx, employees/new/page.tsx, employees/[id]/page.tsx, employees/[id]/history/page.tsx, settings/page.tsx, globals.css

### API Routes (2)
- app/api/employees/route.ts, app/api/employees/[id]/route.ts

### Documentation (3)
- README.md, CLAUDE.md, .gitignore

## Build Commands Reference

```bash
# Development
npm run dev              # Start dev server on localhost:3000

# Production
npm run build           # Build for production
npm start               # Start production server
npm run lint            # Run ESLint

# Type checking
npx tsc --noEmit        # Check types without building

# Clean
rm -rf .next            # Remove build cache
rm -rf node_modules     # Remove dependencies
```

## Environment Variables
Currently none required. For production deployment, consider:
- `NEXT_PUBLIC_API_URL` - API base URL
- `DATABASE_URL` - Database connection string
- `NEXTAUTH_SECRET` - Auth secret key
- `NEXTAUTH_URL` - Auth callback URL

## Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Static Export (Not Supported)
This app uses API routes and dynamic routes, so static export is not possible.

## Contributing
This is a demonstration project. For production use:
1. Add comprehensive tests (Jest, React Testing Library)
2. Set up CI/CD pipeline
3. Add error tracking (Sentry)
4. Implement proper database
5. Add authentication and authorization
6. Implement rate limiting and security headers

## Support
For issues or questions, refer to:
- Next.js docs: https://nextjs.org/docs
- Tailwind CSS docs: https://tailwindcss.com/docs
- TypeScript handbook: https://www.typescriptlang.org/docs

---
Built with Next.js 14, TypeScript, and Tailwind CSS
Last updated: 2026-05-29

## Okta Settings Management

### Persistent Configuration
Okta settings can be configured dynamically through the admin UI and persist across server restarts:

- Settings are stored in `/data/okta-settings.json` (gitignored)
- Environment variables (.env.local) take precedence over persisted settings
- Settings are automatically loaded on server startup

### Current Settings Display
When an admin navigates to Settings > Okta Integration tab, the system automatically loads and displays the current Okta configuration:

- **Client ID**: Displayed in full
- **Client Secret**: Masked for security (shows only last 4 characters as `••••••••••••abc123`)
- **Issuer URL**: Displayed in full

The loading is triggered automatically when the Okta tab becomes active, ensuring admins always see the current configuration without needing to manually enter it each time.

### Saving Settings and Auto-Restart
When an admin saves Okta settings through the UI:

1. Settings are saved to persistent file storage
2. Server automatically restarts to apply OAuth configuration changes
3. Client page polls for server availability
4. Page auto-reloads once server is back online
5. New settings take effect immediately

This ensures that OAuth flow changes (like updated Client ID or Issuer) are immediately active without requiring manual intervention.

### API Endpoints
- `GET /api/okta-settings` - Fetches current Okta configuration (admin only)
  - Returns: `clientId`, masked `clientSecret`, `issuer`, and `isConfigured` flag
  - Authorization: Admin role required

- `PUT /api/okta-settings` - Updates Okta configuration and triggers restart (admin only)
  - Body: `{ clientId, clientSecret, issuer }`
  - Automatically restarts server after 500ms
  - Authorization: Admin role required

### Security Considerations
- Client secret is never exposed in full through the API
- Only the last 4 characters are shown to help admins verify which credential is configured
- Admins must enter the full client secret again if they want to update it
- Settings file is excluded from version control (.gitignore)

### Documentation
See `OKTA_PERSISTENCE.md` for detailed implementation documentation, including:
- Architecture and file structure
- Storage hierarchy and initialization
- Deployment configurations (Docker, Kubernetes)
- Troubleshooting guide

