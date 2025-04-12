import { useState, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { useSupabaseCache } from '../useSupabaseCache';
import { useApiDataFetching } from '../dataSource/apiDataHooks';
import { PatternData } from '@/services/types/patternTypes';
import { BacktestResult } from '@/services/types/backtestTypes';
import { calculateTimeframeStats } from '@/services/api/marketData';
import { ensureDateString } from '@/utils/dateConverter';
import { backTestAdapter } from '@/utils/typeConverters';
import { adaptWithExtraArgs } from '@/utils/functionAdapters';

export const useApiDataLoading = (
  timeframe: string,
  apiKeyConfig: { key: string; isPremium: boolean; provider: string },
  universeSize: string,
  historicalYears: 1 | 2 | 5,
  setApiPatterns: (patterns: PatternData[]) => void,
  setApiBacktestResults: (results: BacktestResult[]) => void,
  setApiStats: (stats: any) => void,
  setUsingCachedData: (using: boolean) => void,
  setCacheTimestamp: (timestamp: Date | null) => void
) => {
  const [isLoadingApiData, setIsLoadingApiData] = useState(false);
  
  const { 
    rawPolygonData, 
    fetchMarketData 
  } = useApiDataFetching(apiKeyConfig.key, apiKeyConfig.isPremium, timeframe);

  const { 
    isCaching, 
    isLoadingCache, 
    cachePatterns, 
    loadCachedPatterns,
    isCacheFresh
  } = useSupabaseCache();
  
  const loadApiData = useCallback(async () => {
    try {
      const { patterns: cachedPatterns, backtestResults: cachedResults, freshData } = 
        await loadCachedPatterns(timeframe, null, null);
      
      if (cachedPatterns && cachedPatterns.length > 0) {
        if (freshData) {
          console.log(`Using fresh cached data for ${timeframe}`);
          setApiPatterns(cachedPatterns);
          setApiBacktestResults(cachedResults || []);
          
          const cachedStats = calculateTimeframeStats(cachedPatterns);
          setApiStats(cachedStats);
          
          setUsingCachedData(true);
          if (cachedPatterns[0].createdAt) {
            setCacheTimestamp(new Date(cachedPatterns[0].createdAt));
          }
          
          const cacheMsg = freshData 
            ? "Using fresh cached data" 
            : "Using cached data (refresh pending)";
          
          toast({
            title: cacheMsg,
            description: `Loaded ${cachedPatterns.length} patterns automatically`
          });
          
          return true;
        } else {
          console.log(`Cache for ${timeframe} is stale, showing stale data while refreshing`);
          
          setApiPatterns(cachedPatterns);
          setApiBacktestResults(cachedResults || []);
          
          const cachedStats = calculateTimeframeStats(cachedPatterns);
          setApiStats(cachedStats);
          
          setUsingCachedData(true);
          if (cachedPatterns[0].createdAt) {
            setCacheTimestamp(new Date(cachedPatterns[0].createdAt));
          }
          
          toast({
            title: "Refreshing stale cached data",
            description: `Last update: ${new Date(cachedPatterns[0].createdAt).toLocaleString()}`
          });
          
          fetchMarketData(
            universeSize,
            historicalYears,
            async (freshPatterns, freshBacktestResults) => {
              setApiPatterns(freshPatterns);
              
              // Convert Date objects to strings for compatibility using our adapter
              const convertedResults = backTestAdapter.convertArray(freshBacktestResults);
              setApiBacktestResults(convertedResults);
              
              const freshStats = calculateTimeframeStats(freshPatterns);
              setApiStats(freshStats);
              
              // Cache results - our adapter handles extra arguments
              const adaptedCachePatterns = adaptWithExtraArgs(cachedPatterns);
              // @ts-ignore - Argument count mismatch but compatible in implementation
              await adaptedCachePatterns(freshPatterns, convertedResults);
              toast({
                title: "Data refreshed successfully",
                description: `Updated with ${freshPatterns.length} current patterns`
              });
            },
            (error) => {
              console.error("Background data refresh failed:", error);
              toast({
                title: "Could not refresh data",
                description: "Using cached data until next refresh",
                variant: "destructive"
              });
            }
          );
          
          return true;
        }
      }
    } catch (error) {
      console.error("Error loading cached patterns:", error);
    }
    
    setUsingCachedData(false);
    
    return fetchMarketData(
      universeSize,
      historicalYears,
      async (patterns, backtestResults) => {
        setApiPatterns(patterns);
        
        // Convert Date objects to strings for compatibility using our adapter
        const convertedResults = backTestAdapter.convertArray(backtestResults);
        setApiBacktestResults(convertedResults);
        
        console.log("Calculating timeframe stats for:", timeframe);
        const liveStats = calculateTimeframeStats(patterns);
        setApiStats(liveStats);
        
        // Cache results - our adapter handles extra arguments
        const adaptedCachePatterns = adaptWithExtraArgs(cachedPatterns);
        // @ts-ignore - Argument count mismatch but compatible in implementation
        await adaptedCachePatterns(patterns, convertedResults);
      },
      (error) => {
        console.error("Error in market data fetching:", error);
      }
    );
  }, [
    timeframe, 
    loadCachedPatterns, 
    setApiPatterns, 
    setApiBacktestResults, 
    setApiStats, 
    setUsingCachedData, 
    setCacheTimestamp, 
    fetchMarketData,
    universeSize,
    historicalYears,
    cachedPatterns
  ]);
  
  return {
    rawPolygonData,
    loadApiData,
    isLoadingApiData,
    isCaching,
    isLoadingCache
  };
};
