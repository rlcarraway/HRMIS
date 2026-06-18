import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getFederatedUserByEmail } from '@/lib/serverFederatedUsers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user exists in federated users
    const federatedUser = getFederatedUserByEmail(session.user.email);
    const isFederated = !!federatedUser;

    return NextResponse.json({
      success: true,
      isFederated,
      userType: isFederated ? 'federated' : 'local',
    });
  } catch (error) {
    console.error('Error checking user type:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while checking user type', isFederated: false },
      { status: 500 }
    );
  }
}
