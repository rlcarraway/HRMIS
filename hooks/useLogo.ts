import { useState, useEffect } from 'react';
import { storage } from '@/lib/storage';

export function useLogo() {
  const [logo, setLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedLogo = storage.getLogo();
    setLogo(savedLogo);
    setLoading(false);
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
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        storage.setLogo(dataUrl);
        setLogo(dataUrl);
        resolve();
      };
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeLogo = () => {
    storage.removeLogo();
    setLogo(null);
  };

  return {
    logo,
    loading,
    uploadLogo,
    removeLogo,
  };
}
