/**
 * Performance Optimization Module
 * Implements optimizations for the breakout scanner
 */

import { PatternData } from '@/services/types/patternTypes';
import { BreakoutData } from '@/services/api/marketData/patternDetection/breakoutDetector';
import { BacktestResult } from '@/services/backtesting/backtestingFramework';

/**
 * Optimize confidence scoring based on backtest results
 * @param patterns Patterns to optimize
 * @param backtestResults Backtest results
 * @returns Optimized patterns
 */
export const optimizeConfidenceScoring = (
  patterns: (PatternData | BreakoutData)[],
  backtestResults: BacktestResult[]
): (PatternData | BreakoutData)[] => {
  // Create a map of backtest results by signal ID
  const backtestMap = new Map<string, BacktestResult>();
  backtestResults.forEach(result => {
    backtestMap.set(result.signalId, result);
  });
  
  // Optimize confidence scores based on backtest results
  return patterns.map(pattern => {
    const backtestResult = backtestMap.get(pattern.id);
    
    if (!backtestResult) {
      return pattern;
    }
    
    // Adjust confidence score based on backtest result
    let adjustedConfidence = pattern.confidenceScore;
    
    // Increase confidence for successful trades
    if (backtestResult.successful) {
      adjustedConfidence += 5;
      
      // Additional boost for high profit trades
      if (backtestResult.profitLossPercent > 10) {
        adjustedConfidence += 5;
      }
      
      // Additional boost for quick trades
      if (backtestResult.daysToExit < 5) {
        adjustedConfidence += 3;
      }
    } else {
      // Decrease confidence for unsuccessful trades
      adjustedConfidence -= 5;
      
      // Additional penalty for high loss trades
      if (backtestResult.profitLossPercent < -10) {
        adjustedConfidence -= 5;
      }
    }
    
    // Ensure confidence is within bounds
    adjustedConfidence = Math.max(0, Math.min(100, adjustedConfidence));
    
    return {
      ...pattern,
      confidenceScore: adjustedConfidence
    };
  });
};

/**
 * Optimize pattern detection parameters
 * @param backtestResults Backtest results
 * @returns Optimized parameters
 */
export const optimizePatternParameters = (
  backtestResults: BacktestResult[]
): Record<string, any> => {
  // Group backtest results by pattern type
  const patternGroups = new Map<string, BacktestResult[]>();
  
  backtestResults.forEach(result => {
    const group = patternGroups.get(result.signalType) || [];
    group.push(result);
    patternGroups.set(result.signalType, group);
  });
  
  // Calculate win rate for each pattern type
  const patternWinRates = new Map<string, number>();
  
  patternGroups.forEach((results, patternType) => {
    const winCount = results.filter(r => r.successful).length;
    const winRate = winCount / results.length;
    patternWinRates.set(patternType, winRate);
  });
  
  // Optimize parameters based on win rates
  const optimizedParameters: Record<string, any> = {};
  
  patternWinRates.forEach((winRate, patternType) => {
    if (patternType.includes('Bull Flag')) {
      optimizedParameters.bullFlagMinPoleHeight = winRate > 0.6 ? 10 : 15;
      optimizedParameters.bullFlagMaxConsolidationPercent = winRate > 0.7 ? 50 : 40;
    } else if (patternType.includes('Bear Flag')) {
      optimizedParameters.bearFlagMinPoleHeight = winRate > 0.6 ? 10 : 15;
      optimizedParameters.bearFlagMaxConsolidationPercent = winRate > 0.7 ? 50 : 40;
    } else if (patternType.includes('Ascending Triangle')) {
      optimizedParameters.triangleMinDuration = winRate > 0.6 ? 7 : 10;
      optimizedParameters.triangleMaxDeviation = winRate > 0.7 ? 3 : 2;
    } else if (patternType.includes('Descending Triangle')) {
      optimizedParameters.triangleMinDuration = winRate > 0.6 ? 7 : 10;
      optimizedParameters.triangleMaxDeviation = winRate > 0.7 ? 3 : 2;
    } else if (patternType.includes('Channel Breakout')) {
      optimizedParameters.channelMinDuration = winRate > 0.6 ? 10 : 15;
      optimizedParameters.breakoutConfirmationCandles = winRate > 0.7 ? 1 : 2;
    }
  });
  
  return optimizedParameters;
};

/**
 * Optimize entry and exit parameters
 * @param backtestResults Backtest results
 * @returns Optimized parameters
 */
