import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logUserAction } from '@/lib/serverAuditLog';

// POST /api/employee-operations - Log employee operations (import/export)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { operation, count, details } = body;

    // Validate operation type
    if (!operation || !['import', 'export'].includes(operation)) {
      return NextResponse.json(
        { success: false, error: 'Invalid operation type' },
        { status: 400 }
      );
    }

    // Log the operation
    const action = operation === 'import' ? 'employee.import' : 'employee.export';
    const description = operation === 'import'
      ? `Imported ${count || 0} employee(s)`
      : `Exported ${count || 0} employee(s)`;

    logUserAction(
      action,
      description,
      {
        userId: session.user?.email || undefined,
        userName: session.user?.name || undefined,
        userEmail: session.user?.email || undefined,
        success: true,
        details: {
          operation,
          count: count || 0,
          ...details,
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: `${operation} operation logged successfully`,
    });
  } catch (error) {
    console.error('Error logging employee operation:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while logging operation' },
      { status: 500 }
    );
  }
}
