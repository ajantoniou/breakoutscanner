import { PatternData } from '@/services/types/patternTypes';
import { BacktestResult } from '@/services/types/backtestTypes';
import PolygonClient from '@/services/api/polygon/client/polygonClient';
import { ensureDateString } from '@/utils/dateUtils';
import { stockUniverses } from '@/services/api/marketData/stockUniverses';

// Create Polygon client instance
const polygonClient = new PolygonClient();

/**
 * Run backtest on patterns using accurate historical data from Polygon.io
 */
export const runPolygonBacktest = async (
  patterns: PatternData[],
  historicalYears: number = 1
): Promise<BacktestResult[]> => {
  const results: BacktestResult[] = [];
  
  for (const pattern of patterns) {
    try {
      console.log(`Running backtest for ${pattern.symbol} ${pattern.timeframe} pattern`);
      
      // Calculate the end date (when the pattern was detected)
      const patternDetectionDate = new Date(pattern.createdAt || pattern.detectedAt);
      
      // Determine if this is a swing trading test (based on symbol and/or timeframe)
      const isSwingTest = stockUniverses.swingTradingUniverse.includes(pattern.symbol) || 
                         ['4h', '1d', '1w'].includes(pattern.timeframe);
      
      // For swing tests, limit to 6 months to speed up testing
      const yearsToFetch = isSwingTest ? 0.5 : historicalYears;
      
      // Calculate date range for historical data
      const endDate = new Date(patternDetectionDate);
      const startDate = new Date(endDate);
      startDate.setFullYear(startDate.getFullYear() - yearsToFetch);
      
      const from = ensureDateString(startDate);
      const to = ensureDateString(endDate);
      
      // Convert timeframe to Polygon format
      const { timespan, multiplier } = polygonClient.convertTimeframe(pattern.timeframe);
      
      // Fetch historical data with retry logic
      let candles = [];
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          const response = await polygonClient.getAggregates(
            pattern.symbol,
            timespan,
            multiplier,
            from,
            to,
            150 // Fetch more candles to ensure we have enough data
          );
          candles = response.candles;
          break;
        } catch (error) {
          retryCount++;
          console.warn(`Error fetching data for ${pattern.symbol}, retry ${retryCount}/${maxRetries}`, error);
          
          if (retryCount >= maxRetries) {
            console.error(`Failed to fetch data for ${pattern.symbol} after ${maxRetries} retries`);
            break;
          }
          
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
        }
      }
      
      if (candles.length === 0) {
        console.warn(`No historical data found for ${pattern.symbol}`);
        
        // Create a failed backtest result when no data is available
        results.push({
          patternId: pattern.id || `${pattern.symbol}-${pattern.timeframe}-${Date.now()}`,
          symbol: pattern.symbol,
          patternType: pattern.patternType,
          timeframe: pattern.timeframe,
          entryPrice: pattern.entryPrice,
          targetPrice: pattern.targetPrice,
          stopLoss: pattern.stopLoss,
          entryDate: ensureDateString(patternDetectionDate),
          exitDate: ensureDateString(patternDetectionDate),
          actualExitPrice: pattern.entryPrice,
          profitLossPercent: 0,
          candlesToBreakout: 0,
          successful: false,
          predictedDirection: pattern.direction,
          actualDirection: 'unknown',
          profitLoss: 0,
          maxDrawdown: 0,
          rsiAtEntry: 0,
          atrAtEntry: 0,
          confidenceScore: pattern.confidenceScore || 0,
          dataSource: 'none'
        });
        
        continue;
      }
      
      // Find entry point index (closest to pattern detection date)
      const entryPointIndex = findClosestDateIndex(candles, patternDetectionDate);
      
      if (entryPointIndex === -1) {
        console.warn(`Could not find entry point for ${pattern.symbol}`);
        continue;
      }
      
      // Run the actual backtest using entry price and target
      const result = performBacktest(pattern, candles, entryPointIndex);
      
      // Add data source information
      result.dataSource = 'polygon';
      
      results.push(result);
    } catch (error) {
      console.error(`Error backtesting pattern for ${pattern.symbol}:`, error);
    }
  }
  
  return results;
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
  const entryPrice = pattern.entryPrice;
  const targetPrice = pattern.targetPrice;
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
    patternId: pattern.id || `${pattern.symbol}-${pattern.timeframe}-${Date.now()}`,
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
 * Backtesting API that uses Polygon data
 */
export const backtestPatternsWithPolygon = async (
  patterns: PatternData[],
  includeDetails: boolean = false,
  isPremium: boolean = false
): Promise<BacktestResult[]> => {
  return runPolygonBacktest(patterns, isPremium ? 2 : 1);
};

/**
 * Get comprehensive backtest statistics
 */
export const getBacktestStatistics = (
  backtestResults: BacktestResult[]
): Record<string, any> => {
  const timeframes = ['15m', '30m', '1h', '4h', '1d', '1w'];
  
  const statistics: Record<string, any> = {
    overall: {
      totalTrades: backtestResults.length,
      successfulTrades: backtestResults.filter(result => result.successful).length,
      winRate: 0,
      profitFactor: 0,
      averageProfitLoss: 0,
      averageCandlesToBreakout: 0
    },
    byTimeframe: {}
  };
  
  // Calculate overall win rate
  statistics.overall.winRate = statistics.overall.totalTrades > 0 ?
    (statistics.overall.successfulTrades / statistics.overall.totalTrades) * 100 : 0;
  
  // Calculate overall profit factor
  const grossProfit = backtestResults
    .filter(result => result.profitLoss > 0)
    .reduce((total, result) => total + result.profitLoss, 0);
  
  const grossLoss = Math.abs(backtestResults
    .filter(result => result.profitLoss < 0)
    .reduce((total, result) => total + result.profitLoss, 0));
  
  statistics.overall.profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? 999 : 0);
  
  // Calculate overall average profit/loss
  statistics.overall.averageProfitLoss = backtestResults.length > 0 ?
    backtestResults.reduce((total, result) => total + result.profitLossPercent, 0) / backtestResults.length : 0;
  
  // Calculate overall average candles to breakout
  const successfulResults = backtestResults.filter(result => result.successful);
  statistics.overall.averageCandlesToBreakout = successfulResults.length > 0 ?
    successfulResults.reduce((total, result) => total + result.candlesToBreakout, 0) / successfulResults.length : 0;
  
  // Calculate statistics by timeframe
  for (const timeframe of timeframes) {
    statistics.byTimeframe[timeframe] = {
      totalTrades: backtestResults.filter(result => result.timeframe === timeframe).length,
      successfulTrades: backtestResults.filter(result => result.timeframe === timeframe && result.successful).length,
      winRate: calculateWinRate(backtestResults, timeframe),
      profitFactor: calculateProfitFactor(backtestResults, timeframe),
      averageCandlesToBreakout: calculateAverageCandlesToBreakout(backtestResults, timeframe)
    };
  }
  
  // Add data source statistics
  statistics.dataSources = {
    polygon: backtestResults.filter(result => result.dataSource === 'polygon').length,
    yahoo: backtestResults.filter(result => result.dataSource === 'yahoo').length,
    none: backtestResults.filter(result => result.dataSource === 'none' || !result.dataSource).length
  };
  
  return statistics;
};

export default {
  backtestPatternsWithPolygon,
  getBacktestStatistics,
  calculateAverageCandlesToBreakout,
  calculateWinRate,
  calculateProfitFactor
}; 