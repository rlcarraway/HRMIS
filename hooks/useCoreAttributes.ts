import { useState, useEffect, useCallback } from 'react';
import { storage } from '@/lib/storage';
import { CoreAttributeConfig } from '@/lib/types';

export function useCoreAttributes() {
  const [attributes, setAttributes] = useState<CoreAttributeConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const coreAttrs = storage.getCoreAttributes();
    setAttributes(coreAttrs);
    setLoading(false);
  }, []);

  const updateAttribute = useCallback((id: string, updates: Partial<CoreAttributeConfig>) => {
    const updated = storage.updateCoreAttribute(id, updates);
    if (updated) {
      setAttributes(prev => prev.map(attr => attr.id === id ? updated : attr));
    }
    return updated;
  }, []);

  const resetToDefaults = useCallback(() => {
    if (confirm('Are you sure you want to reset all core attributes to default settings? This cannot be undone.')) {
      storage.setCoreAttributes([]);
      const defaults = storage.getCoreAttributes();
      setAttributes(defaults);
    }
  }, []);

  return {
    attributes,
    loading,
    updateAttribute,
    resetToDefaults,
  };
}
