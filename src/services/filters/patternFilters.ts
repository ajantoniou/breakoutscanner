
import { PatternData, TimeframeStats } from '@/services/types/patternTypes';
import { BacktestResult } from '@/services/types/backtestTypes';

/**
 * Filter patterns by timeframe
 */
export function filterByTimeframe(patterns: PatternData[], timeframe: string): PatternData[] {
  if (!timeframe || timeframe === 'all') {
    return patterns;
  }
  
  return patterns.filter(pattern => pattern.timeframe === timeframe);
}

/**
 * Filter patterns by pattern type
 */
export function filterByPatternType(
  patterns: PatternData[], 
  patternTypes: string[]
): PatternData[] {
  if (!patternTypes || patternTypes.length === 0 || 
      (patternTypes.length === 1 && patternTypes[0] === 'all')) {
    return patterns;
  }
  
  return patterns.filter(pattern => patternTypes.includes(pattern.patternType));
}

/**
 * Filter patterns by channel type
 */
export function filterByChannelType(
  patterns: PatternData[], 
  channelTypes: string[]
): PatternData[] {
  if (!channelTypes || channelTypes.length === 0 || 
      (channelTypes.length === 1 && channelTypes[0] === 'all')) {
    return patterns;
  }
  
  return patterns.filter(pattern => 
    pattern.channelType && channelTypes.includes(pattern.channelType)
  );
}

/**
 * Filter patterns by EMA pattern
 */
export function filterByEmaPattern(
  patterns: PatternData[], 
  emaPatterns: string[]
): PatternData[] {
  if (!emaPatterns || emaPatterns.length === 0 || 
      (emaPatterns.length === 1 && emaPatterns[0] === 'all')) {
    return patterns;
  }
  
  return patterns.filter(pattern => 
    pattern.emaPattern && emaPatterns.includes(pattern.emaPattern)
  );
}

/**
 * Create timeframe stats from patterns and backtest results
 */
export function createTimeframeStats(
  patterns: PatternData[],
  backtestResults: BacktestResult[],
  timeframe: string
): TimeframeStats {
  const filteredPatterns = filterByTimeframe(patterns, timeframe);
  const filteredResults = backtestResults.filter(result => 
    result.timeframe === timeframe || timeframe === 'all'
  );
  
  const successfulResults = filteredResults.filter(result => result.successful);
  
  const stats: TimeframeStats = {
    timeframe: timeframe || 'all',
    accuracyRate: filteredResults.length > 0 
      ? (successfulResults.length / filteredResults.length) * 100 
      : 0,
    avgDaysToBreakout: filteredResults.length > 0
      ? filteredResults.reduce((sum, result) => sum + result.candlesToBreakout, 0) / filteredResults.length
      : 0,
    successRate: filteredResults.length > 0 
      ? (successfulResults.length / filteredResults.length) * 100 
      : 0,
    totalPatterns: filteredPatterns.length,
    avgProfit: successfulResults.length > 0
      ? successfulResults.reduce((sum, result) => sum + result.profitLossPercent, 0) / successfulResults.length
      : 0,
    successfulPatterns: successfulResults.length
  };
  
  return stats;
}
