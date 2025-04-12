
import React from "react";
import { RefreshCw } from "lucide-react";
import CombinedStrategyView from "../CombinedStrategyView";
import { TradingStrategy, StrategyBacktestResult } from "@/services/backtesting/strategyTypes";

interface StrategyContentProps {
  isLoading: boolean;
  strategy: TradingStrategy;
  currentStrategyResult: StrategyBacktestResult | null;
  tradeResults: any[];
  strategyResults: any;
}

const StrategyContent: React.FC<StrategyContentProps> = ({
  isLoading,
  strategy,
  currentStrategyResult,
  tradeResults,
  strategyResults
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6 min-h-[300px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p>Loading strategy data...</p>
        </div>
      </div>
    );
  }
  
  // Create a complete strategy result with default values for missing properties
  const completeResult: StrategyBacktestResult = currentStrategyResult ? {
    ...currentStrategyResult,
    expectancy: currentStrategyResult.expectancy || 0,
    averageLoss: currentStrategyResult.averageLoss || 0,
    winningTrades: currentStrategyResult.winningTrades || currentStrategyResult.successfulTrades || 0,
    losingTrades: currentStrategyResult.losingTrades || currentStrategyResult.failedTrades || 0,
    riskRewardRatio: currentStrategyResult.riskRewardRatio || 0,
    successfulTrades: currentStrategyResult.successfulTrades || 0,
    failedTrades: currentStrategyResult.failedTrades || 0,
    startingCapital: currentStrategyResult.startingCapital || 10000,
    endingCapital: currentStrategyResult.endingCapital || 10000,
    netProfit: currentStrategyResult.netProfit || 0,
    netProfitPercent: currentStrategyResult.netProfitPercent || 0,
    // Required fields from StrategyBacktestResult
    initialCapital: currentStrategyResult.initialCapital || currentStrategyResult.startingCapital || 10000,
    finalCapital: currentStrategyResult.finalCapital || currentStrategyResult.endingCapital || 10000,
    averageGain: currentStrategyResult.averageGain || currentStrategyResult.averageWin || 0,
    trades: currentStrategyResult.tradeResults || [],
    tradeResults: currentStrategyResult.tradeResults || [],
    // Required fields that may be missing
    timeframe: currentStrategyResult.timeframe || "daily",
    strategyId: currentStrategyResult.strategyId || strategy.id,
    strategyName: currentStrategyResult.strategyName || strategy.name,
    startDate: currentStrategyResult.startDate || new Date().toISOString(),
    endDate: currentStrategyResult.endDate || new Date().toISOString(),
    totalTrades: currentStrategyResult.totalTrades || 0,
    winRate: currentStrategyResult.winRate || 0,
    profitFactor: currentStrategyResult.profitFactor || 0,
    sharpeRatio: currentStrategyResult.sharpeRatio || 0,
    maxDrawdown: currentStrategyResult.maxDrawdown || 0,
    totalReturn: currentStrategyResult.totalReturn || 0,
    annualizedReturn: currentStrategyResult.annualizedReturn || 0,
    averageWin: currentStrategyResult.averageWin || 0
  } as StrategyBacktestResult : null;
  
  return (
    <CombinedStrategyView 
      strategy={strategy}
      backtestResult={completeResult}
      tradeResults={tradeResults}
      isLoading={isLoading}
      timeframeResults={strategyResults}
    />
  );
};

export default StrategyContent;
