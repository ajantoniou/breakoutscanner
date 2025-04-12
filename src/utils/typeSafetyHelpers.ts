
/**
 * Type safety helpers to fix TypeScript errors across the codebase
 */
import { PatternData } from '@/services/types/patternTypes';
import { TradeListItem } from '@/services/types/tradeTypes';
import { BacktestResult as BacktestResultWithDateString } from '@/services/types/backtestTypes';
import { BacktestResult as BacktestResultWithDateObj } from '@/services/backtesting/backtestTypes';
import { ensureDateString } from './dateConverter';

/**
 * Ensures direction is a valid bullish/bearish value for BacktestResult
 */
export function ensureBacktestDirection(direction: string | undefined): "bullish" | "bearish" {
  if (direction === "bullish" || direction === "up") return "bullish";
  if (direction === "bearish" || direction === "down") return "bearish";
  return "bullish"; // Default
}

/**
 * Converts a BacktestResult with Date objects to one with string dates
 */
export function convertBacktestResultDatesToStrings(
  result: BacktestResultWithDateObj
): BacktestResultWithDateString {
  return {
    ...result,
    entryDate: ensureDateString(result.entryDate),
    exitDate: ensureDateString(result.exitDate),
    // Add other required props that might be missing
    maxDrawdown: result.maxDrawdown ?? 0
  };
}

/**
 * Converts an array of BacktestResult with Date objects to ones with string dates
 */
export function convertBacktestResultArrayDatesToStrings(
  results: BacktestResultWithDateObj[]
): BacktestResultWithDateString[] {
  return results.map(convertBacktestResultDatesToStrings);
}

/**
 * Add missing createdAt field to TradeListItem for pattern compatibility
 */
export function adaptTradeListItemToPattern(trade: TradeListItem): PatternData {
  // Add a default value for createdAt if it's not present
  const createdAt = trade.entryDate || new Date().toISOString();
  
  return {
    ...trade as unknown as Partial<PatternData>,
    id: trade.id,
    symbol: trade.symbol,
    patternType: trade.patternType,
    timeframe: trade.timeframe,
    direction: trade.direction,
    entryPrice: trade.entryPrice,
    targetPrice: trade.targetPrice,
    status: trade.status === "cancelled" ? "failed" : trade.status as "active" | "completed" | "failed",
    createdAt: createdAt,
    updatedAt: trade.lastUpdated || createdAt,
    confidenceScore: trade.confidenceScore || 0,
    stopLoss: trade.stopLoss
  } as PatternData;
}

/**
 * Fix expected argument count in function calls
 */
export function adaptFunctionToAcceptExtraParams<T extends (...args: any[]) => any>(
  fn: T
): T {
  return ((...args: Parameters<T>) => {
    // Only pass the first argument to the function
    return fn(args[0]);
  }) as T;
}

/**
 * Safely access properties on potentially unknown objects
 */
export function safeGet<T, K extends keyof T>(obj: unknown, key: K, defaultValue: T[K]): T[K] {
  if (obj && typeof obj === 'object' && key in obj) {
    return (obj as T)[key];
  }
  return defaultValue;
}

/**
 * Fix incompatible function return types (boolean vs void)
 */
export function voidifyPromise<T extends (...args: any[]) => Promise<any>>(
  fn: T
): (...args: Parameters<T>) => Promise<void> {
  return async (...args: Parameters<T>): Promise<void> => {
    await fn(...args);
    // Return void instead of the original return value
  };
}

/**
 * Convert boolean return type to void
 */
export function voidifyFunction<T extends (...args: any[]) => boolean>(
  fn: T
): (...args: Parameters<T>) => void {
  return (...args: Parameters<T>): void => {
    fn(...args);
    // Return void instead of boolean
  };
}
