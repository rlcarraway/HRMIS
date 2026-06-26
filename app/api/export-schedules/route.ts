import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { exportScheduleSchema } from '@/lib/validation';
import { generateId, calculateNextScheduledTime } from '@/lib/utils';
import { ExportSchedule } from '@/lib/types';
import { registerSchedule } from '@/lib/scheduler';
import { logConfigChange } from '@/lib/serverAuditLog';
import { authenticateApiRequest } from '@/lib/apiAuth';
import '@/lib/server-init'; // Initialize server on first import

export const dynamic = 'force-dynamic';

// GET /api/export-schedules - List all schedules
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const auth = await authenticateApiRequest(request);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Authentication required' },
        { status: 401 }
      );
    }

    const schedules = storage.getExportSchedules();
    return NextResponse.json({
      success: true,
      data: schedules,
      count: schedules.length,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch schedules' },
      { status: 500 }
    );
  }
}

// POST /api/export-schedules - Create new schedule
export async function POST(request: NextRequest) {
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

    // Validate input
    const validation = exportScheduleSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const scheduleData: ExportSchedule = {
      id: generateId(),
      name: body.name,
      frequency: body.frequency,
      scheduledTime: body.scheduledTime,
      scheduledDate: body.scheduledDate,
      dayOfWeek: body.dayOfWeek,
      dayOfMonth: body.dayOfMonth,
      intervalValue: body.intervalValue,
      filters: body.filters,
      timezone: body.timezone,
      enabled: body.enabled,
      exportType: body.exportType || 'full',
      webhookUrl: body.webhookUrl || undefined,
      webhookOAuth: body.webhookOAuth || undefined,
      nextScheduled: '', // Will be calculated
      createdAt: now,
      updatedAt: now,
    };

    // Calculate next scheduled time
    scheduleData.nextScheduled = calculateNextScheduledTime(scheduleData);

    // Save to storage
    storage.addExportSchedule(scheduleData);

    // Register with scheduler
    registerSchedule(scheduleData);

    // Log the schedule creation
    await logConfigChange(
      'config.export_schedule.create',
      `Created export schedule: ${scheduleData.name}`,
      {
        userId: auth.user.email,
        userName: auth.user.name,
        userEmail: auth.user.email,
        success: true,
        details: {
          scheduleId: scheduleData.id,
          scheduleName: scheduleData.name,
          frequency: scheduleData.frequency,
          enabled: scheduleData.enabled,
          exportType: scheduleData.exportType,
          authType: auth.user.authType,
          clientId: auth.user.clientId,
        },
      }
    );

    return NextResponse.json({
      success: true,
      data: scheduleData,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating schedule:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create schedule' },
      { status: 500 }
    );
  }
}
