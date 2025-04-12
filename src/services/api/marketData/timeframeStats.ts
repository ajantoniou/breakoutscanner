
import { PatternData, TimeframeStats } from '@/services/types/patternTypes';
import { BacktestResult } from '@/services/types/backtestTypes';

/**
 * Calculates statistics for a set of patterns and their backtest results for a given timeframe
 */
export const calculateTimeframeStats = (
  patterns: PatternData[],
  backtestResults: BacktestResult[],
  timeframe: string
): TimeframeStats => {
  // Filter patterns and results for the current timeframe
  const timeframePatterns = patterns.filter(p => p.timeframe === timeframe);
  const timeframeResults = backtestResults.filter(r => r.timeframe === timeframe);
  
  if (timeframePatterns.length === 0 || timeframeResults.length === 0) {
    return {
      timeframe,
      accuracyRate: 0,
      avgDaysToBreakout: 0,
      successRate: 0,
      totalPatterns: timeframePatterns.length,
      avgProfit: 0,
      successfulPatterns: 0
    };
  }

  // Calculate success rate
  const successfulResults = timeframeResults.filter(r => r.successful);
  const successRate = (successfulResults.length / timeframeResults.length) * 100;
  
  // Calculate average days to breakout
  const avgDaysToBreakout = timeframeResults.reduce((acc, r) => acc + (r.candlesToBreakout || 0), 0) / timeframeResults.length;
  
  // Calculate average profit
  const avgProfit = timeframeResults.reduce((acc, r) => acc + (r.profitLossPercent || 0), 0) / timeframeResults.length;
  
  // Calculate accuracy rate (correct direction prediction)
  const correctDirections = timeframeResults.filter(r => r.predictedDirection === r.actualDirection);
  const accuracyRate = (correctDirections.length / timeframeResults.length) * 100;
  
  return {
    timeframe,
    accuracyRate,
    avgDaysToBreakout,
    successRate,
    totalPatterns: timeframePatterns.length,
    avgProfit,
    successfulPatterns: successfulResults.length
  };
};
