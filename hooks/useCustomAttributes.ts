'use client';

import { useState, useEffect, useCallback } from 'react';
import { CustomAttribute } from '@/lib/types';

export function useCustomAttributes() {
  const [attributes, setAttributes] = useState<CustomAttribute[]>([]);
  const [loading, setLoading] = useState(true);

  // Load attributes from API
  useEffect(() => {
    const loadAttributes = async () => {
      try {
        const response = await fetch('/api/custom-attributes');
        const result = await response.json();
        if (result.success) {
          setAttributes(result.data || []);
        }
      } catch (error) {
        console.error('Error loading custom attributes:', error);
      } finally {
        setLoading(false);
      }
    };
    loadAttributes();
  }, []);

  // Create new attribute
  const createAttribute = useCallback(async (attributeData: Omit<CustomAttribute, 'id'>) => {
    try {
      const response = await fetch('/api/custom-attributes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attributeData),
      });

      const result = await response.json();
      if (result.success && result.data) {
        setAttributes(prev => [...prev, result.data]);
        return result.data;
      }
      return null;
    } catch (error) {
      console.error('Error creating custom attribute:', error);
      return null;
    }
  }, []);

  // Update attribute
  const updateAttribute = useCallback(async (id: string, updates: Partial<CustomAttribute>) => {
    try {
      const response = await fetch(`/api/custom-attributes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const result = await response.json();
      if (result.success && result.data) {
        setAttributes(prev => prev.map(attr => attr.id === id ? result.data : attr));
        return result.data;
      }
      return null;
    } catch (error) {
      console.error('Error updating custom attribute:', error);
      return null;
    }
  }, []);

  // Delete attribute
  const deleteAttribute = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/custom-attributes/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        setAttributes(prev => prev.filter(attr => attr.id !== id));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting custom attribute:', error);
      return false;
    }
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
