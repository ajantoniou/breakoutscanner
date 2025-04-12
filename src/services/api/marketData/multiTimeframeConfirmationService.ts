import { Candle, PatternData } from '@/services/types/patternTypes';
import { yahooApiService } from '../yahoo/yahooApiService';
import { realTimeDataService } from './realTimeDataService';

/**
 * Service for enhancing pattern detection with multi-timeframe confirmation
 */
class MultiTimeframeConfirmationService {
  // Timeframe hierarchy for confirmation (lower timeframe -> higher timeframe)
  private timeframeHierarchy: Record<string, string[]> = {
    '1m': ['5m', '15m', '1h'],
    '5m': ['15m', '1h', '4h'],
    '15m': ['1h', '4h', '1d'],
    '30m': ['1h', '4h', '1d'],
    '1h': ['4h', '1d', '1w'],
    '4h': ['1d', '1w'],
    '1d': ['1w']
  };
  
  // Timeframe weight in confirmation (higher timeframe has more weight)
  private timeframeWeight: Record<string, number> = {
    '1m': 0.6,
    '5m': 0.65,
    '15m': 0.7,
    '30m': 0.75,
    '1h': 0.8,
    '4h': 0.85,
    '1d': 0.9,
    '1w': 0.95
  };

  /**
   * Apply multi-timeframe confirmation to a pattern
   * @param pattern Pattern to enhance with multi-timeframe confirmation
   * @returns Promise with enhanced pattern
   */
  async applyMultiTimeframeConfirmation(pattern: PatternData): Promise<PatternData> {
    try {
      // Get higher timeframes for confirmation
      const higherTimeframes = this.timeframeHierarchy[pattern.timeframe] || [];
      
      if (higherTimeframes.length === 0) {
        // No higher timeframes available for confirmation
        return {
          ...pattern,
          multiTimeframeConfirmation: false
        };
      }
      
      // Get current price
      const currentPrice = await realTimeDataService.getCurrentPrice(pattern.symbol);
      
      if (currentPrice === 0) {
        console.error(`Could not get current price for ${pattern.symbol}`);
        return {
          ...pattern,
          multiTimeframeConfirmation: false
        };
      }
      
      // Fetch data for higher timeframes
      const confirmationResults: Record<string, boolean> = {};
      let confirmationScore = 0;
      
      for (const timeframe of higherTimeframes) {
        const isConfirmed = await this.checkTimeframeConfirmation(
          pattern.symbol,
          timeframe,
          pattern.direction,
          currentPrice
        );
        
        confirmationResults[timeframe] = isConfirmed;
        
        if (isConfirmed) {
          // Add weighted confirmation score
          confirmationScore += this.timeframeWeight[timeframe] || 0.7;
        }
      }
      
      // Calculate overall confirmation status
      // At least one higher timeframe must confirm the pattern
      const isConfirmed = Object.values(confirmationResults).some(result => result);
      
      // Boost confidence score based on confirmation
      let confidenceBoost = 0;
      
      if (isConfirmed) {
        // Calculate confidence boost based on confirmation score and number of confirming timeframes
        const confirmingTimeframes = Object.values(confirmationResults).filter(result => result).length;
        const maxTimeframes = higherTimeframes.length;
        
        // Boost is proportional to the number of confirming timeframes and their weights
        confidenceBoost = Math.min(15, Math.round((confirmationScore / maxTimeframes) * 15));
      }
      
      // Return enhanced pattern
      return {
        ...pattern,
        multiTimeframeConfirmation: isConfirmed,
        confidenceScore: Math.min(100, pattern.confidenceScore + confidenceBoost),
        confirmationDetails: confirmationResults
      };
    } catch (error) {
      console.error(`Error applying multi-timeframe confirmation for ${pattern.symbol}:`, error);
      return {
        ...pattern,
        multiTimeframeConfirmation: false
      };
    }
  }

