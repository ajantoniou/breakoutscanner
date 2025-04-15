import { PatternData } from '@/services/types/patternTypes';
import { BacktestResult, BacktestAnalyticsData } from '@/services/types/backtestTypes';
import { yahooApiService } from '@/services/api/yahoo/yahooApiService';
import { ensureDateString } from '@/utils/dateUtils';
import { stockUniverses } from '@/services/api/marketData/stockUniverses';
import axios from 'axios';
import { format, addDays, subDays, differenceInDays, parseISO } from 'date-fns';

/**
 * Run backtest on patterns using real historical data from Yahoo Finance
 */
export const runYahooBacktest = async (
  patterns: PatternData[],
  historicalYears: number = 1
): Promise<BacktestResult[]> => {
  const results: BacktestResult[] = [];
  
  for (const pattern of patterns) {
    try {
      // Calculate the end date (when the pattern was detected)
      const patternDetectionDate = new Date(pattern.detectedAt);
      
      // Determine if this is a swing trading test (based on symbol and/or timeframe)
      const isSwingTest = stockUniverses.swingTradingUniverse.includes(pattern.symbol) || 
                         ['4h', '1d', '1w'].includes(pattern.timeframe);
      
      // For swing tests, limit to 6 months to speed up testing
      const yearsToFetch = isSwingTest ? 0.5 : historicalYears;
      
      // Determine appropriate Yahoo Finance interval and range
      const yahooInterval = convertTimeframeToYahooInterval(pattern.timeframe);
      const yahooRange = determineYahooRange(yearsToFetch);
      
      // Fetch historical data from Yahoo Finance
      const yahooData = await yahooApiService.getHistoricalData(
        pattern.symbol,
        yahooInterval,
        yahooRange
      );
      
      // Convert to our Candle format
      const candles = yahooApiService.convertToCandles(yahooData);
      
      if (candles.length === 0) {
        console.warn(`No historical data found for ${pattern.symbol}`);
        continue;
      }
      
      // Find entry point index (closest to pattern detection date)
      const entryPointIndex = findClosestDateIndex(
        candles,
        patternDetectionDate
      );
      
      if (entryPointIndex === -1) {
        console.warn(`Could not find entry point for ${pattern.symbol}`);
        continue;
      }
      
      // Run the actual backtest using entry price and target
      const result = performBacktest(
        pattern,
        candles,
        entryPointIndex
      );
      
      results.push(result);
    } catch (error) {
      console.error(`Error backtesting pattern for ${pattern.symbol}:`, error);
    }
  }
  
  return results;
};

/**
 * Convert our timeframe format to Yahoo Finance interval format
 */
const convertTimeframeToYahooInterval = (timeframe: string): string => {
  switch (timeframe) {
    case '1m':
      return '1m';
    case '5m':
      return '5m';
    case '15m':
      return '15m';
    case '30m':
      return '30m';
    case '1h':
      return '60m';
    case '4h':
      // Yahoo doesn't have 4h, so we'll use 1d and then aggregate in our code
      return '1d';
    case '1d':
      return '1d';
    case '1w':
      return '1wk';
    default:
      return '1d';
  }
};

/**
 * Determine appropriate Yahoo Finance range based on years to fetch
 */
const determineYahooRange = (years: number): string => {
  if (years <= 0.25) return '3mo';
  if (years <= 0.5) return '6mo';
  if (years <= 1) return '1y';
  if (years <= 2) return '2y';
  if (years <= 5) return '5y';
  return '10y';
};

/**
 * Find the index of the closest date in historical data
 */
const findClosestDateIndex = (candles: any[], targetDate: Date): number => {
  if (!candles || candles.length === 0) return -1;
  
  const targetTime = targetDate.getTime();
  
  let closestIndex = 0;
  let closestDiff = Math.abs(candles[0].timestamp - targetTime);
  
  for (let i = 1; i < candles.length; i++) {
    const currentTime = candles[i].timestamp;
    const diff = Math.abs(currentTime - targetTime);
    
    if (diff < closestDiff) {
      closestDiff = diff;
      closestIndex = i;
    }
  }
  
  return closestIndex;
};

/**
 * Perform actual backtest logic with real price data
 */
