import { useState, useEffect, useCallback } from 'react';
import { ExportSchedule, ExportMetadata } from '@/lib/types';

export function useExportSchedules() {
  const [schedules, setSchedules] = useState<ExportSchedule[]>([]);
  const [metadata, setMetadata] = useState<ExportMetadata>({
    totalExportsCount: 0,
    scheduledExportsCount: 0,
    manualExportsCount: 0,
  });
  const [loading, setLoading] = useState(true);

  // Load schedules from API
  const loadSchedules = useCallback(async () => {
    try {
      const response = await fetch('/api/export-schedules');
      const result = await response.json();
      if (result.success) {
        setSchedules(result.data);
      }
    } catch (error) {
      console.error('Failed to load schedules:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load metadata
  const loadMetadata = useCallback(async () => {
    try {
      const response = await fetch('/api/export-metadata');
      const result = await response.json();
      if (result.success) {
        setMetadata(result.data);
      }
    } catch (error) {
      console.error('Failed to load metadata:', error);
    }
  }, []);

  useEffect(() => {
    loadSchedules();
    loadMetadata();
  }, [loadSchedules, loadMetadata]);

  // Create schedule
  const createSchedule = useCallback(async (scheduleData: Omit<ExportSchedule, 'id' | 'createdAt' | 'updatedAt' | 'nextScheduled' | 'lastExecuted' | 'lastExportedRecordIds'>) => {
    try {
      const response = await fetch('/api/export-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleData),
      });
      const result = await response.json();
      if (result.success) {
        setSchedules(prev => [...prev, result.data]);
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Failed to create schedule:', error);
      throw error;
    }
  }, []);

  // Update schedule
  const updateSchedule = useCallback(async (id: string, updates: Partial<ExportSchedule>) => {
    try {
      const response = await fetch(`/api/export-schedules/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const result = await response.json();
      if (result.success) {
        setSchedules(prev => prev.map(s => s.id === id ? result.data : s));
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Failed to update schedule:', error);
      throw error;
    }
  }, []);

  // Delete schedule
  const deleteSchedule = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/export-schedules/${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        setSchedules(prev => prev.filter(s => s.id !== id));
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Failed to delete schedule:', error);
      throw error;
    }
  }, []);

  // Execute schedule now
  const executeSchedule = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/export-schedules/${id}/execute`, {
        method: 'POST',
      });
      const result = await response.json();
      if (result.success) {
        // Refresh metadata and schedules
        await loadMetadata();
        await loadSchedules();
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Failed to execute schedule:', error);
      throw error;
    }
  }, [loadMetadata, loadSchedules]);

  return {
    schedules,
    metadata,
    loading,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    executeSchedule,
    refreshSchedules: loadSchedules,
    refreshMetadata: loadMetadata,
  };
}
