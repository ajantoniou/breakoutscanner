
import { BacktestResult as TypesBacktestResult } from '@/services/types/backtestTypes';
import { BacktestResult as BacktestingBacktestResult } from '@/services/backtesting/backtestTypes';
import { ensureDateString } from './dateConverter';

/**
 * Adapts a BacktestResult between different module types
 */
export function adaptBacktestResult(
  result: any
): TypesBacktestResult {
  if (!result) return {} as TypesBacktestResult;
  
  const converted = {...result} as TypesBacktestResult;
  
  // Ensure dates are strings for the returned type
  if (result.entryDate) {
    converted.entryDate = ensureDateString(result.entryDate);
  }
  
  if (result.exitDate) {
    converted.exitDate = ensureDateString(result.exitDate);
  }
  
  // Add any missing properties with defaults
  if (!('maxDrawdown' in converted)) {
    converted.maxDrawdown = 0;
  }
  
  // Ensure we have all required properties for TypesBacktestResult
  converted.patternId = converted.patternId || '';
  converted.symbol = converted.symbol || '';
  converted.timeframe = converted.timeframe || '';
  converted.patternType = converted.patternType || '';
  converted.entryPrice = converted.entryPrice || 0;
  converted.targetPrice = converted.targetPrice || 0;
  converted.predictedDirection = converted.predictedDirection || 'bullish';
  converted.actualDirection = converted.actualDirection === '' ? 'bullish' : (converted.actualDirection || 'bullish');
  converted.candlesToBreakout = converted.candlesToBreakout || 0;
  converted.successful = converted.successful || false;
  converted.profitLoss = converted.profitLoss || 0;
  converted.profitLossPercent = converted.profitLossPercent || 0;
  converted.maxDrawdown = converted.maxDrawdown || 0;
  
  return converted;
}

/**
 * Convert backtest result array - providing alias for compatibility
 */
export function adaptBacktestResults(results: any[]): TypesBacktestResult[] {
  if (!results || !Array.isArray(results)) return [];
  return results.map(adaptBacktestResult);
}

// Add this alias for backwards compatibility
export const adaptBacktestResultsArray = adaptBacktestResults;
