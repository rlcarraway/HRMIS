import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { Employee } from '@/lib/types';
import { generateId } from '@/lib/utils';

// GET /api/employees - Get all employees or filtered by date
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fromDate = searchParams.get('fromDate');

    let employees = storage.getEmployees();

    // Filter by fromDate if provided
    if (fromDate) {
      employees = employees.filter(emp => emp.startDate >= fromDate);
    }

    return NextResponse.json({
      success: true,
      data: employees,
      count: employees.length,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch employees' },
      { status: 500 }
    );
  }
}

// POST /api/employees - Create new employee
export async function POST(request: NextRequest) {
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

    storage.addEmployee(newEmployee);

    // Add to history
    storage.addHistoryEntry({
      id: generateId(),
      employeeId: newEmployee.id,
      action: 'create',
      changes: {},
      timestamp: now,
      changedBy: 'API',
    });

    return NextResponse.json(
      { success: true, data: newEmployee },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create employee' },
      { status: 500 }
    );
  }
}
