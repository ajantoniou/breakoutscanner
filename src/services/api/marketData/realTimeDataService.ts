import { marketDataProvider } from './marketDataProvider';
import { Candle } from '@/services/types/patternTypes';

/**
 * Real-time data service that provides accurate, up-to-date market data
 * by prioritizing Yahoo Finance API for current prices
 */
class RealTimeDataService {
  /**
   * Get the current price for a symbol with high accuracy
   * @param symbol Stock symbol
   * @returns Promise with current price
   */
  async getCurrentPrice(symbol: string): Promise<number> {
    try {
      // Use the market data provider which prioritizes Yahoo Finance
      return await marketDataProvider.getCurrentPrice(symbol);
    } catch (error) {
      console.error(`Error getting real-time price for ${symbol}:`, error);
      return 0;
    }
  }

  /**
   * Get current prices for multiple symbols
   * @param symbols Array of stock symbols
   * @returns Promise with object mapping symbols to prices
   */
  async getCurrentPrices(symbols: string[]): Promise<Record<string, number>> {
    try {
      const result: Record<string, number> = {};
      
      // Process symbols in batches to avoid rate limiting
      const batchSize = 5;
      for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        
        // Fetch prices for each symbol in batch
        const promises = batch.map(symbol => 
          this.getCurrentPrice(symbol)
            .then(price => {
              result[symbol] = price;
            })
            .catch(error => {
              console.error(`Error fetching price for ${symbol}:`, error);
              result[symbol] = 0;
            })
        );
        
        // Wait for batch to complete
        await Promise.all(promises);
        
        // Add a small delay between batches to avoid rate limiting
        if (i + batchSize < symbols.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error getting real-time prices for multiple symbols:', error);
      return {};
    }
  }

  /**
   * Get the latest candles for a symbol with accurate pricing
   * @param symbol Stock symbol
   * @param timeframe Timeframe string (e.g., '1m', '5m', '1h', '1d')
   * @param limit Maximum number of candles to return
   * @returns Promise with candle data
   */
  async getLatestCandles(
    symbol: string,
    timeframe: string,
    limit: number = 120
  ): Promise<Candle[]> {
    try {
      // Use the market data provider which prioritizes Yahoo Finance
      return await marketDataProvider.fetchCandles(symbol, timeframe, limit);
    } catch (error) {
      console.error(`Error getting latest candles for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Verify if a price is current and accurate
   * @param symbol Stock symbol
   * @param price Price to verify
   * @returns Promise with boolean indicating if price is accurate
   */
  async verifyPriceAccuracy(symbol: string, price: number): Promise<boolean> {
    try {
      const currentPrice = await this.getCurrentPrice(symbol);
      
      if (currentPrice === 0) {
        return false;
      }
      
      // Calculate percentage difference
      const difference = Math.abs(price - currentPrice) / currentPrice;
      
      // If difference is less than 0.5%, consider it accurate
      return difference < 0.005;
    } catch (error) {
      console.error(`Error verifying price accuracy for ${symbol}:`, error);
      return false;
    }
  }
}

// Export singleton instance
export const realTimeDataService = new RealTimeDataService();

// Export types
export type { RealTimeDataService };