const performBacktest = (
  pattern: PatternData,
  candles: any[],
  entryPointIndex: number
): BacktestResult => {
  // Extract pattern information
  const entryPrice = pattern.entry;
  const targetPrice = pattern.target;
  const stopLoss = pattern.stopLoss;
  const direction = pattern.direction;
  
  // Setup tracking variables
  let exitIndex = -1;
  let exitPrice = entryPrice;
  let successful = false;
  let maxDrawdown = 0;
  let currentDrawdown = 0;
  let candlesToBreakout = 0;
  
  // Loop through data starting from entry point
  for (let i = entryPointIndex + 1; i < candles.length; i++) {
    const candle = candles[i];
    
    // Calculate current drawdown
    if (direction === "bullish") {
      currentDrawdown = (entryPrice - Math.min(candle.low, entryPrice)) / entryPrice * 100;
    } else {
      currentDrawdown = (Math.max(candle.high, entryPrice) - entryPrice) / entryPrice * 100;
    }
    
    // Update max drawdown
    maxDrawdown = Math.max(maxDrawdown, currentDrawdown);
    
    // Check for target hit
    if (direction === "bullish" && candle.high >= targetPrice) {
      exitIndex = i;
      exitPrice = targetPrice;
      successful = true;
      break;
    } else if (direction === "bearish" && candle.low <= targetPrice) {
      exitIndex = i;
      exitPrice = targetPrice;
      successful = true;
      break;
    }
    
    // Check for stop loss hit
    if (direction === "bullish" && candle.low <= stopLoss) {
      exitIndex = i;
      exitPrice = stopLoss;
      break;
    } else if (direction === "bearish" && candle.high >= stopLoss) {
      exitIndex = i;
      exitPrice = stopLoss;
      break;
    }
    
    // If we've gone through 30 bars and no exit, force exit at current close
    if (i - entryPointIndex >= 30) {
      exitIndex = i;
      exitPrice = candle.close;
      successful = direction === "bullish" ? 
        candle.close > entryPrice : 
        candle.close < entryPrice;
      break;
    }
  }
  
  // If we never hit target or stop, exit at the last bar
  if (exitIndex === -1 && candles.length > entryPointIndex) {
    exitIndex = candles.length - 1;
    exitPrice = candles[exitIndex].close;
    successful = direction === "bullish" ? 
      exitPrice > entryPrice : 
      exitPrice < entryPrice;
  }
  
  // Calculate profit/loss
  const profitLoss = direction === "bullish" ? 
    exitPrice - entryPrice : 
    entryPrice - exitPrice;
  
  const profitLossPercent = (profitLoss / entryPrice) * 100;
  
  // Calculate candles to breakout
  candlesToBreakout = exitIndex - entryPointIndex;
  
  const entryDate = new Date(candles[entryPointIndex].timestamp).toISOString();
  const exitDate = exitIndex !== -1 ? 
    new Date(candles[exitIndex].timestamp).toISOString() : 
    new Date().toISOString();
  
  return {
    patternId: pattern.symbol + '-' + pattern.timeframe + '-' + pattern.detectedAt,
    symbol: pattern.symbol,
    patternType: pattern.patternType,
    timeframe: pattern.timeframe,
    entryPrice: entryPrice,
    targetPrice: targetPrice,
    stopLoss: stopLoss,
    entryDate: ensureDateString(entryDate),
    exitDate: ensureDateString(exitDate),
    actualExitPrice: exitPrice,
    profitLossPercent: profitLossPercent,
    candlesToBreakout: candlesToBreakout,
    successful: successful,
    predictedDirection: direction,
    actualDirection: successful ? direction : (direction === "bullish" ? "bearish" : "bullish"),
    profitLoss: profitLoss,
    maxDrawdown: maxDrawdown,
    // Add technical indicators if available
    rsiAtEntry: candles[entryPointIndex]?.rsi14 || 0,
    atrAtEntry: candles[entryPointIndex]?.atr14 || 0,
    confidenceScore: pattern.confidenceScore || 0
  };
};

/**
 * Calculate average candles to breakout for a specific timeframe
 */
export const calculateAverageCandlesToBreakout = (
  backtestResults: BacktestResult[],
  timeframe: string
): number => {
  const relevantResults = backtestResults.filter(
    result => result.timeframe === timeframe && result.successful
  );
  
  if (relevantResults.length === 0) return 0;
  
  const sum = relevantResults.reduce(
    (total, result) => total + result.candlesToBreakout, 
    0
  );
  
  return sum / relevantResults.length;
};

/**
 * Calculate win rate for a specific timeframe
 */
export const calculateWinRate = (
  backtestResults: BacktestResult[],
  timeframe: string
): number => {
  const relevantResults = backtestResults.filter(
    result => result.timeframe === timeframe
  );
  
  if (relevantResults.length === 0) return 0;
  
  const successfulCount = relevantResults.filter(
    result => result.successful
  ).length;
  
  return (successfulCount / relevantResults.length) * 100;
};

/**
 * Calculate profit factor for a specific timeframe
 */
export const calculateProfitFactor = (
  backtestResults: BacktestResult[],
  timeframe: string
): number => {
  const relevantResults = backtestResults.filter(
    result => result.timeframe === timeframe
  );
  
  if (relevantResults.length === 0) return 0;
  
  const grossProfit = relevantResults
    .filter(result => result.profitLoss > 0)
    .reduce((total, result) => total + result.profitLoss, 0);
  
  const grossLoss = Math.abs(relevantResults
    .filter(result => result.profitLoss < 0)
    .reduce((total, result) => total + result.profitLoss, 0));
  
  if (grossLoss === 0) return grossProfit > 0 ? 999 : 0;
  
  return grossProfit / grossLoss;
};

/**
 * Backtesting API that uses Yahoo Finance data
 */
export const backtestPatternsWithYahoo = async (
  patterns: PatternData[],
  includeDetails: boolean = false,
  isPremium: boolean = false
): Promise<BacktestResult[]> => {
  return runYahooBacktest(patterns, isPremium ? 2 : 1);
};

