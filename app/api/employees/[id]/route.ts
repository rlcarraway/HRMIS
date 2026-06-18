import { NextRequest, NextResponse } from 'next/server';
import { serverStorage } from '@/lib/serverStorage';
import { generateId, getObjectDiff } from '@/lib/utils';
import { sendToOutboundApi } from '@/lib/serverOutboundApi';
import { logUserAction } from '@/lib/serverAuditLog';
import { authenticateApiRequest } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

// GET /api/employees/[id] - Get single employee
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Require authentication to view employees
  const auth = await authenticateApiRequest(request);
  if (!auth.authenticated || !auth.user) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const employee = serverStorage.getEmployee(params.id);

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
  // Require admin role to update employees
  const auth = await authenticateApiRequest(request, { requiredRole: 'admin' });
  if (!auth.authenticated || !auth.user) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Admin access required' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const oldEmployee = serverStorage.getEmployee(params.id);

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

    const updatedEmployee = serverStorage.updateEmployee(params.id, body);

    if (!updatedEmployee) {
      return NextResponse.json(
        { success: false, error: 'Failed to update employee' },
        { status: 500 }
      );
    }

    // Track changes
    const changes = getObjectDiff(oldEmployee, updatedEmployee);
    if (Object.keys(changes).length > 0) {
      serverStorage.addHistoryEntry({
        id: generateId(),
        employeeId: params.id,
        action: 'update',
        changes,
        timestamp: new Date().toISOString(),
        changedBy: 'API',
      });

      // Log the employee update
      logUserAction(
        'employee.update',
        `Updated employee: ${updatedEmployee.firstName} ${updatedEmployee.lastName} (${updatedEmployee.email})`,
        {
          userId: auth.user.email,
          userName: auth.user.name,
          userEmail: auth.user.email,
          success: true,
          details: {
            employeeId: updatedEmployee.id,
            employeeEmail: updatedEmployee.email,
            changedFields: Object.keys(changes),
            changes,
            authType: auth.user.authType,
            clientId: auth.user.clientId,
          },
        }
      );
    }

    // Send to outbound API if configured
    const outboundResult = await sendToOutboundApi('update', updatedEmployee);
    if (!outboundResult.success && outboundResult.error) {
      console.warn('Outbound API call failed:', outboundResult.error);
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
  // Require admin role to delete employees
  const auth = await authenticateApiRequest(request, { requiredRole: 'admin' });
  if (!auth.authenticated || !auth.user) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Admin access required' },
      { status: 403 }
    );
  }

  try {
    const employee = serverStorage.getEmployee(params.id);

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    const success = serverStorage.deleteEmployee(params.id);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete employee' },
        { status: 500 }
      );
    }

    // Add to history
    serverStorage.addHistoryEntry({
      id: generateId(),
      employeeId: params.id,
      action: 'delete',
      changes: {},
      timestamp: new Date().toISOString(),
      changedBy: 'API',
    });

    // Log the employee deletion
    logUserAction(
      'employee.delete',
      `Deleted employee: ${employee.firstName} ${employee.lastName} (${employee.email})`,
      {
        userId: auth.user.email,
        userName: auth.user.name,
        userEmail: auth.user.email,
        success: true,
        details: {
          employeeId: employee.id,
          employeeEmail: employee.email,
          employeeDepartment: employee.department,
          authType: auth.user.authType,
          clientId: auth.user.clientId,
        },
      }
    );

    // Send to outbound API if configured
    const outboundResult = await sendToOutboundApi('delete', employee);
    if (!outboundResult.success && outboundResult.error) {
      console.warn('Outbound API call failed:', outboundResult.error);
    }

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
