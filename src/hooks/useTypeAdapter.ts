
import { useState, useEffect } from 'react';
import { TradeListItem } from '@/services/types/tradeTypes';
import { PatternData } from '@/services/types/patternTypes';
import { BacktestResult as TypesBacktestResult } from '@/services/types/backtestTypes';
import { BacktestResult as BacktestingBacktestResult } from '@/services/backtesting/backtestTypes';
import { ensureDateString } from '@/utils/dateConverter';

/**
 * Hook to adapt trades from useTradeList to the format expected by components
 */
export const useAdaptedTrades = (originalTrades: any[]): TradeListItem[] => {
  const [adaptedTrades, setAdaptedTrades] = useState<TradeListItem[]>([]);
  
  useEffect(() => {
    // Cast with type assertion since we're ensuring the required fields are present
    const newAdaptedTrades = originalTrades.map(trade => {
      // Create a new object with the required fields
      return {
        id: trade.id,
        symbol: trade.symbol,
        patternType: trade.patternType || '',
        direction: trade.direction || 'bullish',
        entryPrice: trade.entryPrice,
        targetPrice: trade.targetPrice,
        stopLoss: trade.stopLoss,
        timeframe: trade.timeframe || 'daily',
        status: trade.status || 'active',
        confidenceScore: trade.confidenceScore || 0,
        entryDate: ensureDateString(trade.entryDate),
        exitDate: trade.exitDate ? ensureDateString(trade.exitDate) : null,
        exitPrice: trade.exitPrice || null,
        riskRewardRatio: trade.riskRewardRatio || 0,
        profitLoss: trade.profitLoss || 0,
        profitLossPercent: trade.profitLossPercent || 0,
        performance: trade.performance || {},
        exitSignal: trade.exitSignal || '',
        lastUpdated: ensureDateString(trade.lastUpdated),
        breakoutProgress: trade.breakoutProgress,
        aiSummary: trade.aiSummary || ''
      } as TradeListItem;
    });
    
    setAdaptedTrades(newAdaptedTrades);
  }, [originalTrades]);
  
  return adaptedTrades;
};

/**
 * Hook to adapt backtest results to the format expected by components
 */
export const useAdaptedBacktestResults = (
  originalResults: TypesBacktestResult[] | BacktestingBacktestResult[]
): TypesBacktestResult[] => {
  const [adaptedResults, setAdaptedResults] = useState<TypesBacktestResult[]>([]);
  
  useEffect(() => {
    const newAdaptedResults = originalResults.map(result => {
      return {
        ...result,
        entryDate: ensureDateString(result.entryDate),
        exitDate: ensureDateString(result.exitDate)
      } as unknown as TypesBacktestResult;
    });
    
    setAdaptedResults(newAdaptedResults);
  }, [originalResults]);
  
  return adaptedResults;
};

/**
 * Hook to adapt patterns to ensure date fields are strings
 */
export const useAdaptedPatterns = (originalPatterns: PatternData[]): PatternData[] => {
  const [adaptedPatterns, setAdaptedPatterns] = useState<PatternData[]>([]);
  
  useEffect(() => {
    const newAdaptedPatterns = originalPatterns.map(pattern => ({
      ...pattern,
      createdAt: ensureDateString(pattern.createdAt),
      updatedAt: pattern.updatedAt ? ensureDateString(pattern.updatedAt) : undefined,
      lastUpdated: pattern.lastUpdated ? ensureDateString(pattern.lastUpdated) : undefined
    }));
    
    setAdaptedPatterns(newAdaptedPatterns);
  }, [originalPatterns]);
  
  return adaptedPatterns;
};
