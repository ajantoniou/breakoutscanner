
import { TradeResult, StrategyBacktestResult } from './strategyTypes';

// Calculate strategy metrics from trade results
export function calculateStrategyMetrics(
  strategyId: string,
  strategyName: string,
  tradeResults: TradeResult[],
  timeframe?: string
): StrategyBacktestResult {
  if (!tradeResults || tradeResults.length === 0) {
    return createEmptyResult(strategyId, strategyName, timeframe);
  }

  // Calculate winning and losing trades
  const winningTrades = tradeResults.filter(trade => trade.profitLossPercent > 0);
  const losingTrades = tradeResults.filter(trade => trade.profitLossPercent < 0);
  const breakEvenTrades = tradeResults.filter(trade => trade.profitLossPercent === 0);
  
  // Calculate win rate
  const winRate = winningTrades.length / tradeResults.length * 100;
  
  // Calculate average profit and loss
  const totalProfit = winningTrades.reduce((sum, trade) => sum + trade.profitLossPercent, 0);
  const totalLoss = losingTrades.reduce((sum, trade) => sum + Math.abs(trade.profitLossPercent), 0);
  
  const averageProfit = winningTrades.length > 0 
    ? totalProfit / winningTrades.length 
    : 0;
  
  const averageLoss = losingTrades.length > 0 
    ? totalLoss / losingTrades.length 
    : 0;
  
  // Calculate profit factor
  const profitFactor = totalLoss > 0 
    ? totalProfit / totalLoss 
    : totalProfit > 0 ? 999 : 0;
  
  // Calculate expectancy
  const expectancy = (winRate / 100) * averageProfit - ((100 - winRate) / 100) * averageLoss;
  
  // Calculate max drawdown
  const maxDrawdown = Math.max(...tradeResults.map(trade => trade.maxDrawdown || 0));
  
  // Calculate largest win and loss
  const largestWin = Math.max(...winningTrades.map(trade => trade.profitLossPercent), 0);
  const largestLoss = Math.min(...losingTrades.map(trade => trade.profitLossPercent), 0);
  
  // Calculate average holding period
  const getBarsInTrade = (trade: TradeResult) => trade.barsInTrade || trade.durationInBars || 0;
  const totalBars = tradeResults.reduce((sum, trade) => sum + getBarsInTrade(trade), 0);
  const averageHoldingPeriod = tradeResults.length > 0 
    ? totalBars / tradeResults.length 
    : 0;
  
  // Calculate consecutive wins and losses
  const { maxConsecutiveWins, maxConsecutiveLosses } = calculateConsecutiveWinsLosses(tradeResults);
  
  // Get profitable and unprofitable tickers
  const profitableTickers = [...new Set(
    winningTrades.map(trade => trade.symbol)
  )];
  
  const unprofitableTickers = [...new Set(
    losingTrades.map(trade => trade.symbol)
  )];
  
  // Build complete result object with all needed properties
  const result: StrategyBacktestResult = {
    strategyId,
    strategyName,
    winRate: parseFloat(winRate.toFixed(2)),
    expectancy: parseFloat(expectancy.toFixed(2)),
    profitFactor: parseFloat(profitFactor.toFixed(2)),
    averageWin: parseFloat(averageProfit.toFixed(2)),
    averageGain: parseFloat(averageProfit.toFixed(2)), // Alias for averageProfit
    averageLoss: parseFloat(averageLoss.toFixed(2)),
    maxConsecutiveWins,
    maxConsecutiveLosses,
    totalTrades: tradeResults.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
    largestWin: parseFloat(largestWin.toFixed(2)),
    largestLoss: parseFloat(largestLoss.toFixed(2)),
    averageHoldingPeriod: parseFloat(averageHoldingPeriod.toFixed(1)),
    sharpeRatio: 0, // Would need price history to calculate
    
    // Additional properties needed by components
    successfulTrades: winningTrades.length,
    failedTrades: losingTrades.length,
    timeframe: timeframe || tradeResults[0]?.timeframe || '',
    
    // Store the trade results for reference
    tradeResults: tradeResults
  };
  
  return result;
}

// Create empty result for when no trades are available
function createEmptyResult(
  strategyId: string, 
  strategyName: string,
  timeframe?: string
): StrategyBacktestResult {
  return {
    strategyId,
    strategyName,
    winRate: 0,
    expectancy: 0,
    profitFactor: 0,
    averageWin: 0,
    averageLoss: 0,
    maxConsecutiveWins: 0,
    maxConsecutiveLosses: 0,
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    maxDrawdown: 0,
    largestWin: 0,
    largestLoss: 0,
    averageHoldingPeriod: 0,
    sharpeRatio: 0,
    
    // Additional properties needed by components
    successfulTrades: 0,
    failedTrades: 0,
    timeframe: timeframe || '',
    
    // Empty trade results
    tradeResults: []
  };
}

// Calculate consecutive wins and losses
function calculateConsecutiveWinsLosses(tradeResults: TradeResult[]): {
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
} {
  let currentConsecutiveWins = 0;
  let currentConsecutiveLosses = 0;
  let maxConsecutiveWins = 0;
  let maxConsecutiveLosses = 0;
  
  // Sort trades by date
  const sortedTrades = [...tradeResults].sort(
    (a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
  );
  
  for (const trade of sortedTrades) {
    if (trade.profitLossPercent > 0) {
      // Winning trade
      currentConsecutiveWins++;
      currentConsecutiveLosses = 0;
      
      if (currentConsecutiveWins > maxConsecutiveWins) {
        maxConsecutiveWins = currentConsecutiveWins;
      }
    } else if (trade.profitLossPercent < 0) {
      // Losing trade
      currentConsecutiveWins = 0;
      currentConsecutiveLosses++;
      
      if (currentConsecutiveLosses > maxConsecutiveLosses) {
        maxConsecutiveLosses = currentConsecutiveLosses;
      }
    } else {
      // Break-even trade, reset both counters
      currentConsecutiveWins = 0;
      currentConsecutiveLosses = 0;
    }
  }
  
  return { maxConsecutiveWins, maxConsecutiveLosses };
}
