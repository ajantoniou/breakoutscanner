import { useState, useCallback } from "react";
import { fetchPolygonData } from "@/services/api/marketData/polygon";
import { HistoricalPrice } from "@/services/backtesting/backtestTypes";
import { PatternData } from "@/services/types/patternTypes";
import { transformPolygonData } from "@/services/api/marketData/polygon/dataTransformer";
import { patternAdapter } from '@/utils/typeConverters';

export const useApiDataFetching = (apiKey: string, isPremium: boolean, timeframe: string) => {
  const [rawPolygonData, setRawPolygonData] = useState<HistoricalPrice[]>([]);
  
  const fetchMarketData = useCallback(
    async (universeSize: string, historicalYears: 1 | 2 | 5, 
           onSuccess: (patterns: PatternData[], backtestResults: any[]) => void, 
           onError: (error: string) => void) => {
      try {
        const polygonData = await fetchPolygonData(
          apiKey,
          universeSize,
          timeframe,
          historicalYears,
          isPremium
        );
        
        setRawPolygonData(polygonData);
        
        const transformedData = transformPolygonData(polygonData, timeframe);
        
        // Adapt each pattern using the adapter
        const adaptedPatterns = transformedData.patterns.map(patternAdapter);
        
        onSuccess(adaptedPatterns, transformedData.backtestResults);
      } catch (error: any) {
        console.error("Error fetching or transforming data:", error);
        onError(error.message || "Failed to fetch market data");
      }
    },
    [apiKey, isPremium, timeframe]
  );
  
  return { rawPolygonData, fetchMarketData };
};
