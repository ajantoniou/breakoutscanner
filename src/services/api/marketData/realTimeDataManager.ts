import PolygonWebSocketClient from '../polygon/websocket/polygonWebSocketClient';
import { DataMetadata } from './dataService';
import PatternDetectionService from './patternDetection/patternDetectionService';
import { PatternData, Candle, PatternTimeframe } from '@/services/types/patternTypes';
import { dayTradingUniverse } from './stockUniverses';
import PatternBacktester from '../../analytics/patternBacktester';

// Define Timeframe type based on PatternTimeframe enum
type Timeframe = 'minute' | 'hour' | 'day';

/**
 * Interface for candle data with additional properties
 */
interface CandleData extends Candle {
  symbol: string;
  ema9?: number;
  ema21?: number;
  rsi?: number;
  atr?: number;
}

/**
 * Real-time data manager using Polygon WebSocket with optimized data handling
 */
export class RealTimeDataManager {
  private static instance: RealTimeDataManager;
  private webSocketClient: PolygonWebSocketClient;
  private apiClient: ApiClient;
  private patternDetector: PatternDetector;
  private patternBacktester: PatternBacktester;
  private subscribedSymbols: Set<string> = new Set();
  private candleCache: Map<string, Map<Timeframe, CandleData[]>> = new Map();
  private lastPrices: Map<string, { price: number, metadata: DataMetadata }> = new Map();
  private priceUpdateHandlers: Map<string, Set<(price: number, metadata: DataMetadata) => void>> = new Map();
  private patternUpdateHandlers: Map<string, Set<(patterns: PatternData[]) => void>> = new Map();
  private isConnected: boolean = false;
  private connectionStatusHandlers: Set<(status: boolean) => void> = new Set();
  private readonly CANDLE_TIMEFRAMES = ['1m', '5m', '15m'];
  private readonly MAX_CANDLES = 500;
  private readonly UPDATE_BATCH_SIZE = 10;
  private readonly UPDATE_INTERVAL = 100; // ms between batch processing
  private pendingUpdates: Map<string, Set<{ price: number, metadata: DataMetadata }>> = new Map();
  private processingUpdates: boolean = false;
  private updateTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.webSocketClient = new PolygonWebSocketClient();
    this.apiClient = new ApiClient();
    this.patternDetector = new PatternDetector();
    this.patternBacktester = PatternBacktester.getInstance();
    this.initializeSymbols();
    
    // Add connection status handler
    this.webSocketClient.addConnectionStatusHandler(this.handleConnectionStatus.bind(this));
    
