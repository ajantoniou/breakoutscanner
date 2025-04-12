import { BacktestResult as TypesBacktestResult } from '@/services/types/backtestTypes';
import { BacktestResult as BacktestingBacktestResult } from '@/services/backtesting/backtestTypes';
import { PatternPerformance } from '@/services/types/patternTypes';
import { ensureDateString } from '@/utils/dateConverter';
import { adaptBacktestResult } from '@/utils/backtestAdapter';

/**
 * Adapts backtest results between different module types
 */
export function adaptBacktestResults(results: any[]): TypesBacktestResult[] {
  return results.map(result => adaptBacktestResult(result));
}

/**
 * Creates a pattern performance record for ui compatibility
 */
export function createPatternPerformanceRecord(performance: PatternPerformance[]): Record<string, PatternPerformance> {
  const record: Record<string, PatternPerformance> = {};
  
  performance.forEach(item => {
    record[item.patternType] = item;
  });
  
  return record;
}

/**
 * Generates performance insights from pattern performance data
 */
export function getPerformanceInsights(performanceRecord: Record<string, PatternPerformance>): string[] {
  const insights: string[] = [];
  
  // Get array of performance objects
  const performances = Object.values(performanceRecord);
  
  if (performances.length === 0) {
    return [
      'No performance data available',
      'Run backtests to generate insights'
    ];
  }
  
  // Sort by success rate
  const sorted = [...performances].sort((a, b) => 
    (b.successRate || b.winRate || 0) - (a.successRate || a.winRate || 0)
  );
  
  // Best pattern
  if (sorted.length > 0) {
    const best = sorted[0];
    insights.push(
      `${best.patternType} has the highest success rate at ${(best.successRate || best.winRate || 0).toFixed(1)}%`
    );
  }
  
  // Worst pattern
  if (sorted.length > 1) {
    const worst = sorted[sorted.length - 1];
    insights.push(
      `${worst.patternType} has the lowest success rate at ${(worst.successRate || worst.winRate || 0).toFixed(1)}%`
    );
  }
  
  // Average holding period
  const avgHoldingPeriod = performances.reduce(
    (sum, p) => sum + (p.averageHoldingPeriod || 0), 
    0
  ) / performances.length;
  
  if (avgHoldingPeriod > 0) {
    insights.push(
      `Average holding period across patterns is ${avgHoldingPeriod.toFixed(1)} days`
    );
  }
  
  // Add a general insight
  insights.push(
    'Focus on patterns with higher success rates and adjust position sizing accordingly'
  );
  
  return insights;
}

/**
 * Converts a backtesting module backtest result to a types module result
 */
export function convertBacktestResult(
  result: BacktestingBacktestResult | TypesBacktestResult
): TypesBacktestResult {
  return adaptBacktestResult(result);
}

/**
 * Updates useScanner hook to handle TimeframeStats properly
 */
export function ensureTimeframeStatsHasAvgProfit(stats: any): any {
  if (!stats) return null;
  
  return {
    ...stats,
    avgProfit: stats.avgProfit ?? 0 // Default to 0 if missing
  };
}