/**
 * Get comprehensive backtest statistics
 */
export const getBacktestStatistics = (results: BacktestResult[]): BacktestAnalyticsData => {
  if (!results || results.length === 0) {
    return {
      winRate: 0,
      profitFactor: 0,
      averageRMultiple: 0,
      expectancy: 0,
      totalTrades: 0,
      totalWins: 0,
      totalLosses: 0,
      pendingTrades: 0,
      totalProfitLossPercent: 0,
      averageWinPercent: 0,
      averageLossPercent: 0,
      winLossRatio: 0,
      bestPattern: null,
      bestPatternWinRate: null,
      bestTimeframe: null,
      averageDaysHeld: null
    };
  }

  // Count wins, losses and pending
  const completedResults = results.filter(r => r.result !== 'pending');
  const wins = completedResults.filter(r => r.result === 'win');
  const losses = completedResults.filter(r => r.result === 'loss');
  const pending = results.filter(r => r.result === 'pending');
  
  // Calculate profit metrics
  const grossProfit = wins.reduce((sum, r) => sum + (r.profit_loss_percent || 0), 0);
  const grossLoss = Math.abs(losses.reduce((sum, r) => sum + (r.profit_loss_percent || 0), 0));
  
  // Calculate R multiples
  const totalRMultiple = completedResults.reduce((sum, r) => sum + (r.r_multiple || 0), 0);
  
  // Calculate days held (if exit_date is available)
  let totalDaysHeld = 0;
  let tradesWithDaysHeld = 0;
  
  completedResults.forEach(result => {
    if (result.entry_date && result.exit_date) {
      const daysHeld = differenceInDays(
        new Date(result.exit_date),
        new Date(result.entry_date)
      );
      totalDaysHeld += daysHeld;
      tradesWithDaysHeld++;
    }
  });
  
  // Group by pattern type to find best pattern
  const patternPerformance: Record<string, { wins: number, trades: number }> = {};
  const timeframePerformance: Record<string, { wins: number, trades: number }> = {};
  
  results.forEach(result => {
    // Track pattern performance
    if (!patternPerformance[result.pattern_type]) {
      patternPerformance[result.pattern_type] = { wins: 0, trades: 0 };
    }
    patternPerformance[result.pattern_type].trades++;
    if (result.result === 'win') {
      patternPerformance[result.pattern_type].wins++;
    }
    
    // Track timeframe performance
    if (!timeframePerformance[result.timeframe]) {
      timeframePerformance[result.timeframe] = { wins: 0, trades: 0 };
    }
    timeframePerformance[result.timeframe].trades++;
    if (result.result === 'win') {
      timeframePerformance[result.timeframe].wins++;
    }
  });
  
  // Find best pattern
  let bestPattern = null;
  let bestPatternWinRate = 0;
  Object.entries(patternPerformance).forEach(([pattern, stats]) => {
    if (stats.trades >= 5) { // Minimum sample size
      const winRate = stats.wins / stats.trades;
      if (winRate > bestPatternWinRate) {
        bestPatternWinRate = winRate;
        bestPattern = pattern;
      }
    }
  });
  
  // Find best timeframe
  let bestTimeframe = null;
  let bestTimeframeWinRate = 0;
  Object.entries(timeframePerformance).forEach(([timeframe, stats]) => {
    if (stats.trades >= 5) { // Minimum sample size
      const winRate = stats.wins / stats.trades;
      if (winRate > bestTimeframeWinRate) {
        bestTimeframeWinRate = winRate;
        bestTimeframe = timeframe;
      }
    }
  });
  
  // Return statistics in the expected format
  return {
    winRate: completedResults.length > 0 ? wins.length / completedResults.length : 0,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : 0,
    averageRMultiple: completedResults.length > 0 ? totalRMultiple / completedResults.length : 0,
    expectancy: completedResults.length > 0 ? 
      (wins.length / completedResults.length) * (grossProfit / wins.length) - 
      (losses.length / completedResults.length) * (grossLoss / losses.length) : 0,
    
    totalTrades: results.length,
    totalWins: wins.length,
    totalLosses: losses.length,
    pendingTrades: pending.length,
    
    totalProfitLossPercent: completedResults.reduce((sum, r) => sum + (r.profit_loss_percent || 0), 0),
    averageWinPercent: wins.length > 0 ? grossProfit / wins.length : 0,
    averageLossPercent: losses.length > 0 ? -grossLoss / losses.length : 0,
    winLossRatio: losses.length > 0 ? wins.length / losses.length : 0,
    
    bestPattern,
    bestPatternWinRate: bestPattern ? patternPerformance[bestPattern].wins / patternPerformance[bestPattern].trades : null,
    bestTimeframe,
    averageDaysHeld: tradesWithDaysHeld > 0 ? totalDaysHeld / tradesWithDaysHeld : null
  };
};

export default {
  backtestPatternsWithYahoo,
  getBacktestStatistics,
  calculateAverageCandlesToBreakout,
  calculateWinRate,
  calculateProfitFactor
};
