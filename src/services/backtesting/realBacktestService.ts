import { PatternData } from '@/services/types/patternTypes';
import { BacktestResult } from '@/services/types/backtestTypes';
import { ensureDateString } from '@/utils/dateUtils';
import { toast } from 'sonner';
import { getApiKey } from '../api/marketData/apiKeyService';
import { differenceInDays, differenceInHours } from 'date-fns';

/**
 * Enhanced backtesting service with real-time data and production-ready error handling
 */
export class RealBacktestService {
  // API call tracking for rate limiting
  private static lastApiCallTime = 0;
  private static apiCallCount = 0;
  private static readonly API_RATE_LIMIT = 5; // calls per second
  private static readonly API_COOLDOWN = 1200; // ms between batches

  /**
   * Run backtests against real market data from Polygon.io
   */
  static async runBacktests(
    patterns: PatternData[],
    options?: {
      maxDaysToTest?: number;
      batchSize?: number;
      onProgress?: (completed: number, total: number) => void;
    }
  ): Promise<BacktestResult[]> {
    const results: BacktestResult[] = [];
    const { maxDaysToTest = 30, batchSize = 5, onProgress } = options || {};

    // Get API key configuration
    const apiKeyConfig = getApiKey();
    if (!apiKeyConfig || !apiKeyConfig.key) {
      toast.error("Missing API Key", { 
        description: "Cannot run backtests without a valid Polygon.io API key"
      });
      return [];
    }

    console.log(`Starting backtests for ${patterns.length} patterns`);
    
    // Process patterns in batches to avoid API rate limits
    for (let i = 0; i < patterns.length; i += batchSize) {
      // Report progress if callback provided
      if (onProgress) {
        onProgress(i, patterns.length);
      }
      
      const batch = patterns.slice(i, i + batchSize);
      const batchPromises = batch.map(pattern => this.backtestPattern(pattern, apiKeyConfig.key, maxDaysToTest));
      
      try {
        // Wait for the batch to complete
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults.filter(r => r !== null));
        
        // Respect API rate limits by adding delay between batches
        await this.respectRateLimit();
      } catch (error) {
        console.error("Error processing batch:", error);
        toast.error("Backtest Error", {
          description: "Error during batch processing. Some results may be incomplete."
        });
      }
    }
    
    // Final progress report
    if (onProgress) {
      onProgress(patterns.length, patterns.length);
    }
    
