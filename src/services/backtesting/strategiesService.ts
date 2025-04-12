import { TradingStrategy } from "../types/tradingTypes";
import { predefinedStrategies } from './predefinedStrategies';
import { BacktestResult } from "../types/backtestTypes";

// Use predefinedStrategies directly instead of individual imports
// Export strategies from the predefined list
export const getAllStrategies = (): TradingStrategy[] => {
  return predefinedStrategies;
};

export const getStrategyById = (id: string): TradingStrategy | undefined => {
  return predefinedStrategies.find(strategy => strategy.id === id);
};

/**
 * Calculates a combined confidence score based on multiple factors
 * @param strategyConfidence The base confidence from the strategy
 * @param patternConfidence The confidence score from the pattern
 * @param backtestResults Previous backtest results to factor in
 * @returns A combined confidence score between 0-100
 */
export const calculateCombinedConfidence = (
  strategyConfidence: number,
  patternConfidence: number,
  backtestResults: BacktestResult[] = []
): number => {
  // Start with weighted average of strategy and pattern confidence
  let combinedConfidence = (strategyConfidence * 0.4) + (patternConfidence * 0.6);
  
  // If we have backtest results, factor those in
  if (backtestResults.length > 0) {
    const successRate = backtestResults.filter(r => r.successful).length / backtestResults.length;
    const backtestConfidence = successRate * 100;
    
    // Adjust the combined confidence based on backtest results (30% weight)
    combinedConfidence = (combinedConfidence * 0.7) + (backtestConfidence * 0.3);
  }
  
  // Ensure confidence is within valid range
  return Math.max(0, Math.min(100, combinedConfidence));
};

// Adds additional properties to strategies for compatibility
export const adaptStrategy = (strategy: TradingStrategy): TradingStrategy => {
  return {
    ...strategy,
    entryRules: strategy.entryRules || [],
    exitRules: strategy.exitRules || [],
    version: strategy.version || "1.0"
  };
};
