import { PatternData } from '@/services/types/patternTypes';
import { BacktestResult } from '@/services/types/backtestTypes';
import MarketDataService from '@/services/api/marketData/dataService';
import { ensureDateString } from '@/utils/dateUtils';
import { ensureBacktestDirection } from '@/utils/typeSafetyHelpers';
import { processPolygonDataForBacktest } from '@/services/api/marketData/polygon/dataTransformer';
import { stockUniverses } from '@/services/api/marketData/stockUniverses';
import { backtestPatternsWithPolygon } from './polygonBacktestService';

// Create an instance of MarketDataService
const marketDataService = new MarketDataService();

/**
 * Run backtest on patterns using real historical data with fallback mechanisms
 */
export const runBacktest = async (
  patterns: PatternData[],
  historicalYears: number = 1,
  apiKey?: string
): Promise<BacktestResult[]> => {
  try {
    console.log(`Running backtest for ${patterns.length} patterns using Polygon.io...`);
    
    // First attempt with Polygon (preferred data source)
    const polygonResults = await backtestPatternsWithPolygon(
      patterns, 
      false, 
      apiKey ? true : false
    );
    
    if (polygonResults && polygonResults.length > 0) {
      console.log(`Successfully backtested ${polygonResults.length} patterns with Polygon data`);
      return polygonResults;
    }
    
    // Fallback to legacy implementation
    console.warn("Polygon backtest failed or returned no results, falling back to legacy implementation");
    return runLegacyBacktest(patterns, historicalYears, apiKey);
  } catch (error) {
    console.error("Error running Polygon backtest:", error);
    console.warn("Falling back to legacy implementation");
    return runLegacyBacktest(patterns, historicalYears, apiKey);
  }
};

/**
 * Legacy backtest implementation (fallback method)
 */
const runLegacyBacktest = async (
  patterns: PatternData[],
  historicalYears: number = 1,
  apiKey?: string
): Promise<BacktestResult[]> => {
  const results: BacktestResult[] = [];
  
  for (const pattern of patterns) {
    try {
      // Calculate the end date (when the pattern was created)
      const patternCreationDate = new Date(pattern.createdAt);
      
      // Determine if this is a swing trading test (based on symbol and/or timeframe)
      const isSwingTest = stockUniverses.swingTradingUniverse.includes(pattern.symbol) || 
                         ['4h', '1d', 'daily', 'weekly'].includes(pattern.timeframe);
      
      // For swing tests, limit to 6 months to speed up testing
      const yearsToFetch = isSwingTest ? 0.5 : historicalYears;
      
      // Calculate start date based on historical years parameter
      const startDate = new Date(patternCreationDate);
      startDate.setFullYear(startDate.getFullYear() - Math.floor(yearsToFetch));
      
      // For partial years, adjust months accordingly
      const fractionalYearMonths = Math.round((yearsToFetch % 1) * 12);
      startDate.setMonth(startDate.getMonth() - fractionalYearMonths);
      
      // Use marketDataService to fetch candles
      const response = await marketDataService.fetchCandles(
        pattern.symbol,
        pattern.timeframe,
        1000, // Get enough data points for a good backtest
        ensureDateString(startDate),
        ensureDateString(patternCreationDate),
        true // Force refresh to get the most accurate data
      );
      
      if (!response.candles || response.candles.length === 0) {
        console.warn(`No historical data found for ${pattern.symbol}`);
        continue;
      }
      
      // Process the data for backtesting
      const processedData = response.candles.map(candle => ({
        date: new Date(candle.timestamp).toISOString(),
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
        rsi: candle.rsi14,
        atr: candle.atr14
      }));
      
      // Find entry point index (closest to pattern creation date)
      const entryPointIndex = findClosestDateIndex(
        processedData,
        patternCreationDate
      );
      
      if (entryPointIndex === -1) {
        console.warn(`Could not find entry point for ${pattern.symbol}`);
        continue;
      }
      
      // Run the actual backtest using entry price and target
      const result = performBacktest(
        pattern,
        processedData,
        entryPointIndex
      );
      
      // Add data source information
      result.dataSource = 'legacy';
      
      results.push(result);
    } catch (error) {
      console.error(`Error backtesting pattern ${pattern.id}:`, error);
    }
  }
  
  return results;
};

