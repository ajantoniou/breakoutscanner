import { PolygonService, PolygonCandle, TimeframeString } from '../api/PolygonService';
import { 
  PolygonWebSocketService, 
  WebSocketConnectionStatus, 
  PolygonTradeEvent, 
  PolygonQuoteEvent,
  PolygonAggregateEvent
} from '../api/realtime/PolygonWebSocketService';
import { LoggingService, LogCategory } from '../logging/LoggingService';

export interface MarketDataOptions {
  apiKey: string;
  enableRealtime: boolean;
  cacheTTLSeconds: number;
  maxCacheEntries: number;
}

export interface CachedData<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface ConnectionStatusListener {
  (status: WebSocketConnectionStatus, detail?: string): void;
}

export interface QuoteListener {
  (symbol: string, price: number, bid: number, ask: number, timestamp: number): void;
}

export interface TradeListener {
  (symbol: string, price: number, size: number, timestamp: number): void;
}

export interface AggregateListener {
  (symbol: string, candle: PolygonCandle, timeframe: string): void;
}

type CacheKey = string;

/**
 * Service for fetching and managing market data from multiple sources
 */
export class MarketDataService {
  private static instance: MarketDataService;
  private options: MarketDataOptions;
  private polygonService: PolygonService;
  private webSocketService: PolygonWebSocketService | null = null;
  private logger: LoggingService;
  
  // Data caching
  private dataCache: Map<CacheKey, CachedData<any>> = new Map();
  private cacheClearInterval: NodeJS.Timeout | null = null;
  
  // Event listeners
  private connectionListeners: ConnectionStatusListener[] = [];
  private quoteListeners: Map<string, QuoteListener[]> = new Map();
  private tradeListeners: Map<string, TradeListener[]> = new Map();
  private aggregateListeners: Map<string, AggregateListener[]> = new Map();
  
