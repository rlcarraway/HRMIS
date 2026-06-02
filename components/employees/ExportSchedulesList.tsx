'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ExportSchedule } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Calendar, Clock, Play, Trash2, Edit, CheckCircle, XCircle } from 'lucide-react';

interface ExportSchedulesListProps {
  isOpen: boolean;
  onClose: () => void;
  schedules: ExportSchedule[];
  onEdit: (schedule: ExportSchedule) => void;
  onDelete: (id: string) => Promise<void>;
  onExecute: (id: string) => Promise<void>;
}

const FREQUENCY_COLORS: Record<ExportSchedule['frequency'], string> = {
  once: 'bg-purple-100 text-purple-700',
  minutes: 'bg-pink-100 text-pink-700',
  hourly: 'bg-indigo-100 text-indigo-700',
  daily: 'bg-blue-100 text-blue-700',
  weekly: 'bg-green-100 text-green-700',
  monthly: 'bg-amber-100 text-amber-700',
};

export function ExportSchedulesList({
  isOpen,
  onClose,
  schedules,
  onEdit,
  onDelete,
  onExecute,
}: ExportSchedulesListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [executingId, setExecutingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;

    try {
      setDeletingId(id);
      await onDelete(id);
    } catch (error) {
      alert('Failed to delete schedule');
    } finally {
      setDeletingId(null);
    }
  };

  const handleExecute = async (id: string) => {
    try {
      setExecutingId(id);
      await onExecute(id);
      alert('Export executed successfully');
    } catch (error) {
      alert('Failed to execute export');
    } finally {
      setExecutingId(null);
    }
  };

  const getNextScheduledDisplay = (schedule: ExportSchedule) => {
    try {
      const nextDate = new Date(schedule.nextScheduled);
      const relative = formatDistanceToNow(nextDate, { addSuffix: true });
      const absolute = formatDate(schedule.nextScheduled, 'PPp');
      return { relative, absolute };
    } catch {
      return { relative: 'Unknown', absolute: 'Unknown' };
    }
  };

  const getLastExecutedDisplay = (schedule: ExportSchedule) => {
    if (!schedule.lastExecuted) return null;
    try {
      const lastDate = new Date(schedule.lastExecuted);
      const relative = formatDistanceToNow(lastDate, { addSuffix: true });
      return relative;
    } catch {
      return 'Unknown';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Export Schedules">
      <div className="space-y-4">
        {schedules.length === 0 ? (
          <div className="text-center py-12">
            <Calendar size={48} className="mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600">No export schedules configured.</p>
            <p className="text-sm text-gray-500 mt-1">Create your first automated export.</p>
          </div>
        ) : (
          schedules.map((schedule) => {
            const { relative, absolute } = getNextScheduledDisplay(schedule);
            const lastExecuted = getLastExecutedDisplay(schedule);

            return (
              <div
                key={schedule.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-primary transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{schedule.name}</h3>
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded ${
                          FREQUENCY_COLORS[schedule.frequency]
                        }`}
                      >
                        {schedule.frequency}
                      </span>
                      {schedule.enabled ? (
                        <span title="Enabled">
                          <CheckCircle size={16} className="text-green-600" />
                        </span>
                      ) : (
                        <span title="Disabled">
                          <XCircle size={16} className="text-gray-400" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock size={14} />
                    <span>
                      Next run: <span className="font-medium text-gray-900">{relative}</span>
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 pl-5">{absolute}</div>

                  {lastExecuted && (
                    <div className="text-xs text-gray-500 pl-5">
                      Last executed: {lastExecuted}
                    </div>
                  )}

                  <div className="text-xs text-gray-500 pl-5">
                    Export type: <span className="font-medium">{schedule.exportType === 'delta' ? 'Delta (changes only)' : 'Full (all records)'}</span>
                  </div>

                  {schedule.webhookUrl && (
                    <div className="text-xs text-gray-500 pl-5">
                      Webhook: <span className="font-mono text-xs">{schedule.webhookUrl.substring(0, 40)}{schedule.webhookUrl.length > 40 ? '...' : ''}</span>
                    </div>
                  )}

                  {Object.keys(schedule.filters).length > 0 && (
                    <div className="text-xs text-gray-500 pl-5">
                      Filters applied: {Object.keys(schedule.filters).filter(k => schedule.filters[k as keyof typeof schedule.filters]).length}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-3">
                  <Button
                    variant="ghost"
                    onClick={() => onEdit(schedule)}
                    disabled={deletingId === schedule.id || executingId === schedule.id}
                    className="text-sm"
                  >
                    <Edit size={14} className="mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleExecute(schedule.id)}
                    disabled={deletingId === schedule.id || executingId === schedule.id}
                    className="text-sm"
                  >
                    <Play size={14} className="mr-1" />
                    {executingId === schedule.id ? 'Running...' : 'Run Now'}
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => handleDelete(schedule.id)}
                    disabled={deletingId === schedule.id || executingId === schedule.id}
                    className="text-sm ml-auto"
                  >
                    <Trash2 size={14} className="mr-1" />
                    {deletingId === schedule.id ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex justify-end mt-6">
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
}
