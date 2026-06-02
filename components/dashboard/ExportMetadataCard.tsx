'use client';

import { ExportMetadata } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Download, Calendar, FileText } from 'lucide-react';
import Link from 'next/link';

interface ExportMetadataCardProps {
  metadata: ExportMetadata;
}

export function ExportMetadataCard({ metadata }: ExportMetadataCardProps) {
  const getLastExportDisplay = () => {
    if (!metadata.lastExportTimestamp) {
      return { relative: 'Never', absolute: 'No exports yet' };
    }

    try {
      const lastDate = new Date(metadata.lastExportTimestamp);
      const relative = formatDistanceToNow(lastDate, { addSuffix: true });
      const absolute = formatDate(metadata.lastExportTimestamp, 'PPp');
      return { relative, absolute };
    } catch {
      return { relative: 'Unknown', absolute: 'Unknown' };
    }
  };

  const { relative, absolute } = getLastExportDisplay();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Download className="text-primary" size={20} />
          <h3 className="text-lg font-semibold text-gray-900">Export Activity</h3>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
            <Calendar size={14} />
            <span>Last Export</span>
          </div>
          <div className="ml-5">
            <div className="font-medium text-gray-900">{relative}</div>
            <div className="text-xs text-gray-500">{absolute}</div>
            {metadata.lastExportCount !== undefined && (
              <div className="text-xs text-gray-500 mt-1">
                {metadata.lastExportCount} {metadata.lastExportCount === 1 ? 'record' : 'records'}
                {metadata.lastExportType && (
                  <span className="ml-1">({metadata.lastExportType})</span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-100 pt-3">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <FileText size={14} />
            <span>Total Exports</span>
          </div>
          <div className="ml-5 grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {metadata.totalExportsCount}
              </div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {metadata.scheduledExportsCount}
              </div>
              <div className="text-xs text-gray-500">Scheduled</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {metadata.manualExportsCount}
              </div>
              <div className="text-xs text-gray-500">Manual</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <Link
          href="/employees"
          className="text-sm text-primary hover:text-primary-dark font-medium"
        >
          Manage Schedules →
        </Link>
      </div>
    </div>
  );
}
