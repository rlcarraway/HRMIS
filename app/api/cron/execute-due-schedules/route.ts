import { NextRequest, NextResponse } from 'next/server';
import { checkAndRunDueSchedules } from '@/lib/scheduler';

export const dynamic = 'force-dynamic';

// GET /api/cron/execute-due-schedules - Check all enabled export schedules
// and run whichever are due. Invoked by a Vercel Cron Job in production
// (see vercel.json); can also be hit by an external pinger with the same
// bearer token for finer-than-daily granularity than the Hobby plan allows.
export async function GET(request: NextRequest) {
  if (process.env.CRON_SECRET) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const result = await checkAndRunDueSchedules();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Cron export check failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check schedules' },
      { status: 500 }
    );
  }
}
