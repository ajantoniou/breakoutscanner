import { useState, useCallback } from 'react';
import { PatternData } from '@/services/types/patternTypes';
import { TimeframeStats } from '@/services/types/patternTypes';

interface ScannerState {
  patterns: PatternData[];
  loading: boolean;
  timeframe: string;
  lastUpdated: Date | null;
  timeframeStats: TimeframeStats;
  patternTypeStats: Record<string, number>;
  backtestResults: any[];
  realTimeQuotes: Record<string, any>;
  isRealTimeMode: boolean;
  autoRefreshEnabled: boolean;
  autoRefreshInterval: number;
}

export function useScannerState(initialTimeframe: string = '15min') {
  const [state, setState] = useState<ScannerState>({
    patterns: [],
    loading: false,
    timeframe: initialTimeframe,
    lastUpdated: null,
    timeframeStats: {
      timeframe: initialTimeframe,
      totalPatterns: 0,
      activePatterns: 0,
      completedPatterns: 0,
      failedPatterns: 0,
      successRate: 0,
      avgBreakoutTime: 0,
      avgProfit: 0,
      successfulPatterns: 0,
      accuracyRate: 0,
      avgDaysToBreakout: 0
    },
    patternTypeStats: {},
    backtestResults: [],
    realTimeQuotes: {},
    isRealTimeMode: false,
    autoRefreshEnabled: false,
    autoRefreshInterval: 300000 // 5 minutes
  });

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
  }, []);

  const setPatterns = useCallback((patterns: PatternData[]) => {
    setState(prev => ({ ...prev, patterns }));
  }, []);

  const setTimeframe = useCallback((timeframe: string) => {
    setState(prev => ({ ...prev, timeframe }));
  }, []);

  const setLastUpdated = useCallback((lastUpdated: Date | null) => {
    setState(prev => ({ ...prev, lastUpdated }));
  }, []);

  const setTimeframeStats = useCallback((timeframeStats: TimeframeStats) => {
    setState(prev => ({ ...prev, timeframeStats }));
  }, []);

  const setPatternTypeStats = useCallback((patternTypeStats: Record<string, number>) => {
    setState(prev => ({ ...prev, patternTypeStats }));
  }, []);

  const setBacktestResults = useCallback((backtestResults: any[]) => {
    setState(prev => ({ ...prev, backtestResults }));
  }, []);

  const setRealTimeQuotes = useCallback((realTimeQuotes: Record<string, any>) => {
    setState(prev => ({ ...prev, realTimeQuotes }));
  }, []);

  const setIsRealTimeMode = useCallback((isRealTimeMode: boolean) => {
    setState(prev => ({ ...prev, isRealTimeMode }));
  }, []);

  const setAutoRefreshEnabled = useCallback((autoRefreshEnabled: boolean) => {
    setState(prev => ({ ...prev, autoRefreshEnabled }));
  }, []);

  const setAutoRefreshInterval = useCallback((autoRefreshInterval: number) => {
    setState(prev => ({ ...prev, autoRefreshInterval }));
  }, []);

  return {
    ...state,
    setLoading,
    setPatterns,
    setTimeframe,
    setLastUpdated,
    setTimeframeStats,
    setPatternTypeStats,
    setBacktestResults,
    setRealTimeQuotes,
    setIsRealTimeMode,
    setAutoRefreshEnabled,
    setAutoRefreshInterval
  };
} 