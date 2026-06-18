import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// POST - Test outbound API connection
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Only admins can test outbound API
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { url, headers, method, payload } = body;

    // Validation
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      );
    }

    if (!method || !['POST', 'PUT', 'DELETE'].includes(method)) {
      return NextResponse.json(
        { success: false, error: 'Valid HTTP method is required (POST, PUT, DELETE)' },
        { status: 400 }
      );
    }

    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Payload is required' },
        { status: 400 }
      );
    }

    // Build headers object
    const headersObj: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (Array.isArray(headers)) {
      headers.forEach(header => {
        if (header.key && header.value) {
          headersObj[header.key] = header.value;
        }
      });
    }

    // Make the test API call with the specified method and payload
    const startTime = Date.now();
    const response = await fetch(url, {
      method: method,
      headers: headersObj,
      body: JSON.stringify(payload),
    });
    const duration = Date.now() - startTime;

    const responseText = await response.text();
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch {
      parsedResponse = responseText;
    }

    return NextResponse.json({
      success: response.ok,
      statusCode: response.status,
      statusText: response.statusText,
      duration: `${duration}ms`,
      response: parsedResponse,
      error: response.ok ? undefined : `API returned ${response.status}: ${response.statusText}`,
    });
  } catch (error) {
    console.error('Error testing outbound API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      },
      { status: 500 }
    );
  }
}
