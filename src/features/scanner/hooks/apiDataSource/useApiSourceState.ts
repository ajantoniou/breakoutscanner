
import { useState, useEffect } from "react";
import { PatternData, TimeframeStats } from '@/services/types/patternTypes';
import { BacktestResult } from '@/services/backtesting/backtestTypes';
import { calculateTimeframeStats } from '@/services/api/marketData';
import { useApiConfig, useUniverseSettings } from '../dataSource/apiStateHooks';

export const useApiSourceState = (timeframe: string) => {
  const [apiPatterns, setApiPatterns] = useState<PatternData[]>([]);
  const [apiBacktestResults, setApiBacktestResults] = useState<BacktestResult[]>([]);
  const [apiStats, setApiStats] = useState<TimeframeStats>({
    timeframe: 'all',
    accuracyRate: 0,
    avgDaysToBreakout: 0,
    successRate: 0,
    totalPatterns: 0,
    avgProfit: 0 // Add the missing property
  });
  
  const [usingCachedData, setUsingCachedData] = useState(false);
  const [cacheTimestamp, setCacheTimestamp] = useState<Date | null>(null);
  
  const { 
    apiKeyConfig, 
    isCheckingKey, 
    updateApiKey 
  } = useApiConfig();
  
  const {
    universeSize,
    analyzeFullUniverse,
    historicalYears,
    toggleAnalysisMode,
    changeUniverseSize,
    changeHistoricalYears,
    setAnalyzeFullUniverse,
    setUniverseSize,
    setHistoricalYears
  } = useUniverseSettings();
  
  // Clear patterns when timeframe changes
  useEffect(() => {
    console.log(`useApiSourceState: Timeframe changed to ${timeframe}, clearing current patterns`);
    setApiPatterns([]);
  }, [timeframe]);
  
  return {
    apiPatterns,
    setApiPatterns,
    apiBacktestResults,
    setApiBacktestResults,
    apiStats,
    setApiStats,
    usingCachedData,
    setUsingCachedData,
    cacheTimestamp,
    setCacheTimestamp,
    apiKeyConfig,
    isCheckingKey,
    updateApiKey,
    universeSize,
    analyzeFullUniverse,
    historicalYears,
    toggleAnalysisMode,
    changeUniverseSize,
    changeHistoricalYears,
    setAnalyzeFullUniverse,
    setUniverseSize,
    setHistoricalYears
  };
};
