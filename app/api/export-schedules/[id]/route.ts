import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { calculateNextScheduledTime } from '@/lib/utils';
import { registerSchedule, unregisterSchedule } from '@/lib/scheduler';
import { logConfigChange } from '@/lib/serverAuditLog';
import { authenticateApiRequest } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

// GET /api/export-schedules/[id] - Get single schedule
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require authentication
    const auth = await authenticateApiRequest(request);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Authentication required' },
        { status: 401 }
      );
    }

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
    // Require authentication
    const auth = await authenticateApiRequest(request);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Authentication required' },
        { status: 401 }
      );
    }

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

    // Log the schedule update
    await logConfigChange(
      'config.export_schedule.update',
      `Updated export schedule: ${updatedSchedule.name}`,
      {
        userId: auth.user.email,
        userName: auth.user.name,
        userEmail: auth.user.email,
        success: true,
        details: {
          scheduleId: updatedSchedule.id,
          scheduleName: updatedSchedule.name,
          updatedFields: Object.keys(body),
          authType: auth.user.authType,
          clientId: auth.user.clientId,
        },
      }
    );

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
    // Require authentication
    const auth = await authenticateApiRequest(request);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Authentication required' },
        { status: 401 }
      );
    }

    const schedule = storage.getExportSchedule(params.id);
    const success = storage.deleteExportSchedule(params.id);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Schedule not found' },
        { status: 404 }
      );
    }

    // Unregister from scheduler
    unregisterSchedule(params.id);

    // Log the schedule deletion
    await logConfigChange(
      'config.export_schedule.delete',
      `Deleted export schedule: ${schedule?.name || params.id}`,
      {
        userId: auth.user.email,
        userName: auth.user.name,
        userEmail: auth.user.email,
        success: true,
        details: {
          scheduleId: params.id,
          scheduleName: schedule?.name,
          authType: auth.user.authType,
          clientId: auth.user.clientId,
        },
      }
    );

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
