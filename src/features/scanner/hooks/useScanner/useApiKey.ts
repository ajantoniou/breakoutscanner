import { useState, useCallback } from 'react';
import { DEFAULT_API_KEY } from '@/services/api/marketData/apiKeyService';

export function useApiKey() {
  const [apiKey, setApiKey] = useState<string>(DEFAULT_API_KEY);

  const updateApiKey = useCallback((newKey: string) => {
    setApiKey(newKey);
  }, []);

  return {
    apiKey,
    updateApiKey
  };
} 