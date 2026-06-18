import { NextRequest, NextResponse } from 'next/server';
import { getAuditLogs, AuditAction, AuditLevel, AuditLogFilter } from '@/lib/serverAuditLog';
import { authenticateApiRequest } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

// GET - Retrieve audit logs with filtering
export async function GET(request: NextRequest) {
  try {
    // Only admins can view audit logs
    const auth = await authenticateApiRequest(request, { requiredRole: 'admin' });
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const filter: AuditLogFilter = {
      search: searchParams.get('search') || undefined,
      action: (searchParams.get('action') as AuditAction) || undefined,
      level: (searchParams.get('level') as AuditLevel) || undefined,
      userId: searchParams.get('userId') || undefined,
      fromDate: searchParams.get('fromDate') || undefined,
      toDate: searchParams.get('toDate') || undefined,
      success: searchParams.get('success') === 'true' ? true : searchParams.get('success') === 'false' ? false : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
    };

    const result = getAuditLogs(filter);

    return NextResponse.json({
      success: true,
      logs: result.logs,
      total: result.total,
      count: result.logs.length,
      limit: filter.limit,
      offset: filter.offset,
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while fetching audit logs' },
      { status: 500 }
    );
  }
}
