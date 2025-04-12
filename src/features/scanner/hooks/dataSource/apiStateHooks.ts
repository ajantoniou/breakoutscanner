
import { useState } from 'react';
import { ApiKeyConfig } from '@/services/types/backtestTypes';
import { 
  loadApiKeyConfig, 
  updateApiKey, 
  initialApiKeyConfig 
} from '../apiData/apiKeyManager';

/**
 * Hook for managing API key configuration
 */
export const useApiConfig = () => {
  const [apiKeyConfig, setApiKeyConfig] = useState<ApiKeyConfig>(loadApiKeyConfig());
  const [isCheckingKey, setIsCheckingKey] = useState(false);
  
  const updateApiKeyHandler = (key: string, isPremium: boolean = false) => {
    const newConfig = updateApiKey(key, isPremium);
    setApiKeyConfig(newConfig);
    return newConfig;
  };
  
  return {
    apiKeyConfig,
    isCheckingKey,
    updateApiKey: updateApiKeyHandler
  };
};

/**
 * Hook for managing universe settings
 */
export const useUniverseSettings = () => {
  const [analyzeFullUniverse, setAnalyzeFullUniverse] = useState(false);
  const [universeSize, setUniverseSize] = useState<string>("top100");
  const [historicalYears, setHistoricalYears] = useState<1 | 2 | 5>(1);
  
  const toggleAnalysisMode = () => {
    setAnalyzeFullUniverse(!analyzeFullUniverse);
    return !analyzeFullUniverse;
  };
  
  const changeUniverseSize = (size: string) => {
    setUniverseSize(size);
    return size;
  };
  
  const changeHistoricalYears = (years: 1 | 2 | 5) => {
    setHistoricalYears(years);
    return years;
  };
  
  return {
    analyzeFullUniverse,
    universeSize,
    historicalYears,
    toggleAnalysisMode,
    changeUniverseSize,
    changeHistoricalYears,
    setAnalyzeFullUniverse,
    setUniverseSize,
    setHistoricalYears
  };
};

/**
 * Scanner filter preset type definition (moved from individual components)
 */
export interface ScannerFilterPreset {
  id: string;
  name: string;
  patternTypes: string[];
  channelTypes: string[];
  emaPatterns: string[];
  timeframe: string;
  createdAt: string;
  description?: string;
  minPrice?: number;
  maxPrice?: number;
  minVolume?: number;
  isDefault?: boolean;
}
