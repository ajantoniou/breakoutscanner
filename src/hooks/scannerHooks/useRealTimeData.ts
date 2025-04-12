import { useState, useEffect, useCallback, useRef } from "react";
import { PatternData } from "@/services/types/patternTypes";
import { toast } from "sonner";

export interface RealTimeQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: Date;
  bid?: number;
  ask?: number;
  high?: number;
  low?: number;
  open?: number;
  previousClose?: number;
}

interface RateLimitInfo {
  lastRequest: number;
  requestCount: number;
  resetTime: number;
}

export const useRealTimeData = (
  apiKey: string,
  patterns: PatternData[],
  enabled: boolean
): {
  realTimeData: Record<string, RealTimeQuote>;
  isConnected: boolean;
  marketOpen: boolean;
  lastUpdated: Date | null;
  refreshQuotes: () => Promise<void>;
  error: string | null;
} => {
  const [realTimeData, setRealTimeData] = useState<Record<string, RealTimeQuote>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [marketOpen, setMarketOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Rate limiting
  const rateLimitRef = useRef<RateLimitInfo>({
    lastRequest: 0,
    requestCount: 0,
    resetTime: Date.now() + 60000 // Reset every minute
  });
  
  // Check if we're in production
  const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost';
  
  // Maximum requests per minute (adjust based on your API plan)
  const MAX_REQUESTS_PER_MINUTE = isProduction ? 5 : 30;
  
  const checkRateLimit = useCallback((): boolean => {
    const now = Date.now();
    const rateLimit = rateLimitRef.current;
    
    // Reset counter if minute has passed
    if (now > rateLimit.resetTime) {
      rateLimit.requestCount = 0;
      rateLimit.resetTime = now + 60000;
      return true;
    }
    
    // Check if we're under the limit
    if (rateLimit.requestCount < MAX_REQUESTS_PER_MINUTE) {
      rateLimit.requestCount++;
      rateLimit.lastRequest = now;
      return true;
    }
    
    return false;
  }, [MAX_REQUESTS_PER_MINUTE]);
  
  const fetchQuotes = useCallback(async (symbols: string[]): Promise<Record<string, RealTimeQuote>> => {
    if (!apiKey || symbols.length === 0) return {};
    
    // Check rate limit
    if (!checkRateLimit()) {
      throw new Error('Rate limit exceeded. Please wait before refreshing.');
    }
    
    try {
      // In production, use actual API call
      if (isProduction) {
        const response = await fetch(
          `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${symbols.join(',')}&apiKey=${apiKey}`
        );
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Transform API response to our format
        const quotes: Record<string, RealTimeQuote> = {};
        
        data.tickers?.forEach((ticker: any) => {
          quotes[ticker.ticker] = {
            symbol: ticker.ticker,
            price: ticker.lastTrade.p,
            change: ticker.todaysChange,
            changePercent: ticker.todaysChangePerc,
            volume: ticker.day.v,
            timestamp: new Date(ticker.updated),
            bid: ticker.bid,
            ask: ticker.ask,
            high: ticker.day.h,
            low: ticker.day.l,
            open: ticker.day.o,
            previousClose: ticker.prevDay.c
          };
        });
        
        return quotes;
      } else {
        // In development, use mock data with realistic patterns
        const mockData: Record<string, RealTimeQuote> = {};
        
        symbols.forEach(symbol => {
          const pattern = patterns.find(p => p.symbol === symbol);
          if (!pattern) return;
          
          // Generate more realistic price movements
          const volatility = 0.02; // 2% volatility
          const priceChange = (Math.random() * 2 - 1) * volatility;
          const newPrice = pattern.entryPrice * (1 + priceChange);
          const volume = Math.floor(Math.random() * 1000000) + 100000;
          
          mockData[symbol] = {
            symbol,
            price: newPrice,
            change: newPrice - pattern.entryPrice,
            changePercent: priceChange * 100,
            volume,
            timestamp: new Date(),
            bid: newPrice * 0.999,
            ask: newPrice * 1.001,
            high: Math.max(pattern.entryPrice, newPrice) * 1.002,
            low: Math.min(pattern.entryPrice, newPrice) * 0.998,
            open: pattern.entryPrice,
            previousClose: pattern.entryPrice
          };
        });
        
        return mockData;
      }
    } catch (error) {
      console.error('Error fetching quotes:', error);
      throw error;
    }
  }, [apiKey, patterns, checkRateLimit, isProduction]);
  
  const refreshQuotes = useCallback(async () => {
    if (!enabled || !apiKey || patterns.length === 0) return;
    
    setError(null);
    setIsConnected(false);
    
    try {
      const symbols = patterns.map(p => p.symbol);
      const uniqueSymbols = [...new Set(symbols)];
      
      // Split symbols into chunks of 10 to avoid too large requests
      const chunks = [];
      for (let i = 0; i < uniqueSymbols.length; i += 10) {
        chunks.push(uniqueSymbols.slice(i, i + 10));
      }
      
      let allQuotes: Record<string, RealTimeQuote> = {};
      
      // Fetch each chunk with a small delay between requests
      for (const chunk of chunks) {
        const quotes = await fetchQuotes(chunk);
        allQuotes = { ...allQuotes, ...quotes };
        
        // Add a small delay between chunks to avoid rate limits
        if (chunks.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      setRealTimeData(allQuotes);
      setIsConnected(true);
      setMarketOpen(true);
      setLastUpdated(new Date());
      
      // Check if market is open (9:30 AM - 4:00 PM ET)
      const now = new Date();
      const etTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      const hour = etTime.getHours();
      const minute = etTime.getMinutes();
      const isMarketHours = (hour > 9 || (hour === 9 && minute >= 30)) && hour < 16;
      setMarketOpen(isMarketHours);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      toast.error('Error fetching quotes', {
        description: errorMessage
      });
    }
  }, [apiKey, enabled, patterns, fetchQuotes]);
  
  // Initial fetch on mount
  useEffect(() => {
    if (enabled && apiKey && patterns.length > 0) {
      refreshQuotes();
      
      // Set up interval to refresh quotes
      // More frequent in development, less in production
      const interval = setInterval(refreshQuotes, isProduction ? 300000 : 60000); // 5 min in prod, 1 min in dev
      
      return () => clearInterval(interval);
    }
  }, [apiKey, enabled, patterns, refreshQuotes, isProduction]);
  
  return {
    realTimeData,
    isConnected,
    marketOpen,
    lastUpdated,
    refreshQuotes,
    error
  };
};
