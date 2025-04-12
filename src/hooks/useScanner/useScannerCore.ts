
import { useState, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { PatternData, TimeframeStats } from "@/services/types/patternTypes";
import { BacktestResult } from '@/services/backtesting/backtestTypes';
import { useScannerState } from "../scannerHooks/useScannerState";
import { useScannerPatterns } from "../scannerHooks/useScannerPatterns";

export const useScannerCore = () => {
  const {
    timeframe,
    loading,
    setLoading,
    lastUpdated,
    setLastUpdated,
    dataSource,
    activeTab,
    setActiveTab,
    loadedTimeframes,
    handleTimeframeChange,
    markTimeframeAsLoaded,
    isTimeframeLoaded,
    getTimeframeStats
  } = useScannerState();
  
  const {
    patterns,
    setPatterns,
    backtestResults,
    setBacktestResults,
    patternTypeFilter,
    setPatternTypeFilter,
    channelTypeFilter,
    setChannelTypeFilter,
    emaFilter,
    setEmaFilter,
    dedupPatterns,
    getBacktestSummary,
    applyFilters,
    getSortedPatternsWithStatus
  } = useScannerPatterns();
  
  // Track initial stats
  const [stats, setStats] = useState(getTimeframeStats(timeframe));
  
  return {
    // State
    timeframe,
    loading,
    setLoading,
    lastUpdated,
    setLastUpdated,
    dataSource,
    activeTab,
    setActiveTab,
    stats,
    setStats,
    
    // Patterns and backtest data
    patterns,
    setPatterns,
    backtestResults,
    setBacktestResults,
    
    // Filters
    patternTypeFilter,
    setPatternTypeFilter,
    channelTypeFilter,
    setChannelTypeFilter,
    emaFilter,
    setEmaFilter,
    
    // Utilities
    loadedTimeframes,
    handleTimeframeChange,
    markTimeframeAsLoaded,
    isTimeframeLoaded,
    getTimeframeStats,
    dedupPatterns,
    getBacktestSummary,
    applyFilters,
    getSortedPatternsWithStatus
  };
};
