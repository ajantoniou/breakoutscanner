
import { useMemo, useCallback } from "react";
import { useRealTimeData } from "../scannerHooks/useRealTimeData";
import { useRealTimeUpdates } from "../scannerHooks/useRealTimeUpdates";
import { useScannerCore } from "./useScannerCore";
import { useScannerData } from "./useScannerData";
import { ensureDateString } from "@/utils/dateConverter";
import { PatternData } from "@/services/types/patternTypes";

export const useScannerRealTime = () => {
  const {
    patterns
  } = useScannerCore();
  
  const {
    apiKeyConfig,
    toggleAnalysisMode,
    changeUniverseSize,
    changeHistoricalYears,
    filteredPatterns
  } = useScannerData();
  
  // Create a wrapped toggleAnalysisMode that returns a boolean synchronously
  const toggleUniverseMode = useCallback((): boolean => {
    try {
      toggleAnalysisMode();
      return true;
    } catch (error) {
      console.error("Error toggling analysis mode:", error);
      return false;
    }
  }, [toggleAnalysisMode]);
  
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
  
  // Update sortedPatterns with real-time data
  const patternsWithLiveData = useMemo(() => {
    if (!realTimeData || Object.keys(realTimeData).length === 0 || !filteredPatterns || !Array.isArray(filteredPatterns)) {
      console.log("Using patterns without real-time data", {
        hasRealTimeData: !!realTimeData,
        realTimeDataCount: Object.keys(realTimeData || {}).length,
        filteredPatternsType: typeof filteredPatterns,
        isArray: Array.isArray(filteredPatterns),
      });
      return Array.isArray(filteredPatterns) ? filteredPatterns : [];
    }
    
    return filteredPatterns.map((pattern: PatternData) => {
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
        lastUpdated: typeof liveQuote.timestamp === 'object' 
          ? ensureDateString(liveQuote.timestamp) 
          : liveQuote.timestamp
      };
    });
  }, [filteredPatterns, realTimeData]);
  
  return {
    realTimeData,
    isRealTimeConnected,
    marketOpen,
    realTimeLastUpdated,
    refreshQuotes,
    toggleUniverseMode,
    patternsWithLiveData
  };
};
