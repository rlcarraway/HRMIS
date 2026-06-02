'use client';

import { ChangeHistory } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { FileEdit, UserPlus, Trash2 } from 'lucide-react';

interface RecentChangesProps {
  history: ChangeHistory[];
  limit?: number;
}

export function RecentChanges({ history, limit = 5 }: RecentChangesProps) {
  const recentHistory = history.slice(0, limit);

  const getActionIcon = (action: ChangeHistory['action']) => {
    switch (action) {
      case 'create':
        return <UserPlus size={16} className="text-green-600" />;
      case 'update':
        return <FileEdit size={16} className="text-blue-600" />;
      case 'delete':
        return <Trash2 size={16} className="text-red-600" />;
    }
  };

  const getActionText = (entry: ChangeHistory) => {
    switch (entry.action) {
      case 'create':
        return 'Employee created';
      case 'update':
        return `Updated: ${Object.keys(entry.changes).join(', ')}`;
      case 'delete':
        return 'Employee deleted';
    }
  };

  if (recentHistory.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No recent changes
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {recentHistory.map(entry => (
        <div key={entry.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
          <div className="mt-1">{getActionIcon(entry.action)}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">
              {getActionText(entry)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {formatDate(entry.timestamp, 'MMM dd, yyyy HH:mm')} • {entry.changedBy}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
