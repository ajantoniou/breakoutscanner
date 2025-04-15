import { PatternData } from '@/services/types/patternTypes';

// Event types for pattern updates
export enum PatternUpdateEventType {
  NEW_PATTERN = 'new_pattern',
  PATTERN_UPDATED = 'pattern_updated',
  PATTERN_DELETED = 'pattern_deleted',
  STATUS_CHANGE = 'status_change',
  BREAKOUT_DETECTED = 'breakout_detected',
  CONNECTION_STATUS = 'connection_status'
}

// Connection status types
export enum ConnectionStatus {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error'
}

// Interface for pattern update events
export interface PatternUpdateEvent {
  type: PatternUpdateEventType;
  payload: any;
  timestamp: number;
}

// Interface for status change events
export interface StatusChangeEvent extends PatternUpdateEvent {
  type: PatternUpdateEventType.STATUS_CHANGE;
  payload: {
    patternId: string;
    newStatus: string;
    oldStatus: string;
  };
}

// Interface for new pattern events
export interface NewPatternEvent extends PatternUpdateEvent {
  type: PatternUpdateEventType.NEW_PATTERN;
  payload: PatternData;
}

// Interface for pattern update events
export interface PatternUpdatedEvent extends PatternUpdateEvent {
  type: PatternUpdateEventType.PATTERN_UPDATED;
  payload: PatternData;
}

// Interface for connection status events
export interface ConnectionStatusEvent extends PatternUpdateEvent {
  type: PatternUpdateEventType.CONNECTION_STATUS;
  payload: {
    status: ConnectionStatus;
    message?: string;
  };
}

// Type for event handlers
type PatternUpdateEventHandler = (event: PatternUpdateEvent) => void;

class PatternUpdateService {
  private static instance: PatternUpdateService;
  private socket: WebSocket | null = null;
  private eventHandlers: Map<PatternUpdateEventType, PatternUpdateEventHandler[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000; // ms
  private connectionStatus: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private keepAliveInterval: NodeJS.Timeout | null = null;
  
  private constructor() {
    // Initialize event handlers map
    for (const eventType of Object.values(PatternUpdateEventType)) {
      this.eventHandlers.set(eventType as PatternUpdateEventType, []);
    }
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): PatternUpdateService {
    if (!PatternUpdateService.instance) {
      PatternUpdateService.instance = new PatternUpdateService();
    }
    return PatternUpdateService.instance;
  }
  
  /**
   * Connect to WebSocket server
   */
  public connect(url: string): void {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      console.warn('WebSocket connection already open or connecting');
      return;
    }
    
    this.updateConnectionStatus(ConnectionStatus.CONNECTING);
    
    try {
      this.socket = new WebSocket(url);
      
      this.socket.onopen = this.handleSocketOpen.bind(this);
      this.socket.onmessage = this.handleSocketMessage.bind(this);
      this.socket.onclose = this.handleSocketClose.bind(this);
      this.socket.onerror = this.handleSocketError.bind(this);
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      this.updateConnectionStatus(ConnectionStatus.ERROR, 'Failed to create connection');
    }
  }
  
  /**
   * Disconnect from WebSocket server
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
    
    this.updateConnectionStatus(ConnectionStatus.DISCONNECTED);
  }
  
  /**
   * Subscribe to pattern updates
   */
  public subscribe(patternIds: string[]): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('Cannot subscribe: WebSocket not connected');
      return;
    }
    
    const message = {
      action: 'subscribe',
      patternIds
    };
    
    this.socket.send(JSON.stringify(message));
  }
  
  /**
   * Register event handler
   */
  public on(eventType: PatternUpdateEventType, handler: PatternUpdateEventHandler): void {
    const handlers = this.eventHandlers.get(eventType) || [];
    if (!handlers.includes(handler)) {
      handlers.push(handler);
      this.eventHandlers.set(eventType, handlers);
    }
  }
  
  /**
   * Unregister event handler
   */
  public off(eventType: PatternUpdateEventType, handler: PatternUpdateEventHandler): void {
    const handlers = this.eventHandlers.get(eventType) || [];
    const index = handlers.indexOf(handler);
    if (index !== -1) {
      handlers.splice(index, 1);
      this.eventHandlers.set(eventType, handlers);
    }
  }
  
  /**
   * Get current connection status
   */
  public getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }
  
  /**
   * Mock pattern update for development/testing
   */
  public mockPatternUpdate(pattern: PatternData): void {
    const event: PatternUpdatedEvent = {
      type: PatternUpdateEventType.PATTERN_UPDATED,
      payload: pattern,
      timestamp: Date.now()
    };
    
    this.dispatchEvent(event);
  }
  
  /**
   * Handle WebSocket open event
   */
  private handleSocketOpen(): void {
    console.log('WebSocket connection established');
    this.reconnectAttempts = 0;
    this.updateConnectionStatus(ConnectionStatus.CONNECTED);
    
    // Set up keep-alive ping
    this.keepAliveInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ action: 'ping' }));
      }
    }, 30000); // 30 seconds
  }
  
  /**
   * Handle WebSocket message event
   */
  private handleSocketMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type && Object.values(PatternUpdateEventType).includes(data.type)) {
        const patternEvent: PatternUpdateEvent = {
          type: data.type,
          payload: data.payload,
          timestamp: data.timestamp || Date.now()
        };
        
        this.dispatchEvent(patternEvent);
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  }
  
  /**
   * Handle WebSocket close event
   */
  private handleSocketClose(event: CloseEvent): void {
    console.log(`WebSocket connection closed: ${event.code} - ${event.reason}`);
    
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
    
    this.updateConnectionStatus(ConnectionStatus.DISCONNECTED, `Connection closed: ${event.reason || 'Unknown reason'}`);
    
    // Attempt to reconnect unless explicitly disconnected
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * this.reconnectAttempts;
      
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        if (this.socket && this.socket.url) {
          this.connect(this.socket.url);
        }
      }, delay);
    }
  }
  
  /**
   * Handle WebSocket error event
   */
  private handleSocketError(event: Event): void {
    console.error('WebSocket error:', event);
    this.updateConnectionStatus(ConnectionStatus.ERROR, 'Connection error occurred');
  }
  
  /**
   * Dispatch event to registered handlers
   */
  private dispatchEvent(event: PatternUpdateEvent): void {
    const handlers = this.eventHandlers.get(event.type) || [];
    handlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error(`Error in event handler for ${event.type}:`, error);
      }
    });
  }
  
  /**
   * Update connection status and dispatch event
   */
  private updateConnectionStatus(status: ConnectionStatus, message?: string): void {
    this.connectionStatus = status;
    
    const event: ConnectionStatusEvent = {
      type: PatternUpdateEventType.CONNECTION_STATUS,
      payload: {
        status,
        message
      },
      timestamp: Date.now()
    };
    
    this.dispatchEvent(event);
  }
}

export default PatternUpdateService; 