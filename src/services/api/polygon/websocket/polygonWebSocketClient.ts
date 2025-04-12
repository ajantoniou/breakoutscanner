import { Candle } from '@/services/types/patternTypes';
import { DataMetadata } from '@/services/api/marketData/dataService';

/**
 * Polygon WebSocket client for real-time market data
 */
class PolygonWebSocketClient {
  private socket: WebSocket | null = null;
  private apiKey: string;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 2000; // Start with 2 seconds
  private subscriptions: Set<string> = new Set();
  private messageHandlers: Map<string, (data: any) => void> = new Map();
  private connectionStatusHandlers: Set<(status: boolean) => void> = new Set();
  private lastMessageTime: number = 0;
  private heartbeatInterval: number | null = null;
  private checkConnectionInterval: number | null = null;

  constructor() {
    // Get API key from environment variables
    this.apiKey = import.meta.env.VITE_POLYGON_API_KEY || 'onEimwzRMEYR2FhgLVBZnAmyz9EC8KfI';
    
    // Bind methods to maintain 'this' context
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.reconnect = this.reconnect.bind(this);
    this.handleOpen = this.handleOpen.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.handleError = this.handleError.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.subscribe = this.subscribe.bind(this);
    this.unsubscribe = this.unsubscribe.bind(this);
    this.sendHeartbeat = this.sendHeartbeat.bind(this);
    this.checkConnection = this.checkConnection.bind(this);
  }

