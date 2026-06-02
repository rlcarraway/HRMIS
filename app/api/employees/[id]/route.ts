import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { generateId, getObjectDiff } from '@/lib/utils';

// GET /api/employees/[id] - Get single employee
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const employee = storage.getEmployee(params.id);

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: employee,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch employee' },
      { status: 500 }
    );
  }
}

// PUT /api/employees/[id] - Update employee
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const oldEmployee = storage.getEmployee(params.id);

    if (!oldEmployee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Validate email if provided
    if (body.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.email)) {
        return NextResponse.json(
          { success: false, error: 'Invalid email format' },
          { status: 400 }
        );
      }
    }

    // Validate contractor has end date
    if (body.type === 'contractor' && !body.endDate && !oldEmployee.endDate) {
      return NextResponse.json(
        { success: false, error: 'End date is required for contractors' },
        { status: 400 }
      );
    }

    const updatedEmployee = storage.updateEmployee(params.id, body);

    if (!updatedEmployee) {
      return NextResponse.json(
        { success: false, error: 'Failed to update employee' },
        { status: 500 }
      );
    }

    // Track changes
    const changes = getObjectDiff(oldEmployee, updatedEmployee);
    if (Object.keys(changes).length > 0) {
      storage.addHistoryEntry({
        id: generateId(),
        employeeId: params.id,
        action: 'update',
        changes,
        timestamp: new Date().toISOString(),
        changedBy: 'API',
      });
    }

    return NextResponse.json({
      success: true,
      data: updatedEmployee,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update employee' },
      { status: 500 }
    );
  }
}

// DELETE /api/employees/[id] - Delete employee
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const employee = storage.getEmployee(params.id);

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    const success = storage.deleteEmployee(params.id);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete employee' },
        { status: 500 }
      );
    }

    // Add to history
    storage.addHistoryEntry({
      id: generateId(),
      employeeId: params.id,
      action: 'delete',
      changes: {},
      timestamp: new Date().toISOString(),
      changedBy: 'API',
    });

    return NextResponse.json({
      success: true,
      message: 'Employee deleted successfully',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete employee' },
      { status: 500 }
    );
  }
}
