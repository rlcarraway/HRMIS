'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ExportSchedule, EmployeeFilters } from '@/lib/types';
import { formatDate } from '@/lib/utils';

interface ExportSchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (schedule: Omit<ExportSchedule, 'id' | 'createdAt' | 'updatedAt' | 'nextScheduled' | 'lastExecuted' | 'lastExportedRecordIds'>) => Promise<void>;
  onScheduleNow?: (schedule: Omit<ExportSchedule, 'id' | 'createdAt' | 'updatedAt' | 'nextScheduled' | 'lastExecuted' | 'lastExportedRecordIds'>) => Promise<void>;
  initialSchedule?: ExportSchedule;
  currentFilters?: EmployeeFilters;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export function ExportSchedulerModal({
  isOpen,
  onClose,
  onSave,
  onScheduleNow,
  initialSchedule,
  currentFilters = {},
}: ExportSchedulerModalProps) {
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState<'once' | 'daily' | 'weekly' | 'monthly' | 'hourly' | 'minutes'>('daily');
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [scheduledDate, setScheduledDate] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState<number>(1);
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [intervalValue, setIntervalValue] = useState<number>(1);
  const [enabled, setEnabled] = useState(true);
  const [exportType, setExportType] = useState<'full' | 'delta'>('full');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [showOAuth, setShowOAuth] = useState(false);
  const [oauthClientId, setOauthClientId] = useState('');
  const [oauthClientSecret, setOauthClientSecret] = useState('');
  const [oauthTokenUrl, setOauthTokenUrl] = useState('');
  const [oauthScope, setOauthScope] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<EmployeeFilters>(currentFilters);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Get user's timezone
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Load initial schedule if editing
  useEffect(() => {
    if (initialSchedule) {
      setName(initialSchedule.name);
      setFrequency(initialSchedule.frequency);
      setScheduledTime(initialSchedule.scheduledTime || '09:00');
      setScheduledDate(initialSchedule.scheduledDate || '');
      setDayOfWeek(initialSchedule.dayOfWeek ?? 1);
      setDayOfMonth(initialSchedule.dayOfMonth ?? 1);
      setIntervalValue(initialSchedule.intervalValue ?? 1);
      setEnabled(initialSchedule.enabled);
      setExportType(initialSchedule.exportType);
      setWebhookUrl(initialSchedule.webhookUrl || '');
      setFilters(initialSchedule.filters);

      // Load OAuth config if present
      if (initialSchedule.webhookOAuth) {
        setShowOAuth(true);
        setOauthClientId(initialSchedule.webhookOAuth.clientId);
        setOauthClientSecret(initialSchedule.webhookOAuth.clientSecret);
        setOauthTokenUrl(initialSchedule.webhookOAuth.tokenUrl);
        setOauthScope(initialSchedule.webhookOAuth.scope || '');
      }
    }
  }, [initialSchedule]);

  const handleSubmit = async (scheduleNow = false) => {
    setError('');

    // Validation
    if (!name.trim()) {
      setError('Schedule name is required');
      return;
    }

    if (frequency === 'once' && !scheduledDate) {
      setError('Date is required for one-time schedules');
      return;
    }

    // Validate scheduled datetime is in the future
    if (frequency === 'once' && scheduledDate && scheduledTime) {
      const [hours, minutes] = scheduledTime.split(':').map(Number);
      const scheduledDateTime = new Date(scheduledDate);
      scheduledDateTime.setHours(hours, minutes, 0, 0);
      if (scheduledDateTime <= new Date()) {
        setError('Scheduled date and time must be in the future');
        return;
      }
    }

    // Validate interval values
    if (frequency === 'hourly' && (!intervalValue || intervalValue < 1 || intervalValue > 24)) {
      setError('Hours must be between 1 and 24');
      return;
    }

    if (frequency === 'minutes' && (!intervalValue || intervalValue < 1 || intervalValue > 1440)) {
      setError('Minutes must be between 1 and 1440');
      return;
    }

    // Validate webhook URL if provided
    if (webhookUrl && webhookUrl.trim()) {
      try {
        new URL(webhookUrl);
      } catch {
        setError('Invalid webhook URL');
        return;
      }
    }

    // Validate OAuth config if provided
    if (showOAuth && webhookUrl && webhookUrl.trim()) {
      if (!oauthClientId.trim()) {
        setError('OAuth Client ID is required');
        return;
      }
      if (!oauthClientSecret.trim()) {
        setError('OAuth Client Secret is required');
        return;
      }
      if (!oauthTokenUrl.trim()) {
        setError('OAuth Token URL is required');
        return;
      }
      try {
        new URL(oauthTokenUrl);
      } catch {
        setError('Invalid OAuth Token URL');
        return;
      }
    }

    const scheduleData: Omit<ExportSchedule, 'id' | 'createdAt' | 'updatedAt' | 'nextScheduled' | 'lastExecuted' | 'lastExportedRecordIds'> = {
      name,
      frequency,
      scheduledTime: (frequency === 'hourly' || frequency === 'minutes') ? undefined : scheduledTime,
      scheduledDate: frequency === 'once' ? scheduledDate : undefined,
      dayOfWeek: frequency === 'weekly' ? dayOfWeek : undefined,
      dayOfMonth: frequency === 'monthly' ? dayOfMonth : undefined,
      intervalValue: (frequency === 'hourly' || frequency === 'minutes') ? intervalValue : undefined,
      filters,
      timezone,
      enabled,
      exportType,
      webhookUrl: webhookUrl.trim() || undefined,
      webhookOAuth: (showOAuth && webhookUrl.trim() && oauthClientId.trim() && oauthClientSecret.trim() && oauthTokenUrl.trim()) ? {
        clientId: oauthClientId.trim(),
        clientSecret: oauthClientSecret.trim(),
        tokenUrl: oauthTokenUrl.trim(),
        scope: oauthScope.trim() || undefined,
      } : undefined,
    };

    try {
      setSaving(true);
      if (scheduleNow && onScheduleNow) {
        await onScheduleNow(scheduleData);
      } else {
        await onSave(scheduleData);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save schedule');
    } finally {
      setSaving(false);
    }
  };

  const calculateNextRun = () => {
    const now = new Date();

    switch (frequency) {
      case 'minutes':
        return `Every ${intervalValue} minute${intervalValue !== 1 ? 's' : ''}`;

      case 'hourly':
        return `Every ${intervalValue} hour${intervalValue !== 1 ? 's' : ''}`;

      case 'once':
        if (scheduledDate) {
          const [hours, minutes] = scheduledTime.split(':').map(Number);
          const date = new Date(scheduledDate);
          date.setHours(hours, minutes, 0, 0);
          return formatDate(date.toISOString(), 'PPP') + ` at ${scheduledTime}`;
        }
        return 'Select a date';

      case 'daily': {
        const [hours, minutes] = scheduledTime.split(':').map(Number);
        let next = new Date();
        next.setHours(hours, minutes, 0, 0);
        if (next <= now) {
          next.setDate(next.getDate() + 1);
        }
        return formatDate(next.toISOString(), 'PPP') + ` at ${scheduledTime}`;
      }

      case 'weekly': {
        const dayName = DAYS_OF_WEEK.find(d => d.value === dayOfWeek)?.label;
        return `Every ${dayName} at ${scheduledTime}`;
      }

      case 'monthly': {
        return `Day ${dayOfMonth} of each month at ${scheduledTime}`;
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialSchedule ? 'Edit Schedule' : 'Schedule Export'}>
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <Input
          label="Schedule Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Daily Full Export"
        />

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="rounded border-gray-300"
            />
            Enabled
          </label>
        </div>

        <Select
          label="Export Type"
          value={exportType}
          onChange={(e) => setExportType(e.target.value as 'full' | 'delta')}
          options={[
            { value: 'full', label: 'Full Export - All records' },
            { value: 'delta', label: 'Delta Export - Only changes since last export' },
          ]}
        />

        {exportType === 'delta' && (
          <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700">
            Delta exports include only records created or updated since the last export.
            The first export will include all records.
          </div>
        )}

        <Select
          label="Frequency"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as any)}
          options={[
            { value: 'once', label: 'Once' },
            { value: 'minutes', label: 'Every N Minutes' },
            { value: 'hourly', label: 'Every N Hours' },
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' },
            { value: 'monthly', label: 'Monthly' },
          ]}
        />

        {(frequency === 'minutes' || frequency === 'hourly') && (
          <Input
            label={frequency === 'minutes' ? 'Interval (Minutes)' : 'Interval (Hours)'}
            type="number"
            value={intervalValue}
            onChange={(e) => setIntervalValue(Number(e.target.value))}
            min="1"
            max={frequency === 'minutes' ? '1440' : '24'}
          />
        )}

        {frequency !== 'minutes' && frequency !== 'hourly' && (
          <Input
            label="Time"
            type="time"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
          />
        )}

        {frequency === 'once' && (
          <div>
            <Input
              label="Date"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
            <p className="text-xs text-gray-500 mt-1">
              Same-day scheduling allowed if time is in the future
            </p>
          </div>
        )}

        {frequency === 'weekly' && (
          <Select
            label="Day of Week"
            value={dayOfWeek.toString()}
            onChange={(e) => setDayOfWeek(Number(e.target.value))}
            options={DAYS_OF_WEEK.map(d => ({ value: d.value.toString(), label: d.label }))}
          />
        )}

        {frequency === 'monthly' && (
          <Input
            label="Day of Month"
            type="number"
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(Number(e.target.value))}
            min="1"
            max="31"
          />
        )}

        <Input
          label="Webhook URL (optional)"
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          placeholder="https://example.com/webhook"
        />

        {webhookUrl && (
          <div className="bg-amber-50 p-3 rounded-lg text-sm text-amber-700">
            The webhook will be called with a POST request containing export details when the export completes.
          </div>
        )}

        {webhookUrl && webhookUrl.trim() && (
          <div>
            <button
              type="button"
              onClick={() => setShowOAuth(!showOAuth)}
              className="text-sm text-primary hover:text-primary-dark font-medium"
            >
              {showOAuth ? '- Hide OAuth Configuration' : '+ Add OAuth Authentication'}
            </button>

            {showOAuth && (
              <div className="mt-3 p-4 border border-gray-200 rounded-lg space-y-3 bg-gray-50">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  OAuth 2.0 Client Credentials
                </div>
                <Input
                  label="Client ID"
                  value={oauthClientId}
                  onChange={(e) => setOauthClientId(e.target.value)}
                  placeholder="your-client-id"
                />
                <Input
                  label="Client Secret"
                  type="password"
                  value={oauthClientSecret}
                  onChange={(e) => setOauthClientSecret(e.target.value)}
                  placeholder="your-client-secret"
                />
                <Input
                  label="Token URL"
                  value={oauthTokenUrl}
                  onChange={(e) => setOauthTokenUrl(e.target.value)}
                  placeholder="https://auth.example.com/oauth/token"
                />
                <Input
                  label="Scope (optional)"
                  value={oauthScope}
                  onChange={(e) => setOauthScope(e.target.value)}
                  placeholder="read write"
                />
                <div className="bg-blue-50 p-2 rounded text-xs text-blue-700">
                  The system will automatically obtain and cache access tokens using the Client Credentials flow.
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="text-sm font-medium text-blue-900">Next scheduled run:</div>
          <div className="text-sm text-blue-700 mt-1">{calculateNextRun()}</div>
          <div className="text-xs text-blue-600 mt-1">Timezone: {timezone}</div>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="text-sm text-primary hover:text-primary-dark font-medium"
          >
            {showFilters ? '- Hide Filters' : '+ Add Filters'}
          </button>

          {showFilters && (
            <div className="mt-3 p-3 border border-gray-200 rounded-lg space-y-3">
              <Input
                label="Search"
                value={filters.search || ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Name or email"
              />
              <Select
                label="Status"
                value={filters.status || 'all'}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'terminated', label: 'Terminated' },
                ]}
              />
              <Select
                label="Type"
                value={filters.type || 'all'}
                onChange={(e) => setFilters({ ...filters, type: e.target.value as any })}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'employee', label: 'Employee' },
                  { value: 'contractor', label: 'Contractor' },
                ]}
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={() => handleSubmit(false)} disabled={saving}>
          {saving ? 'Saving...' : 'Save Schedule'}
        </Button>
        {onScheduleNow && (
          <Button onClick={() => handleSubmit(true)} disabled={saving}>
            {saving ? 'Saving...' : 'Schedule & Run Now'}
          </Button>
        )}
      </div>
    </Modal>
  );
}
