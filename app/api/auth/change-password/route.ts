import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getLocalUser, updateLocalUser } from '@/lib/serverLocalUsers';
import { logUserAction } from '@/lib/serverAuditLog';

export async function POST(request: NextRequest) {
  try {
    // Get the current session
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { currentPassword, newPassword } = await request.json();

    // Validation
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: 'New password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Get the user
    const user = getLocalUser(session.user.email);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify current password
    // In production, use: await bcrypt.compare(currentPassword, user.password)
    if (user.password !== currentPassword) {
      // Log failed password change attempt
      await logUserAction(
        'user.update',
        `Failed password change attempt for ${user.email}: incorrect current password`,
        {
          userId: session.user?.email || undefined,
          userName: session.user?.name || undefined,
          userEmail: session.user?.email || undefined,
          success: false,
          details: {
            reason: 'incorrect_current_password',
          },
        }
      );

      return NextResponse.json(
        { success: false, error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    // Update password
    // In production, use: const hashedPassword = await bcrypt.hash(newPassword, 10)
    const updatedUser = updateLocalUser(user.id, { password: newPassword });

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: 'Failed to update password' },
        { status: 500 }
      );
    }

    // Log successful password change
    await logUserAction(
      'user.update',
      `Password changed successfully for ${updatedUser.email}`,
      {
        userId: session.user?.email || undefined,
        userName: session.user?.name || undefined,
        userEmail: session.user?.email || undefined,
        success: true,
        details: {
          targetUserId: updatedUser.id,
          targetUserEmail: updatedUser.email,
          action: 'password_change',
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Error changing password:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while changing password' },
      { status: 500 }
    );
  }
}
