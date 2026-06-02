'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChangeHistory } from '@/lib/types';
import { storage } from '@/lib/storage';
import { generateId } from '@/lib/utils';

export function useHistory(employeeId?: string) {
  const [history, setHistory] = useState<ChangeHistory[]>([]);
  const [loading, setLoading] = useState(true);

  // Load history from storage
  useEffect(() => {
    const loadHistory = () => {
      const stored = storage.getHistory(employeeId);
      // Sort by timestamp descending (most recent first)
      stored.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setHistory(stored);
      setLoading(false);
    };
    loadHistory();
  }, [employeeId]);

  // Add history entry
  const addHistoryEntry = useCallback((entry: Omit<ChangeHistory, 'id' | 'timestamp' | 'changedBy'> & { changedBy?: string }) => {
    const newEntry: ChangeHistory = {
      employeeId: entry.employeeId,
      action: entry.action,
      changes: entry.changes,
      id: generateId(),
      timestamp: new Date().toISOString(),
      changedBy: entry.changedBy || 'System', // In a real app, this would be the logged-in user
    };

    storage.addHistoryEntry(newEntry);
    setHistory(prev => [newEntry, ...prev]); // Add to beginning (most recent first)

    return newEntry;
  }, []);

  return {
    history,
    loading,
    addHistoryEntry,
  };
}
