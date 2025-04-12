import { Candle } from '@/services/types/patternTypes';
import MarketDataService from './dataService';
import YahooDataService from '../yahoo/yahooDataService';

/**
 * Market Data Provider that selects the appropriate data service
 * based on configuration and availability
 */
class MarketDataProvider {
  private polygonService: MarketDataService;
  private yahooService: YahooDataService;
  private useYahoo: boolean = true; // Default to Yahoo Finance for more accurate data

  constructor() {
    this.polygonService = new MarketDataService();
    this.yahooService = new YahooDataService();
    
    // Check if we should use Yahoo Finance
    this.checkDataSources();
  }

  /**
   * Check available data sources and determine which to use
   */
  private async checkDataSources(): Promise<void> {
    try {
      // Test Yahoo Finance connection
      const yahooConnected = await this.yahooService.testConnection();
      
      if (yahooConnected) {
        console.log('Using Yahoo Finance for market data (more accurate prices)');
        this.useYahoo = true;
        return;
      }
      
      // Fallback to Polygon if Yahoo fails
      const polygonConnected = await this.polygonService.testConnection();
      
      if (polygonConnected) {
        console.log('Using Polygon.io for market data (Yahoo Finance unavailable)');
        this.useYahoo = false;
        return;
      }
      
      console.error('No market data sources available!');
    } catch (error) {
      console.error('Error checking data sources:', error);
      // Default to Yahoo if there's an error
      this.useYahoo = true;
    }
  }

  /**
   * Get the active data service
   * @returns The active data service
   */
  private getActiveService(): MarketDataService | YahooDataService {
    return this.useYahoo ? this.yahooService : this.polygonService;
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
    const service = this.getActiveService();
    return service.fetchCandles(symbol, timeframe, limit);
  }

  /**
   * Get current price for a symbol
   * @param symbol Stock symbol
   * @returns Promise with current price
   */
  async getCurrentPrice(symbol: string): Promise<number> {
    const service = this.getActiveService();
    return service.getCurrentPrice(symbol);
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
    const service = this.getActiveService();
    return service.scanMultipleSymbols(symbols, timeframe, limit);
  }

  /**
   * Force use of Yahoo Finance data
   */
  forceUseYahoo(): void {
    this.useYahoo = true;
    console.log('Forced use of Yahoo Finance for market data');
  }

  /**
   * Force use of Polygon.io data
   */
  forceUsePolygon(): void {
    this.useYahoo = false;
    console.log('Forced use of Polygon.io for market data');
  }

  /**
   * Check if Yahoo Finance is being used
   * @returns True if Yahoo Finance is being used
   */
  isUsingYahoo(): boolean {
    return this.useYahoo;
  }
}

// Export singleton instance
export const marketDataProvider = new MarketDataProvider();

// Export types
export type { MarketDataProvider };
