import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';

// GET /api/export-metadata - Get export metadata
export async function GET() {
  try {
    const metadata = storage.getExportMetadata();
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

    const metadata = storage.getExportMetadata();

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

    const updatedMetadata = storage.updateExportMetadata(updates);

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
