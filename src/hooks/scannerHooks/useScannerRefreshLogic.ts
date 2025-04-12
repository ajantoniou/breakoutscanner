
import { useCallback } from "react";
import { PatternData, TimeframeStats } from "@/services/types/patternTypes";
import { BacktestResult } from "@/services/types/backtestTypes";
import { adaptBooleanToVoid } from "@/utils/typeAdapters";
import { convertDatesToStrings } from "@/utils/dateAdapter";

export const useScannerRefreshLogic = (
  timeframe: string,
  dataSource: "api" | "supabase",
  dedupPatterns: (patterns: PatternData[]) => PatternData[],
  loadApiData: (symbols?: string[], forceRefresh?: boolean, runFullBacktest?: boolean) => Promise<boolean>,
  loadSupabaseData: () => Promise<void>,
  markTimeframeAsLoaded: (tf: string) => void,
  isTimeframeLoaded: (tf: string) => boolean,
  getTimeframeStats: (tf: string) => TimeframeStats,
  setPatterns: (patterns: PatternData[]) => void,
  setBacktestResults: (results: BacktestResult[]) => void,
  setStats: (stats: TimeframeStats) => void,
  setLastUpdated: (date: Date) => void,
  setLoading: (loading: boolean) => void,
  apiPatterns: PatternData[],
  apiBacktestResults: BacktestResult[],
  apiStats: TimeframeStats,
  supabasePatterns: PatternData[],
  supabaseBacktestResults: BacktestResult[]
) => {
  // Wrap the loadApiData function to handle boolean return value correctly
  const adaptedLoadApiData = adaptBooleanToVoid(loadApiData);
  
  // Handler for refreshing data
  const handleRefresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    
    try {
      if (dataSource === 'api') {
        await adaptedLoadApiData(undefined, true, false);
        
        // Ensure all dates are strings before setting state
        const safePatterns = convertDatesToStrings(apiPatterns) as PatternData[];
        const safeBacktestResults = convertDatesToStrings(apiBacktestResults) as BacktestResult[];
        
        setPatterns(safePatterns);
        setBacktestResults(safeBacktestResults);
        setStats(apiStats);
      } else if (dataSource === 'supabase') {
        await loadSupabaseData();
        
        // Ensure all dates are strings before setting state
        const safePatterns = convertDatesToStrings(supabasePatterns) as PatternData[];
        const safeBacktestResults = convertDatesToStrings(supabaseBacktestResults) as BacktestResult[];
        
        setPatterns(safePatterns);
        setBacktestResults(safeBacktestResults);
        setStats(getTimeframeStats(timeframe));
      }
      
      setLastUpdated(new Date());
      markTimeframeAsLoaded(timeframe);
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setLoading(false);
    }
  }, [
    timeframe,
    dataSource,
    adaptedLoadApiData,
    loadSupabaseData,
    apiPatterns,
    apiBacktestResults,
    apiStats,
    supabasePatterns,
    supabaseBacktestResults,
    setLoading,
    setPatterns,
    setBacktestResults,
    setStats,
    setLastUpdated,
    markTimeframeAsLoaded,
    getTimeframeStats
  ]);
  
  // Function to force refresh API data
  const forceApiDataRefresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    
    try {
      await adaptedLoadApiData(undefined, true, true);
      
      // Ensure all dates are strings before setting state
      const safePatterns = convertDatesToStrings(apiPatterns) as PatternData[];
      const safeBacktestResults = convertDatesToStrings(apiBacktestResults) as BacktestResult[];
      
      setPatterns(safePatterns);
      setBacktestResults(safeBacktestResults);
      setStats(apiStats);
      setLastUpdated(new Date());
      markTimeframeAsLoaded(timeframe);
    } catch (error) {
      console.error("Error forcing API data refresh:", error);
    } finally {
      setLoading(false);
    }
  }, [
    timeframe,
    adaptedLoadApiData,
    apiPatterns,
    apiBacktestResults,
    apiStats,
    setLoading,
    setPatterns,
    setBacktestResults,
    setStats,
    setLastUpdated,
    markTimeframeAsLoaded
  ]);
  
  return {
    handleRefresh,
    forceApiDataRefresh
  };
};
