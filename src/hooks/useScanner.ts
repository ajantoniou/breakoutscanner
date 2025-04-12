import { useState, useCallback, useMemo } from "react";
import { toast } from "@/hooks/use-toast";
import { PatternData, TimeframeStats } from "@/services/types/patternTypes";
import { BacktestResult } from '@/services/backtesting/backtestTypes';
import { useApiDataSource } from "./scannerHooks/useApiDataSource";
import { useSupabaseDataSource } from "./scannerHooks/useSupabaseDataSource";
import { useScannerPatterns } from "./scannerHooks/useScannerPatterns";
import { useScannerState } from "./scannerHooks/useScannerState";
import { useScannerRefresh } from "./scannerHooks/useScannerRefresh";
import { useRealTimeUpdates } from "./scannerHooks/useRealTimeUpdates";
import { useRealTimeData } from "./scannerHooks/useRealTimeData";
import { useScannerInitialization } from "./scannerHooks/useScannerInitialization";

export type DataSourceType = "api" | "supabase";

export const useScanner = () => {
  // Use more focused hooks
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

  // Make sure loadApiData returns Promise<void>
  const {
    apiPatterns, 
    apiBacktestResults, 
    apiStats,
    apiKeyConfig,
    isCheckingKey,
    loadApiData,
    updateApiKey,
    rawPolygonData,
    analyzeFullUniverse,
    toggleAnalysisMode,
    universeSize,
    changeUniverseSize,
    historicalYears,
    changeHistoricalYears,
    usingCachedData,
    savedFilterPresets,
    activePresetId,
    saveFilterPreset,
    loadFilterPresets,
    setActivePreset,
    deleteFilterPreset
  } = useApiDataSource(timeframe);
  
  const { 
    supabasePatterns, 
    supabaseBacktestResults, 
    loadSupabaseData,
    savePatternWithBacktest
  } = useSupabaseDataSource();
  
  // Add real-time data hook
  const {
    realTimeData,
    isConnected: isRealTimeConnected,
    marketOpen,
    lastUpdated: realTimeLastUpdated,
    refreshQuotes
  } = useRealTimeData(
    apiKeyConfig.key,
    patterns.filter(p => p.status === 'active'),
    true // Enable real-time data by default
  );
  
  // Use the refresh hook
  const {
    handleRefresh,
    forceApiDataRefresh
  } = useScannerRefresh(
    timeframe,
    dataSource,
    dedupPatterns,
    loadApiData,
    loadSupabaseData,
    markTimeframeAsLoaded,
    isTimeframeLoaded,
    getTimeframeStats,
    setPatterns,
    setBacktestResults,
    setStats,
    setLastUpdated,
    setLoading,
    apiPatterns,
    apiBacktestResults,
    apiStats,
    supabasePatterns,
    supabaseBacktestResults
  );

  // Use the real-time updates hook
  const {
    toggleUniverseMode
  } = useRealTimeUpdates(
    toggleAnalysisMode,
    changeUniverseSize,
    changeHistoricalYears
  );

  // Use scanner initialization hook
  useScannerInitialization(
    timeframe,
    apiPatterns,
    apiBacktestResults,
    apiStats,
    dedupPatterns,
    isTimeframeLoaded,
    loadApiData,
    markTimeframeAsLoaded,
    setLoading,
    setLastUpdated,
    setPatterns,
    setBacktestResults,
    setStats,
    forceApiDataRefresh,
    loadFilterPresets,
    handleRefresh
  );

  // Apply filters to get filtered patterns
  const filteredPatterns = applyFilters(
    patterns,
    timeframe,
    patternTypeFilter,
    channelTypeFilter,
    emaFilter
  );

  // Sort patterns by confidence score and ensure status
  const sortedPatterns = getSortedPatternsWithStatus(filteredPatterns);

  // Generate summary from backtests
  const backtestSummary = getBacktestSummary(backtestResults, timeframe);
  
  // Sync new patterns and backtest results to Supabase
  const syncToSupabase = useCallback(async () => {
    if (dataSource === 'api' && apiPatterns.length > 0 && apiBacktestResults.length > 0) {
      setLoading(true);
      
      try {
        // Get existing patterns from Supabase to avoid duplicates
        await loadSupabaseData();
        
        // Create a set of existing pattern symbols and timeframes
        const existingKeys = new Set(
          supabasePatterns.map(p => `${p.symbol}-${p.timeframe}-${p.patternType}`)
        );
        
        // Find new patterns to sync
        const newPatterns = apiPatterns.filter(p => 
          !existingKeys.has(`${p.symbol}-${p.timeframe}-${p.patternType}`)
        );
        
        if (newPatterns.length === 0) {
          toast({
            title: "No new patterns to sync",
            description: "All patterns are already in Supabase"
          });
          return;
        }
        
        // For each new pattern, find its backtest result and save both
        let syncCount = 0;
        for (const pattern of newPatterns) {
          const backtestResult = apiBacktestResults.find(r => r.patternId === pattern.id);
          
          if (backtestResult) {
            await savePatternWithBacktest(pattern, backtestResult);
            syncCount++;
          }
        }
        
        toast({
          title: `Synced ${syncCount} patterns to Supabase`,
          description: `Successfully saved ${syncCount} patterns and their backtest results to the database`
        });
      } catch (error) {
        console.error("Error syncing to Supabase:", error);
        toast({
          title: "Error syncing to Supabase",
          description: "An error occurred while syncing patterns to Supabase",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }
  }, [apiPatterns, apiBacktestResults, dataSource, loadSupabaseData, supabasePatterns, savePatternWithBacktest, setLoading]);
  
  // Update sortedPatterns with real-time data
  const patternsWithLiveData = useMemo(() => {
    if (!realTimeData || Object.keys(realTimeData).length === 0) {
      return sortedPatterns;
    }
    
    return sortedPatterns.map(pattern => {
      const liveQuote = realTimeData[pattern.symbol];
      
      if (!liveQuote) {
        return pattern;
      }
      
      const priceChange = liveQuote.price - pattern.entryPrice;
      const priceChangePercent = (priceChange / pattern.entryPrice) * 100;
      
      return {
        ...pattern,
        currentPrice: liveQuote.price,
        priceChange,
        priceChangePercent,
        lastUpdated: liveQuote.timestamp
      };
    });
  }, [sortedPatterns, realTimeData]);

  // Expose a function to specifically trigger a full backtest
  const handleRunFullBacktest = useCallback(() => {
    console.log("Triggering full backtest...");
    // Call loadApiData with forceRefresh=true and runFullBacktest=true
    // Using existing symbols, forcing refresh, and running backtest
    loadApiData(undefined, true, true);
  }, [loadApiData]);

  return {
    timeframe,
    patterns: patternsWithLiveData, 
    filteredPatterns: patternsWithLiveData,
    stats,
    loading,
    patternTypeFilter,
    channelTypeFilter,
    emaFilter,
    lastUpdated,
    dataSource,
    backtestResults,
    backtestSummary,
    activeTab,
    apiKeyConfig,
    isCheckingKey,
    isRateLimited: false, 
    rawPolygonData,
    analyzeFullUniverse,
    universeSize,
    historicalYears,
    // Real-time data
    realTimeData,
    isRealTimeConnected,
    marketOpen,
    refreshQuotes,
    // Core functions
    handleTimeframeChange,
    handleRefresh,
    handleRunFullBacktest, // Expose the new handler
    setPatternTypeFilter,
    setChannelTypeFilter,
    setEmaFilter,
    setActiveTab,
    forceApiDataRefresh,
    updateApiKey,
    toggleUniverseMode,
    changeUniverseSize,
    changeHistoricalYears,
    syncToSupabase,
    // State
    usingCachedData,
    savedFilterPresets,
    activePresetId,
    saveFilterPreset,
    setActivePreset,
    deleteFilterPreset
  };
};