  private constructor(options: MarketDataOptions) {
    this.options = {
      cacheTTLSeconds: 60, // Default 1 minute cache TTL
      maxCacheEntries: 1000, // Default max cache entries
      ...options
    };
    
    this.polygonService = PolygonService.getInstance({
      apiKey: options.apiKey
    });
    
    this.logger = LoggingService.getInstance();
    
    // Initialize WebSocket service if real-time is enabled
    if (options.enableRealtime) {
      this.initializeWebSocket();
    }
    
    // Set up cache cleanup interval
    this.cacheClearInterval = setInterval(() => this.cleanupCache(), 60000); // Clean every minute
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(options?: MarketDataOptions): MarketDataService {
    if (!MarketDataService.instance) {
      if (!options) {
        throw new Error('MarketDataService requires options on initialization');
      }
      MarketDataService.instance = new MarketDataService(options);
    }
    return MarketDataService.instance;
  }
  
  /**
   * Get historical candles for a symbol
   */
  public async getCandles(
    symbol: string,
    timeframe: TimeframeString,
    from: Date,
    to: Date,
    forceRefresh: boolean = false
  ): Promise<PolygonCandle[]> {
    const cacheKey = this.getCandlesCacheKey(symbol, timeframe, from, to);
    
    // Check cache first (unless force refresh is requested)
    if (!forceRefresh) {
      const cachedData = this.getCachedData<PolygonCandle[]>(cacheKey);
      if (cachedData) {
        this.logger.debug('Returning cached candles', LogCategory.API, {
          symbol,
          timeframe,
          from: from.toISOString(),
          to: to.toISOString()
        });
        return cachedData;
      }
    }
    
    // Fetch fresh data
    try {
      const startTime = Date.now();
      const candles = await this.polygonService.getAggregates(symbol, timeframe, from, to);
      
      // Cache the result
      this.cacheData(cacheKey, candles);
      
      this.logger.logPerformance('MarketDataService.getCandles', Date.now() - startTime, {
        symbol,
        timeframe,
        from: from.toISOString(),
        to: to.toISOString(),
        count: candles.length
      });
      
      return candles;
    } catch (error) {
      this.logger.error(
        `Failed to fetch candles for ${symbol}`, 
        LogCategory.API, 
        { 
          symbol, 
          timeframe, 
          from: from.toISOString(), 
          to: to.toISOString(), 
          error: (error as Error).message 
        }
      );
      
      throw error;
    }
  }
  
  /**
   * Get last price for a symbol
   */
  public async getLastPrice(symbol: string): Promise<number> {
    // Try to get from real-time service first if available
    if (this.webSocketService && 
        this.webSocketService.getConnectionStatus() === WebSocketConnectionStatus.SUBSCRIBED) {
      // Real-time price might be available in cache
      const realtimeCacheKey = this.getRealtimePriceCacheKey(symbol);
      const cachedData = this.getCachedData<number>(realtimeCacheKey);
      if (cachedData) {
        return cachedData;
      }
    }
    
    // Fall back to REST API
    try {
      const quote = await this.polygonService.getLastQuote(symbol);
      return (quote.p || quote.bp + quote.ap) / 2; // Average of bid and ask if price not available
    } catch (error) {
      this.logger.error(
        `Failed to fetch last price for ${symbol}`, 
        LogCategory.API, 
        { symbol, error: (error as Error).message }
      );
      throw error;
    }
  }
  
  /**
   * Subscribe to real-time updates for a symbol
   */
  public subscribeToRealtime(
    symbol: string,
    options: {
      trades?: boolean,
      quotes?: boolean,
      aggregates?: boolean,
      timeframe?: '1min' | '5min' | '15min'
    } = { quotes: true }
  ): boolean {
    if (!this.webSocketService) {
      this.logger.warn('Real-time updates not enabled', LogCategory.WEBSOCKET, { symbol });
      return false;
    }
    
    // Ensure WebSocket is connected
    if (this.webSocketService.getConnectionStatus() !== WebSocketConnectionStatus.AUTHENTICATED &&
        this.webSocketService.getConnectionStatus() !== WebSocketConnectionStatus.SUBSCRIBED) {
      this.webSocketService.connect().catch(error => {
        this.logger.error('Failed to connect to WebSocket', LogCategory.WEBSOCKET, {
          error: (error as Error).message
        });
      });
    }
    
    // Subscribe to requested data types
    const subscriptionPromises: Promise<any>[] = [];
    
    if (options.trades) {
      subscriptionPromises.push(this.webSocketService.subscribe([symbol], 'T'));
      
      // Set up trade callback if not already set
      this.webSocketService.onTrade(symbol, (event) => {
        // Cache the latest price
        this.cacheData(this.getRealtimePriceCacheKey(symbol), event.p, 600); // 10 min cache
        
        // Notify listeners
        this.notifyTradeListeners(symbol, event);
      });
    }
    
    if (options.quotes) {
      subscriptionPromises.push(this.webSocketService.subscribe([symbol], 'Q'));
      
      // Set up quote callback if not already set
      this.webSocketService.onQuote(symbol, (event) => {
        // Cache the mid price
        const midPrice = (event.bp + event.ap) / 2;
        this.cacheData(this.getRealtimePriceCacheKey(symbol), midPrice, 600); // 10 min cache
        
        // Notify listeners
        this.notifyQuoteListeners(symbol, event);
      });
    }
    
    if (options.aggregates) {
      // Use minute aggregates as default
      const aggType = options.timeframe === '1min' ? 'A' : 'AM';
      subscriptionPromises.push(this.webSocketService.subscribe([symbol], aggType));
      
      // Set up aggregate callback if not already set
      this.webSocketService.onAggregate(symbol, (event) => {
        // Create a candle object
        const candle: PolygonCandle = {
          o: event.o,
          h: event.h,
          l: event.l,
          c: event.c,
          v: event.v,
          t: event.s, // Start timestamp
          vw: event.vw
        };
        
        // Cache the latest price from close
        this.cacheData(this.getRealtimePriceCacheKey(symbol), event.c, 600); // 10 min cache
        
        // Notify listeners
        this.notifyAggregateListeners(symbol, candle, options.timeframe || '1min');
      });
    }
    
    // Return true if any subscriptions were requested
    return subscriptionPromises.length > 0;
  }
  
  /**
   * Unsubscribe from real-time updates for a symbol
   */
  public unsubscribeFromRealtime(symbol: string): boolean {
    if (!this.webSocketService) {
      return false;
    }
    
    // Unsubscribe from all data types
    try {
      this.webSocketService.unsubscribe([symbol], 'T');
      this.webSocketService.unsubscribe([symbol], 'Q');
      this.webSocketService.unsubscribe([symbol], 'A');
      this.webSocketService.unsubscribe([symbol], 'AM');
      return true;
    } catch (error) {
      this.logger.error('Failed to unsubscribe', LogCategory.WEBSOCKET, {
        symbol,
        error: (error as Error).message
      });
      return false;
    }
  }
  
  /**
   * Add listener for connection status events
   */
  public addConnectionStatusListener(listener: ConnectionStatusListener): void {
    this.connectionListeners.push(listener);
    
    // If WebSocket service exists, add the listener
    if (this.webSocketService) {
      this.webSocketService.onStatus(listener);
    }
  }
  
  /**
   * Add listener for quote events
   */
  public addQuoteListener(symbol: string, listener: QuoteListener): void {
    if (!this.quoteListeners.has(symbol)) {
      this.quoteListeners.set(symbol, []);
    }
    
    this.quoteListeners.get(symbol)!.push(listener);
  }
  
  /**
   * Add listener for trade events
   */
  public addTradeListener(symbol: string, listener: TradeListener): void {
    if (!this.tradeListeners.has(symbol)) {
      this.tradeListeners.set(symbol, []);
    }
    
    this.tradeListeners.get(symbol)!.push(listener);
  }
  
  /**
   * Add listener for aggregate events
   */
  public addAggregateListener(symbol: string, listener: AggregateListener): void {
    if (!this.aggregateListeners.has(symbol)) {
      this.aggregateListeners.set(symbol, []);
    }
    
    this.aggregateListeners.get(symbol)!.push(listener);
  }
  
  /**
   * Get connection status
   */
  public getConnectionStatus(): WebSocketConnectionStatus {
    if (!this.webSocketService) {
      return WebSocketConnectionStatus.DISCONNECTED;
    }
    
    return this.webSocketService.getConnectionStatus();
  }
  
  /**
   * Clear all cached data
   */
  public clearCache(): void {
    this.dataCache.clear();
    this.logger.info('Cache cleared', LogCategory.SYSTEM, {
      service: 'MarketDataService'
    });
  }
  
  /**
   * Get statistics about the cache
   */
  public getCacheStats(): { size: number, maxSize: number, ttlSeconds: number } {
    return {
      size: this.dataCache.size,
      maxSize: this.options.maxCacheEntries,
      ttlSeconds: this.options.cacheTTLSeconds
    };
  }
  
  /**
   * Clean up resources when service is no longer needed
   */
  public dispose(): void {
    if (this.webSocketService) {
      this.webSocketService.disconnect();
    }
    
    if (this.cacheClearInterval) {
      clearInterval(this.cacheClearInterval);
      this.cacheClearInterval = null;
    }
    
    this.dataCache.clear();
    this.connectionListeners = [];
    this.quoteListeners.clear();
    this.tradeListeners.clear();
    this.aggregateListeners.clear();
  }
  
  /**
   * Initialize WebSocket service
   */
  private initializeWebSocket(): void {
    try {
      this.webSocketService = PolygonWebSocketService.getInstance(this.options.apiKey);
      
      // Add status listener to notify our own listeners
      this.webSocketService.onStatus((status, detail) => {
        // Forward status to our listeners
        for (const listener of this.connectionListeners) {
          try {
            listener(status, detail);
          } catch (error) {
            this.logger.error('Error in connection status listener', LogCategory.WEBSOCKET, {
              error: (error as Error).message
            });
          }
        }
      });
      
      this.logger.info('WebSocket service initialized', LogCategory.WEBSOCKET);
    } catch (error) {
      this.logger.error('Failed to initialize WebSocket service', LogCategory.WEBSOCKET, {
        error: (error as Error).message
      });
    }
  }
  
  /**
   * Cache data with TTL
   */
  private cacheData<T>(key: string, data: T, ttlSeconds: number = this.options.cacheTTLSeconds): void {
    // Check if we need to enforce max cache size
    if (this.dataCache.size >= this.options.maxCacheEntries) {
      // Simple LRU implementation: remove oldest entries
      const entriesToDelete = Math.ceil(this.options.maxCacheEntries * 0.1); // Remove 10%
      const entries = Array.from(this.dataCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp) // Sort by timestamp (oldest first)
        .slice(0, entriesToDelete);
      
      for (const [entryKey] of entries) {
        this.dataCache.delete(entryKey);
      }
      
      this.logger.debug(`Removed ${entriesToDelete} old cache entries`, LogCategory.SYSTEM, {
        service: 'MarketDataService',
        cacheSize: this.dataCache.size
      });
    }
    
    const now = Date.now();
    const expiresAt = now + (ttlSeconds * 1000);
    
    this.dataCache.set(key, {
      data,
      timestamp: now,
      expiresAt
    });
  }
  
  /**
   * Get cached data if available and not expired
   */
  private getCachedData<T>(key: string): T | null {
    const cachedEntry = this.dataCache.get(key);
    
    if (!cachedEntry) {
      return null;
    }
    
    const now = Date.now();
    
    // Check if expired
    if (now > cachedEntry.expiresAt) {
      this.dataCache.delete(key);
      return null;
    }
    
    return cachedEntry.data as T;
  }
  
  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const [key, entry] of this.dataCache.entries()) {
      if (now > entry.expiresAt) {
        this.dataCache.delete(key);
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      this.logger.debug(`Removed ${expiredCount} expired cache entries`, LogCategory.SYSTEM, {
        service: 'MarketDataService',
        remainingEntries: this.dataCache.size
      });
    }
  }
  
