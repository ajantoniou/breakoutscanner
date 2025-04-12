
import { useState } from 'react';
import { PatternData } from '@/services/types/patternTypes';
import { TradingStrategy, StrategyBacktestResult, TradeResult } from '@/services/backtesting/strategyTypes';
import { getHistoricalPrices } from '@/services/backtesting/priceService';
import { executeStrategy } from '@/services/backtesting/strategyExecutor';
import { calculateStrategyMetrics } from '@/services/backtesting/strategyMetrics';
import { getAllStrategies } from '@/services/backtesting/strategiesService';

export const useStrategyBacktest = (patterns: PatternData[], initialStrategyId: string = 'default') => {
  const [tradeResults, setTradeResults] = useState<TradeResult[]>([]);
  const [strategyResults, setStrategyResults] = useState<StrategyBacktestResult[]>([]);
  const [currentStrategyResult, setCurrentStrategyResult] = useState<StrategyBacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [monitoringAlerts, setMonitoringAlerts] = useState<{symbol: string, reason: string, timestamp: Date}[]>([]);
  
  // Run a backtest with the selected strategy
  const runStrategyBacktest = async () => {
    setLoading(true);
    setTradeResults([]);
    setCurrentStrategyResult(null);
    
    try {
      const strategies = getAllStrategies();
      const strategy = strategies.find(s => s.id === initialStrategyId);
      
      if (!strategy) {
        console.error(`Strategy with ID ${initialStrategyId} not found`);
        setLoading(false);
        return;
      }
      
      // Execute the strategy on each pattern
      const allTradeResults: TradeResult[] = [];
      
      for (const pattern of patterns) {
        try {
          // Get historical prices for this pattern
          const prices = await getHistoricalPrices(pattern);
          
          // Execute strategy on this pattern
          const result = executeStrategy(strategy, pattern, prices);
          
          if (result) {
            allTradeResults.push(result);
          }
        } catch (error) {
          console.error(`Error backtesting pattern ${pattern.symbol}:`, error);
        }
      }
      
      // Calculate strategy metrics - use the first pattern's timeframe if available
      const defaultTimeframe = patterns.length > 0 ? patterns[0].timeframe : 'daily';
      
      const strategyResult = calculateStrategyMetrics(
        strategy.id,
        strategy.name,
        allTradeResults,
        defaultTimeframe
      );
      
      setTradeResults(allTradeResults);
      setCurrentStrategyResult(strategyResult);
      
      // Return the newly computed results
      return {
        trades: allTradeResults,
        result: strategyResult
      };
    } catch (error) {
      console.error('Error running strategy backtest:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Monitor active positions for exit signals
  const monitorActivePositions = async () => {
    try {
      if (tradeResults.length === 0) {
        return [];
      }
      
      // Check for exit conditions on active trades
      const alerts: {symbol: string, reason: string, timestamp: Date}[] = [];
      
      // In a real app, this would check real-time data
      // For demo, we'll simulate finding exit signals
      
      // Return any alerts found
      return alerts;
    } catch (error) {
      console.error('Error monitoring positions:', error);
      return [];
    }
  };
  
  return {
    tradeResults,
    strategyResults,
    currentStrategyResult,
    loading,
    runStrategyBacktest,
    monitorActivePositions
  };
};
