import { PolygonApiClient } from './polygon/polygonApiClient';
import { DEFAULT_API_KEY } from '../apiKeyService';

// Constants for data delay management
const DELAY_MINUTES = 15;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
const ALLOWED_TIMEFRAMES = ['15m', '30m', '1h'];

interface CachedData {
  data: any;
  timestamp: number;
}

class DelayedDataManager {
  private cache: Map<string, CachedData>;
  private polygonClient: PolygonApiClient;

  constructor(apiKey: string = DEFAULT_API_KEY) {
    this.cache = new Map();
    this.polygonClient = new PolygonApiClient(apiKey);
  }

  /**
   * Get the cache key for a symbol and timeframe
   */
  private getCacheKey(symbol: string, timeframe: string): string {
    return `${symbol}_${timeframe}`;
  }

  /**
   * Check if data is stale and needs refresh
   */
  private isDataStale(cachedData: CachedData): boolean {
    return Date.now() - cachedData.timestamp > CACHE_DURATION;
  }

  /**
   * Validate timeframe is allowed with current subscription
   */
  private validateTimeframe(timeframe: string): boolean {
    return ALLOWED_TIMEFRAMES.includes(timeframe);
  }

  /**
   * Get delayed market data for a symbol
   */
  async getDelayedData(symbol: string, timeframe: string): Promise<any> {
    // Validate timeframe
    if (!this.validateTimeframe(timeframe)) {
      throw new Error(`Timeframe ${timeframe} not allowed with current subscription. Allowed timeframes: ${ALLOWED_TIMEFRAMES.join(', ')}`);
    }

    const cacheKey = this.getCacheKey(symbol, timeframe);
    const cachedData = this.cache.get(cacheKey);

    // Return cached data if it's still fresh
    if (cachedData && !this.isDataStale(cachedData)) {
      return cachedData.data;
    }

    // Fetch new data
    try {
      const data = await this.polygonClient.getHistoricalPrices(symbol, timeframe);
      
      // Cache the new data
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });

      return data;
    } catch (error) {
      console.error(`Error fetching delayed data for ${symbol} (${timeframe}):`, error);
      throw error;
    }
  }

  /**
   * Get delayed market data for multiple symbols
   */
  async getBatchDelayedData(symbols: string[], timeframe: string): Promise<Record<string, any>> {
    // Validate timeframe
    if (!this.validateTimeframe(timeframe)) {
      throw new Error(`Timeframe ${timeframe} not allowed with current subscription. Allowed timeframes: ${ALLOWED_TIMEFRAMES.join(', ')}`);
    }

    const results: Record<string, any> = {};
    const uncachedSymbols: string[] = [];

    // Check cache first
    for (const symbol of symbols) {
      const cacheKey = this.getCacheKey(symbol, timeframe);
      const cachedData = this.cache.get(cacheKey);

      if (cachedData && !this.isDataStale(cachedData)) {
        results[symbol] = cachedData.data;
      } else {
        uncachedSymbols.push(symbol);
      }
    }

    // Fetch data for uncached symbols
    if (uncachedSymbols.length > 0) {
      try {
        const batchData = await this.polygonClient.fetchBatchStockData(uncachedSymbols, timeframe);
        
        // Update cache and results
        for (const [symbol, data] of Object.entries(batchData)) {
          const cacheKey = this.getCacheKey(symbol, timeframe);
          this.cache.set(cacheKey, {
            data,
            timestamp: Date.now()
          });
          results[symbol] = data;
        }
      } catch (error) {
        console.error(`Error fetching batch delayed data for ${uncachedSymbols.join(', ')} (${timeframe}):`, error);
        throw error;
      }
    }

    return results;
  }

  /**
   * Clear the cache for a specific symbol and timeframe
   */
  clearCache(symbol: string, timeframe: string): void {
    const cacheKey = this.getCacheKey(symbol, timeframe);
    this.cache.delete(cacheKey);
  }

  /**
   * Clear the entire cache
   */
  clearAllCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const delayedDataManager = new DelayedDataManager();

// Export types
export type { DelayedDataManager }; 