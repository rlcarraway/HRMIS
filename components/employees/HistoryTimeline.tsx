'use client';

import { ChangeHistory } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { FileEdit, UserPlus, Trash2 } from 'lucide-react';

interface HistoryTimelineProps {
  history: ChangeHistory[];
}

export function HistoryTimeline({ history }: HistoryTimelineProps) {
  const getActionIcon = (action: ChangeHistory['action']) => {
    switch (action) {
      case 'create':
        return <UserPlus size={20} className="text-green-600" />;
      case 'update':
        return <FileEdit size={20} className="text-blue-600" />;
      case 'delete':
        return <Trash2 size={20} className="text-red-600" />;
    }
  };

  const getActionColor = (action: ChangeHistory['action']) => {
    switch (action) {
      case 'create':
        return 'bg-green-100 border-green-300';
      case 'update':
        return 'bg-blue-100 border-blue-300';
      case 'delete':
        return 'bg-red-100 border-red-300';
    }
  };

  if (history.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No change history available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {history.map((entry, index) => (
        <div key={entry.id} className="flex gap-4">
          {/* Timeline line */}
          <div className="flex flex-col items-center">
            <div className={`p-2 rounded-full border-2 ${getActionColor(entry.action)}`}>
              {getActionIcon(entry.action)}
            </div>
            {index < history.length - 1 && (
              <div className="w-0.5 h-full bg-gray-200 mt-2" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 pb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900 capitalize">
                  {entry.action}
                </h3>
                <span className="text-sm text-gray-500">
                  {formatDate(entry.timestamp, 'MMM dd, yyyy HH:mm')}
                </span>
              </div>

              <p className="text-sm text-gray-600 mb-2">
                By {entry.changedBy}
              </p>

              {Object.keys(entry.changes).length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-sm font-medium text-gray-700">Changes:</p>
                  <div className="space-y-1">
                    {Object.entries(entry.changes).map(([field, { old, new: newValue }]) => (
                      <div key={field} className="text-sm bg-gray-50 p-2 rounded">
                        <span className="font-medium capitalize">{field}:</span>
                        <div className="ml-4 mt-1">
                          <div className="text-red-600">
                            - {old !== undefined ? String(old) : 'null'}
                          </div>
                          <div className="text-green-600">
                            + {newValue !== undefined ? String(newValue) : 'null'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