/**
 * Find the index of the closest date in historical data
 */
const findClosestDateIndex = (historicalData: any[], targetDate: Date): number => {
  if (!historicalData || historicalData.length === 0) return -1;
  
  const targetTime = targetDate.getTime();
  
  let closestIndex = 0;
  let closestDiff = Math.abs(new Date(historicalData[0].date).getTime() - targetTime);
  
  for (let i = 1; i < historicalData.length; i++) {
    const currentTime = new Date(historicalData[i].date).getTime();
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
  historicalData: any[],
  entryPointIndex: number
): BacktestResult => {
  // Extract pattern information
  const entryPrice = pattern.entryPrice;
  const targetPrice = pattern.targetPrice;
  const stopLoss = pattern.stopLoss || (pattern.entryPrice * 0.95); // Default 5% stop loss
  const direction = pattern.direction;
  
  // Setup tracking variables
  let exitIndex = -1;
  let exitPrice = entryPrice;
  let successful = false;
  let maxDrawdown = 0;
  let currentDrawdown = 0;
  let candlesToBreakout = 0;
  
  // Loop through data starting from entry point
  for (let i = entryPointIndex + 1; i < historicalData.length; i++) {
    const bar = historicalData[i];
    
    // Calculate current drawdown
    if (direction === "bullish") {
      currentDrawdown = (entryPrice - Math.min(bar.low, entryPrice)) / entryPrice * 100;
    } else {
      currentDrawdown = (Math.max(bar.high, entryPrice) - entryPrice) / entryPrice * 100;
    }
    
    // Update max drawdown
    maxDrawdown = Math.max(maxDrawdown, currentDrawdown);
    
    // Check for target hit
    if (direction === "bullish" && bar.high >= targetPrice) {
      exitIndex = i;
      exitPrice = targetPrice;
      successful = true;
      break;
    } else if (direction === "bearish" && bar.low <= targetPrice) {
      exitIndex = i;
      exitPrice = targetPrice;
      successful = true;
      break;
    }
    
    // Check for stop loss hit
    if (direction === "bullish" && bar.low <= stopLoss) {
      exitIndex = i;
      exitPrice = stopLoss;
      break;
    } else if (direction === "bearish" && bar.high >= stopLoss) {
      exitIndex = i;
      exitPrice = stopLoss;
      break;
    }
    
    // If we've gone through 30 bars and no exit, force exit at current close
    if (i - entryPointIndex >= 30) {
      exitIndex = i;
      exitPrice = bar.close;
      successful = direction === "bullish" ? 
        bar.close > entryPrice : 
        bar.close < entryPrice;
      break;
    }
  }
  
  // If we never hit target or stop, exit at the last bar
  if (exitIndex === -1 && historicalData.length > entryPointIndex) {
    exitIndex = historicalData.length - 1;
    exitPrice = historicalData[exitIndex].close;
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
  
  const entryDate = historicalData[entryPointIndex]?.date || pattern.createdAt;
  const exitDate = exitIndex !== -1 ? 
    historicalData[exitIndex]?.date : 
    new Date().toISOString();
  
  // Ensure direction is valid for BacktestResult
  const predictedDir = direction as "bullish" | "bearish";
  const oppositeDir = predictedDir === "bullish" ? "bearish" : "bullish";
  
  return {
    patternId: pattern.id,
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
    predictedDirection: predictedDir,
    actualDirection: successful ? predictedDir : oppositeDir,
    profitLoss: profitLoss,
    maxDrawdown: maxDrawdown,
    // Add technical indicators if available
    rsiAtEntry: historicalData[entryPointIndex]?.rsi,
    atrAtEntry: historicalData[entryPointIndex]?.atr,
    confidenceScore: pattern.confidenceScore || 0
  };
};

/**
 * Backtesting API that uses multiple data sources with fallback mechanisms
 */
export const backtestPatterns = async (
  patterns: PatternData[],
  includeDetails: boolean = false,
  apiKey?: string,
  isPremium?: boolean
): Promise<BacktestResult[]> => {
  return runBacktest(patterns, isPremium ? 2 : 1, apiKey);
};