  /**
   * Connect to Polygon WebSocket
   * @returns Promise that resolves when connected
   */
  async connect(): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.isConnected && this.socket) {
        resolve(true);
        return;
      }

      // Close existing socket if any
      if (this.socket) {
        this.socket.close();
        this.socket = null;
      }

      try {
        // Connect to Polygon WebSocket
        this.socket = new WebSocket(`wss://socket.polygon.io/stocks`);
        
        // Set up event handlers
        this.socket.onopen = (event) => {
          this.handleOpen(event);
          resolve(true);
        };
        
        this.socket.onmessage = this.handleMessage;
        this.socket.onerror = this.handleError;
        this.socket.onclose = this.handleClose;
        
        // Set up heartbeat and connection check
        this.heartbeatInterval = window.setInterval(this.sendHeartbeat, 30000); // 30 seconds
        this.checkConnectionInterval = window.setInterval(this.checkConnection, 60000); // 1 minute
      } catch (error) {
        console.error('Error connecting to Polygon WebSocket:', error);
        this.isConnected = false;
        this.notifyConnectionStatus();
        resolve(false);
        
        // Try to reconnect
        setTimeout(this.reconnect, this.reconnectDelay);
      }
    });
  }

  /**
   * Handle WebSocket open event
   * @param event WebSocket open event
   */
  private handleOpen(event: Event): void {
    console.log('Connected to Polygon WebSocket');
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.reconnectDelay = 2000; // Reset reconnect delay
    this.notifyConnectionStatus();
    
    // Authenticate
    this.authenticate();
    
    // Resubscribe to previous subscriptions
    this.resubscribe();
  }

  /**
   * Authenticate with Polygon WebSocket
   */
  private authenticate(): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }
    
    const authMessage = {
      action: 'auth',
      params: this.apiKey
    };
    
    this.socket.send(JSON.stringify(authMessage));
  }

  /**
   * Resubscribe to previous subscriptions
   */
  private resubscribe(): void {
    if (this.subscriptions.size === 0) {
      return;
    }
    
    const channels = Array.from(this.subscriptions);
    this.subscribe(channels);
  }

  /**
   * Handle WebSocket message event
   * @param event WebSocket message event
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      this.lastMessageTime = Date.now();
      
      // Handle authentication response
      if (data.ev === 'status' && data.status === 'auth_success') {
        console.log('Successfully authenticated with Polygon WebSocket');
        return;
      }
      
      // Handle different event types
      if (Array.isArray(data)) {
        data.forEach(message => {
          this.processMessage(message);
        });
      } else {
        this.processMessage(data);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }

  /**
   * Process a single WebSocket message
   * @param message WebSocket message
   */
  private processMessage(message: any): void {
    if (!message.ev) {
      return;
    }
    
    // Get event type
    const eventType = message.ev;
    
    // Find handlers for this event type
    if (this.messageHandlers.has(eventType)) {
      const handler = this.messageHandlers.get(eventType);
      if (handler) {
        handler(message);
      }
    }
    
    // Find handlers for specific symbols
    if (message.sym) {
      const symbolHandler = this.messageHandlers.get(`${eventType}:${message.sym}`);
      if (symbolHandler) {
        symbolHandler(message);
      }
    }
  }

  /**
   * Handle WebSocket error event
   * @param event WebSocket error event
   */
  private handleError(event: Event): void {
    console.error('Polygon WebSocket error:', event);
  }

  /**
   * Handle WebSocket close event
   * @param event WebSocket close event
   */
  private handleClose(event: CloseEvent): void {
    console.log(`Polygon WebSocket closed: ${event.code} ${event.reason}`);
    this.isConnected = false;
    this.notifyConnectionStatus();
    
    // Clear intervals
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.checkConnectionInterval !== null) {
      clearInterval(this.checkConnectionInterval);
      this.checkConnectionInterval = null;
    }
    
    // Try to reconnect
    setTimeout(this.reconnect, this.reconnectDelay);
  }

  /**
   * Attempt to reconnect to WebSocket
   */
  private reconnect(): void {
    if (this.isConnected) {
      return;
    }
    
    this.reconnectAttempts++;
    
    if (this.reconnectAttempts > this.maxReconnectAttempts) {
      console.error(`Failed to reconnect after ${this.maxReconnectAttempts} attempts`);
      return;
    }
    
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    // Exponential backoff
    this.reconnectDelay = Math.min(30000, this.reconnectDelay * 2);
    
    this.connect();
  }

  /**
   * Subscribe to channels
   * @param channels Array of channels to subscribe to
   */
  subscribe(channels: string[]): void {
    if (!this.isConnected || !this.socket) {
      console.warn('Cannot subscribe: WebSocket not connected');
      return;
    }
    
    // Add channels to subscriptions set
    channels.forEach(channel => {
      this.subscriptions.add(channel);
    });
    
    const subscribeMessage = {
      action: 'subscribe',
      params: channels.join(',')
    };
    
    this.socket.send(JSON.stringify(subscribeMessage));
  }

  /**
   * Unsubscribe from channels
   * @param channels Array of channels to unsubscribe from
   */
  unsubscribe(channels: string[]): void {
    if (!this.isConnected || !this.socket) {
      return;
    }
    
    // Remove channels from subscriptions set
    channels.forEach(channel => {
      this.subscriptions.delete(channel);
    });
    
    const unsubscribeMessage = {
      action: 'unsubscribe',
      params: channels.join(',')
    };
    
    this.socket.send(JSON.stringify(unsubscribeMessage));
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    this.isConnected = false;
    this.notifyConnectionStatus();
    
    // Clear intervals
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.checkConnectionInterval !== null) {
      clearInterval(this.checkConnectionInterval);
      this.checkConnectionInterval = null;
    }
    
    // Clear subscriptions and handlers
    this.subscriptions.clear();
    this.messageHandlers.clear();
  }

  /**
   * Send heartbeat to keep connection alive
   */
  private sendHeartbeat(): void {
    if (!this.isConnected || !this.socket) {
      return;
    }
    
    const heartbeatMessage = {
      action: 'ping'
    };
    
    this.socket.send(JSON.stringify(heartbeatMessage));
  }

  /**
   * Check if connection is still alive
   */
  private checkConnection(): void {
    if (!this.isConnected) {
      return;
    }
    
    const now = Date.now();
    const timeSinceLastMessage = now - this.lastMessageTime;
    
    // If no message received in 2 minutes, reconnect
    if (timeSinceLastMessage > 120000) {
      console.warn('No message received in 2 minutes, reconnecting...');
      this.disconnect();
      setTimeout(this.connect, 1000);
    }
  }

  /**
   * Add message handler for specific event type
   * @param eventType Event type to handle
   * @param handler Handler function
   */
  addMessageHandler(eventType: string, handler: (data: any) => void): void {
    this.messageHandlers.set(eventType, handler);
  }

  /**
   * Add message handler for specific symbol and event type
   * @param symbol Stock symbol
   * @param eventType Event type to handle
   * @param handler Handler function
   */
  addSymbolHandler(symbol: string, eventType: string, handler: (data: any) => void): void {
    this.messageHandlers.set(`${eventType}:${symbol}`, handler);
  }

  /**
   * Remove message handler for specific event type
   * @param eventType Event type to remove handler for
   */
  removeMessageHandler(eventType: string): void {
    this.messageHandlers.delete(eventType);
  }

  /**
   * Remove message handler for specific symbol and event type
   * @param symbol Stock symbol
   * @param eventType Event type to remove handler for
   */
  removeSymbolHandler(symbol: string, eventType: string): void {
    this.messageHandlers.delete(`${eventType}:${symbol}`);
  }

  /**
   * Add connection status handler
   * @param handler Handler function
   */
  addConnectionStatusHandler(handler: (status: boolean) => void): void {
    this.connectionStatusHandlers.add(handler);
  }

  /**
   * Remove connection status handler
   * @param handler Handler function to remove
   */
  removeConnectionStatusHandler(handler: (status: boolean) => void): void {
    this.connectionStatusHandlers.delete(handler);
  }

  /**
   * Notify all connection status handlers
   */
  private notifyConnectionStatus(): void {
    this.connectionStatusHandlers.forEach(handler => {
      handler(this.isConnected);
    });
  }

  /**
   * Subscribe to real-time trades for a symbol
   * @param symbol Stock symbol
   * @param handler Handler function for trade events
   */
  subscribeToTrades(symbol: string, handler: (data: any) => void): void {
    const channel = `T.${symbol}`;
    this.addSymbolHandler(symbol, 'T', handler);
    this.subscribe([channel]);
  }

  /**
   * Unsubscribe from real-time trades for a symbol
   * @param symbol Stock symbol
   */
  unsubscribeFromTrades(symbol: string): void {
    const channel = `T.${symbol}`;
    this.removeSymbolHandler(symbol, 'T');
    this.unsubscribe([channel]);
  }

  /**
   * Subscribe to real-time quotes for a symbol
   * @param symbol Stock symbol
   * @param handler Handler function for quote events
   */
  subscribeToQuotes(symbol: string, handler: (data: any) => void): void {
    const channel = `Q.${symbol}`;
    this.addSymbolHandler(symbol, 'Q', handler);
    this.subscribe([channel]);
  }

  /**
   * Unsubscribe from real-time quotes for a symbol
   * @param symbol Stock symbol
   */
  unsubscribeFromQuotes(symbol: string): void {
    const channel = `Q.${symbol}`;
    this.removeSymbolHandler(symbol, 'Q');
    this.unsubscribe([channel]);
  }

  /**
   * Subscribe to minute aggregates for a symbol
   * @param symbol Stock symbol
   * @param handler Handler function for aggregate events
   */
  subscribeToMinuteAggregates(symbol: string, handler: (data: any) => void): void {
    const channel = `AM.${symbol}`;
    this.addSymbolHandler(symbol, 'AM', handler);
    this.subscribe([channel]);
  }

  /**
   * Unsubscribe from minute aggregates for a symbol
   * @param symbol Stock symbol
   */
  unsubscribeFromMinuteAggregates(symbol: string): void {
    const channel = `AM.${symbol}`;
    this.removeSymbolHandler(symbol, 'AM');
    this.unsubscribe([channel]);
  }

  /**
   * Subscribe to second aggregates for a symbol
   * @param symbol Stock symbol
   * @param handler Handler function for aggregate events
   */
  subscribeToSecondAggregates(symbol: string, handler: (data: any) => void): void {
    const channel = `A.${symbol}`;
    this.addSymbolHandler(symbol, 'A', handler);
    this.subscribe([channel]);
  }

  /**
   * Unsubscribe from second aggregates for a symbol
   * @param symbol Stock symbol
   */
  unsubscribeFromSecondAggregates(symbol: string): void {
    const channel = `A.${symbol}`;
    this.removeSymbolHandler(symbol, 'A');
    this.unsubscribe([channel]);
  }

  /**
   * Get connection status
   * @returns Boolean indicating if connected
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

export default PolygonWebSocketClient;
