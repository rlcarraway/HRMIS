'use client';

import { useState, useEffect, useCallback } from 'react';
import { CustomAttribute } from '@/lib/types';
import { storage } from '@/lib/storage';
import { generateId } from '@/lib/utils';

export function useCustomAttributes() {
  const [attributes, setAttributes] = useState<CustomAttribute[]>([]);
  const [loading, setLoading] = useState(true);

  // Load attributes from storage
  useEffect(() => {
    const loadAttributes = () => {
      const stored = storage.getCustomAttributes();
      setAttributes(stored);
      setLoading(false);
    };
    loadAttributes();
  }, []);

  // Create new attribute
  const createAttribute = useCallback((attributeData: Omit<CustomAttribute, 'id'>) => {
    const newAttribute: CustomAttribute = {
      ...attributeData,
      id: generateId(),
    };

    storage.addCustomAttribute(newAttribute);
    setAttributes(prev => [...prev, newAttribute]);

    return newAttribute;
  }, []);

  // Update attribute
  const updateAttribute = useCallback((id: string, updates: Partial<CustomAttribute>) => {
    const updatedAttribute = storage.updateCustomAttribute(id, updates);
    if (updatedAttribute) {
      setAttributes(prev => prev.map(attr => attr.id === id ? updatedAttribute : attr));
    }
    return updatedAttribute;
  }, []);

  // Delete attribute
  const deleteAttribute = useCallback((id: string) => {
    const success = storage.deleteCustomAttribute(id);
    if (success) {
      setAttributes(prev => prev.filter(attr => attr.id !== id));
    }
    return success;
  }, []);

  // Get single attribute
  const getAttribute = useCallback((id: string) => {
    return attributes.find(attr => attr.id === id) || null;
  }, [attributes]);

  return {
    attributes,
    customAttributes: attributes, // Alias for compatibility
    loading,
    createAttribute,
    updateAttribute,
    deleteAttribute,
    getAttribute,
  };
}
