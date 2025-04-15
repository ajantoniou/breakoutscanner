import { LoggingService, LogCategory } from '../../logging/LoggingService';

// WebSocket message types
export interface PolygonWebSocketMessage<T> {
  ev: string;         // Event type
  status: string;     // Status
  message?: string;   // Optional message
  data?: T;           // Data payload
}

// Trade event
export interface PolygonTradeEvent {
  sym: string;        // Symbol
  p: number;          // Price
  s: number;          // Size (volume)
  t: number;          // Timestamp (ms since epoch)
  c: number[];        // Condition codes
  x: number;          // Exchange ID
  i: string;          // Trade ID
}

// Quote event
export interface PolygonQuoteEvent {
  sym: string;        // Symbol
  bp: number;         // Bid price
  bs: number;         // Bid size
  ap: number;         // Ask price
  as: number;         // Ask size
  t: number;          // Timestamp (ms since epoch)
  bx: number;         // Bid exchange ID
  ax: number;         // Ask exchange ID
}

// Aggregate/candle event
export interface PolygonAggregateEvent {
  sym: string;        // Symbol
  v: number;          // Volume
  o: number;          // Open price
  c: number;          // Close price
  h: number;          // High price
  l: number;          // Low price
  s: number;          // Start timestamp (ms since epoch)
  e: number;          // End timestamp (ms since epoch)
  vw: number;         // Volume-weighted average price
}

// Subscription status
export interface PolygonSubscriptionStatus {
  status: 'success' | 'error';
  message?: string;
}

// Connection status enum
export enum WebSocketConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  AUTHENTICATED = 'authenticated',
  SUBSCRIBED = 'subscribed',
  ERROR = 'error'
}

// Subscription types
export type SubscriptionType = 'T' | 'Q' | 'A' | 'AM';

// WebSocket callback types
export type TradeCallback = (event: PolygonTradeEvent) => void;
export type QuoteCallback = (event: PolygonQuoteEvent) => void;
export type AggregateCallback = (event: PolygonAggregateEvent) => void;
export type StatusCallback = (status: WebSocketConnectionStatus, detail?: string) => void;

/**
 * Service for streaming real-time data from Polygon.io via WebSocket
 */
export class PolygonWebSocketService {
  private static instance: PolygonWebSocketService;
  private apiKey: string;
  private websocketUrl: string;
  private socket: WebSocket | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 2000; // Start with 2 seconds
  private connectionStatus: WebSocketConnectionStatus = WebSocketConnectionStatus.DISCONNECTED;
  private subscriptions: Map<string, Set<string>> = new Map();
  private tradeCallbacks: Map<string, TradeCallback[]> = new Map();
  private quoteCallbacks: Map<string, QuoteCallback[]> = new Map();
  private aggregateCallbacks: Map<string, AggregateCallback[]> = new Map();
  private statusCallbacks: StatusCallback[] = [];
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastHeartbeat: number = 0;
  private logger: LoggingService;
  
