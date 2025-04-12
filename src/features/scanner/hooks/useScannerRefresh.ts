import { useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { PatternData } from "@/services/types/patternTypes";
import { BacktestResult } from '@/services/types/backtestTypes';

export const useScannerRefresh = (
  timeframe: string,
  dataSource: "api" | "supabase",
  dedupPatterns: (patterns: PatternData[]) => PatternData[],
  loadApiData: (symbols?: string[], forceRefresh?: boolean, runFullBacktest?: boolean) => Promise<void>,
  loadSupabaseData: () => Promise<void>,
  markTimeframeAsLoaded: (tf: string) => void,
  isTimeframeLoaded: (tf: string) => boolean,
  getTimeframeStats: (tf: string) => any,
  setPatterns: (patterns: PatternData[]) => void,
  setBacktestResults: (results: BacktestResult[]) => void,
  setStats: (stats: any) => void,
  setLastUpdated: (date: Date) => void,
  setLoading: (loading: boolean) => void,
  apiPatterns: PatternData[],
  apiBacktestResults: BacktestResult[],
  apiStats: any,
  supabasePatterns: PatternData[],
  supabaseBacktestResults: BacktestResult[]
) => {
  // Handle force refresh of API data
  const forceApiDataRefresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    
    try {
      await loadApiData(undefined, true, false);
      
      markTimeframeAsLoaded(timeframe);
      
      const accuracy = apiBacktestResults.length > 0
        ? (apiBacktestResults.filter(r => r.successful).length / apiBacktestResults.length * 100).toFixed(1)
        : "N/A";
      
      toast({
        title: `Market data refreshed with ${accuracy}% accuracy`,
        description: `Found ${apiPatterns.length} patterns`
      });
    } catch (error) {
      console.error("Error forcing API data refresh:", error);
      toast({
        title: "Error loading market data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [
    apiBacktestResults,
    apiPatterns,
    loadApiData,
    markTimeframeAsLoaded,
    setLoading,
    timeframe
  ]);
  
  // Handle refresh (normal refresh, possibly from cache)
  const handleRefresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    
    try {
      switch (dataSource) {
        case "api":
          await loadApiData(undefined, false, false);
          console.log(`Refreshed API data for timeframe: ${timeframe}`);
          break;
          
        case "supabase":
          await loadSupabaseData();
          
          const enhancedSupabasePatterns = dedupPatterns(supabasePatterns.map(p => ({
            ...p,
            status: p.status || 'active'
          })));
          setPatterns(enhancedSupabasePatterns);
          setBacktestResults(supabaseBacktestResults);
          setStats(getTimeframeStats(timeframe));
          markTimeframeAsLoaded(`${timeframe}-supabase`);
          console.log(`Refreshed Supabase data for timeframe: ${timeframe}`);
          break;
      }
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error refreshing data:", error);
      
      toast({
        title: "Error loading data",
        description: "There was an error fetching data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [
    dataSource,
    loadApiData,
    loadSupabaseData,
    markTimeframeAsLoaded,
    setLoading,
    timeframe,
    dedupPatterns,
    supabasePatterns,
    setPatterns,
    supabaseBacktestResults,
    setBacktestResults,
    getTimeframeStats,
    setStats,
    setLastUpdated
  ]);

  return {
    handleRefresh,
    forceApiDataRefresh
  };
};
