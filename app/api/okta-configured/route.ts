import { NextResponse } from 'next/server';
import { getOktaSettings } from '@/lib/serverOktaSettings';

export async function GET() {
  try {
    const settings = getOktaSettings();

    // Check if all required Okta settings are present
    const configured = !!(
      settings.clientId &&
      settings.clientSecret &&
      settings.issuer
    );

    return NextResponse.json({
      configured,
    });
  } catch (error) {
    console.error('Error checking Okta configuration:', error);
    return NextResponse.json(
      { configured: false },
      { status: 200 }
    );
  }
}
