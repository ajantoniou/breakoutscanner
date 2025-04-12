import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { PolygonRealTimeClient, createRealTimeClient } from '@/services/api/marketData/polygon/polygonRealTimeClient';
import { DEFAULT_API_KEY } from '@/services/api/marketData/apiKeyService';

type RealTimeDataType = 'agg' | 'trade' | 'quote';
type MarketType = 'stocks' | 'options' | 'forex' | 'crypto' | 'indices';

interface RealTimeDataOptions {
  symbols: string[];
  dataTypes?: RealTimeDataType[];
  market?: MarketType;
  refreshInterval?: number;
  apiKey?: string;
  autoConnect?: boolean;
  onData?: (data: any) => void;
  onError?: (error: any) => void;
  debug?: boolean;
}

/**
 * Hook for accessing real-time market data from Polygon.io
 * Provides WebSocket connection with REST API fallback
 */
export function useRealTimeData(options: RealTimeDataOptions) {
  const {
    symbols,
    dataTypes = ['agg'],
    market = 'stocks',
    refreshInterval = 15000,
    apiKey = DEFAULT_API_KEY,
    autoConnect = true,
    onData,
    onError,
    debug = false
  } = options;
  
  // Convert dataTypes to Polygon event types
  const eventTypes = dataTypes.map(type => {
    switch (type) {
      case 'agg': return 'A';
      case 'trade': return 'T';
      case 'quote': return 'Q';
      default: return 'A';
    }
  });
  
  // State for tracking data and connection
  const [connected, setConnected] = useState(false);
  const [isUsingWebSocket, setIsUsingWebSocket] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [marketData, setMarketData] = useState<Map<string, any>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Ref to store client instance and prevent recreation on rerenders
  const clientRef = useRef<PolygonRealTimeClient | null>(null);
  
  // Initialize the client
  useEffect(() => {
    if (!symbols || symbols.length === 0) {
      console.warn('No symbols provided to useRealTimeData hook');
      return;
    }
    
    // Create the client instance if it doesn't exist yet
    if (!clientRef.current) {
      try {
        clientRef.current = createRealTimeClient({
          apiKey,
          symbols,
          eventTypes,
          reconnect: true,
          reconnectInterval: 5000,
          snapshotInterval: refreshInterval,
          market,
          debug,
          onConnect: () => {
            setConnected(true);
            setIsLoading(false);
            setError(null);
          },
          onDisconnect: () => {
            setConnected(false);
          },
          onMessage: (data) => {
            // Update last update time
            setLastUpdateTime(new Date());
            
            // Call external handler if provided
            if (onData) {
              onData(data);
            }
            
            // Update state with new data
            setMarketData(prevData => {
              // Deep clone to ensure reference equality changes
              const newData = new Map(prevData);
              if (data.symbol) {
                newData.set(data.symbol.toUpperCase(), data);
              }
              return newData;
            });
          },
          onError: (errorEvent) => {
            console.error('Real-time data error:', errorEvent);
            setError(new Error('Failed to connect to real-time data service'));
            
            if (onError) {
              onError(errorEvent);
            }
          }
        });
        
        // Check if using WebSocket or REST API fallback
        setIsUsingWebSocket(clientRef.current.isUsingWebSockets());
      } catch (initError) {
        console.error('Error initializing real-time data client:', initError);
        setError(new Error('Failed to initialize real-time data client'));
        setIsLoading(false);
        
        toast({
          title: 'Real-Time Data Error',
          description: 'Failed to initialize real-time market data',
          variant: 'destructive'
        });
        
        if (onError) {
          onError(initError);
        }
        
        return;
      }
    }
    
    // Connect if autoConnect is true
    if (autoConnect && clientRef.current && !clientRef.current.isConnected()) {
      setIsLoading(true);
      clientRef.current.connect();
    }
    
    // Cleanup function
    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
        clientRef.current = null;
      }
    };
  }, [apiKey, debug, onData, onError, refreshInterval, symbols.join(','), eventTypes.join(','), market, autoConnect]);
  
  // Update symbols if they change
  useEffect(() => {
    if (clientRef.current && clientRef.current.isConnected()) {
      clientRef.current.updateSymbols(symbols);
    }
  }, [symbols]);
  
  // Update event types if they change
  useEffect(() => {
    if (clientRef.current && clientRef.current.isConnected()) {
      clientRef.current.updateEventTypes(eventTypes as any[]);
    }
  }, [eventTypes]);
  
  /**
   * Connect to real-time data stream
   */
  const connect = useCallback(() => {
    if (!clientRef.current) {
      setError(new Error('Client not initialized'));
      return false;
    }
    
    setIsLoading(true);
    const success = clientRef.current.connect();
    
    if (!success) {
      setError(new Error('Failed to connect to real-time data service'));
      setIsLoading(false);
    }
    
    return success;
  }, []);
  
  /**
   * Disconnect from real-time data stream
   */
  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
      setConnected(false);
    }
  }, []);
  
  /**
   * Force refresh data (useful for polling fallback)
   */
  const refresh = useCallback(async () => {
    if (!clientRef.current) {
      setError(new Error('Client not initialized'));
      return;
    }
    
    try {
      await clientRef.current.forceRefresh();
      setLastUpdateTime(new Date());
    } catch (refreshError) {
      console.error('Error refreshing data:', refreshError);
      setError(new Error('Failed to refresh data'));
      
      if (onError) {
        onError(refreshError);
      }
    }
  }, [onError]);
  
  /**
   * Get data for a specific symbol
   */
  const getSymbolData = useCallback((symbol: string) => {
    return marketData.get(symbol.toUpperCase()) || null;
  }, [marketData]);
  
  /**
   * Check if a symbol is being tracked
   */
  const isTrackingSymbol = useCallback((symbol: string) => {
    return symbols.includes(symbol);
  }, [symbols]);
  
  return {
    connected,
    isUsingWebSocket,
    isLoading,
    error,
    lastUpdateTime,
    marketData,
    connect,
    disconnect,
    refresh,
    getSymbolData,
    isTrackingSymbol,
    // Export the raw client for advanced usage
    client: clientRef.current
  };
} 