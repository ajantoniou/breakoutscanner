
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PatternData, TimeframeStats } from '@/services/types/patternTypes';
import { BacktestResult } from '@/services/types/backtestTypes';
import { calculateTimeframeStats } from '@/services/api/marketData';
import { dedupPatterns } from "@/utils/patternUtils";
import { backTestAdapter, patternAdapter } from "@/utils/typeConverters";

export const useApiDataFetch = (
  apiPatterns: PatternData[],
  apiBacktestResults: any[],
  apiStats: TimeframeStats,
  timeframe: string,
  cachePatterns: (patterns: PatternData[], timeframe: string) => Promise<boolean>
) => {
  const [patterns, setPatterns] = useState<PatternData[]>([]);
  const [backtestResults, setBacktestResults] = useState<BacktestResult[]>([]);
  const [stats, setStats] = useState<TimeframeStats>({
    timeframe: 'all',
    accuracyRate: 0,
    avgDaysToBreakout: 0,
    successRate: 0,
    totalPatterns: 0,
    avgProfit: 0
  });
  
  const [usingCachedData, setUsingCachedData] = useState(false);
  const [cacheTimestamp, setCacheTimestamp] = useState<Date | null>(null);

  // Update patterns when API data changes
  useEffect(() => {
    if (apiPatterns.length > 0) {
      // Ensure all patterns have a status property and deduplicate
      const enhancedPatterns = dedupPatterns(apiPatterns.map(p => ({
        ...p,
        status: p.status || 'active'
      })));
      
      setPatterns(enhancedPatterns);
      // Convert Date objects to strings for compatibility
      setBacktestResults(backTestAdapter.convertArray(apiBacktestResults));
      setStats(apiStats);
      
      // Check if we're using cached data
      if (apiPatterns[0]?.createdAt) {
        setCacheTimestamp(new Date(apiPatterns[0].createdAt));
        setUsingCachedData(true);
      }
    }
  }, [apiPatterns, apiBacktestResults, apiStats]);

  // Process market data response
  const processMarketData = async (
    freshPatterns: PatternData[], 
    freshBacktestResults: any[]
  ) => {
    // Deduplicate patterns
    const deduped = dedupPatterns(freshPatterns.map(p => ({
      ...p,
      status: p.status || 'active'
    })));
    
    setPatterns(deduped);
    // Convert Date objects to strings for compatibility
    const stringDateResults = backTestAdapter.convertArray(freshBacktestResults);
    setBacktestResults(stringDateResults);
    
    // Calculate stats and ensure it has the required avgProfit field
    const freshStats = {
      ...calculateTimeframeStats(freshPatterns, stringDateResults, timeframe),
      avgProfit: stringDateResults.length > 0 
        ? stringDateResults.reduce((acc, result) => acc + result.profitLossPercent, 0) / stringDateResults.length 
        : 0
    };
    
    setStats(freshStats);
    
    // Cache the patterns with the timeframe parameter
    await cachePatterns(freshPatterns, timeframe);
    
    toast.success("Data refreshed successfully", {
      description: `Updated with ${deduped.length} current patterns`
    });
    
    return true;
  };

  return {
    patterns,
    backtestResults,
    stats,
    usingCachedData,
    cacheTimestamp,
    processMarketData
  };
};
