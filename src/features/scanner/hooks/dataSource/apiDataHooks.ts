
import { useState, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { 
  fetchPatternData,
  calculateTimeframeStats
} from '@/services/api/marketData';
import { 
  backtestPatterns
} from '@/services/backtesting/backtestService';
import { STOCK_UNIVERSES } from '@/services/api/marketData/stockUniverses';
import { fetchRawPolygonData, enhancePatternsWithChannelInfo } from '../apiData/apiDataUtils';
import { PatternData } from '@/services/types/patternTypes';
import { BacktestResult } from '@/services/backtesting/backtestTypes';
import { BacktestResult as TypesBacktestResult } from '@/services/types/backtestTypes';
import { PolygonApiClient } from '@/services/api/marketData/polygon/polygonApiClient';
import { ScannerFilterPreset } from './apiStateHooks';
import { backTestAdapter } from '@/utils/typeConverters';
import { adaptFunctionToAcceptExtraParams } from '@/utils/typeSafetyHelpers';

/**
 * Hook to handle raw data fetching and pattern detection
 */
export const useApiDataFetching = (
  apiKey: string,
  isPremium: boolean,
  timeframe: string
) => {
  const [rawPolygonData, setRawPolygonData] = useState<Record<string, any>>({});
  const [isRealTime, setIsRealTime] = useState(false);
  const [lastError, setLastError] = useState<Error | null>(null);

  const getStockUniverseForAnalysis = useCallback((universeSize: string) => {
    if (STOCK_UNIVERSES[universeSize as keyof typeof STOCK_UNIVERSES]) {
      return STOCK_UNIVERSES[universeSize as keyof typeof STOCK_UNIVERSES];
    }
    
    return STOCK_UNIVERSES.top100;
  }, []);

  const fetchMarketData = useCallback(async (
    universeSize: string,
    historicalYears: 1 | 2 | 5,
    onSuccess: (patterns: PatternData[], backtestResults: any[]) => void,
    onError: (error: Error) => void
  ) => {
    const stockUniverse = getStockUniverseForAnalysis(universeSize);
    const symbolCount = stockUniverse.length;
    
    const timeFrameMapping: Record<string, string> = {
      '1h': 'hour',
      '4h': 'hour',
      '1d': 'day',
      '1w': 'week',
      'all': 'day'
    };
    
    const mappedTimeframe = timeFrameMapping[timeframe] || 'day';
    
    toast({
      title: "Fetching market data",
      description: `Analyzing patterns across ${symbolCount} stocks with ${historicalYears}-year history`
    });
    
    try {
      console.log(`Fetching pattern data for ${symbolCount} symbols with timeframe ${mappedTimeframe}`);
      
      // Validate API key first
      const client = new PolygonApiClient(apiKey);
      const keyStatus = await client.checkApiKey().catch(() => ({ isValid: false, isPremium: false }));
      
      if (!keyStatus.isValid) {
        const keyError = new Error("Invalid API key. Please check your Polygon.io API key and try again.");
        console.error(keyError);
        onError(keyError);
        return false;
      }
      
      // Use a smaller subset for non-premium to avoid rate limits
      const adjustedUniverse = isPremium ? stockUniverse : stockUniverse.slice(0, 20);
      if (!isPremium && stockUniverse.length > 20) {
        console.warn("Using reduced universe size due to non-premium API key");
        toast({
          title: "Using reduced universe size",
          description: "Limited to 20 symbols with free API key to avoid rate limits"
        });
      }
      
      const polygonData = await client.fetchBatchStockData(
        adjustedUniverse, 
        mappedTimeframe,
        historicalYears === 1 ? 365 : historicalYears === 2 ? 730 : 1825 // Convert years to days
      );
      
      setRawPolygonData(polygonData);
      
      console.log(`Raw Polygon data fetched: ${Object.keys(polygonData).length} symbols loaded`);
      
      // Check if we actually received data
      if (Object.keys(polygonData).length === 0) {
        throw new Error("No data received from API. Check your internet connection and API key.");
      }
      
      const livePatterns = await fetchPatternData(
        adjustedUniverse, 
        mappedTimeframe, 
        apiKey,
        isPremium
      );
      
      const sortedPatterns = [...livePatterns].sort((a, b) => 
        (b.confidenceScore || 0) - (a.confidenceScore || 0)
      );
      
      const highConfidencePatterns = sortedPatterns.filter(pattern => 
        (pattern.confidenceScore || 0) >= 55 && pattern.entryPrice > 5
      );
      
      if (highConfidencePatterns.length > 0) {
        console.log(`Successfully found ${sortedPatterns.length} patterns, keeping ${highConfidencePatterns.length} high confidence patterns with price > $5`);
        
        const enhancedPatterns = await enhancePatternsWithChannelInfo(highConfidencePatterns);
        
        console.log(`Running backtests on patterns with ${historicalYears}-year historical data`);
        
        // Run backtests and convert to the appropriate format
        const backtestResults = await backtestPatterns(
          enhancedPatterns, 
          true,
          apiKey,
          isPremium
        );
        
        // Convert types if needed - use the adapter
        const adaptedResults = backTestAdapter.convertArray(backtestResults);
        
        onSuccess(enhancedPatterns, adaptedResults);
        setLastError(null);
        
        toast({
          title: "Market data analysis complete",
          description: `Found ${enhancedPatterns.length} high confidence patterns from ${symbolCount} stocks`
        });
        
        return true;
      } else {
        console.warn(`Found ${sortedPatterns.length} patterns but none with high confidence or price > $5`);
        
        // If we have some patterns but none meet our criteria, return those anyway
        if (sortedPatterns.length > 0) {
          const enhancedPatterns = await enhancePatternsWithChannelInfo(sortedPatterns);
          const backtestResults = await backtestPatterns(
            enhancedPatterns, 
            true,
            apiKey,
            isPremium
          );
          
          // Convert types if needed - use the adapter
          const adaptedResults = backTestAdapter.convertArray(backtestResults);
          
          onSuccess(enhancedPatterns, adaptedResults);
          setLastError(null);
          
          toast({
            title: "Found lower confidence patterns",
            description: `Returning ${enhancedPatterns.length} patterns that don't meet high confidence criteria`
          });
          
          return true;
        }
        
        toast({
          title: "No high confidence patterns found",
          description: "Try different symbols or timeframes",
          variant: "destructive"
        });
        
        const noPatternError = new Error("No high confidence patterns found");
        setLastError(noPatternError);
        onError(noPatternError);
        return false;
      }
    } catch (error) {
      console.error("Error in loadApiData:", error);
      
      let errorMessage = "Could not fetch market data. Check connection and try again.";
      
      if (error instanceof Error) {
        if (error.message.includes("rate limit")) {
          errorMessage = "API rate limit exceeded. Please try again later or use a premium API key.";
        } else if (error.message.includes("API key")) {
          errorMessage = "Invalid API key. Please check your Polygon.io API key.";
        }
        setLastError(error);
      }
      
      toast({
        title: "API data loading failed",
        description: errorMessage,
        variant: "destructive"
      });
      
      onError(error as Error);
      return false;
    }
  }, [timeframe, getStockUniverseForAnalysis, apiKey, isPremium]);

  // Fix the enhancePatternsWithChannelInfo function issue
  const enhancePatternsWithChannelInfoWrapper = (patterns: PatternData[]) => {
    return enhancePatternsWithChannelInfo(patterns);
  };
  
  const toggleRealTimeMode = useCallback(() => {
    const newMode = !isRealTime;
    setIsRealTime(newMode);
    
    if (newMode) {
      toast({
        title: "Real-time data enabled",
        description: "Scanner will update with live market data"
      });
    } else {
      toast({
        title: "Real-time data disabled",
        description: "Scanner will use cached data when available"
      });
    }
    
    return newMode;
  }, [isRealTime]);
  
  const getRealTimeQuote = useCallback(async (symbol: string) => {
    if (!isRealTime) return null;
    
    try {
      // Create a new client instance properly
      const client = new PolygonApiClient(apiKey);
      return await client.getRealTimeQuote(symbol);
    } catch (error) {
      console.error(`Error getting real-time quote for ${symbol}:`, error);
      return null;
    }
  }, [isRealTime, apiKey]);

  return {
    rawPolygonData,
    fetchMarketData,
    isRealTime,
    toggleRealTimeMode,
    getRealTimeQuote,
    lastError
  };
};
