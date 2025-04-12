import { useState, useCallback } from "react";
import { PatternData } from "@/services/types/patternTypes";
import { useFilterPatterns } from "./useFilterPatterns";
import { generateBacktestSummary } from "@/services/backtesting/backtestSummary";
import { BacktestResult } from '@/services/backtesting/backtestTypes';
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
    applyFilters,
    getSortedPatternsWithStatus
  };
};
