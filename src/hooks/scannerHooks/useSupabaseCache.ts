
import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { PatternData } from '@/services/types/patternTypes';
import { BacktestResult } from '@/services/types/backtestTypes';
import { ensureDateString } from '@/utils/dateConverter';

// Return type for loadCachedPatterns function
interface CacheResult {
  patterns: PatternData[];
  backtestResults: BacktestResult[];
  freshData: boolean;
}

export const useSupabaseCache = () => {
  const [isCaching, setIsCaching] = useState(false);
  const [isLoadingCache, setIsLoadingCache] = useState(false);

  // Store patterns in cache
  const cachePatterns = useCallback(async (
    patterns: PatternData[],
    timeframe: string,
    backtestResults?: BacktestResult[]
  ): Promise<boolean> => {
    setIsCaching(true);
    try {
      // Mock implementation that would normally store in Supabase
      console.log(`Caching ${patterns.length} patterns for ${timeframe}`);
      localStorage.setItem(`pattern_cache_${timeframe}`, JSON.stringify(
        patterns.map(p => ({...p, createdAt: ensureDateString(p.createdAt)}))
      ));
      
      if (backtestResults && backtestResults.length > 0) {
        console.log(`Caching ${backtestResults.length} backtest results for ${timeframe}`);
        localStorage.setItem(`backtest_cache_${timeframe}`, JSON.stringify(backtestResults));
      }
      
      // Store cache timestamp
      localStorage.setItem(`pattern_cache_timestamp_${timeframe}`, new Date().toISOString());
      
      setIsCaching(false);
      return true;
    } catch (error) {
      console.error("Error caching patterns:", error);
      setIsCaching(false);
      return false;
    }
  }, []);

  // Load patterns from cache
  const loadCachedPatterns = useCallback(async (timeframe: string): Promise<CacheResult> => {
    setIsLoadingCache(true);
    try {
      // Get cached data
      const cachedPatternsJson = localStorage.getItem(`pattern_cache_${timeframe}`);
      const cachedBacktestJson = localStorage.getItem(`backtest_cache_${timeframe}`);
      const cacheTimestamp = localStorage.getItem(`pattern_cache_timestamp_${timeframe}`);
      
      if (cachedPatternsJson) {
        const cachedPatterns = JSON.parse(cachedPatternsJson) as PatternData[];
        const cachedBacktestResults = cachedBacktestJson ? 
          JSON.parse(cachedBacktestJson) as BacktestResult[] : [];
        
        // Check if cache is fresh (less than 12 hours old)
        const isFresh = cacheTimestamp && 
          (new Date().getTime() - new Date(cacheTimestamp).getTime() < 12 * 60 * 60 * 1000);
        
        setIsLoadingCache(false);
        return {
          patterns: cachedPatterns,
          backtestResults: cachedBacktestResults,
          freshData: isFresh
        };
      }
      
      setIsLoadingCache(false);
      return {
        patterns: [],
        backtestResults: [],
        freshData: false
      };
    } catch (error) {
      console.error("Error loading cached patterns:", error);
      setIsLoadingCache(false);
      return {
        patterns: [],
        backtestResults: [],
        freshData: false
      };
    }
  }, []);
  
  // Check if cache is fresh
  const isCacheFresh = useCallback((timeframe: string): boolean => {
    const cacheTimestamp = localStorage.getItem(`pattern_cache_timestamp_${timeframe}`);
    if (!cacheTimestamp) return false;
    
    // Cache is considered fresh if less than 12 hours old
    return new Date().getTime() - new Date(cacheTimestamp).getTime() < 12 * 60 * 60 * 1000;
  }, []);

  return {
    isCaching,
    isLoadingCache,
    cachePatterns,
    loadCachedPatterns,
    isCacheFresh
  };
};
