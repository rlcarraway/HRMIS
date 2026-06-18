import { NextRequest, NextResponse } from 'next/server';
import { getLocalUsers } from '@/lib/serverLocalUsers';
import { authenticateApiRequest } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Only admins can view users
    const auth = await authenticateApiRequest(request, { requiredRole: 'admin' });
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const localUsers = getLocalUsers();

    // Transform to include user type
    const users = localUsers.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isOktaUser: false, // All users from local store are local users
      lastLogin: user.lastLogin,
    }));

    // In a full implementation, you would also fetch Okta users here
    // and merge them with local users

    return NextResponse.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while fetching users' },
      { status: 500 }
    );
  }
}
