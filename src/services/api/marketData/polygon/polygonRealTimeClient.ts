import { toast } from '@/hooks/use-toast';
import { transformRealTimeData } from './dataTransformer';
import { DEFAULT_API_KEY } from '../apiKeyService';

// Event types supported by Polygon.io WebSockets
type PolygonEventType = 'A' | 'AM' | 'T' | 'Q' | 'LULD' | 'NOI' | 'SS';

// WebSocket clusters available on Polygon.io
const POLYGON_WS_ENDPOINTS = {
  stocks: 'wss://socket.polygon.io/stocks',
  options: 'wss://socket.polygon.io/options',
  forex: 'wss://socket.polygon.io/forex',
  crypto: 'wss://socket.polygon.io/crypto',
  indices: 'wss://socket.polygon.io/indices'
};

// Real-time data options
interface RealTimeOptions {
  apiKey: string;
  symbols?: string[];
  eventTypes?: PolygonEventType[];
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  snapshotInterval?: number; // Milliseconds between snapshots when WebSocket is unavailable
  market?: 'stocks' | 'options' | 'forex' | 'crypto' | 'indices';
  onMessage?: (data: any) => void;
  onConnect?: () => void;
  onDisconnect?: (event: CloseEvent) => void;
  onError?: (error: Event) => void;
  onReconnect?: (attempt: number) => void;
  debug?: boolean;
}

// Default options 
const DEFAULT_OPTIONS: RealTimeOptions = {
  apiKey: DEFAULT_API_KEY,
  symbols: ['SPY', 'AAPL', 'MSFT', 'GOOGL', 'AMZN'], // Default symbols
  eventTypes: ['A'], // Default to aggregates (candles)
  reconnect: true,
  reconnectInterval: 5000, // 5 seconds
  maxReconnectAttempts: 10,
  snapshotInterval: 15000, // 15 seconds - used for polling when WebSocket is not available
  market: 'stocks',
  debug: false
};

/**
 * PolygonRealTimeClient provides real-time market data from Polygon.io
 * through WebSockets with fallback to REST API for delayed data
 */
export class PolygonRealTimeClient {
  private options: RealTimeOptions;
  private websocket: WebSocket | null = null;
  private connected: boolean = false;
  private reconnectAttempts: number = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private snapshotTimer: ReturnType<typeof setTimeout> | null = null;
  private lastMessageTimestamp: number = 0;
  private cachedData: Map<string, any> = new Map(); // Cache for last data point per symbol
  private eventListeners: Set<(data: any) => void> = new Set();
  private isUsingWebSocket: boolean = false;
  
  constructor(options: Partial<RealTimeOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    
    // Only attempt WebSocket in browser environments
    if (typeof window !== 'undefined' && typeof WebSocket !== 'undefined') {
      this.isUsingWebSocket = true;
    } else {
      this.isUsingWebSocket = false;
      if (this.options.debug) {
        console.log('WebSocket not available, using REST API fallback');
      }
    }
    
    // Start data connection if symbols are provided
    if (this.options.symbols && this.options.symbols.length > 0) {
      this.connect();
    }
  }
  
  /**
   * Initialize the WebSocket connection or fallback REST polling
   */
  public connect(): boolean {
    if (this.connected) {
      if (this.options.debug) {
        console.log('Already connected, disconnect first');
      }
      return false;
    }
    
    if (this.isUsingWebSocket) {
      return this.connectWebSocket();
    } else {
      return this.startSnapshotPolling();
    }
  }
  
  /**
   * Disconnect from the data stream
   */
  public disconnect(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.snapshotTimer) {
      clearTimeout(this.snapshotTimer);
      this.snapshotTimer = null;
    }
    
    this.connected = false;
    this.reconnectAttempts = 0;
    
