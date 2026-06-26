import { useState, useEffect } from 'react';

export function useLogo() {
  const [logo, setLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLogo = async () => {
      try {
        const response = await fetch('/api/logo');
        const result = await response.json();
        if (result.success && result.data) {
          setLogo(result.data);
        }
      } catch (error) {
        console.error('Error loading logo:', error);
      } finally {
        setLoading(false);
      }
    };
    loadLogo();
  }, []);

  const uploadLogo = (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('File must be an image'));
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        reject(new Error('Image must be less than 2MB'));
        return;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        try {
          const response = await fetch('/api/logo', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ logo: dataUrl }),
          });

          const result = await response.json();
          if (result.success) {
            setLogo(dataUrl);
            resolve();
          } else {
            reject(new Error(result.error || 'Failed to upload logo'));
          }
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeLogo = async () => {
    try {
      const response = await fetch('/api/logo', {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        setLogo(null);
      }
    } catch (error) {
      console.error('Error removing logo:', error);
    }
  };

  return {
    logo,
    loading,
    uploadLogo,
    removeLogo,
  };
}
