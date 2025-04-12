import { Candle, PatternData } from '@/services/types/patternTypes';
import { detectMultiTimeframePatterns } from './patternDetection/patternDetectionService';
import { realTimeDataService } from './realTimeDataService';
import { yahooApiService } from '../yahoo/yahooApiService';

/**
 * Pattern Detection Manager
 * Integrates Yahoo Finance data with pattern detection algorithms
 */
class PatternDetectionManager {
  /**
   * Scan a single symbol for patterns across multiple timeframes
   * @param symbol Stock symbol to scan
   * @param timeframes Array of timeframes to analyze
   * @returns Promise with detected patterns
   */
  async scanSymbol(
    symbol: string,
    timeframes: string[] = ['15m', '1h', '4h', '1d']
  ): Promise<PatternData[]> {
    try {
      console.log(`Scanning ${symbol} for patterns across timeframes: ${timeframes.join(', ')}`);
      
      // Get current price from Yahoo Finance
      const currentPrice = await realTimeDataService.getCurrentPrice(symbol);
      
      if (currentPrice === 0) {
        console.error(`Could not get current price for ${symbol}`);
        return [];
      }
      
      // Fetch candles for each timeframe
      const candlesByTimeframe: Record<string, Candle[]> = {};
      
      for (const timeframe of timeframes) {
        const yahooInterval = this.convertTimeframeToYahooInterval(timeframe);
        const yahooRange = this.getAppropriateRange(timeframe);
        
        // Fetch historical data from Yahoo Finance
        const yahooData = await yahooApiService.getHistoricalData(symbol, yahooInterval, yahooRange);
        
        // Convert to our Candle format
        const candles = yahooApiService.convertToCandles(yahooData);
        
        // Calculate technical indicators
        const processedCandles = this.calculateIndicators(candles);
        
        candlesByTimeframe[timeframe] = processedCandles;
      }
      
      // Detect patterns across multiple timeframes
      const patterns = detectMultiTimeframePatterns(symbol, candlesByTimeframe, currentPrice);
      
      return patterns;
    } catch (error) {
      console.error(`Error scanning ${symbol} for patterns:`, error);
      return [];
    }
  }
  
  /**
   * Scan multiple symbols for patterns
   * @param symbols Array of stock symbols to scan
   * @param timeframes Array of timeframes to analyze
   * @returns Promise with detected patterns grouped by symbol
   */
  async scanMultipleSymbols(
    symbols: string[],
    timeframes: string[] = ['15m', '1h', '4h', '1d']
  ): Promise<Record<string, PatternData[]>> {
    try {
      console.log(`Scanning ${symbols.length} symbols for patterns`);
      
      const results: Record<string, PatternData[]> = {};
      
      // Process symbols in batches to avoid rate limiting
      const batchSize = 5;
      for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        
        // Scan each symbol in batch
        const promises = batch.map(symbol => 
          this.scanSymbol(symbol, timeframes)
            .then(patterns => {
              results[symbol] = patterns;
            })
            .catch(error => {
              console.error(`Error scanning ${symbol}:`, error);
              results[symbol] = [];
            })
        );
        
        // Wait for batch to complete
        await Promise.all(promises);
        
        // Add a small delay between batches to avoid rate limiting
        if (i + batchSize < symbols.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error scanning multiple symbols:', error);
      return {};
    }
  }
  
  /**
   * Calculate technical indicators for candles
   * @param candles Array of candles
   * @returns Array of candles with calculated indicators
   */
  private calculateIndicators(candles: Candle[]): Candle[] {
    if (candles.length === 0) return [];
    
    // Make a copy of candles to avoid modifying the original
    const result = [...candles];
    
    // Calculate EMAs
    this.calculateEMA(result, 7);
    this.calculateEMA(result, 20);
    this.calculateEMA(result, 50);
    this.calculateEMA(result, 100);
    this.calculateEMA(result, 200);
    
    // Calculate RSI
    this.calculateRSI(result, 14);
    
    // Calculate ATR
    this.calculateATR(result, 14);
    
    return result;
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
   * Calculate Relative Strength Index (RSI)
   * @param candles Array of candles
   * @param period RSI period
   */
  private calculateRSI(candles: Candle[], period: number): void {
    if (candles.length <= period) return;
    
    let gains = 0;
    let losses = 0;
    
    // Calculate first average gain and loss
    for (let i = 1; i <= period; i++) {
      const change = candles[i].close - candles[i - 1].close;
      if (change >= 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }
    
    let avgGain = gains / period;
    let avgLoss = losses / period;
    
    // Calculate RSI for remaining candles
    for (let i = period + 1; i < candles.length; i++) {
      const change = candles[i].close - candles[i - 1].close;
      
      if (change >= 0) {
        avgGain = (avgGain * (period - 1) + change) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgGain = (avgGain * (period - 1)) / period;
        avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
      }
      
      if (avgLoss === 0) {
        candles[i].rsi14 = 100;
      } else {
        const rs = avgGain / avgLoss;
        candles[i].rsi14 = 100 - (100 / (1 + rs));
      }
    }
  }
  
  /**
   * Calculate Average True Range (ATR)
   * @param candles Array of candles
   * @param period ATR period
   */
  private calculateATR(candles: Candle[], period: number): void {
    if (candles.length <= period) return;
    
    // Calculate True Range for each candle
    const trueRanges: number[] = [];
    
    for (let i = 1; i < candles.length; i++) {
      const high = candles[i].high;
      const low = candles[i].low;
      const prevClose = candles[i - 1].close;
      
      const tr1 = high - low;
      const tr2 = Math.abs(high - prevClose);
      const tr3 = Math.abs(low - prevClose);
      
      const trueRange = Math.max(tr1, tr2, tr3);
      trueRanges.push(trueRange);
    }
    
    // Calculate first ATR as simple average of true ranges
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += trueRanges[i];
    }
    
    let atr = sum / period;
    candles[period].atr14 = atr;
    
    // Calculate ATR for remaining candles
    for (let i = period + 1; i < candles.length; i++) {
      atr = (atr * (period - 1) + trueRanges[i - 1]) / period;
      candles[i].atr14 = atr;
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
}

// Export singleton instance
export const patternDetectionManager = new PatternDetectionManager();

// Export types
export type { PatternDetectionManager };
