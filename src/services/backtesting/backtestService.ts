import { PatternData } from '@/services/types/patternTypes';
import { BacktestResult } from '@/services/types/backtestTypes';
import { fetchStockData } from '@/services/api/marketData/dataService';
import { ensureDateString } from '@/utils/dateConverter';
import { ensureBacktestDirection } from '@/utils/typeSafetyHelpers';
import { processPolygonDataForBacktest } from '@/services/api/marketData/polygon/dataTransformer';
import { STOCK_UNIVERSES } from '@/services/api/marketData/stockUniverses';

/**
 * Run backtest on patterns using real historical data
 */
export const runBacktest = async (
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
      const isSwingTest = STOCK_UNIVERSES.swingOptions100.includes(pattern.symbol) || 
                         ['4h', '1d', 'daily', 'weekly'].includes(pattern.timeframe);
      
      // For swing tests, limit to 6 months to speed up testing
      const yearsToFetch = isSwingTest ? 0.5 : historicalYears;
      
      // Calculate start date based on historical years parameter
      const startDate = new Date(patternCreationDate);
      startDate.setFullYear(startDate.getFullYear() - Math.floor(yearsToFetch));
      
      // For partial years, adjust months accordingly
      const fractionalYearMonths = Math.round((yearsToFetch % 1) * 12);
      startDate.setMonth(startDate.getMonth() - fractionalYearMonths);
      
      // Fetch historical data from the API
      const historicalData = await fetchStockData(
        pattern.symbol,
        pattern.timeframe,
        apiKey || "",
        1000 // Get enough data points for a good backtest
      );
      
      if (!historicalData || !historicalData.results || historicalData.results.length === 0) {
        console.warn(`No historical data found for ${pattern.symbol}`);
        continue;
      }
      
      // Process the data for backtesting
      const processedData = processPolygonDataForBacktest(historicalData, pattern.symbol);
      
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
  const direction = pattern.direction || "bullish";
  
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
  
  // Convert direction type to ensure it's "bullish" or "bearish"
  const predictedDir = direction === "neutral" ? "bullish" : direction as ("bullish" | "bearish");
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
 * Backtesting compatibility API
 */
export const backtestPatterns = async (
  patterns: PatternData[],
  includeDetails: boolean = false,
  apiKey?: string,
  isPremium?: boolean
): Promise<BacktestResult[]> => {
  return runBacktest(patterns, isPremium ? 2 : 1, apiKey);
};
