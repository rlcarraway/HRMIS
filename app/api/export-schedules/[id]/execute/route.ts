import { NextRequest, NextResponse } from 'next/server';
import { executeScheduledExport } from '@/lib/scheduler';

// POST /api/export-schedules/[id]/execute - Manually trigger schedule execution
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await executeScheduledExport(params.id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Export failed' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        filename: result.filename,
        count: result.count,
      },
    });
  } catch (error) {
    console.error('Error executing export:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to execute export' },
      { status: 500 }
    );
  }
}