    // Initialize the pattern backtester
    this.initializePatternBacktester();
  }

  public static getInstance(): RealTimeDataManager {
    if (!RealTimeDataManager.instance) {
      RealTimeDataManager.instance = new RealTimeDataManager();
    }
    return RealTimeDataManager.instance;
  }

  /**
   * Initialize the pattern backtester
   */
  private initializePatternBacktester(): void {
    this.patternBacktester.initialize();
  }

  /**
   * Initialize symbols for real-time data
   */
  private initializeSymbols(): void {
    // Subscribe to day trading universe by default
    dayTradingUniverse.forEach(symbol => {
      this.subscribeToSymbol(symbol);
    });
  }

  /**
   * Handle real-time price updates with batching
   */
  private handlePriceUpdate(symbol: string, price: number, metadata: DataMetadata): void {
    // Add update to pending queue
    if (!this.pendingUpdates.has(symbol)) {
      this.pendingUpdates.set(symbol, new Set());
    }
    
    const updates = this.pendingUpdates.get(symbol);
    if (updates) {
      updates.add({ price, metadata });
    }
    
    // Start processing if not already running
    this.startProcessingUpdates();
  }

  /**
   * Start processing updates in batches
   */
  private startProcessingUpdates(): void {
    if (this.processingUpdates || this.updateTimer !== null) {
      return;
    }
    
    this.updateTimer = setTimeout(() => {
      this.processPendingUpdates();
    }, this.UPDATE_INTERVAL);
  }

  /**
   * Process pending updates in batches
   */
  private processPendingUpdates(): void {
    this.processingUpdates = true;
    this.updateTimer = null;
    
    let processedCount = 0;
    const symbolsToProcess = [...this.pendingUpdates.keys()];
    
    for (const symbol of symbolsToProcess) {
      const updates = this.pendingUpdates.get(symbol);
      if (!updates || updates.size === 0) {
        this.pendingUpdates.delete(symbol);
        continue;
      }
      
      // Take a batch of updates
      const batch = [...updates].slice(0, this.UPDATE_BATCH_SIZE);
      
      // Process each update in the batch
      for (const update of batch) {
        this.processUpdate(symbol, update.price, update.metadata);
        updates.delete(update);
        processedCount++;
        
        if (processedCount >= this.UPDATE_BATCH_SIZE) {
          break;
        }
      }
      
      if (updates.size === 0) {
        this.pendingUpdates.delete(symbol);
      }
      
      if (processedCount >= this.UPDATE_BATCH_SIZE) {
        break;
      }
    }
    
    // If there are more updates to process, schedule another batch
    if (this.pendingUpdates.size > 0) {
      this.updateTimer = setTimeout(() => {
        this.processPendingUpdates();
      }, this.UPDATE_INTERVAL);
    } else {
      this.processingUpdates = false;
    }
  }
  
  /**
   * Process a single price update
   * @param symbol Stock symbol
   * @param price Updated price
   * @param metadata Data metadata
   */
  private processUpdate(symbol: string, price: number, metadata: DataMetadata): void {
    // Update candle cache for all timeframes
    this.updateCandleCache(symbol, price, metadata, 'minute');
    this.updateCandleCache(symbol, price, metadata, 'hour');
    this.updateCandleCache(symbol, price, metadata, 'day');
    
    // Check for pattern updates
    this.checkForPatternUpdates(symbol);
  }

  /**
   * Update candle cache with memory management
   */
  private updateCandleCache(
    symbol: string, 
    price: number, 
    metadata: DataMetadata, 
    timeframe: Timeframe
  ): void {
    if (!this.candleCache.has(symbol)) {
      this.candleCache.set(symbol, new Map());
    }
    
    const symbolCache = this.candleCache.get(symbol);
    if (!symbolCache) return;
    
    if (!symbolCache.has(timeframe)) {
      symbolCache.set(timeframe, []);
    }
    
    const candles = symbolCache.get(timeframe);
    if (!candles) return;
    
    // Get timestamp from metadata
    const timestamp = metadata.lastUpdated || metadata.fetchedAt;
    if (!timestamp) return;
    
    const date = new Date(timestamp);
    
    // Determine the candle period based on timeframe
    let periodStart: Date;
    switch (timeframe) {
      case 'minute':
        periodStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes());
        break;
      case 'hour':
        periodStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours());
        break;
      case 'day':
        periodStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        break;
      default:
        return;
    }
    
    // Check if we need to update an existing candle or create a new one
    let candle = candles.find(c => new Date(c.timestamp).getTime() === periodStart.getTime());
    
    if (candle) {
      // Update existing candle
      if (price > candle.high) candle.high = price;
      if (price < candle.low) candle.low = price;
      candle.close = price;
      candle.volume = (candle.volume || 0) + 1; // Increment volume
    } else {
      // Create new candle
      candle = {
        symbol,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: 1,
        timestamp: periodStart.getTime() // Use timestamp as number
      };
      
      // Add new candle to the front
      candles.unshift(candle);
      
      // Limit the number of candles to reduce memory usage
      if (candles.length > this.MAX_CANDLES) {
        candles.pop();
      }
    }
    
    // Update technical indicators
    this.updateTechnicalIndicators(candles);
  }
  
  /**
   * Update technical indicators for candles
   * @param candles Array of candles to update
   */
  private updateTechnicalIndicators(candles: CandleData[]): void {
    if (candles.length < 21) return;
    
    // Calculate EMAs
    this.calculateEMA(candles, 9);
    this.calculateEMA(candles, 21);
    
    // Calculate RSI
    this.calculateRSI(candles);
    
    // Calculate ATR
    this.calculateATR(candles);
  }
  
  /**
   * Calculate Exponential Moving Average
   * @param candles Array of candles
   * @param period EMA period
   */
  private calculateEMA(candles: CandleData[], period: number): void {
    if (candles.length < period) return;
    
    // Sort candles by timestamp (oldest to newest)
    const sortedCandles = [...candles].sort((a, b) => 
      a.timestamp - b.timestamp
    );
    
    // Calculate simple average for initial EMA
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += sortedCandles[i].close;
    }
    let ema = sum / period;
    
    // Multiplier: (2 / (period + 1))
    const multiplier = 2 / (period + 1);
    
    // Calculate EMA for each candle
    for (let i = period; i < sortedCandles.length; i++) {
      ema = (sortedCandles[i].close - ema) * multiplier + ema;
      
      // Store EMA in candle
      if (period === 9) {
        sortedCandles[i].ema9 = ema;
      } else if (period === 21) {
        sortedCandles[i].ema21 = ema;
      }
    }
  }
  
  /**
   * Calculate Relative Strength Index
   * @param candles Array of candles
   */
  private calculateRSI(candles: CandleData[]): void {
    if (candles.length < 14) return;
    
    // Sort candles by timestamp (oldest to newest)
    const sortedCandles = [...candles].sort((a, b) => 
      a.timestamp - b.timestamp
    );
    
    const period = 14;
    const changes: number[] = [];
    
    // Calculate price changes
    for (let i = 1; i < sortedCandles.length; i++) {
      changes.push(sortedCandles[i].close - sortedCandles[i-1].close);
    }
    
    // Calculate gains and losses
    let gainSum = 0;
    let lossSum = 0;
    
    for (let i = 0; i < period; i++) {
      if (changes[i] > 0) {
        gainSum += changes[i];
      } else {
        lossSum += Math.abs(changes[i]);
      }
    }
    
    let avgGain = gainSum / period;
    let avgLoss = lossSum / period;
    
    // Calculate RSI for each candle
    for (let i = period; i < changes.length; i++) {
      // Update average gain and loss
      if (changes[i] > 0) {
        avgGain = (avgGain * (period - 1) + changes[i]) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgGain = (avgGain * (period - 1)) / period;
        avgLoss = (avgLoss * (period - 1) + Math.abs(changes[i])) / period;
      }
      
      // Calculate RS and RSI
      const rs = avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));
      
      // Store RSI in candle
      sortedCandles[i+1].rsi = rsi;
    }
  }
  
  /**
   * Calculate Average True Range
   * @param candles Array of candles
   */
  private calculateATR(candles: CandleData[]): void {
    if (candles.length < 14) return;
    
    // Sort candles by timestamp (oldest to newest)
    const sortedCandles = [...candles].sort((a, b) => 
      a.timestamp - b.timestamp
    );
    
    const period = 14;
    const trueRanges: number[] = [];
    
    // Calculate true ranges
    for (let i = 1; i < sortedCandles.length; i++) {
      const high = sortedCandles[i].high;
      const low = sortedCandles[i].low;
      const prevClose = sortedCandles[i-1].close;
      
      const tr1 = high - low;
      const tr2 = Math.abs(high - prevClose);
      const tr3 = Math.abs(low - prevClose);
      
      trueRanges.push(Math.max(tr1, tr2, tr3));
    }
    
    // Calculate initial ATR
    let atr = 0;
    for (let i = 0; i < period; i++) {
      atr += trueRanges[i];
    }
    atr /= period;
    
    // Calculate ATR for each candle
    for (let i = period; i < trueRanges.length; i++) {
      atr = ((period - 1) * atr + trueRanges[i]) / period;
      
      // Store ATR in candle
      sortedCandles[i+1].atr = atr;
    }
  }

  /**
   * Check for pattern updates
   * @param symbol Stock symbol
   */
  private async checkForPatternUpdates(symbol: string): Promise<void> {
    const symbolCache = this.candleCache.get(symbol);
    if (!symbolCache) return;
    
    // Get 1m candles for pattern detection
    const candles = symbolCache.get('minute');
    if (!candles) return;
    
    try {
      // Only detect patterns if we have enough candles
      if (candles.length >= 20) {
        const { patterns } = await this.patternDetector.detectPatterns(
          symbol,
          candles,
          {
            includeHistoricalPatterns: true,
            maxPatterns: 5
          }
        );
        
        if (patterns.length > 0 && this.patternUpdateHandlers.has(symbol)) {
          this.patternUpdateHandlers.get(symbol)?.forEach(handler => handler(patterns));
        }
      }
    } catch (error) {
      console.error(`Error detecting patterns for ${symbol}:`, error);
    }
  }

  /**
   * Build candles with technical indicators
   */
  private buildCandles(trades: CandleData[], timeframe: string): Candle[] {
    // Group trades by timeframe interval
    const groupedCandles = this.groupCandlesByTimeframe(trades, timeframe);
    
    // Calculate technical indicators
    return this.calculateIndicators(groupedCandles);
  }

  /**
   * Group candles by timeframe interval
   */
  private groupCandlesByTimeframe(candles: CandleData[], timeframe: string): CandleData[] {
    const interval = this.getTimeframeInterval(timeframe);
    const grouped = new Map<number, CandleData>();

    candles.forEach(candle => {
      const timestamp = Math.floor(candle.timestamp / interval) * interval;
      
      if (!grouped.has(timestamp)) {
        grouped.set(timestamp, {
          ...candle,
          timestamp
        });
      } else {
        const existing = grouped.get(timestamp)!;
        existing.high = Math.max(existing.high, candle.high);
        existing.low = Math.min(existing.low, candle.low);
        existing.close = candle.close;
        existing.volume = (existing.volume || 0) + (candle.volume || 0);
      }
    });

    return Array.from(grouped.values()).sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get timeframe interval in milliseconds
   */
  private getTimeframeInterval(timeframe: string): number {
    switch (timeframe) {
      case '1m': return 60 * 1000;
      case '5m': return 5 * 60 * 1000;
      case '15m': return 15 * 60 * 1000;
      default: return 60 * 1000;
    }
  }

  /**
   * Calculate technical indicators for candles
   */
  private calculateIndicators(candles: CandleData[]): Candle[] {
    if (candles.length < 2) return candles;

    // Calculate EMAs
    this.calculateEMA(candles, 7);
    this.calculateEMA(candles, 20);
    this.calculateEMA(candles, 50);
    this.calculateEMA(candles, 100);
    this.calculateEMA(candles, 200);

    // Calculate RSI
    this.calculateRSI(candles);

    // Calculate ATR
    this.calculateATR(candles);

    return candles;
  }

  /**
   * Add handler for pattern updates
   */
  public addPatternUpdateHandler(symbol: string, handler: (patterns: PatternData[]) => void) {
    if (!this.patternUpdateHandlers.has(symbol)) {
      this.patternUpdateHandlers.set(symbol, new Set());
    }
    this.patternUpdateHandlers.get(symbol)?.add(handler);
  }

  /**
   * Remove handler for pattern updates
   */
  public removePatternUpdateHandler(symbol: string, handler: (patterns: PatternData[]) => void) {
    this.patternUpdateHandlers.get(symbol)?.delete(handler);
  }

  /**
   * Handle WebSocket connection status changes
   * @param status Connection status
   */
  private handleConnectionStatus(status: boolean): void {
    this.isConnected = status;
    
    // Notify all connection status handlers
    this.connectionStatusHandlers.forEach(handler => {
      handler(status);
    });
    
    // If reconnected, resubscribe to all symbols
    if (status && this.subscribedSymbols.size > 0) {
      this.resubscribeAll();
    }
  }

  /**
   * Resubscribe to all previously subscribed symbols
   */
  private resubscribeAll(): void {
    this.subscribedSymbols.forEach(symbol => {
      this.subscribeToSymbol(symbol);
    });
  }

  /**
   * Subscribe to real-time data for a symbol
   * @param symbol Stock symbol
   */
  subscribeToSymbol(symbol: string): void {
    if (!this.isConnected) {
      console.warn(`Cannot subscribe to ${symbol}: WebSocket not connected`);
      return;
    }
    
    const normalizedSymbol = symbol.toUpperCase();
    
    // Add to subscribed symbols
    this.subscribedSymbols.add(normalizedSymbol);
    
    // Subscribe to trades
    this.webSocketClient.subscribeToTrades(normalizedSymbol, this.handleTradeUpdate.bind(this, normalizedSymbol));
    
    // Subscribe to quotes
    this.webSocketClient.subscribeToQuotes(normalizedSymbol, this.handleQuoteUpdate.bind(this, normalizedSymbol));
    
    // Subscribe to minute aggregates
    this.webSocketClient.subscribeToMinuteAggregates(normalizedSymbol, this.handleAggregateUpdate.bind(this, normalizedSymbol));
  }

  /**
   * Unsubscribe from real-time data for a symbol
   * @param symbol Stock symbol
   */
  unsubscribeFromSymbol(symbol: string): void {
    const normalizedSymbol = symbol.toUpperCase();
    
    // Remove from subscribed symbols
    this.subscribedSymbols.delete(normalizedSymbol);
    
    // Unsubscribe from trades
    this.webSocketClient.unsubscribeFromTrades(normalizedSymbol);
    
    // Unsubscribe from quotes
    this.webSocketClient.unsubscribeFromQuotes(normalizedSymbol);
    
    // Unsubscribe from minute aggregates
    this.webSocketClient.unsubscribeFromMinuteAggregates(normalizedSymbol);
    
    // Remove price update handlers
    this.priceUpdateHandlers.delete(normalizedSymbol);
    
    // Remove last price
    this.lastPrices.delete(normalizedSymbol);
  }

  /**
   * Handle trade update from WebSocket
   * @param symbol Stock symbol
   * @param data Trade data
   */
  private handleTradeUpdate(symbol: string, data: any): void {
    if (!data || !data.p) {
      return;
    }
    
    const price = data.p;
    const timestamp = data.t;
    
    // Create metadata
    const metadata: DataMetadata = {
      fetchedAt: new Date(timestamp).toISOString(),
      isDelayed: false,
      source: 'websocket_trade',
      lastUpdated: new Date().toISOString(),
      marketStatus: this.getCurrentMarketStatus(),
      dataAge: Date.now() - timestamp,
      requestDuration: 0
    };
    
    // Update last price
    this.lastPrices.set(symbol, { price, metadata });
    
    // Notify all price update handlers
    this.notifyPriceUpdateHandlers(symbol, price, metadata);
  }

  /**
   * Handle quote update from WebSocket
   * @param symbol Stock symbol
   * @param data Quote data
   */
  private handleQuoteUpdate(symbol: string, data: any): void {
    if (!data || !data.bp || !data.ap) {
      return;
    }
    
    // Use midpoint of bid and ask as price
    const price = (data.bp + data.ap) / 2;
    const timestamp = data.t;
    
    // Create metadata
    const metadata: DataMetadata = {
      fetchedAt: new Date(timestamp).toISOString(),
      isDelayed: false,
      source: 'websocket_quote',
      lastUpdated: new Date().toISOString(),
      marketStatus: this.getCurrentMarketStatus(),
      dataAge: Date.now() - timestamp,
      requestDuration: 0
    };
    
    // Only update if we don't have a trade price yet
    if (!this.lastPrices.has(symbol)) {
      this.lastPrices.set(symbol, { price, metadata });
      this.notifyPriceUpdateHandlers(symbol, price, metadata);
    }
  }

  /**
   * Handle aggregate update from WebSocket
   * @param symbol Stock symbol
   * @param data Aggregate data
   */
  private handleAggregateUpdate(symbol: string, data: any): void {
    if (!data || !data.c) {
      return;
    }
    
    const price = data.c; // Close price
    const timestamp = data.e; // End timestamp
    
    // Create metadata
    const metadata: DataMetadata = {
      fetchedAt: new Date(timestamp).toISOString(),
      isDelayed: false,
      source: 'websocket_aggregate',
      lastUpdated: new Date().toISOString(),
      marketStatus: this.getCurrentMarketStatus(),
      dataAge: Date.now() - timestamp,
      requestDuration: 0
    };
    
    // Only update if we don't have a trade or quote price yet
    if (!this.lastPrices.has(symbol)) {
      this.lastPrices.set(symbol, { price, metadata });
      this.notifyPriceUpdateHandlers(symbol, price, metadata);
    }
  }

  /**
   * Notify all price update handlers for a symbol
   * @param symbol Stock symbol
   * @param price Updated price
   * @param metadata Data metadata
   */
  private notifyPriceUpdateHandlers(symbol: string, price: number, metadata: DataMetadata): void {
    const handlers = this.priceUpdateHandlers.get(symbol);
    if (handlers) {
      handlers.forEach(handler => {
        handler(price, metadata);
      });
    }
  }

  /**
   * Add price update handler for a symbol
   * @param symbol Stock symbol
   * @param handler Handler function
   */
  addPriceUpdateHandler(symbol: string, handler: (price: number, metadata: DataMetadata) => void): void {
    const normalizedSymbol = symbol.toUpperCase();
    
    // Create handlers set if it doesn't exist
    if (!this.priceUpdateHandlers.has(normalizedSymbol)) {
      this.priceUpdateHandlers.set(normalizedSymbol, new Set());
    }
    
    // Add handler
    const handlers = this.priceUpdateHandlers.get(normalizedSymbol);
    if (handlers) {
      handlers.add(handler);
    }
    
    // Subscribe to symbol if not already subscribed
    if (!this.subscribedSymbols.has(normalizedSymbol)) {
      this.subscribeToSymbol(normalizedSymbol);
    }
    
    // If we already have a price for this symbol, notify handler immediately
    const lastPrice = this.lastPrices.get(normalizedSymbol);
    if (lastPrice) {
      handler(lastPrice.price, lastPrice.metadata);
    }
  }

  /**
   * Remove price update handler for a symbol
   * @param symbol Stock symbol
   * @param handler Handler function to remove
   */
  removePriceUpdateHandler(symbol: string, handler: (price: number, metadata: DataMetadata) => void): void {
    const normalizedSymbol = symbol.toUpperCase();
    
    const handlers = this.priceUpdateHandlers.get(normalizedSymbol);
    if (handlers) {
      handlers.delete(handler);
      
      // If no more handlers for this symbol, unsubscribe
      if (handlers.size === 0) {
        this.unsubscribeFromSymbol(normalizedSymbol);
      }
    }
  }

  /**
   * Add connection status handler
   * @param handler Handler function
   */
  addConnectionStatusHandler(handler: (status: boolean) => void): void {
    this.connectionStatusHandlers.add(handler);
    
    // Notify handler immediately with current status
    handler(this.isConnected);
  }

  /**
   * Remove connection status handler
   * @param handler Handler function to remove
   */
  removeConnectionStatusHandler(handler: (status: boolean) => void): void {
    this.connectionStatusHandlers.delete(handler);
  }

  /**
   * Get current market status
   * @returns Market status string
   */
  private getCurrentMarketStatus(): 'open' | 'closed' | 'pre-market' | 'after-hours' {
    const now = new Date();
    
    // Check if it's a weekend
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return 'closed';
    }
    
    // Convert current time to minutes since midnight in Eastern Time
    const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes() - 240; // EDT offset
    
    // Market hours
    const MARKET_HOURS = {
      start: 9 * 60 + 30, // 9:30 AM in minutes
      end: 16 * 60        // 4:00 PM in minutes
    };
    const PRE_MARKET_START = 4 * 60; // 4:00 AM in minutes
    const AFTER_HOURS_END = 20 * 60; // 8:00 PM in minutes
    
    if (currentMinutes >= MARKET_HOURS.start && currentMinutes < MARKET_HOURS.end) {
      return 'open';
    } else if (currentMinutes >= PRE_MARKET_START && currentMinutes < MARKET_HOURS.start) {
      return 'pre-market';
    } else if (currentMinutes >= MARKET_HOURS.end && currentMinutes < AFTER_HOURS_END) {
      return 'after-hours';
    } else {
      return 'closed';
    }
  }

  /**
   * Get last price for a symbol
   * @param symbol Stock symbol
   * @returns Last price and metadata, or null if not available
   */
  getLastPrice(symbol: string): { price: number, metadata: DataMetadata } | null {
    const normalizedSymbol = symbol.toUpperCase();
    return this.lastPrices.get(normalizedSymbol) || null;
  }

  /**
   * Get connection status
   * @returns Boolean indicating if connected
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    this.webSocketClient.disconnect();
    this.isConnected = false;
    this.subscribedSymbols.clear();
    this.priceUpdateHandlers.clear();
    this.lastPrices.clear();
  }

  /**
   * Get performance metrics from the pattern backtester
   */
  public getPatternPerformanceMetrics() {
    return this.patternBacktester.getPerformanceMetrics();
  }
}
