import { useState, useCallback, useMemo } from "react";
import { PatternData } from "@/services/types/patternTypes";
import { useFilterPatterns } from "./useFilterPatterns";
import { generateBacktestSummary } from "@/services/backtesting/backtestSummary";
import { BacktestResult, BacktestSummary } from '@/services/backtesting/backtestTypes';
import { dedupPatterns } from "@/utils/patternUtils";

export const useScannerPatterns = () => {
  const [patterns, setPatterns] = useState<PatternData[]>([]);
  const [backtestResults, setBacktestResults] = useState<BacktestResult[]>([]);
  const [patternTypeFilter, setPatternTypeFilter] = useState("all");
  const [channelTypeFilter, setChannelTypeFilter] = useState("all");
  const [emaFilter, setEmaFilter] = useState("all");
  
  // Generate backtests summary based on filtered results and timeframe
  const getBacktestSummary = useCallback((results: BacktestResult[], timeframe: string) => {
    return generateBacktestSummary(results, timeframe);
  }, []);
  
  // Get performance metrics grouped by pattern type
  const getPatternTypePerformance = useCallback((results: BacktestResult[], timeframe: string): Record<string, BacktestSummary> => {
    // Get unique pattern types from results
    const patternTypes = [...new Set(results.map(r => r.patternType))];
    
    // Create a summary for each pattern type
    const performanceByPattern: Record<string, BacktestSummary> = {};
    
    patternTypes.forEach(patternType => {
      if (patternType) {
        performanceByPattern[patternType] = generateBacktestSummary(results, timeframe, patternType);
      }
    });
    
    // Add an "all patterns" summary
    performanceByPattern["all"] = generateBacktestSummary(results, timeframe);
    
    return performanceByPattern;
  }, []);
  
  // Apply filters to patterns
  const applyFilters = useCallback((
    allPatterns: PatternData[],
    timeframe: string,
    patternFilter: string,
    channelFilter: string, 
    emaFilterValue: string
  ): PatternData[] => {
    return useFilterPatterns(
      dedupPatterns(allPatterns || []),
      timeframe,
      patternFilter,
      channelFilter,
      emaFilterValue
    );
  }, []);
  
  // Get sorted patterns with status
  const getSortedPatternsWithStatus = useCallback((filteredPatterns: PatternData[]): PatternData[] => {
    if (!filteredPatterns || !Array.isArray(filteredPatterns)) {
      console.warn("getSortedPatternsWithStatus received non-array:", filteredPatterns);
      return [];
    }
    
    // Make sure each pattern has a status property, defaulting to 'active' if not set
    const patternsWithStatus = filteredPatterns.map(pattern => ({
      ...pattern,
      status: pattern.status || 'active'
    }));

    // Sort filtered patterns by confidence score (high to low)
    return [...patternsWithStatus].sort((a, b) => 
      (b.confidenceScore || 0) - (a.confidenceScore || 0)
    );
  }, []);

  return {
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
    getPatternTypePerformance,
    applyFilters,
    getSortedPatternsWithStatus
  };
};