  /**
   * Check if a higher timeframe confirms the pattern direction
   * @param symbol Stock symbol
   * @param timeframe Timeframe to check
   * @param direction Pattern direction ('bullish' or 'bearish')
   * @param currentPrice Current price of the stock
   * @returns Promise with confirmation result
   */
  private async checkTimeframeConfirmation(
    symbol: string,
    timeframe: string,
    direction: string,
    currentPrice: number
  ): Promise<boolean> {
    try {
      // Convert timeframe to Yahoo Finance format
      const yahooInterval = this.convertTimeframeToYahooInterval(timeframe);
      const yahooRange = this.getAppropriateRange(timeframe);
      
      // Fetch historical data from Yahoo Finance
      const yahooData = await yahooApiService.getHistoricalData(
        symbol,
        yahooInterval,
        yahooRange
      );
      
      // Convert to our Candle format
      const candles = yahooApiService.convertToCandles(yahooData);
      
      if (candles.length < 10) {
        console.warn(`Not enough data for ${symbol} on ${timeframe} timeframe`);
        return false;
      }
      
      // Calculate EMAs for trend determination
      this.calculateEMA(candles, 20);
      this.calculateEMA(candles, 50);
      
      // Get the most recent candles
      const recentCandles = candles.slice(-5);
      const lastCandle = recentCandles[recentCandles.length - 1];
      
      // Check if higher timeframe confirms the pattern direction
      if (direction === 'bullish') {
        // For bullish patterns, check for uptrend and support
        
        // Check if price is above EMAs (uptrend)
        const isAboveEMA20 = currentPrice > lastCandle.ema20;
        const isAboveEMA50 = currentPrice > lastCandle.ema50;
        
        // Check if EMAs are in uptrend configuration (EMA20 > EMA50)
        const isEMAUptrend = lastCandle.ema20 > lastCandle.ema50;
        
        // Check if price found support at EMA20 recently
        const foundSupportAtEMA20 = recentCandles.some(candle => 
          Math.abs(candle.low - candle.ema20) / candle.ema20 < 0.01
        );
        
        // Combine confirmation factors
        return (isAboveEMA20 && isAboveEMA50) || (isEMAUptrend && foundSupportAtEMA20);
      } else {
        // For bearish patterns, check for downtrend and resistance
        
        // Check if price is below EMAs (downtrend)
        const isBelowEMA20 = currentPrice < lastCandle.ema20;
        const isBelowEMA50 = currentPrice < lastCandle.ema50;
        
        // Check if EMAs are in downtrend configuration (EMA20 < EMA50)
        const isEMADowntrend = lastCandle.ema20 < lastCandle.ema50;
        
        // Check if price found resistance at EMA20 recently
        const foundResistanceAtEMA20 = recentCandles.some(candle => 
          Math.abs(candle.high - candle.ema20) / candle.ema20 < 0.01
        );
        
        // Combine confirmation factors
        return (isBelowEMA20 && isBelowEMA50) || (isEMADowntrend && foundResistanceAtEMA20);
      }
    } catch (error) {
      console.error(`Error checking timeframe confirmation for ${symbol} on ${timeframe}:`, error);
      return false;
    }
  }

  /**
   * Calculate Exponential Moving Average (EMA)
   * @param candles Array of candles
   * @param period EMA period
   */
  private calculateEMA(candles: Candle[], period: number): void {
    if (candles.length < period) return;
    
    // Calculate first SMA as starting point for EMA
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += candles[i].close;
    }
    
    const multiplier = 2 / (period + 1);
    const emaKey = `ema${period}` as keyof Candle;
    
    // Set first EMA as SMA
    candles[period - 1][emaKey] = sum / period;
    
    // Calculate EMA for remaining candles
    for (let i = period; i < candles.length; i++) {
      candles[i][emaKey] = (candles[i].close - candles[i - 1][emaKey]) * multiplier + candles[i - 1][emaKey];
    }
  }

  /**
   * Convert our timeframe format to Yahoo Finance interval format
   * @param timeframe Timeframe string (e.g., '1m', '5m', '1h', '1d')
   * @returns Yahoo Finance interval string
   */
  private convertTimeframeToYahooInterval(timeframe: string): string {
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
  }

  /**
   * Get appropriate range based on timeframe
   * @param timeframe Timeframe string (e.g., '1m', '5m', '1h', '1d')
   * @returns Yahoo Finance range string
   */
  private getAppropriateRange(timeframe: string): string {
    // For minute-based timeframes
    if (['1m', '5m', '15m', '30m'].includes(timeframe)) {
      return '5d';
    }
    
    // For hourly timeframes
    if (timeframe === '1h') {
      return '1mo';
    }
    
    // For 4-hour timeframe
    if (timeframe === '4h') {
      return '3mo';
    }
    
    // For daily timeframe
    if (timeframe === '1d') {
      return '6mo';
    }
    
    // For weekly timeframe
    if (timeframe === '1w') {
      return '2y';
    }
    
    // Default
    return '1mo';
  }

  /**
   * Apply multi-timeframe confirmation to multiple patterns
   * @param patterns Array of patterns to enhance
   * @returns Promise with enhanced patterns
   */
  async applyMultiTimeframeConfirmationBatch(patterns: PatternData[]): Promise<PatternData[]> {
    const enhancedPatterns: PatternData[] = [];
    
    // Process patterns in batches to avoid rate limiting
    const batchSize = 5;
    for (let i = 0; i < patterns.length; i += batchSize) {
      const batch = patterns.slice(i, i + batchSize);
      
      // Apply multi-timeframe confirmation to each pattern in batch
      const promises = batch.map(pattern => 
        this.applyMultiTimeframeConfirmation(pattern)
          .then(enhancedPattern => {
            enhancedPatterns.push(enhancedPattern);
          })
          .catch(error => {
            console.error(`Error enhancing pattern for ${pattern.symbol}:`, error);
            enhancedPatterns.push({
              ...pattern,
              multiTimeframeConfirmation: false
            });
          })
      );
      
      // Wait for batch to complete
      await Promise.all(promises);
      
      // Add a small delay between batches to avoid rate limiting
      if (i + batchSize < patterns.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return enhancedPatterns;
  }
}

// Export singleton instance
export const multiTimeframeConfirmationService = new MultiTimeframeConfirmationService();

// Export types
export type { MultiTimeframeConfirmationService };
