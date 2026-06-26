import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAuditLogStats } from '@/lib/serverAuditLog';

export const dynamic = 'force-dynamic';

// GET - Retrieve audit log statistics
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    // Only admins can view audit log stats
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const stats = await getAuditLogStats();

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Error fetching audit log stats:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while fetching stats' },
      { status: 500 }
    );
  }
}
