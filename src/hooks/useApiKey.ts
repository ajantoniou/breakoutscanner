import { useState, useEffect } from 'react';
import { getApiKey, storeApiKey } from '@/services/api/marketData/apiKeyService';

interface ApiKeyConfig {
  key: string;
  isValid: boolean;
  isDefault: boolean;
}

export function useApiKey() {
  const [apiKeyConfig, setApiKeyConfig] = useState<ApiKeyConfig>(() => {
    const config = getApiKey();
    return {
      key: config?.key || '',
      isValid: Boolean(config?.key && config.key !== 'RbQS5oXFUydxTBiJnQVzU_67whX2Nxzm'),
      isDefault: !config?.key || config.key === 'RbQS5oXFUydxTBiJnQVzU_67whX2Nxzm'
    };
  });

  const updateApiKey = (newKey: string) => {
    storeApiKey({
      key: newKey,
      provider: 'Polygon.io',
      isPremium: Boolean(newKey && newKey !== 'RbQS5oXFUydxTBiJnQVzU_67whX2Nxzm')
    });
    setApiKeyConfig({
      key: newKey,
      isValid: Boolean(newKey && newKey !== 'RbQS5oXFUydxTBiJnQVzU_67whX2Nxzm'),
      isDefault: !newKey || newKey === 'RbQS5oXFUydxTBiJnQVzU_67whX2Nxzm'
    });
  };

  return {
    apiKeyConfig,
    updateApiKey
  };
} 