    console.log(`Completed backtests: ${results.length}/${patterns.length} patterns processed`);
    return results;
  }
  
  /**
   * Run backtest for a single pattern
   */
  private static async backtestPattern(
    pattern: PatternData,
    apiKey: string,
    maxDaysToTest: number
  ): Promise<BacktestResult | null> {
    try {
      // Convert pattern detection date to Date object
      const patternCreationDate = new Date(pattern.created_at);
      
      // Determine appropriate Polygon.io timeframe
      const polygonTimeframe = this.convertTimeframeToPolygon(pattern.timeframe);
      
      // Fetch historical data starting from pattern detection date
      const startDate = new Date(patternCreationDate);
      const endDate = new Date();
      
      // Cap the end date to limit data size for older patterns
      if (differenceInDays(endDate, startDate) > maxDaysToTest) {
        endDate.setDate(startDate.getDate() + maxDaysToTest);
      }
      
      // Format dates for API call
      const formattedStartDate = startDate.toISOString().split('T')[0];
      const formattedEndDate = endDate.toISOString().split('T')[0];
      
      // Prepare API call with proper rate limiting
      await this.respectRateLimit();
      
      // Fetch data from Polygon API
      console.log(`Fetching historical data for ${pattern.symbol} from ${formattedStartDate} to ${formattedEndDate}`);
      const url = `https://api.polygon.io/v2/aggs/ticker/${pattern.symbol}/range/${polygonTimeframe.multiplier}/${polygonTimeframe.timespan}/${formattedStartDate}/${formattedEndDate}?apiKey=${apiKey}&limit=5000`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Validate response data
      if (!data.results || data.results.length === 0) {
        console.warn(`No historical data found for ${pattern.symbol}`);
        return null;
      }
      
      // Convert to candle format
      const candles = data.results.map(bar => ({
        timestamp: bar.t,
        date: new Date(bar.t).toISOString(),
        open: bar.o,
        high: bar.h,
        low: bar.l,
        close: bar.c,
        volume: bar.v
      }));
      
      // Sort from newest to oldest (as our algorithm expects)
      candles.sort((a, b) => b.timestamp - a.timestamp);
      
      // Find entry point index (closest to pattern detection date)
      const entryPointIndex = this.findClosestDateIndex(candles, patternCreationDate);
      if (entryPointIndex === -1) {
        console.warn(`Could not find suitable entry point for ${pattern.symbol}`);
        return null;
      }
      
      // Perform backtest simulation
      return this.performBacktest(pattern, candles, entryPointIndex);
    } catch (error) {
      console.error(`Error running backtest for ${pattern.symbol}:`, error);
      return null;
    }
  }
  
  /**
   * Find index of candle closest to target date
   */
  private static findClosestDateIndex(candles: any[], targetDate: Date): number {
    if (!candles || candles.length === 0) return -1;
    
    const targetTime = targetDate.getTime();
    
    for (let i = 0; i < candles.length; i++) {
      const candleTime = new Date(candles[i].timestamp).getTime();
      // Find first candle that is on or after the target date
      if (candleTime <= targetTime) {
        return i;
      }
    }
    
    // If no exact match, return the newest candle
    return 0;
  }
  
  /**
   * Convert app timeframe format to Polygon API format
   */
  private static convertTimeframeToPolygon(timeframe: string): { multiplier: number; timespan: string } {
    switch (timeframe) {
      case '1m':
        return { multiplier: 1, timespan: 'minute' };
      case '5m':
        return { multiplier: 5, timespan: 'minute' };
      case '15m':
        return { multiplier: 15, timespan: 'minute' };
      case '30m':
        return { multiplier: 30, timespan: 'minute' };
      case '1h':
        return { multiplier: 1, timespan: 'hour' };
      case '4h':
        return { multiplier: 4, timespan: 'hour' };
      case '1d':
        return { multiplier: 1, timespan: 'day' };
      case '1w':
        return { multiplier: 1, timespan: 'week' };
      default:
        return { multiplier: 1, timespan: 'day' }; // Default to daily
    }
  }
  
  /**
   * Implement rate limiting for API calls
   */
  private static async respectRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastApiCallTime;
    
    // Reset counter if more than 1 second has passed
    if (timeSinceLastCall > 1000) {
      this.apiCallCount = 0;
      this.lastApiCallTime = now;
    }
    
    // If we're at or above rate limit, delay the next call
    if (this.apiCallCount >= this.API_RATE_LIMIT) {
      const delayMs = this.API_COOLDOWN;
      console.log(`Rate limit reached, delaying next call by ${delayMs}ms`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      this.apiCallCount = 0;
      this.lastApiCallTime = Date.now();
    }
    
    // Increment counter
    this.apiCallCount++;
  }
  
  /**
   * Perform actual backtest simulation with real price data
   */
  private static performBacktest(
    pattern: PatternData,
    candles: any[],
    entryPointIndex: number
  ): BacktestResult {
    // Extract pattern information
    const entryPrice = pattern.entry_price;
    const targetPrice = pattern.target_price;
    const stopLoss = pattern.stop_loss || (pattern.entry_price * 0.95); // Default 5% stop loss
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
    
    const entryDate = candles[entryPointIndex]?.date || pattern.created_at;
    const exitDate = exitIndex !== -1 ? 
      candles[exitIndex]?.date : 
      new Date().toISOString();
    
    // Calculate risk/reward ratio
    const risk = direction === 'bullish' ? entryPrice - stopLoss : stopLoss - entryPrice;
    const reward = direction === 'bullish' ? targetPrice - entryPrice : entryPrice - targetPrice;
    const riskRewardRatio = risk > 0 ? reward / risk : 0;
    
    // Ensure direction is valid for BacktestResult
    const predictedDir = direction as "bullish" | "bearish";
    const oppositeDir = predictedDir === "bullish" ? "bearish" : "bullish";
    
    return {
      patternId: pattern.id,
      symbol: pattern.symbol,
      patternType: pattern.pattern_type,
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
      daysToExit: differenceInDays(new Date(exitDate), new Date(entryDate)),
      riskRewardRatio: riskRewardRatio,
      confidenceScore: pattern.confidence_score || 0
    };
  }
} 