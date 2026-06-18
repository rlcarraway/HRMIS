import { NextRequest, NextResponse } from 'next/server';
import { serverStorage } from '@/lib/serverStorage';
import { Employee } from '@/lib/types';
import { generateId } from '@/lib/utils';
import { sendToOutboundApi } from '@/lib/serverOutboundApi';
import { logUserAction, logApiCall } from '@/lib/serverAuditLog';
import { authenticateApiRequest } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

// GET /api/employees - Get all employees with optional filtering
export async function GET(request: NextRequest) {
  // Require authentication (NextAuth session OR Okta OAuth token)
  const auth = await authenticateApiRequest(request);
  if (!auth.authenticated || !auth.user) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Authentication required' },
      { status: 401 }
    );
  }
  try {
    const searchParams = request.nextUrl.searchParams;
    let employees = serverStorage.getEmployees();

    // Apply filters based on query parameters
    for (const [key, value] of searchParams.entries()) {
      if (!value) continue; // Skip empty values

      employees = employees.filter(emp => {
        switch (key) {
          case 'type':
            // Filter by employee type (employee or contractor)
            return emp.type === value;

          case 'status':
            // Filter by status (active, inactive, terminated)
            return emp.status === value;

          case 'department':
            // Filter by department (case-insensitive)
            return emp.department.toLowerCase() === value.toLowerCase();

          case 'fromDate':
            // Filter by start date (employees starting on or after this date)
            return emp.startDate >= value;

          case 'toDate':
            // Filter by start date (employees starting on or before this date)
            return emp.startDate <= value;

          case 'firstName':
            // Filter by first name (case-insensitive partial match)
            return emp.firstName.toLowerCase().includes(value.toLowerCase());

          case 'lastName':
            // Filter by last name (case-insensitive partial match)
            return emp.lastName.toLowerCase().includes(value.toLowerCase());

          case 'email':
            // Filter by email (case-insensitive partial match)
            return emp.email.toLowerCase().includes(value.toLowerCase());

          case 'title':
            // Filter by title (case-insensitive partial match)
            return emp.title.toLowerCase().includes(value.toLowerCase());

          case 'manager':
            // Filter by manager (case-insensitive partial match)
            return emp.manager.toLowerCase().includes(value.toLowerCase());

          case 'search':
            // Global search across name and email
            const searchTerm = value.toLowerCase();
            return (
              emp.firstName.toLowerCase().includes(searchTerm) ||
              emp.lastName.toLowerCase().includes(searchTerm) ||
              emp.email.toLowerCase().includes(searchTerm)
            );

          default:
            // Check custom attributes
            if (key.startsWith('customAttributes.')) {
              const attrName = key.replace('customAttributes.', '');
              const attrValue = emp.customAttributes?.[attrName];

              if (attrValue === undefined || attrValue === null) {
                return false;
              }

              // Handle different data types
              if (typeof attrValue === 'boolean') {
                return attrValue === (value === 'true');
              } else if (typeof attrValue === 'number') {
                return attrValue === Number(value);
              } else {
                return String(attrValue).toLowerCase().includes(value.toLowerCase());
              }
            }
            return true; // Unknown filter, don't filter out
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: employees,
      count: employees.length,
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch employees', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// POST /api/employees - Create new employee
export async function POST(request: NextRequest) {
  // Require admin role to create employees
  const auth = await authenticateApiRequest(request, { requiredRole: 'admin' });
  if (!auth.authenticated || !auth.user) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Admin access required' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields = ['type', 'firstName', 'lastName', 'email', 'department', 'title', 'manager', 'status', 'startDate'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate contractor has end date
    if (body.type === 'contractor' && !body.endDate) {
      return NextResponse.json(
        { success: false, error: 'End date is required for contractors' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const newEmployee: Employee = {
      id: generateId(),
      type: body.type,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      department: body.department,
      title: body.title,
      manager: body.manager,
      status: body.status,
      startDate: body.startDate,
      endDate: body.endDate,
      customAttributes: body.customAttributes || {},
      createdAt: now,
      updatedAt: now,
    };

    serverStorage.addEmployee(newEmployee);

    // Add to history
    serverStorage.addHistoryEntry({
      id: generateId(),
      employeeId: newEmployee.id,
      action: 'create',
      changes: {},
      timestamp: now,
      changedBy: 'API',
    });

    // Log the employee creation
    logUserAction(
      'employee.create',
      `Created employee: ${newEmployee.firstName} ${newEmployee.lastName} (${newEmployee.email})`,
      {
        userId: auth.user.email,
        userName: auth.user.name,
        userEmail: auth.user.email,
        success: true,
        details: {
          employeeId: newEmployee.id,
          employeeEmail: newEmployee.email,
          employeeType: newEmployee.type,
          department: newEmployee.department,
          authType: auth.user.authType,
          clientId: auth.user.clientId,
        },
      }
    );

    // Send to outbound API if configured
    const outboundResult = await sendToOutboundApi('create', newEmployee);
    if (!outboundResult.success && outboundResult.error) {
      console.warn('Outbound API call failed:', outboundResult.error);
    }

    // Log the API response
    logApiCall(
      'api.inbound.success',
      `POST /api/employees - Created employee ${newEmployee.email}`,
      {
        userId: auth.user.email,
        userName: auth.user.name,
        userEmail: auth.user.email,
        success: true,
        method: 'POST',
        url: '/api/employees',
        statusCode: 201,
        requestDetails: {
          authType: auth.user.authType,
          clientId: auth.user.clientId,
        },
      }
    );

    return NextResponse.json(
      { success: true, data: newEmployee },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating employee:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create employee', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
