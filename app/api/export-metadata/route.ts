import { NextRequest, NextResponse } from 'next/server';
import { serverStorage } from '@/lib/serverStorage';

// GET /api/export-metadata - Get export metadata
export async function GET() {
  try {
    const metadata = await serverStorage.getExportMetadata();
    return NextResponse.json({
      success: true,
      data: metadata,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch metadata' },
      { status: 500 }
    );
  }
}

// PUT /api/export-metadata - Update export metadata
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const metadata = await serverStorage.getExportMetadata();

    // Handle incremental updates
    const updates: any = {};

    if (body.lastExportTimestamp) {
      updates.lastExportTimestamp = body.lastExportTimestamp;
    }

    if (body.lastExportCount !== undefined) {
      updates.lastExportCount = body.lastExportCount;
    }

    if (body.lastExportType) {
      updates.lastExportType = body.lastExportType;

      // Increment counters
      updates.totalExportsCount = metadata.totalExportsCount + 1;

      if (body.lastExportType === 'manual') {
        updates.manualExportsCount = metadata.manualExportsCount + 1;
      } else if (body.lastExportType === 'scheduled') {
        updates.scheduledExportsCount = metadata.scheduledExportsCount + 1;
      }
    }

    const updatedMetadata = await serverStorage.updateExportMetadata(updates);

    return NextResponse.json({
      success: true,
      data: updatedMetadata,
    });
  } catch (error) {
    console.error('Error updating metadata:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update metadata' },
      { status: 500 }
    );
  }
}