    if (this.options.debug) {
      console.log('Disconnected from Polygon.io data stream');
    }
  }
  
  /**
   * Add a listener for real-time data events
   */
  public addListener(callback: (data: any) => void): void {
    this.eventListeners.add(callback);
  }
  
  /**
   * Remove a listener
   */
  public removeListener(callback: (data: any) => void): void {
    this.eventListeners.delete(callback);
  }
  
  /**
   * Update symbols being tracked
   */
  public updateSymbols(symbols: string[]): void {
    if (!symbols || symbols.length === 0) {
      console.warn('No symbols provided for updating');
      return;
    }
    
    this.options.symbols = [...symbols];
    
    // If connected, update the subscription
    if (this.connected && this.websocket) {
      // First unsubscribe from all symbols
      this.sendWebSocketMessage({
        action: 'unsubscribe',
        params: this.formatSubscriptionString(this.options.symbols, 'all')
      });
      
      // Then subscribe to the new symbols
      this.sendWebSocketMessage({
        action: 'subscribe',
        params: this.formatSubscriptionString(this.options.symbols)
      });
      
      if (this.options.debug) {
        console.log(`Updated symbol subscription to: ${this.options.symbols.join(', ')}`);
      }
    } 
    // If using snapshots, the next poll will use the new symbols
  }
  
  /**
   * Update event types to listen for
   */
  public updateEventTypes(eventTypes: PolygonEventType[]): void {
    if (!eventTypes || eventTypes.length === 0) {
      console.warn('No event types provided for updating');
      return;
    }
    
    this.options.eventTypes = [...eventTypes];
    
    // If connected, update the subscription
    if (this.connected && this.websocket) {
      // First unsubscribe from all current event types
      this.sendWebSocketMessage({
        action: 'unsubscribe',
        params: this.formatSubscriptionString(this.options.symbols, 'all')
      });
      
      // Then subscribe to the new event types
      this.sendWebSocketMessage({
        action: 'subscribe',
        params: this.formatSubscriptionString(this.options.symbols, this.options.eventTypes)
      });
      
      if (this.options.debug) {
        console.log(`Updated event type subscription to: ${this.options.eventTypes.join(', ')}`);
      }
    }
    // If using snapshots, this mainly affects how data is transformed
  }
  
  /**
   * Get the current connection status
   */
  public isConnected(): boolean {
    return this.connected;
  }
  
  /**
   * Check if using WebSocket or REST API fallback
   */
  public isUsingWebSockets(): boolean {
    return this.isUsingWebSocket && this.websocket !== null;
  }
  
  /**
   * Get the last cached data for a symbol
   */
  public getLastData(symbol: string): any {
    return this.cachedData.get(symbol.toUpperCase()) || null;
  }
  
  /**
   * Get all cached data
   */
  public getAllData(): Map<string, any> {
    return new Map(this.cachedData);
  }
  
  /**
   * Clear the cached data
   */
  public clearCache(): void {
    this.cachedData.clear();
  }
  
  /**
   * Get the timestamp of the last received message
   */
  public getLastMessageTimestamp(): number {
    return this.lastMessageTimestamp;
  }
  
  /**
   * Force refresh data for all symbols (useful for polling fallback)
   */
  public async forceRefresh(): Promise<void> {
    if (this.isUsingWebSocket && this.connected) {
      // For WebSocket, we can't force a refresh, but we can check connection
      if (this.websocket && this.websocket.readyState !== WebSocket.OPEN) {
        this.reconnect();
      }
      return;
    }
    
    // For REST fallback, immediately poll for fresh data
    await this.fetchSnapshots();
  }
  
  // PRIVATE METHODS
  
  /**
   * Initialize the WebSocket connection
   */
  private connectWebSocket(): boolean {
    try {
      // Choose the correct endpoint based on market type
      const endpoint = POLYGON_WS_ENDPOINTS[this.options.market || 'stocks'];
      
      // Initialize WebSocket
      this.websocket = new WebSocket(`${endpoint}`);
      
      // Set up event handlers
      this.websocket.onopen = this.handleWebSocketOpen.bind(this);
      this.websocket.onmessage = this.handleWebSocketMessage.bind(this);
      this.websocket.onclose = this.handleWebSocketClose.bind(this);
      this.websocket.onerror = this.handleWebSocketError.bind(this);
      
      if (this.options.debug) {
        console.log(`Connecting to Polygon.io WebSocket: ${endpoint}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error initializing WebSocket:', error);
      
      // Fall back to REST API if WebSocket fails
      this.isUsingWebSocket = false;
      this.startSnapshotPolling();
      
      toast({
        title: 'WebSocket Connection Failed',
        description: 'Falling back to REST API polling for market data',
        variant: 'destructive'
      });
      
      return false;
    }
  }
  
  /**
   * Handle WebSocket open event
   */
  private handleWebSocketOpen(event: Event): void {
    if (this.options.debug) {
      console.log('Polygon.io WebSocket connected');
    }
    
    // Authenticate immediately
    this.sendWebSocketMessage({
      action: 'auth',
      params: this.options.apiKey
    });
    
    this.connected = true;
    this.reconnectAttempts = 0;
    
    if (this.options.onConnect) {
      this.options.onConnect();
    }
  }
  
  /**
   * Handle WebSocket messages
   */
  private handleWebSocketMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      
      // Handle authentication response
      if (data.status === 'connected' && data.message === 'authenticated') {
        if (this.options.debug) {
          console.log('Authenticated with Polygon.io WebSocket');
        }
        
        // Subscribe to symbols
        this.sendWebSocketMessage({
          action: 'subscribe',
          params: this.formatSubscriptionString(this.options.symbols)
        });
        
        return;
      }
      
      // Skip non-data messages
      if (!Array.isArray(data)) {
        if (this.options.debug && data.status !== 'success') {
          console.log('Non-data WebSocket message:', data);
        }
        return;
      }
      
      // Process each data item
      data.forEach(item => {
        // Update timestamp
        this.lastMessageTimestamp = Date.now();
        
        // Skip if no symbol
        if (!item.sym) return;
        
        // Transform data to our format based on event type
        let transformedData;
        
        switch (item.ev) {
          case 'A':
          case 'AM':
            transformedData = transformRealTimeData(item, item.sym, 'agg');
            break;
          case 'T':
            transformedData = transformRealTimeData(item, item.sym, 'trade');
            break;
          case 'Q':
            transformedData = transformRealTimeData(item, item.sym, 'quote');
            break;
          default:
            // For other event types, just pass through with minimal processing
            transformedData = {
              symbol: item.sym,
              timestamp: new Date(item.t || Date.now()).toISOString(),
              dataType: item.ev,
              data: item
            };
        }
        
        // Cache the data by symbol
        this.cachedData.set(item.sym.toUpperCase(), transformedData);
        
        // Notify listeners
        this.notifyListeners(transformedData);
        
        // Call onMessage callback if provided
        if (this.options.onMessage) {
          this.options.onMessage(transformedData);
        }
      });
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  }
  
  /**
   * Handle WebSocket close event
   */
  private handleWebSocketClose(event: CloseEvent): void {
    this.connected = false;
    this.websocket = null;
    
    if (this.options.debug) {
      console.log(`Polygon.io WebSocket disconnected: ${event.code} - ${event.reason}`);
    }
    
    // Attempt to reconnect if enabled
    if (this.options.reconnect) {
      this.reconnect();
    }
    
    // Fall back to snapshots while trying to reconnect
    if (!this.snapshotTimer) {
      this.startSnapshotPolling();
    }
    
    if (this.options.onDisconnect) {
      this.options.onDisconnect(event);
    }
  }
  
  /**
   * Handle WebSocket error
   */
  private handleWebSocketError(event: Event): void {
    console.error('Polygon.io WebSocket error:', event);
    
    if (this.options.onError) {
      this.options.onError(event);
    }
    
    // Don't reconnect here - the onclose handler will trigger
  }
  
  /**
   * Send a message to the WebSocket
   */
  private sendWebSocketMessage(message: any): boolean {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      if (this.options.debug) {
        console.log('Cannot send message, WebSocket not open');
      }
      return false;
    }
    
    try {
      this.websocket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }
  
  /**
   * Reconnect the WebSocket after a delay
   */
  private reconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    if (this.reconnectAttempts >= (this.options.maxReconnectAttempts || 10)) {
      if (this.options.debug) {
        console.log('Maximum reconnect attempts reached, falling back to REST API');
      }
      
      this.isUsingWebSocket = false;
      this.startSnapshotPolling();
      
      toast({
        title: 'WebSocket Reconnect Failed',
        description: 'Maximum reconnect attempts reached, falling back to REST API',
        variant: 'destructive'
      });
      
      return;
    }
    
    this.reconnectAttempts++;
    
    if (this.options.debug) {
      console.log(`Reconnecting to Polygon.io WebSocket (attempt ${this.reconnectAttempts})`);
    }
    
    if (this.options.onReconnect) {
      this.options.onReconnect(this.reconnectAttempts);
    }
    
    this.reconnectTimer = setTimeout(() => {
      if (this.options.debug) {
        console.log(`Executing reconnect attempt ${this.reconnectAttempts}`);
      }
      
      this.connectWebSocket();
    }, this.options.reconnectInterval || 5000);
  }
  
  /**
   * Format the subscription string for WebSocket
   * Handles both regular symbol subscriptions and unsubscribe-all pattern
   */
  private formatSubscriptionString(symbols: string[] | string, events?: PolygonEventType[] | 'all'): string[] {
    const symbolsArray = typeof symbols === 'string' ? [symbols] : symbols;
    
    // Special case for unsubscribing from all - uses the .* pattern
    if (events === 'all') {
      return symbolsArray.map(symbol => `.*${symbol}`);
    }
    
    const eventsToUse = events || this.options.eventTypes || ['A'];
    
    // Create subscription strings in the format EVENT.SYMBOL
    const subscriptions: string[] = [];
    
    eventsToUse.forEach(event => {
      symbolsArray.forEach(symbol => {
        subscriptions.push(`${event}.${symbol}`);
      });
    });
    
    return subscriptions;
  }
  
  /**
   * Start polling for snapshots (REST API fallback)
   */
  private startSnapshotPolling(): boolean {
    if (this.snapshotTimer) {
      clearTimeout(this.snapshotTimer);
    }
    
    // Fetch initial data
    this.fetchSnapshots().catch(error => {
      console.error('Error fetching initial snapshots:', error);
    });
    
    // Set up recurring polling
    this.snapshotTimer = setInterval(() => {
      this.fetchSnapshots().catch(error => {
        console.error('Error fetching snapshots:', error);
      });
    }, this.options.snapshotInterval || 15000);
    
    this.connected = true;
    
    if (this.options.debug) {
      console.log(`Started snapshot polling with interval ${this.options.snapshotInterval}ms`);
    }
    
    return true;
  }
  
  /**
   * Fetch snapshots from REST API (fallback when WebSocket is not available)
   */
  private async fetchSnapshots(): Promise<void> {
    if (!this.options.symbols || this.options.symbols.length === 0) {
      return;
    }
    
    const symbols = this.options.symbols;
    
    try {
      // Request snapshots for all symbols in parallel
      const requests = symbols.map(symbol => 
        this.fetchSymbolSnapshot(symbol).catch(error => {
          console.error(`Error fetching snapshot for ${symbol}:`, error);
          return null;
        })
      );
      
      const results = await Promise.all(requests);
      
      // Filter out failed requests
      const validResults = results.filter(r => r !== null);
      
      if (this.options.debug) {
        console.log(`Fetched ${validResults.length} snapshots (${results.length - validResults.length} failed)`);
      }
      
      // Update timestamp
      this.lastMessageTimestamp = Date.now();
      
    } catch (error) {
      console.error('Error fetching snapshots:', error);
      
      // Show a toast only on the first failure
      if (this.lastMessageTimestamp === 0) {
        toast({
          title: 'Error Fetching Market Data',
          description: 'Failed to retrieve market snapshots',
          variant: 'destructive'
        });
      }
    }
  }
  
  /**
   * Fetch snapshot for a single symbol
   */
  public async fetchSymbolSnapshot(symbol: string): Promise<any> {
    try {
      // Determine which endpoint to use based on options.market
      const endpoint = this.getSnapshotEndpoint(symbol);
      
      // Make the request
      const response = await fetch(`${endpoint}${symbol}?apiKey=${this.options.apiKey}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Skip if no data or ticker mismatch
      if (!data || !data.ticker || data.ticker !== symbol) {
        if (this.options.debug) {
          console.log(`Invalid snapshot response for ${symbol}:`, data);
        }
        return null;
      }
      
      // Transform the data based on market type
      let transformedData;
      
      // Pick the right transformer based on data structure
      if (data.day) {
        // Stock/equity snapshot
        transformedData = transformRealTimeData({
          ticker: data.ticker,
          t: data.updated,
          o: data.day.o,
          h: data.day.h, 
          l: data.day.l,
          c: data.day.c,
          v: data.day.v,
          results: [{ 
            t: data.lastTrade.t,
            p: data.lastTrade.p,
            s: data.lastTrade.s,
            x: data.lastTrade.x,
            c: data.lastTrade.c
          }]
        }, symbol, 'agg');
      } else if (data.results) {
        // Direct from Aggregates endpoint
        transformedData = transformRealTimeData(data, symbol, 'agg');
      } else if (data.last) {
        // From the last trade/quote endpoint
        transformedData = transformRealTimeData({
          ticker: data.ticker,
          t: data.updated,
          results: [data.last]
        }, symbol, data.last.p ? 'trade' : 'quote');
      } else {
        // Fallback
        transformedData = {
          symbol,
          timestamp: new Date().toISOString(),
          rawData: data,
          isValid: false,
          message: 'Unknown data format'
        };
      }
      
      // Cache the data
      this.cachedData.set(symbol.toUpperCase(), transformedData);
      
      // Notify listeners
      this.notifyListeners(transformedData);
      
      // Call onMessage callback if provided
      if (this.options.onMessage) {
        this.options.onMessage(transformedData);
      }
      
      return transformedData;
    } catch (error) {
      console.error(`Error fetching snapshot for ${symbol}:`, error);
      throw error;
    }
  }
  
  /**
   * Get the appropriate snapshot endpoint based on market type
   */
  private getSnapshotEndpoint(symbol: string): string {
    // Base URL for Polygon.io REST API
    const baseUrl = 'https://api.polygon.io/v2/';
    
    // Default to stocks endpoint
    let endpoint = `${baseUrl}snapshot/locale/us/markets/stocks/tickers/`;
    
    // Use the right endpoint based on market type
    switch (this.options.market) {
      case 'options':
        // Options use a different endpoint format with support for option symbols
        endpoint = `${baseUrl}snapshot/options/`;
        break;
      case 'forex':
        endpoint = `${baseUrl}snapshot/locale/global/markets/forex/tickers/`;
        break;
      case 'crypto':
        endpoint = `${baseUrl}snapshot/locale/global/markets/crypto/tickers/`;
        break;
      case 'indices':
        endpoint = `${baseUrl}snapshot/locale/us/markets/indices/tickers/`;
        break;
    }
    
    return endpoint;
  }
  
  /**
   * Notify all registered listeners of new data
   */
  private notifyListeners(data: any): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error('Error in listener callback:', error);
      }
    });
  }
}

