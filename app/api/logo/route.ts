import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { serverStorage } from '@/lib/serverStorage';
import { logConfigChange } from '@/lib/serverAuditLog';

// GET /api/logo - Get company logo
export async function GET() {
  try {
    const logo = serverStorage.getLogo();
    return NextResponse.json({
      success: true,
      data: logo,
    });
  } catch (error) {
    console.error('Error fetching logo:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while fetching logo' },
      { status: 500 }
    );
  }
}

// PUT /api/logo - Upload/update logo
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Only admins can update logo
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { logo } = body;

    if (!logo || typeof logo !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid logo data' },
        { status: 400 }
      );
    }

    serverStorage.setLogo(logo);

    // Log the logo upload
    logConfigChange(
      'config.logo.upload',
      'Uploaded company logo',
      {
        userId: session.user?.email || undefined,
        userName: session.user?.name || undefined,
        userEmail: session.user?.email || undefined,
        success: true,
        details: {
          logoSize: logo.length,
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Logo uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading logo:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while uploading logo' },
      { status: 500 }
    );
  }
}

// DELETE /api/logo - Remove logo
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);

    // Only admins can delete logo
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    serverStorage.removeLogo();

    // Log the logo removal
    logConfigChange(
      'config.logo.remove',
      'Removed company logo',
      {
        userId: session.user?.email || undefined,
        userName: session.user?.name || undefined,
        userEmail: session.user?.email || undefined,
        success: true,
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Logo removed successfully',
    });
  } catch (error) {
    console.error('Error removing logo:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while removing logo' },
      { status: 500 }
    );
  }
}
