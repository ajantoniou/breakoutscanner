import { Candle } from '@/services/types/patternTypes';
import YahooFinanceClient from './yahooFinanceClient';

/**
 * Yahoo Finance Data Service for fetching and processing market data
 */
class YahooDataService {
  private yahooClient: YahooFinanceClient;

  constructor() {
    this.yahooClient = new YahooFinanceClient();
  }

  /**
   * Test the connection to Yahoo Finance
   * @returns Promise with test result
   */
  async testConnection(): Promise<boolean> {
    return this.yahooClient.testConnection();
  }

  /**
   * Fetch candles for a symbol
   * @param symbol Stock symbol
   * @param timeframe Timeframe string (e.g., '1m', '5m', '1h', '1d')
   * @param limit Maximum number of candles to return
   * @returns Promise with candle data
   */
  async fetchCandles(
    symbol: string,
    timeframe: string,
    limit: number = 120
  ): Promise<Candle[]> {
    try {
      console.log(`Fetching ${timeframe} candles for ${symbol} from Yahoo Finance`);
      
      // Fetch candles from Yahoo Finance
      const candles = await this.yahooClient.getCandles(symbol, timeframe, limit);
      
      // Calculate indicators
      return this.calculateIndicators(candles);
    } catch (error) {
      console.error(`Error fetching candles for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Calculate technical indicators for candles
   * @param candles Array of candles
   * @returns Array of candles with calculated indicators
   */
  calculateIndicators(candles: Candle[]): Candle[] {
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
   * Get current price for a symbol
   * @param symbol Stock symbol
   * @returns Promise with current price
   */
  async getCurrentPrice(symbol: string): Promise<number> {
    try {
      return this.yahooClient.getCurrentPrice(symbol);
    } catch (error) {
      console.error(`Error getting current price for ${symbol}:`, error);
      return 0;
    }
  }

  /**
   * Scan multiple symbols for patterns
   * @param symbols Array of stock symbols
   * @param timeframe Timeframe string (e.g., '1m', '5m', '1h', '1d')
   * @param limit Maximum number of candles to return per symbol
   * @returns Promise with object mapping symbols to candle arrays
   */
  async scanMultipleSymbols(
    symbols: string[],
    timeframe: string,
    limit: number = 120
  ): Promise<Record<string, Candle[]>> {
    try {
      console.log(`Scanning ${symbols.length} symbols on ${timeframe} timeframe using Yahoo Finance`);
      
      const result: Record<string, Candle[]> = {};
      
      // Process symbols in batches to avoid rate limiting
      const batchSize = 5;
      for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        
        // Fetch candles for each symbol in batch
        const promises = batch.map(symbol => 
          this.fetchCandles(symbol, timeframe, limit)
            .then(candles => {
              result[symbol] = candles;
            })
            .catch(error => {
              console.error(`Error fetching candles for ${symbol}:`, error);
              result[symbol] = [];
            })
        );
        
        // Wait for batch to complete
        await Promise.all(promises);
        
        // Add a small delay between batches to avoid rate limiting
        if (i + batchSize < symbols.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error scanning multiple symbols:', error);
      return {};
    }
  }
}

export default YahooDataService;