/**
 * Create a real-time client with the specified options
 */
export const createRealTimeClient = (options: Partial<RealTimeOptions> = {}): PolygonRealTimeClient => {
  return new PolygonRealTimeClient(options);
};

/**
 * Get a snapshot of the current market data for a symbol
 */
export const getMarketSnapshot = async (
  symbol: string,
  apiKey: string = DEFAULT_API_KEY,
  market: 'stocks' | 'options' | 'forex' | 'crypto' | 'indices' = 'stocks'
): Promise<any> => {
  try {
    // Create a temporary client and fetch a single snapshot
    const client = new PolygonRealTimeClient({
      apiKey,
      market,
      symbols: [symbol],
      debug: false
    });
    
    // Fetch the snapshot directly
    return await client.fetchSymbolSnapshot(symbol);
  } catch (error) {
    console.error(`Error getting market snapshot for ${symbol}:`, error);
    throw error;
  }
};

/**
 * Get the last quote for a symbol
 */
export const getLastQuote = async (
  symbol: string,
  apiKey: string = DEFAULT_API_KEY
): Promise<any> => {
  try {
    const url = `https://api.polygon.io/v2/last/nbbo/${symbol}?apiKey=${apiKey}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    return transformRealTimeData(data, symbol, 'quote');
  } catch (error) {
    console.error(`Error getting last quote for ${symbol}:`, error);
    throw error;
  }
};

/**
 * Get the last trade for a symbol
 */
export const getLastTrade = async (
  symbol: string,
  apiKey: string = DEFAULT_API_KEY
): Promise<any> => {
  try {
    const url = `https://api.polygon.io/v2/last/trade/${symbol}?apiKey=${apiKey}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    return transformRealTimeData(data, symbol, 'trade');
  } catch (error) {
    console.error(`Error getting last trade for ${symbol}:`, error);
    throw error;
  }
}; 