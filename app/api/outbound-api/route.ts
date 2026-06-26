import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getOutboundApiSettings, updateOutboundApiSettings } from '@/lib/serverOutboundApi';
import { logConfigChange } from '@/lib/serverAuditLog';

export const dynamic = 'force-dynamic';

// GET - Retrieve outbound API settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    // Only admins can view outbound API settings
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const settings = await getOutboundApiSettings();

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('Error fetching outbound API settings:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while fetching settings' },
      { status: 500 }
    );
  }
}

// PUT - Update outbound API settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Only admins can update outbound API settings
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { enabled, url, headers, operations } = body;

    // Validation
    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Invalid enabled value' },
        { status: 400 }
      );
    }

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(headers)) {
      return NextResponse.json(
        { success: false, error: 'Headers must be an array' },
        { status: 400 }
      );
    }

    if (!operations || typeof operations !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Operations configuration is required' },
        { status: 400 }
      );
    }

    // Get old settings for audit log
    const oldSettings = await getOutboundApiSettings();

    // Update settings
    const updatedSettings = await updateOutboundApiSettings({
      enabled,
      url: url.trim(),
      headers: headers.map(h => ({
        key: h.key?.trim() || '',
        value: h.value?.trim() || '',
      })),
      operations: {
        create: !!operations.create,
        update: !!operations.update,
        delete: !!operations.delete,
      },
    });

    // Log the configuration change
    await logConfigChange(
      'config.outbound_api.update',
      'Updated outbound API configuration',
      {
        userId: session.user?.email || undefined,
        userName: session.user?.name || undefined,
        userEmail: session.user?.email || undefined,
        oldValue: {
          enabled: oldSettings.enabled,
          url: oldSettings.url,
          operations: oldSettings.operations,
        },
        newValue: {
          enabled: updatedSettings.enabled,
          url: updatedSettings.url,
          operations: updatedSettings.operations,
        },
        success: true,
      }
    );

    return NextResponse.json({
      success: true,
      data: updatedSettings,
      message: 'Outbound API settings updated successfully',
    });
  } catch (error) {
    console.error('Error updating outbound API settings:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while updating settings' },
      { status: 500 }
    );
  }
}
