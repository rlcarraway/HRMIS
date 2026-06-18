import { NextRequest, NextResponse } from 'next/server';
import { updateLocalUser, deleteLocalUser, getLocalUserById } from '@/lib/serverLocalUsers';
import { logUserAction } from '@/lib/serverAuditLog';
import { authenticateApiRequest } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Only admins can update users
    const auth = await authenticateApiRequest(request, { requiredRole: 'admin' });
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const { role } = await request.json();

    if (!role || !['admin', 'viewer'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role' },
        { status: 400 }
      );
    }

    const oldUser = getLocalUserById(params.id);
    const updatedUser = updateLocalUser(params.id, { role });

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Log the role change
    logUserAction(
      'user.role_change',
      `Changed role for user ${updatedUser.email} from ${oldUser?.role} to ${updatedUser.role}`,
      {
        userId: auth.user.email,
        userName: auth.user.name,
        userEmail: auth.user.email,
        success: true,
        details: {
          targetUserId: updatedUser.id,
          targetUserEmail: updatedUser.email,
          oldRole: oldUser?.role,
          newRole: updatedUser.role,
          authType: auth.user.authType,
          clientId: auth.user.clientId,
        },
      }
    );

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
      },
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while updating user' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Only admins can delete users
    const auth = await authenticateApiRequest(request, { requiredRole: 'admin' });
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const userToDelete = getLocalUserById(params.id);
    const success = deleteLocalUser(params.id);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete user. User not found or cannot delete the last admin.' },
        { status: 400 }
      );
    }

    // Log the user deletion
    logUserAction(
      'user.delete',
      `Deleted user: ${userToDelete?.email || params.id}`,
      {
        userId: auth.user.email,
        userName: auth.user.name,
        userEmail: auth.user.email,
        success: true,
        details: {
          deletedUserId: params.id,
          deletedUserEmail: userToDelete?.email,
          deletedUserRole: userToDelete?.role,
          authType: auth.user.authType,
          clientId: auth.user.clientId,
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while deleting user' },
      { status: 500 }
    );
  }
}
