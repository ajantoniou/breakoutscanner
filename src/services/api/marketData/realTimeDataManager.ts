import PolygonWebSocketClient from '@/services/api/polygon/websocket/polygonWebSocketClient';
import { DataMetadata } from '@/services/api/marketData/dataService';

/**
 * Real-time data manager using Polygon WebSocket
 */
class RealTimeDataManager {
  private webSocketClient: PolygonWebSocketClient;
  private isConnected: boolean = false;
  private subscribedSymbols: Set<string> = new Set();
  private priceUpdateHandlers: Map<string, Set<(price: number, metadata: DataMetadata) => void>> = new Map();
  private connectionStatusHandlers: Set<(status: boolean) => void> = new Set();
  private lastPrices: Map<string, { price: number, metadata: DataMetadata }> = new Map();

  constructor() {
    this.webSocketClient = new PolygonWebSocketClient();
    
    // Add connection status handler
    this.webSocketClient.addConnectionStatusHandler(this.handleConnectionStatus.bind(this));
  }

  /**
   * Initialize the real-time data manager
   * @returns Promise that resolves when connected
   */
  async initialize(): Promise<boolean> {
    try {
      const connected = await this.webSocketClient.connect();
      this.isConnected = connected;
      return connected;
    } catch (error) {
      console.error('Error initializing real-time data manager:', error);
      this.isConnected = false;
      return false;
    }
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
}

export default RealTimeDataManager;