  /**
   * Generate cache key for candles
   */
  private getCandlesCacheKey(
    symbol: string,
    timeframe: string,
    from: Date,
    to: Date
  ): string {
    return `candles:${symbol}:${timeframe}:${from.getTime()}:${to.getTime()}`;
  }
  
  /**
   * Generate cache key for real-time price
   */
  private getRealtimePriceCacheKey(symbol: string): string {
    return `realtimePrice:${symbol}`;
  }
  
  /**
   * Notify trade event listeners
   */
  private notifyTradeListeners(symbol: string, event: PolygonTradeEvent): void {
    if (!this.tradeListeners.has(symbol)) {
      return;
    }
    
    for (const listener of this.tradeListeners.get(symbol)!) {
      try {
        listener(symbol, event.p, event.s, event.t);
      } catch (error) {
        this.logger.error('Error in trade listener', LogCategory.WEBSOCKET, {
          symbol,
          error: (error as Error).message
        });
      }
    }
  }
  
  /**
   * Notify quote event listeners
   */
  private notifyQuoteListeners(symbol: string, event: PolygonQuoteEvent): void {
    if (!this.quoteListeners.has(symbol)) {
      return;
    }
    
    for (const listener of this.quoteListeners.get(symbol)!) {
      try {
        const midPrice = (event.bp + event.ap) / 2;
        listener(symbol, midPrice, event.bp, event.ap, event.t);
      } catch (error) {
        this.logger.error('Error in quote listener', LogCategory.WEBSOCKET, {
          symbol,
          error: (error as Error).message
        });
      }
    }
  }
  
  /**
   * Notify aggregate event listeners
   */
  private notifyAggregateListeners(symbol: string, candle: PolygonCandle, timeframe: string): void {
    if (!this.aggregateListeners.has(symbol)) {
      return;
    }
    
    for (const listener of this.aggregateListeners.get(symbol)!) {
      try {
        listener(symbol, candle, timeframe);
      } catch (error) {
        this.logger.error('Error in aggregate listener', LogCategory.WEBSOCKET, {
          symbol,
          error: (error as Error).message
        });
      }
    }
  }
} 