  private constructor(apiKey: string, websocketUrl?: string) {
    this.apiKey = apiKey;
    this.websocketUrl = websocketUrl || 'wss://socket.polygon.io/stocks';
    this.logger = LoggingService.getInstance();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(apiKey?: string, websocketUrl?: string): PolygonWebSocketService {
    if (!PolygonWebSocketService.instance) {
      if (!apiKey) {
        throw new Error('PolygonWebSocketService requires API key on initialization');
      }
      PolygonWebSocketService.instance = new PolygonWebSocketService(apiKey, websocketUrl);
    }
    return PolygonWebSocketService.instance;
  }

  /**
   * Connect to Polygon WebSocket
   */
  public connect(): Promise<void> {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return Promise.resolve();
    }

    this.setStatus(WebSocketConnectionStatus.CONNECTING);
    
    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(this.websocketUrl);
        
        this.socket.onopen = () => {
          this.logger.info('Connected to Polygon WebSocket', LogCategory.WEBSOCKET);
          this.authenticate();
        };
        
        this.socket.onmessage = (event) => {
          this.handleMessage(event.data);
        };
        
        this.socket.onerror = (error) => {
          this.logger.error('WebSocket error', LogCategory.WEBSOCKET, { error });
          this.setStatus(WebSocketConnectionStatus.ERROR, 'WebSocket connection error');
          reject(error);
        };
        
        this.socket.onclose = (event) => {
          this.logger.warn('WebSocket closed', LogCategory.WEBSOCKET, { 
            code: event.code, 
            reason: event.reason,
            wasClean: event.wasClean 
          });
          
          this.cleanupConnection();
          
          if (this.connectionStatus !== WebSocketConnectionStatus.ERROR) {
            this.setStatus(WebSocketConnectionStatus.DISCONNECTED);
          }
          
          // Attempt to reconnect if not explicitly closed by user
          if (event.code !== 1000) {
            this.scheduleReconnect();
          }
        };
        
        // Setup authentication listener
        const authListener = (status: WebSocketConnectionStatus) => {
          if (status === WebSocketConnectionStatus.AUTHENTICATED) {
            // Remove the listener
            this.removeStatusCallback(authListener);
            resolve();
          } else if (status === WebSocketConnectionStatus.ERROR) {
            // Remove the listener
            this.removeStatusCallback(authListener);
            reject(new Error('Authentication failed'));
          }
        };
        
        this.addStatusCallback(authListener);
        
      } catch (error) {
        this.setStatus(WebSocketConnectionStatus.ERROR, 'Failed to connect to WebSocket');
        reject(error);
      }
    });
  }

  /**
   * Disconnect from Polygon WebSocket
   */
  public disconnect(): void {
    if (this.socket) {
      // Clear all subscriptions
      this.subscriptions.clear();
      
      // Close the socket
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.close(1000, 'User initiated disconnect');
      }
      
      this.cleanupConnection();
      this.setStatus(WebSocketConnectionStatus.DISCONNECTED);
    }
  }

  /**
   * Subscribe to a specific symbol and event type
   */
  public subscribe(symbols: string[], type: SubscriptionType = 'T'): Promise<PolygonSubscriptionStatus> {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error('WebSocket not connected'));
    }

    if (!this.subscriptions.has(type)) {
      this.subscriptions.set(type, new Set());
    }
    
    // Add symbols to subscription set
    const symbolSet = this.subscriptions.get(type)!;
    symbols.forEach(symbol => symbolSet.add(symbol));
    
    // Send subscription message
    const subscribeMsg = {
      action: 'subscribe',
      params: symbols.map(symbol => `${type}.${symbol}`)
    };
    
    return new Promise((resolve, reject) => {
      try {
        this.socket!.send(JSON.stringify(subscribeMsg));
        this.logger.info('Sent subscription request', LogCategory.WEBSOCKET, { 
          type, 
          symbols 
        });
        
        resolve({ status: 'success' });
      } catch (error) {
        this.logger.error('Failed to send subscription', LogCategory.WEBSOCKET, { 
          error: (error as Error).message, 
          type, 
          symbols 
        });
        reject(error);
      }
    });
  }

  /**
   * Unsubscribe from a specific symbol and event type
   */
  public unsubscribe(symbols: string[], type: SubscriptionType = 'T'): Promise<PolygonSubscriptionStatus> {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error('WebSocket not connected'));
    }

    if (this.subscriptions.has(type)) {
      const symbolSet = this.subscriptions.get(type)!;
      symbols.forEach(symbol => symbolSet.delete(symbol));
    }
    
    // Send unsubscribe message
    const unsubscribeMsg = {
      action: 'unsubscribe',
      params: symbols.map(symbol => `${type}.${symbol}`)
    };
    
    return new Promise((resolve, reject) => {
      try {
        this.socket!.send(JSON.stringify(unsubscribeMsg));
        this.logger.info('Sent unsubscription request', LogCategory.WEBSOCKET, { 
          type, 
          symbols 
        });
        
        resolve({ status: 'success' });
      } catch (error) {
        this.logger.error('Failed to send unsubscription', LogCategory.WEBSOCKET, { 
          error: (error as Error).message, 
          type, 
          symbols 
        });
        reject(error);
      }
    });
  }

  /**
   * Register a callback for trade events
   */
  public onTrade(symbol: string, callback: TradeCallback): void {
    if (!this.tradeCallbacks.has(symbol)) {
      this.tradeCallbacks.set(symbol, []);
    }
    
    this.tradeCallbacks.get(symbol)!.push(callback);
  }

  /**
   * Register a callback for quote events
   */
  public onQuote(symbol: string, callback: QuoteCallback): void {
    if (!this.quoteCallbacks.has(symbol)) {
      this.quoteCallbacks.set(symbol, []);
    }
    
    this.quoteCallbacks.get(symbol)!.push(callback);
  }

  /**
   * Register a callback for aggregate events
   */
  public onAggregate(symbol: string, callback: AggregateCallback): void {
    if (!this.aggregateCallbacks.has(symbol)) {
      this.aggregateCallbacks.set(symbol, []);
    }
    
    this.aggregateCallbacks.get(symbol)!.push(callback);
  }

  /**
   * Register a callback for status events
   */
  public onStatus(callback: StatusCallback): void {
    this.addStatusCallback(callback);
  }

  /**
   * Get current connection status
   */
  public getConnectionStatus(): WebSocketConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * Get all current subscriptions
   */
  public getSubscriptions(): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    
    this.subscriptions.forEach((symbols, type) => {
      result[type] = Array.from(symbols);
    });
    
    return result;
  }

  /**
   * Add status callback
   */
  private addStatusCallback(callback: StatusCallback): void {
    this.statusCallbacks.push(callback);
  }

  /**
   * Remove status callback
   */
  private removeStatusCallback(callback: StatusCallback): void {
    const index = this.statusCallbacks.indexOf(callback);
    if (index !== -1) {
      this.statusCallbacks.splice(index, 1);
    }
  }

  /**
   * Set connection status and notify listeners
   */
  private setStatus(status: WebSocketConnectionStatus, detail?: string): void {
    this.connectionStatus = status;
    
    // Notify all status callbacks
    for (const callback of this.statusCallbacks) {
      try {
        callback(status, detail);
      } catch (error) {
        this.logger.error('Error in status callback', LogCategory.WEBSOCKET, { 
          error: (error as Error).message 
        });
      }
    }
  }

  /**
   * Authenticate with API key
   */
  private authenticate(): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const authMsg = {
        action: 'auth',
        params: this.apiKey
      };
      
      this.socket.send(JSON.stringify(authMsg));
      this.logger.info('Sent authentication request', LogCategory.WEBSOCKET);
    }
  }

  /**
   * Process incoming WebSocket messages
   */
  private handleMessage(data: string): void {
    try {
      const messages = JSON.parse(data);
      const messageArray = Array.isArray(messages) ? messages : [messages];
      
      for (const message of messageArray) {
        // Handle different message types
        if (message.ev === 'status') {
          this.handleStatusMessage(message);
        } else if (message.ev === 'T') {
          this.handleTradeMessage(message as PolygonWebSocketMessage<PolygonTradeEvent>);
        } else if (message.ev === 'Q') {
          this.handleQuoteMessage(message as PolygonWebSocketMessage<PolygonQuoteEvent>);
        } else if (message.ev === 'AM' || message.ev === 'A') {
          this.handleAggregateMessage(message as PolygonWebSocketMessage<PolygonAggregateEvent>);
        }
      }
      
      // Update heartbeat timestamp
      this.lastHeartbeat = Date.now();
      
    } catch (error) {
      this.logger.error('Error processing WebSocket message', LogCategory.WEBSOCKET, { 
        error: (error as Error).message,
        data 
      });
    }
  }

  /**
   * Handle status messages
   */
  private handleStatusMessage(message: any): void {
    if (message.status === 'connected') {
      // Connection established, now authenticate
      this.logger.info('WebSocket connected, authenticating', LogCategory.WEBSOCKET);
    } else if (message.status === 'auth_success') {
      // Authentication successful
      this.setStatus(WebSocketConnectionStatus.AUTHENTICATED);
      this.reconnectAttempts = 0; // Reset reconnect attempts
      this.startHeartbeat();
      
      // Re-subscribe to previously subscribed symbols
      this.resubscribe();
      
      this.logger.info('Authentication successful', LogCategory.WEBSOCKET);
    } else if (message.status === 'auth_failed') {
      this.setStatus(WebSocketConnectionStatus.ERROR, 'Authentication failed');
      this.logger.error('Authentication failed', LogCategory.WEBSOCKET, { message: message.message });
    } else if (message.status === 'success' && message.message && message.message.includes('subscribed')) {
      // Subscription successful
      this.setStatus(WebSocketConnectionStatus.SUBSCRIBED);
      this.logger.info('Subscription successful', LogCategory.WEBSOCKET, { message: message.message });
    }
  }

  /**
   * Handle trade messages
   */
  private handleTradeMessage(message: PolygonWebSocketMessage<PolygonTradeEvent>): void {
    if (!message.data) return;
    
    const event = message.data;
    const symbol = event.sym;
    
    if (this.tradeCallbacks.has(symbol)) {
      for (const callback of this.tradeCallbacks.get(symbol)!) {
        try {
          callback(event);
        } catch (error) {
          this.logger.error('Error in trade callback', LogCategory.WEBSOCKET, { 
            error: (error as Error).message,
            symbol 
          });
        }
      }
    }
  }

  /**
   * Handle quote messages
   */
  private handleQuoteMessage(message: PolygonWebSocketMessage<PolygonQuoteEvent>): void {
    if (!message.data) return;
    
    const event = message.data;
    const symbol = event.sym;
    
    if (this.quoteCallbacks.has(symbol)) {
      for (const callback of this.quoteCallbacks.get(symbol)!) {
        try {
          callback(event);
        } catch (error) {
          this.logger.error('Error in quote callback', LogCategory.WEBSOCKET, { 
            error: (error as Error).message,
            symbol 
          });
        }
      }
    }
  }

  /**
   * Handle aggregate messages
   */
  private handleAggregateMessage(message: PolygonWebSocketMessage<PolygonAggregateEvent>): void {
    if (!message.data) return;
    
    const event = message.data;
    const symbol = event.sym;
    
    if (this.aggregateCallbacks.has(symbol)) {
      for (const callback of this.aggregateCallbacks.get(symbol)!) {
        try {
          callback(event);
        } catch (error) {
          this.logger.error('Error in aggregate callback', LogCategory.WEBSOCKET, { 
            error: (error as Error).message,
            symbol 
          });
        }
      }
    }
  }

  /**
   * Re-subscribe to all previously subscribed symbols
   */
  private resubscribe(): void {
    this.subscriptions.forEach((symbols, type) => {
      if (symbols.size > 0) {
        this.subscribe(Array.from(symbols), type as SubscriptionType)
          .catch(error => {
            this.logger.error('Failed to resubscribe', LogCategory.WEBSOCKET, { 
              error: (error as Error).message,
              type,
              symbols: Array.from(symbols)
            });
          });
      }
    });
  }

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error('Max reconnect attempts reached', LogCategory.WEBSOCKET, {
        attempts: this.reconnectAttempts,
        max: this.maxReconnectAttempts
      });
      this.setStatus(WebSocketConnectionStatus.ERROR, 'Max reconnect attempts reached');
      return;
    }
    
    // Exponential backoff with jitter
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts) * (0.9 + Math.random() * 0.2);
    
    this.logger.info('Scheduling reconnect', LogCategory.WEBSOCKET, {
      attempt: this.reconnectAttempts + 1,
      delay: Math.round(delay)
    });
    
    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect()
        .catch(error => {
          this.logger.error('Reconnect failed', LogCategory.WEBSOCKET, { 
            error: (error as Error).message,
            attempt: this.reconnectAttempts
          });
        });
    }, delay);
  }

  /**
   * Cleanup WebSocket connection and intervals
   */
  private cleanupConnection(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    // Clear the socket reference
    this.socket = null;
  }

  /**
   * Start heartbeat monitor
   */
  private startHeartbeat(): void {
    // Clear any existing interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.lastHeartbeat = Date.now();
    
    // Check for heartbeat every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastHeartbeat = now - this.lastHeartbeat;
      
      // If no heartbeat for 2 minutes, consider connection dead
      if (timeSinceLastHeartbeat > 120000) {
        this.logger.warn('No heartbeat received, reconnecting', LogCategory.WEBSOCKET, {
          lastHeartbeat: new Date(this.lastHeartbeat).toISOString(),
          timeSinceLastHeartbeat
        });
        
        // Force close and reconnect
        if (this.socket) {
          this.socket.close();
        }
      }
    }, 30000);
  }
} 