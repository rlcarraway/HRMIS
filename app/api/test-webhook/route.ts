import { NextRequest, NextResponse } from 'next/server';

// Test webhook endpoint to receive export notifications
// This demonstrates what a webhook receiver would look like
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('==============================');
    console.log('WEBHOOK RECEIVED');
    console.log('==============================');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Schedule ID:', body.scheduleId);
    console.log('Schedule Name:', body.scheduleName);
    console.log('Executed At:', body.executedAt);
    console.log('Success:', body.success);
    console.log('Employee Count:', body.employeeCount);
    console.log('Filename:', body.filename);
    console.log('Export Type:', body.exportType);
    console.log('File Path:', body.filepath);
    console.log('==============================');

    return NextResponse.json({
      success: true,
      message: 'Webhook received',
      receivedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

// GET endpoint to verify webhook is accessible
export async function GET() {
  return NextResponse.json({
    message: 'Test webhook endpoint is active',
    usage: 'POST to this endpoint to test webhook functionality',
    expectedPayload: {
      scheduleId: 'string',
      scheduleName: 'string',
      executedAt: 'ISO timestamp',
      success: 'boolean',
      employeeCount: 'number',
      filename: 'string',
      exportType: 'full | delta',
      filepath: 'string',
    },
  });
}
