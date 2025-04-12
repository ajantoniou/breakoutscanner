import { Candle } from '@/services/types/patternTypes';
import PolygonClient from '@/services/api/polygon/client/polygonClient';

// Define timeframe mapping
export const TIMEFRAMES = {
  '1m': '1 Minute',
  '5m': '5 Minutes',
  '15m': '15 Minutes',
  '30m': '30 Minutes',
  '1h': '1 Hour',
  '4h': '4 Hours',
  '1d': '1 Day',
  '1w': '1 Week'
};

// Data freshness status types
export type DataFreshnessStatus = 'real-time' | 'delayed' | 'cached' | 'error' | 'stale';

// Interface for data metadata with enhanced timestamp tracking
export interface DataMetadata {
  fetchedAt: string;         // When the data was fetched from the API
  isDelayed: boolean;        // Whether the data is delayed (15-min delay for Stocks Starter)
  source: string;            // Source of the data (api, cache, error, etc.)
  lastUpdated?: string;      // When the data was last updated in our system
  validUntil?: string;       // When the data should be considered stale
  marketStatus?: 'open' | 'closed' | 'pre-market' | 'after-hours'; // Current market status
  dataAge?: number;          // Age of data in milliseconds
  requestDuration?: number;  // How long the API request took
  retryCount?: number;       // Number of retries needed to get the data
}

/**
 * Market Data Service for fetching and processing market data with comprehensive timestamp validation
 */
class MarketDataService {
  private polygonClient: PolygonClient;
  private dataCache: Map<string, { data: any, metadata: DataMetadata }>;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
  private readonly REAL_TIME_THRESHOLD = 15 * 60 * 1000; // 15 minutes in milliseconds
  private readonly MARKET_HOURS = {
    start: 9 * 60 + 30, // 9:30 AM in minutes
    end: 16 * 60        // 4:00 PM in minutes
  };
  private readonly PRE_MARKET_START = 4 * 60; // 4:00 AM in minutes
  private readonly AFTER_HOURS_END = 20 * 60; // 8:00 PM in minutes

  constructor() {
    this.polygonClient = new PolygonClient();
    this.dataCache = new Map();
  }

  /**
   * Test the connection to the data provider
   * @returns Promise with test result
   */
  async testConnection(): Promise<{success: boolean, message: string, timestamp: string}> {
    return this.polygonClient.testConnection();
  }

  /**
   * Get cache key for a symbol and timeframe
   * @param symbol Stock symbol
   * @param timeframe Timeframe string
   * @returns Cache key string
   */
  private getCacheKey(symbol: string, timeframe: string): string {
    return `${symbol}_${timeframe}`;
  }

  /**
   * Check if cached data is stale based on market hours and data age
   * @param metadata Data metadata
   * @returns Boolean indicating if data is stale
   */
  private isDataStale(metadata: DataMetadata): boolean {
    // If validUntil is set, use it as the primary staleness check
    if (metadata.validUntil) {
      return new Date() > new Date(metadata.validUntil);
    }
    
    const fetchedAt = new Date(metadata.fetchedAt).getTime();
    const currentTime = Date.now();
    const dataAge = currentTime - fetchedAt;
    
    // Get current market status
    const marketStatus = this.getCurrentMarketStatus();
    
    // Different staleness rules based on market status
    if (marketStatus === 'open') {
      // During market hours, data becomes stale more quickly
      return dataAge > this.CACHE_DURATION;
    } else if (marketStatus === 'pre-market' || marketStatus === 'after-hours') {
      // During extended hours, data can be cached longer but still needs freshness
      return dataAge > (this.CACHE_DURATION * 2);
    } else {
      // When market is closed, data can be cached much longer
      return dataAge > (this.CACHE_DURATION * 6);
    }
  }

  /**
   * Get current market status based on time
   * @returns Market status string
   */
  getCurrentMarketStatus(): 'open' | 'closed' | 'pre-market' | 'after-hours' {
    const now = new Date();
    
    // Check if it's a weekend
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return 'closed';
    }
    
    // Convert current time to minutes since midnight in Eastern Time
    const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes() - 240; // EDT offset
    
