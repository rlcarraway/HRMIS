import { NextRequest, NextResponse } from 'next/server';
import { getFederatedUser, updateFederatedUserRole, deleteFederatedUser } from '@/lib/serverFederatedUsers';
import { authenticateApiRequest } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Only admins can view federated user details
    const auth = await authenticateApiRequest(request, { requiredRole: 'admin' });
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await getFederatedUser(params.id);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Error fetching federated user:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while fetching the user' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Only admins can update federated user roles
    const auth = await authenticateApiRequest(request, { requiredRole: 'admin' });
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { role } = body;

    if (!role || (role !== 'admin' && role !== 'viewer')) {
      return NextResponse.json(
        { success: false, error: 'Invalid role. Must be "admin" or "viewer"' },
        { status: 400 }
      );
    }

    const updatedUser = await updateFederatedUserRole(params.id, role);

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: 'User role updated successfully',
    });
  } catch (error) {
    console.error('Error updating federated user:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while updating the user' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Only admins can delete federated users
    const auth = await authenticateApiRequest(request, { requiredRole: 'admin' });
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const success = await deleteFederatedUser(params.id);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting federated user:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while deleting the user' },
      { status: 500 }
    );
  }
}
