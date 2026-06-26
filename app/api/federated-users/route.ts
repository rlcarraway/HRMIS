import { NextRequest, NextResponse } from 'next/server';
import { getFederatedUsers } from '@/lib/serverFederatedUsers';
import { authenticateApiRequest } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Only admins can view federated users
    const auth = await authenticateApiRequest(request, { requiredRole: 'admin' });
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const users = await getFederatedUsers();

    return NextResponse.json({
      success: true,
      data: users,
      count: users.length,
    });
  } catch (error) {
    console.error('Error fetching federated users:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while fetching federated users' },
      { status: 500 }
    );
  }
}
