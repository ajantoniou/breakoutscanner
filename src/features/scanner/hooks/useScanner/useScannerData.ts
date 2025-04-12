
import { useCallback, useMemo } from "react";
import { toast } from "@/hooks/use-toast";
import { PatternData } from '@/services/types/patternTypes';
import { useApiDataSource } from "../scannerHooks/useApiDataSource";
import { useSupabaseDataSource } from "../scannerHooks/useSupabaseDataSource";
import { useScannerCore } from "./useScannerCore";

export type DataSourceType = "api" | "supabase";

export const useScannerData = () => {
  const {
    timeframe,
    setLoading,
    setPatterns,
    setBacktestResults,
    setStats,
    setLastUpdated,
    dedupPatterns,
    getTimeframeStats,
    applyFilters,
    getSortedPatternsWithStatus,
    patterns,
    patternTypeFilter,
    channelTypeFilter,
    emaFilter
  } = useScannerCore();
  
  // Data sources
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
  
  // Apply filters to get filtered patterns
  const filteredPatterns = useMemo(() => {
    return applyFilters(
      patterns || [],
      timeframe || 'daily',
      patternTypeFilter || 'all',
      channelTypeFilter || 'all',
      emaFilter || 'all'
    );
  }, [patterns, timeframe, patternTypeFilter, channelTypeFilter, emaFilter, applyFilters]);

  // Sort patterns by confidence score and ensure status
  const sortedPatterns = useMemo(() => {
    return getSortedPatternsWithStatus(filteredPatterns || []);
  }, [filteredPatterns, getSortedPatternsWithStatus]);

  // Sync new patterns and backtest results to Supabase
  const syncToSupabase = useCallback(async () => {
    if (apiPatterns.length > 0 && apiBacktestResults.length > 0) {
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
  }, [apiPatterns, apiBacktestResults, loadSupabaseData, supabasePatterns, savePatternWithBacktest, setLoading]);
  
  return {
    // Data sources
    apiPatterns,
    apiBacktestResults,
    apiStats,
    apiKeyConfig,
    isCheckingKey,
    supabasePatterns,
    supabaseBacktestResults,
    
    // Data loading
    loadApiData,
    loadSupabaseData,
    
    // Filtered and sorted data
    filteredPatterns: sortedPatterns,
    
    // API settings
    rawPolygonData,
    analyzeFullUniverse,
    toggleAnalysisMode,
    universeSize,
    changeUniverseSize,
    historicalYears,
    changeHistoricalYears,
    
    // Actions
    updateApiKey,
    syncToSupabase,
    
    // State
    usingCachedData,
    savedFilterPresets,
    activePresetId,
    saveFilterPreset,
    loadFilterPresets,
    setActivePreset,
    deleteFilterPreset
  };
};
