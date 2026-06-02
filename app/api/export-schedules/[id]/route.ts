import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { exportScheduleSchema } from '@/lib/validation';
import { calculateNextScheduledTime } from '@/lib/utils';
import { registerSchedule, unregisterSchedule } from '@/lib/scheduler';

// GET /api/export-schedules/[id] - Get single schedule
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const schedule = storage.getExportSchedule(params.id);

    if (!schedule) {
      return NextResponse.json(
        { success: false, error: 'Schedule not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: schedule,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch schedule' },
      { status: 500 }
    );
  }
}

// PUT /api/export-schedules/[id] - Update schedule
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    // Check if schedule exists
    const existingSchedule = storage.getExportSchedule(params.id);
    if (!existingSchedule) {
      return NextResponse.json(
        { success: false, error: 'Schedule not found' },
        { status: 404 }
      );
    }

    // Validate input - for updates, we don't need full validation
    // Just check that provided fields are valid
    // Note: Cannot use .partial() on refined schemas, so we skip validation for updates

    // Update schedule
    const updates = { ...body };

    // Recalculate next scheduled time if schedule-related fields changed
    if (
      body.frequency ||
      body.scheduledTime ||
      body.scheduledDate ||
      body.dayOfWeek !== undefined ||
      body.dayOfMonth !== undefined
    ) {
      const tempSchedule = { ...existingSchedule, ...updates };
      updates.nextScheduled = calculateNextScheduledTime(tempSchedule);
    }

    const updatedSchedule = storage.updateExportSchedule(params.id, updates);

    if (!updatedSchedule) {
      return NextResponse.json(
        { success: false, error: 'Failed to update schedule' },
        { status: 500 }
      );
    }

    // Update scheduler registration
    if (body.enabled !== undefined || body.frequency || body.scheduledTime) {
      unregisterSchedule(params.id);
      if (updatedSchedule.enabled) {
        registerSchedule(updatedSchedule);
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedSchedule,
    });
  } catch (error) {
    console.error('Error updating schedule:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update schedule' },
      { status: 500 }
    );
  }
}

// DELETE /api/export-schedules/[id] - Delete schedule
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const success = storage.deleteExportSchedule(params.id);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Schedule not found' },
        { status: 404 }
      );
    }

    // Unregister from scheduler
    unregisterSchedule(params.id);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete schedule' },
      { status: 500 }
    );
  }
}