    if (currentMinutes >= this.MARKET_HOURS.start && currentMinutes < this.MARKET_HOURS.end) {
      return 'open';
    } else if (currentMinutes >= this.PRE_MARKET_START && currentMinutes < this.MARKET_HOURS.start) {
      return 'pre-market';
    } else if (currentMinutes >= this.MARKET_HOURS.end && currentMinutes < this.AFTER_HOURS_END) {
      return 'after-hours';
    } else {
      return 'closed';
    }
  }

  /**
   * Calculate data validity period based on market status and timeframe
   * @param timeframe Timeframe string
   * @returns Date when the data should be considered stale
   */
  private calculateValidUntil(timeframe: string): Date {
    const now = new Date();
    const marketStatus = this.getCurrentMarketStatus();
    
    // Base validity period in milliseconds
    let validityPeriod = this.CACHE_DURATION;
    
    // Adjust validity period based on market status
    if (marketStatus === 'open') {
      // During market hours, shorter validity for smaller timeframes
      if (timeframe === '1m' || timeframe === '5m') {
        validityPeriod = 1 * 60 * 1000; // 1 minute
      } else if (timeframe === '15m' || timeframe === '30m') {
        validityPeriod = 3 * 60 * 1000; // 3 minutes
      } else if (timeframe === '1h' || timeframe === '4h') {
        validityPeriod = 5 * 60 * 1000; // 5 minutes
      } else {
        validityPeriod = 15 * 60 * 1000; // 15 minutes for daily and weekly
      }
    } else if (marketStatus === 'pre-market' || marketStatus === 'after-hours') {
      // During extended hours, longer validity
      validityPeriod = validityPeriod * 2;
    } else {
      // When market is closed, much longer validity
      validityPeriod = validityPeriod * 6;
    }
    
    // Calculate valid until date
    const validUntil = new Date(now.getTime() + validityPeriod);
    return validUntil;
  }

  /**
   * Create comprehensive metadata for data tracking
   * @param baseMetadata Base metadata from API response
   * @param timeframe Timeframe string
   * @param requestStartTime Request start timestamp
   * @param retryCount Number of retries
   * @returns Enhanced metadata object
   */
  private createEnhancedMetadata(
    baseMetadata: Partial<DataMetadata>,
    timeframe: string,
    requestStartTime: number,
    retryCount: number = 0
  ): DataMetadata {
    const now = new Date();
    const fetchedAt = baseMetadata.fetchedAt || now.toISOString();
    const dataAge = now.getTime() - new Date(fetchedAt).getTime();
    
    return {
      fetchedAt: fetchedAt,
      isDelayed: baseMetadata.isDelayed || dataAge > this.REAL_TIME_THRESHOLD,
      source: baseMetadata.source || 'api',
      lastUpdated: now.toISOString(),
      validUntil: this.calculateValidUntil(timeframe).toISOString(),
      marketStatus: this.getCurrentMarketStatus(),
      dataAge: dataAge,
      requestDuration: requestStartTime ? now.getTime() - requestStartTime : undefined,
      retryCount: retryCount
    };
  }

  /**
   * Fetch candles for a symbol with enhanced timestamp validation
   * @param symbol Stock symbol
   * @param timeframe Timeframe string (e.g., '1m', '5m', '1h', '1d')
   * @param limit Maximum number of candles to return
   * @param from Start date (YYYY-MM-DD)
   * @param to End date (YYYY-MM-DD)
   * @param forceRefresh Force refresh from API instead of using cache
   * @returns Promise with candle data and enhanced metadata
   */
  async fetchCandles(
    symbol: string,
    timeframe: string,
    limit: number = 120,
    from?: string,
    to?: string,
    forceRefresh: boolean = false
  ): Promise<{ candles: Candle[], metadata: DataMetadata }> {
    try {
      console.log(`Fetching ${timeframe} candles for ${symbol}`);
      
      const cacheKey = this.getCacheKey(symbol, timeframe);
      const cachedData = this.dataCache.get(cacheKey);
      
      // Return cached data if it's not stale and force refresh is not requested
      if (cachedData && !this.isDataStale(cachedData.metadata) && !forceRefresh) {
        console.log(`Using cached data for ${symbol} (${timeframe})`);
        
        // Update the cached metadata with current market status
        const updatedMetadata = {
          ...cachedData.metadata,
          source: 'cache',
          marketStatus: this.getCurrentMarketStatus(),
          dataAge: Date.now() - new Date(cachedData.metadata.fetchedAt).getTime()
        };
        
        return {
          candles: this.calculateIndicators(cachedData.data),
          metadata: updatedMetadata
        };
      }
      
      // Track request start time for performance monitoring
      const requestStartTime = Date.now();
      let retryCount = 0;
      let result;
      
      // Try to fetch data with retries
      try {
        result = await this.polygonClient.getCandles(symbol, timeframe, limit, from, to);
      } catch (error) {
        console.error(`Error on first attempt for ${symbol}, retrying...`);
        retryCount++;
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
          result = await this.polygonClient.getCandles(symbol, timeframe, limit, from, to);
        } catch (secondError) {
          console.error(`Error on second attempt for ${symbol}, retrying final time...`);
          retryCount++;
          
          // Wait longer before final retry
          await new Promise(resolve => setTimeout(resolve, 2000));
          result = await this.polygonClient.getCandles(symbol, timeframe, limit, from, to);
        }
      }
      
      // Create enhanced metadata
      const enhancedMetadata = this.createEnhancedMetadata(
        result.metadata,
        timeframe,
        requestStartTime,
        retryCount
      );
      
      // Update cache with new data
      this.dataCache.set(cacheKey, {
        data: result.candles,
        metadata: enhancedMetadata
      });
      
      // Calculate indicators
      const candlesWithIndicators = this.calculateIndicators(result.candles);
      
      return {
        candles: candlesWithIndicators,
        metadata: enhancedMetadata
      };
    } catch (error) {
      console.error(`Error fetching candles for ${symbol}:`, error);
      
      // Create error metadata
      const errorMetadata = this.createEnhancedMetadata(
        {
          fetchedAt: new Date().toISOString(),
          isDelayed: true,
          source: 'error'
        },
        timeframe,
        Date.now(),
        0
      );
      
      return {
        candles: [],
        metadata: errorMetadata
      };
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
   * Get current price for a symbol with enhanced timestamp validation
   * @param symbol Stock symbol
   * @param forceRefresh Force refresh from API instead of using cache
   * @returns Promise with current price and enhanced metadata
   */
  async getCurrentPrice(symbol: string, forceRefresh: boolean = false): Promise<{ price: number, metadata: DataMetadata }> {
    try {
      const cacheKey = this.getCacheKey(symbol, 'current');
      const cachedData = this.dataCache.get(cacheKey);
      
      // Return cached data if it's not stale and force refresh is not requested
      if (cachedData && !this.isDataStale(cachedData.metadata) && !forceRefresh) {
        console.log(`Using cached current price for ${symbol}`);
        
        // Update the cached metadata with current market status
        const updatedMetadata = {
          ...cachedData.metadata,
          source: 'cache',
          marketStatus: this.getCurrentMarketStatus(),
          dataAge: Date.now() - new Date(cachedData.metadata.fetchedAt).getTime()
        };
        
        return {
          price: cachedData.data,
          metadata: updatedMetadata
        };
      }
      
      // Track request start time for performance monitoring
      const requestStartTime = Date.now();
      let retryCount = 0;
      let result;
      
      // Try to fetch data with retries
      try {
        result = await this.polygonClient.getCurrentPrice(symbol);
      } catch (error) {
        console.error(`Error on first attempt for ${symbol} current price, retrying...`);
        retryCount++;
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
          result = await this.polygonClient.getCurrentPrice(symbol);
        } catch (secondError) {
          console.error(`Error on second attempt for ${symbol} current price, retrying final time...`);
          retryCount++;
          
          // Wait longer before final retry
          await new Promise(resolve => setTimeout(resolve, 2000));
          result = await this.polygonClient.getCurrentPrice(symbol);
        }
      }
      
      // Create enhanced metadata
      const enhancedMetadata = this.createEnhancedMetadata(
        result.metadata,
        'current',
        requestStartTime,
        retryCount
      );
      
      // Update cache with new data
      this.dataCache.set(cacheKey, {
        data: result.price,
        metadata: enhancedMetadata
      });
      
      return {
        price: result.price,
        metadata: enhancedMetadata
      };
    } catch (error) {
      console.error(`Error getting current price for ${symbol}:`, error);
      
      // Create error metadata
      const errorMetadata = this.createEnhancedMetadata(
        {
          fetchedAt: new Date().toISOString(),
          isDelayed: true,
          source: 'error'
        },
        'current',
        Date.now(),
        0
      );
      
      return {
        price: 0,
        metadata: errorMetadata
      };
    }
  }

  /**
   * Verify data accuracy by comparing with another source
   * @param symbol Stock symbol
   * @returns Promise with verification result
   */
  async verifyDataAccuracy(symbol: string): Promise<{
    isAccurate: boolean,
    primaryPrice: number,
    secondaryPrice: number | null,
    discrepancy: number | null,
    metadata: DataMetadata
  }> {
    try {
      // Get primary price from Polygon
      const primaryResult = await this.getCurrentPrice(symbol, true);
      
      // If primary price is 0 or error, return immediately
      if (primaryResult.price === 0 || primaryResult.metadata.source === 'error') {
        return {
          isAccurate: false,
          primaryPrice: primaryResult.price,
          secondaryPrice: null,
          discrepancy: null,
          metadata: primaryResult.metadata
        };
      }
      
      // For now, we don't have a secondary source implemented
      // This would be where we'd add Yahoo Finance or another API as verification
      const secondaryPrice = null;
      
      return {
        isAccurate: true,
        primaryPrice: primaryResult.price,
        secondaryPrice,
        discrepancy: null,
        metadata: primaryResult.metadata
      };
    } catch (error) {
      console.error(`Error verifying data accuracy for ${symbol}:`, error);
      
      // Create error metadata
      const errorMetadata = this.createEnhancedMetadata(
        {
          fetchedAt: new Date().toISOString(),
          isDelayed: true,
          source: 'error'
        },
        'verification',
        Date.now(),
        0
      );
      
      return {
        isAccurate: false,
        primaryPrice: 0,
        secondaryPrice: null,
        discrepancy: null,
        metadata: errorMetadata
      };
    }
  }

  /**
   * Clear cache for a specific symbol and timeframe
   * @param symbol Stock symbol
   * @param timeframe Timeframe string
   */
  clearCache(symbol: string, timeframe: string): void {
    const cacheKey = this.getCacheKey(symbol, timeframe);
    this.dataCache.delete(cacheKey);
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.dataCache.clear();
  }

  /**
   * Scan multiple symbols for patterns with enhanced timestamp validation
   * @param symbols Array of stock symbols
   * @param timeframe Timeframe string (e.g., '1m', '5m', '1h', '1d')
   * @param limit Maximum number of candles to return per symbol
   * @param from Start date (YYYY-MM-DD)
   * @param to End date (YYYY-MM-DD)
   * @param forceRefresh Force refresh from API instead of using cache
   * @returns Promise with object mapping symbols to candle arrays and metadata
   */
  async scanMultipleSymbols(
    symbols: string[],
    timeframe: string,
    limit: number = 120,
    from?: string,
    to?: string,
    forceRefresh: boolean = false
  ): Promise<{ 
    data: Record<string, Candle[]>, 
    metadata: Record<string, DataMetadata>,
    scanMetadata: DataMetadata 
  }> {
    try {
      console.log(`Scanning ${symbols.length} symbols on ${timeframe} timeframe`);
      
      const scanStartTime = Date.now();
      const result: Record<string, Candle[]> = {};
      const metadata: Record<string, DataMetadata> = {};
      let totalRetries = 0;
      
      // Process symbols in batches to avoid rate limiting
      const batchSize = 5;
      for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        
        // Fetch candles for each symbol in batch
        const promises = batch.map(symbol => 
          this.fetchCandles(symbol, timeframe, limit, from, to, forceRefresh)
            .then(response => {
              result[symbol] = response.candles;
              metadata[symbol] = response.metadata;
              
              // Track retries
              if (response.metadata.retryCount) {
                totalRetries += response.metadata.retryCount;
              }
            })
            .catch(error => {
              console.error(`Error fetching candles for ${symbol}:`, error);
              result[symbol] = [];
              
              // Create error metadata
              metadata[symbol] = this.createEnhancedMetadata(
                {
                  fetchedAt: new Date().toISOString(),
                  isDelayed: true,
                  source: 'error'
                },
                timeframe,
                Date.now(),
                0
              );
            })
        );
        
        // Wait for batch to complete
        await Promise.all(promises);
        
        // Add a small delay between batches to avoid rate limiting
        if (i + batchSize < symbols.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Create scan metadata
      const scanEndTime = Date.now();
      const scanMetadata = this.createEnhancedMetadata(
        {
          fetchedAt: new Date().toISOString(),
          isDelayed: false,
          source: 'scan'
        },
        timeframe,
        scanStartTime,
        totalRetries
      );
      
      // Add scan duration
      scanMetadata.requestDuration = scanEndTime - scanStartTime;
      
      return { 
        data: result, 
        metadata,
        scanMetadata
      };
    } catch (error) {
      console.error('Error scanning multiple symbols:', error);
      
      // Create error metadata
      const errorMetadata = this.createEnhancedMetadata(
        {
          fetchedAt: new Date().toISOString(),
          isDelayed: true,
          source: 'error'
        },
        'scan',
        Date.now(),
        0
      );
      
      return { 
        data: {}, 
        metadata: {
          'error': errorMetadata
        },
        scanMetadata: errorMetadata
      };
    }
  }

  /**
   * Format a timestamp for display
   * @param timestamp ISO timestamp string
   * @returns Formatted time string (e.g., "10:30:45 AM")
   */
  formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  }

  /**
   * Get data freshness status with detailed information
   * @param metadata Data metadata
   * @returns Object with status information
   */
  getDataFreshnessStatus(metadata: DataMetadata): { 
    status: DataFreshnessStatus, 
    message: string,
    details: {
      age: string,
      source: string,
      fetchTime: string,
      marketStatus: string
    }
  } {
    if (!metadata) {
      return { 
        status: 'error', 
        message: 'No data available',
        details: {
          age: 'Unknown',
          source: 'None',
          fetchTime: 'Unknown',
          marketStatus: 'Unknown'
        }
      };
    }

    if (metadata.source === 'error') {
      return { 
        status: 'error', 
        message: 'Error fetching data',
        details: {
          age: 'Unknown',
          source: metadata.source || 'error',
          fetchTime: this.formatTimestamp(metadata.fetchedAt),
          marketStatus: metadata.marketStatus || 'Unknown'
        }
      };
    }

    // Calculate data age
    const fetchedAt = new Date(metadata.fetchedAt).getTime();
    const currentTime = Date.now();
    const dataAge = currentTime - fetchedAt;
    const ageMinutes = Math.floor(dataAge / (60 * 1000));
    const ageSeconds = Math.floor((dataAge % (60 * 1000)) / 1000);
    const ageString = ageMinutes > 0 
      ? `${ageMinutes}m ${ageSeconds}s` 
      : `${ageSeconds}s`;

    if (metadata.source === 'cache') {
      // Check if cached data is stale
      if (this.isDataStale(metadata)) {
        return { 
          status: 'stale', 
          message: `Stale data from ${ageString} ago`,
          details: {
            age: ageString,
            source: 'Cache (stale)',
            fetchTime: this.formatTimestamp(metadata.fetchedAt),
            marketStatus: metadata.marketStatus || this.getCurrentMarketStatus()
          }
        };
      }
      
      return { 
        status: 'cached', 
        message: `Cached data from ${ageString} ago`,
        details: {
          age: ageString,
          source: 'Cache',
          fetchTime: this.formatTimestamp(metadata.fetchedAt),
          marketStatus: metadata.marketStatus || this.getCurrentMarketStatus()
        }
      };
    }

    if (metadata.isDelayed || dataAge > this.REAL_TIME_THRESHOLD) {
      return { 
        status: 'delayed', 
        message: `15-minute delayed data (${ageString} old)`,
        details: {
          age: ageString,
          source: metadata.source || 'API (delayed)',
          fetchTime: this.formatTimestamp(metadata.fetchedAt),
          marketStatus: metadata.marketStatus || this.getCurrentMarketStatus()
        }
      };
    }

    return { 
      status: 'real-time', 
      message: `Real-time data (${ageString} old)`,
      details: {
        age: ageString,
        source: metadata.source || 'API (real-time)',
        fetchTime: this.formatTimestamp(metadata.fetchedAt),
        marketStatus: metadata.marketStatus || this.getCurrentMarketStatus()
      }
    };
  }

  /**
   * Log data access for auditing and debugging
   * @param symbol Stock symbol
   * @param timeframe Timeframe string
   * @param metadata Data metadata
   */
  logDataAccess(symbol: string, timeframe: string, metadata: DataMetadata): void {
    const freshness = this.getDataFreshnessStatus(metadata);
    console.log(`[DATA ACCESS] ${symbol} (${timeframe}): ${freshness.status} - ${freshness.message}`);
    
    // In a production environment, this could write to a database or file
  }
}

export default MarketDataService;
