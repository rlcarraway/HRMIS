import { NextRequest, NextResponse } from 'next/server';
import { getOktaSettings, updateOktaSettings, getMaskedClientSecret } from '@/lib/serverOktaSettings';
import { logConfigChange } from '@/lib/serverAuditLog';
import { authenticateApiRequest } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Only admins can view Okta settings
    const auth = await authenticateApiRequest(request, { requiredRole: 'admin' });
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const settings = await getOktaSettings();
    const maskedSecret = await getMaskedClientSecret();

    return NextResponse.json({
      success: true,
      settings: {
        clientId: settings.clientId,
        clientSecret: maskedSecret,
        issuer: settings.issuer,
        isConfigured: !!(settings.clientId && settings.clientSecret && settings.issuer),
      },
    });
  } catch (error) {
    console.error('Error fetching Okta settings:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while fetching Okta settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Only admins can update Okta settings
    const auth = await authenticateApiRequest(request, { requiredRole: 'admin' });
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { clientId, clientSecret, issuer } = body;

    // Validate required fields
    if (!clientId || !clientSecret || !issuer) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Get old settings for logging
    const oldSettings = await getOktaSettings();

    // Update settings in file
    const saved = await updateOktaSettings({
      clientId,
      clientSecret,
      issuer,
    });

    if (!saved) {
      return NextResponse.json(
        { success: false, error: 'Failed to save settings' },
        { status: 500 }
      );
    }

    // Log the configuration change
    await logConfigChange(
      'config.okta.update',
      'Updated Okta configuration',
      {
        userId: auth.user.email,
        userName: auth.user.name,
        userEmail: auth.user.email,
        success: true,
        oldValue: {
          clientId: oldSettings.clientId,
          issuer: oldSettings.issuer,
          hasClientSecret: !!oldSettings.clientSecret,
        },
        newValue: {
          clientId,
          issuer,
          hasClientSecret: !!clientSecret,
        },
        details: {
          authType: auth.user.authType,
          clientId: auth.user.clientId,
        },
      }
    );

    // Update environment variables for current process
    // This allows the running server to use updated settings without restart
    process.env.OKTA_CLIENT_ID = clientId;
    process.env.OKTA_CLIENT_SECRET = clientSecret;
    process.env.OKTA_ISSUER = issuer;

    // Schedule server restart to apply OAuth configuration changes
    // Use setTimeout to ensure response is sent before restart
    setTimeout(() => {
      console.log('Restarting server to apply new Okta settings...');
      process.exit(0); // Exit code 0 for graceful shutdown - process manager will restart
    }, 500);

    return NextResponse.json({
      success: true,
      message: 'Okta settings saved successfully. Server will restart automatically to apply changes.',
    });
  } catch (error) {
    console.error('Error saving Okta settings:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while saving Okta settings' },
      { status: 500 }
    );
  }
}