export const optimizeEntryExitParameters = (
  backtestResults: BacktestResult[]
): Record<string, any> => {
  // Calculate average profit/loss for different risk/reward ratios
  const riskRewardGroups = new Map<number, BacktestResult[]>();
  
  backtestResults.forEach(result => {
    const rr = Math.round(result.riskRewardRatio * 10) / 10; // Round to 1 decimal place
    const group = riskRewardGroups.get(rr) || [];
    group.push(result);
    riskRewardGroups.set(rr, group);
  });
  
  // Find optimal risk/reward ratio
  let optimalRR = 2.0; // Default
  let bestAvgPL = -Infinity;
  
  riskRewardGroups.forEach((results, rr) => {
    const avgPL = results.reduce((sum, r) => sum + r.profitLossPercent, 0) / results.length;
    if (avgPL > bestAvgPL) {
      bestAvgPL = avgPL;
      optimalRR = rr;
    }
  });
  
  // Calculate optimal stop loss percentage
  const successfulTrades = backtestResults.filter(r => r.successful);
  const avgMaxDrawdown = successfulTrades.reduce((sum, r) => sum + r.maxDrawdownPercent, 0) / 
    (successfulTrades.length || 1);
  
  // Calculate optimal holding period
  const profitableTrades = backtestResults.filter(r => r.profitLossPercent > 0);
  const avgHoldingPeriod = profitableTrades.reduce((sum, r) => sum + r.daysToExit, 0) / 
    (profitableTrades.length || 1);
  
  return {
    optimalRiskRewardRatio: optimalRR,
    stopLossBuffer: Math.max(1, Math.ceil(avgMaxDrawdown * 1.5)), // Add buffer to average max drawdown
    targetTakeProfitMultiplier: optimalRR,
    maxHoldingPeriod: Math.ceil(avgHoldingPeriod * 1.5), // Add buffer to average holding period
  };
};

/**
 * Optimize scanner parameters
 * @param patterns Patterns to analyze
 * @param backtestResults Backtest results
 * @returns Optimized parameters
 */
export const optimizeScannerParameters = (
  patterns: (PatternData | BreakoutData)[],
  backtestResults: BacktestResult[]
): Record<string, any> => {
  // Group patterns by timeframe
  const timeframeGroups = new Map<string, (PatternData | BreakoutData)[]>();
  
  patterns.forEach(pattern => {
    const group = timeframeGroups.get(pattern.timeframe) || [];
    group.push(pattern);
    timeframeGroups.set(pattern.timeframe, group);
  });
  
  // Calculate success rate for each timeframe
  const timeframeSuccessRates = new Map<string, number>();
  
  timeframeGroups.forEach((patterns, timeframe) => {
    const patternIds = patterns.map(p => p.id);
    const relevantResults = backtestResults.filter(r => patternIds.includes(r.signalId));
    
    if (relevantResults.length === 0) {
      timeframeSuccessRates.set(timeframe, 0);
      return;
    }
    
    const successCount = relevantResults.filter(r => r.successful).length;
    const successRate = successCount / relevantResults.length;
    timeframeSuccessRates.set(timeframe, successRate);
  });
  
  // Find optimal timeframes
  const sortedTimeframes = Array.from(timeframeSuccessRates.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([timeframe]) => timeframe);
  
  // Determine optimal scanner modes
  const dayTradingTimeframes = sortedTimeframes.filter(tf => 
    tf === '1m' || tf === '5m' || tf === '15m' || tf === '30m' || tf === '1h'
  ).slice(0, 3);
  
  const swingTradingTimeframes = sortedTimeframes.filter(tf => 
    tf === '1h' || tf === '4h' || tf === '1d'
  ).slice(0, 3);
  
  const goldenScannerTimeframes = sortedTimeframes.slice(0, 3);
  
  return {
    dayTradingTimeframes,
    swingTradingTimeframes,
    goldenScannerTimeframes,
    minConfidenceThreshold: 65, // Default minimum confidence threshold
    preferredPatterns: [], // No specific pattern preference by default
  };
};

/**
 * Apply optimizations to the application
 * @param patterns Patterns to optimize
 * @param backtestResults Backtest results
 * @returns Optimized parameters and patterns
 */
export const applyOptimizations = (
  patterns: (PatternData | BreakoutData)[],
  backtestResults: BacktestResult[]
): {
  optimizedPatterns: (PatternData | BreakoutData)[],
  patternParameters: Record<string, any>,
  entryExitParameters: Record<string, any>,
  scannerParameters: Record<string, any>
} => {
  // Optimize confidence scoring
  const optimizedPatterns = optimizeConfidenceScoring(patterns, backtestResults);
  
  // Optimize pattern detection parameters
  const patternParameters = optimizePatternParameters(backtestResults);
  
  // Optimize entry and exit parameters
  const entryExitParameters = optimizeEntryExitParameters(backtestResults);
  
  // Optimize scanner parameters
  const scannerParameters = optimizeScannerParameters(patterns, backtestResults);
  
  return {
    optimizedPatterns,
    patternParameters,
    entryExitParameters,
    scannerParameters
  };
};

export default {
  optimizeConfidenceScoring,
  optimizePatternParameters,
  optimizeEntryExitParameters,
  optimizeScannerParameters,
  applyOptimizations
};
