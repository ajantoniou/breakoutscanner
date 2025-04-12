
import { BacktestResult as TypesBacktestResult } from '@/services/types/backtestTypes';
import { BacktestResult as BacktestingBacktestResult } from '@/services/backtesting/backtestTypes';
import { PatternData } from '@/services/types/patternTypes';
import { ensureDateString } from '@/utils/dateConverter';

/**
 * Adapts raw backtest results to match the BacktestResult interface with string dates
 */
export const adaptResultsArray = (
  backtestResults: any[],
  patterns: PatternData[]
): TypesBacktestResult[] => {
  // Create a map for faster pattern lookups
  const patternMap = new Map<string, PatternData>();
  patterns.forEach(pattern => {
    patternMap.set(pattern.id, pattern);
  });
  
  return backtestResults
    .filter(result => result && result.patternId)
    .map(result => {
      const pattern = patternMap.get(result.patternId);
      
      return {
        patternId: result.patternId,
        symbol: result.symbol || (pattern ? pattern.symbol : ''),
        timeframe: result.timeframe || (pattern ? pattern.timeframe : ''),
        patternType: result.patternType || (pattern ? pattern.patternType : ''),
        entryPrice: result.entryPrice || 0,
        targetPrice: result.targetPrice || 0,
        stopLoss: result.stopLoss,
        actualExitPrice: result.actualExitPrice || 0,
        predictedDirection: result.predictedDirection || 'bullish',
        actualDirection: result.actualDirection || 'bullish',
        entryDate: ensureDateString(result.entryDate),
        exitDate: ensureDateString(result.exitDate),
        candlesToBreakout: result.candlesToBreakout || 0,
        successful: result.successful || false,
        profitLoss: result.profitLoss || 0,
        profitLossPercent: result.profitLossPercent || 0,
        isSimulated: result.isSimulated || false,
        maxDrawdown: result.maxDrawdown || 0,
        rsiAtEntry: result.rsiAtEntry,
        atrAtEntry: result.atrAtEntry,
        macdAtEntry: result.macdAtEntry,
        macdSignalAtEntry: result.macdSignalAtEntry,
        macdHistogramAtEntry: result.macdHistogramAtEntry,
        confidenceScore: result.confidenceScore || 0,
        riskRewardRatio: result.riskRewardRatio || 0
      };
    });
};

/**
 * Convert BacktestResult from one type to another, ensuring dates are strings
 */
export const convertBacktestResultToTypes = (
  result: BacktestingBacktestResult
): TypesBacktestResult => {
  return {
    patternId: result.patternId,
    symbol: result.symbol,
    timeframe: result.timeframe,
    patternType: result.patternType,
    entryPrice: result.entryPrice,
    targetPrice: result.targetPrice,
    stopLoss: result.stopLoss,
    actualExitPrice: result.actualExitPrice,
    predictedDirection: result.predictedDirection,
    actualDirection: result.actualDirection,
    entryDate: ensureDateString(result.entryDate),
    exitDate: ensureDateString(result.exitDate),
    candlesToBreakout: result.candlesToBreakout,
    successful: result.successful,
    profitLoss: result.profitLoss,
    profitLossPercent: result.profitLossPercent,
    isSimulated: result.isSimulated || false,
    maxDrawdown: result.maxDrawdown || 0,
    rsiAtEntry: result.rsiAtEntry,
    atrAtEntry: result.atrAtEntry,
    macdAtEntry: result.macdAtEntry,
    macdSignalAtEntry: result.macdSignalAtEntry,
    macdHistogramAtEntry: result.macdHistogramAtEntry,
    confidenceScore: result.confidenceScore || 0,
    riskRewardRatio: result.riskRewardRatio || 0
  };
};

/**
 * Convert an array of BacktestResult objects to TypesBacktestResult
 */
export const convertBacktestResultArrayToTypes = (
  results: BacktestingBacktestResult[]
): TypesBacktestResult[] => {
  return results.map(convertBacktestResultToTypes);
};
