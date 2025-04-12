
import { DEFAULT_API_KEY } from '../apiKeyService';

export class PolygonApiClient {
  private apiKey: string;
  private rateLimit: number = 5; // Requests per second for free tier
  private retryLimit: number = 3;
  
  constructor(apiKey: string = DEFAULT_API_KEY) {
    this.apiKey = apiKey;
  }
  
  async checkApiKey(): Promise<{ isValid: boolean; isPremium: boolean }> {
    try {
      // Test API key with a simple reference data call
      const url = `https://api.polygon.io/v3/reference/tickers/AAPL?apiKey=${this.apiKey}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error(`API key validation failed with status: ${response.status}`);
        return { isValid: false, isPremium: false };
      }
      
      const data = await response.json();
      
      // If we get a valid response, the API key is working
      console.log("API key validation successful:", data.status);
      
      // Check for premium status - in a real app, you'd have a better way to determine this
      return { 
        isValid: true, 
        isPremium: this.apiKey !== DEFAULT_API_KEY 
      };
    } catch (error) {
      console.error("Error validating API key:", error);
      return { isValid: false, isPremium: false };
    }
  }
  
  private async fetchWithRetry(url: string, retries = 0): Promise<Response> {
    try {
      const response = await fetch(url);
      
      // If we hit rate limit, wait and retry
      if (response.status === 429 && retries < this.retryLimit) {
        console.warn(`Rate limit hit, retrying after delay (attempt ${retries + 1}/${this.retryLimit})`);
        // Exponential backoff: wait longer with each retry
        const delay = Math.pow(2, retries) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.fetchWithRetry(url, retries + 1);
      }
      
      return response;
    } catch (error) {
      if (retries < this.retryLimit) {
        console.warn(`Network error, retrying (attempt ${retries + 1}/${this.retryLimit})`, error);
        const delay = Math.pow(2, retries) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.fetchWithRetry(url, retries + 1);
      }
      throw error;
    }
  }
  
  async getHistoricalPrices(
    symbol: string,
    timeframe: string = 'day',
    limit: number = 100
  ) {
    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (limit > 365 ? 365 : limit)); // Cap at 1 year for performance
      
      // Format dates as YYYY-MM-DD
      const formattedStartDate = startDate.toISOString().split('T')[0];
      const formattedEndDate = endDate.toISOString().split('T')[0];
      
      // Map timeframe to Polygon format
      let multiplier = 1;
      let timespan = 'day';
      
      switch (timeframe) {
        case '1h':
          multiplier = 1;
          timespan = 'hour';
          break;
        case '4h':
          multiplier = 4;
          timespan = 'hour';
          break;
        case '1d':
        case 'day':
          multiplier = 1;
          timespan = 'day';
          break;
        case '1w':
        case 'week':
          multiplier = 1;
          timespan = 'week';
          break;
        default:
          multiplier = 1;
          timespan = 'day';
      }
      
      console.log(`Fetching ${timeframe} data for ${symbol} from Polygon.io (${formattedStartDate} to ${formattedEndDate})`);
      
      const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${formattedStartDate}/${formattedEndDate}?apiKey=${this.apiKey}&limit=${limit}`;
      
      const response = await this.fetchWithRetry(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status} for symbol ${symbol}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'ERROR' || data.error) {
        throw new Error(data.error || `Unknown API error for symbol ${symbol}`);
      }
      
      return data;
    } catch (error) {
      console.error(`Error fetching ${timeframe} data for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Fetches aggregates (OHLC) for a symbol
   * This is an alias for getHistoricalPrices to maintain compatibility with patternEnhancer.ts
   */
  async fetchAggregatesForSymbol(
    symbol: string,
    timeframe: string = 'day',
    limit: number = 100
  ) {
    return this.getHistoricalPrices(symbol, timeframe, limit);
  }

  async fetchBatchStockData(
    symbols: string[],
    interval: string = 'day',
    limit: number = 730
  ): Promise<Record<string, any>> {
    // For free tier, reduce batch size and add more delay
    const isPremium = this.apiKey !== DEFAULT_API_KEY;
    const batchSize = isPremium ? 5 : 2; // Process fewer symbols at once for free tier
    const delayMs = isPremium ? 1200 : 2000; // Add longer delay for free tier
    const results: Record<string, any> = {};
    let successCount = 0;
    let failureCount = 0;
    let rateLimitHit = false;
    
    // Process symbols in batches
    for (let i = 0; i < symbols.length; i += batchSize) {
      // If we've already hit rate limits multiple times, stop making more requests
      if (rateLimitHit && failureCount > 5) {
        console.error("Multiple rate limit errors encountered, stopping batch process");
        break;
      }
      
      const batch = symbols.slice(i, i + batchSize);
      const batchPromises = batch.map(async (symbol) => {
        try {
          const data = await this.getHistoricalPrices(symbol, interval, limit);
          results[symbol] = data;
          successCount++;
          return { symbol, success: true };
        } catch (error) {
          console.error(`Failed to fetch data for ${symbol}:`, error);
          // Check for rate limit errors
          if (error instanceof Error && 
              (error.message.includes("429") || error.message.includes("rate limit"))) {
            rateLimitHit = true;
          }
          failureCount++;
          return { symbol, success: false, error };
        }
      });
      
      // Wait for current batch to complete
      await Promise.all(batchPromises);
      
      // Add delay before next batch if there are more symbols to process
      if (i + batchSize < symbols.length) {
        // Add extra delay if we hit rate limits
        const actualDelay = rateLimitHit ? delayMs * 2 : delayMs;
        await new Promise(resolve => setTimeout(resolve, actualDelay));
        
        // Reset rate limit flag after the delay
        rateLimitHit = false;
      }
    }
    
    console.log(`Completed loading ${successCount}/${symbols.length} symbols (${failureCount} failed)`);
    
    return results;
  }

  async getRealTimeQuote(symbol: string): Promise<any> {
    try {
      const url = `https://api.polygon.io/v2/last/trade/${symbol}?apiKey=${this.apiKey}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status} for real-time quote of ${symbol}`);
      }
      
      const data = await response.json();
      
      if (!data || !data.results) {
        throw new Error(`Invalid response for real-time quote of ${symbol}`);
      }
      
      return data.results;
    } catch (error) {
      console.error(`Error fetching real-time quote for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Checks if the market is currently open
   * @returns Boolean indicating if the market is open
   */
  async isMarketOpen(): Promise<boolean> {
    try {
      const url = `https://api.polygon.io/v1/marketstatus/now?apiKey=${this.apiKey}`;
      const response = await this.fetchWithRetry(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.market === 'open';
    } catch (error) {
      console.error("Error checking market status:", error);
      return false;
    }
  }

  /**
   * Subscribes to websocket feed for a list of symbols
   * Note: This requires authentication and needs to be used in a context with WebSocket support
   * @param symbols List of symbols to subscribe to
   * @param callback Function to be called when data is received
   */
  subscribeToRealTimeData(
    symbols: string[],
    callback: (data: any) => void
  ): WebSocket | null {
    try {
      // Check if WebSocket is available (not in server context)
      if (typeof WebSocket === 'undefined') {
        console.error("WebSocket is not available in this environment");
        return null;
      }
      
      const ws = new WebSocket('wss://socket.polygon.io/stocks');
      
      ws.onopen = () => {
        console.log('WebSocket connection established');
        
        // Authenticate
        ws.send(JSON.stringify({ action: 'auth', params: this.apiKey }));
        
        // Subscribe to the specified symbols
        symbols.forEach(symbol => {
          ws.send(JSON.stringify({ action: 'subscribe', params: `T.${symbol}` }));
        });
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          callback(data);
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      ws.onclose = () => {
        console.log('WebSocket connection closed');
      };
      
      return ws;
    } catch (error) {
      console.error("Error setting up WebSocket connection:", error);
      return null;
    }
  }

  /**
   * Gets the latest aggregate bars for a symbol
   * @param symbol Stock symbol
   * @param multiplier Time multiplier
   * @param timespan Time span (minute, hour, day, week, month, quarter, year)
   * @param from Start date
   * @param to End date
   */
  async getAggregates(
    symbol: string,
    multiplier: number = 1,
    timespan: string = 'day',
    from: Date,
    to: Date
  ): Promise<any> {
    try {
      const fromStr = from.toISOString().split('T')[0];
      const toStr = to.toISOString().split('T')[0];
      
      const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${fromStr}/${toStr}?apiKey=${this.apiKey}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching aggregates for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Gets the latest trades for a symbol
   * @param symbol Stock symbol
   * @param limit Number of trades to return
   */
  async getLatestTrades(symbol: string, limit: number = 10): Promise<any> {
    try {
      const url = `https://api.polygon.io/v3/trades/${symbol}?limit=${limit}&apiKey=${this.apiKey}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching latest trades for ${symbol}:`, error);
      throw error;
    }
  }
}

export const fetchStockDataPolygon = async (
  symbol: string,
  interval: string = 'day',
  apiKey: string = DEFAULT_API_KEY,
  limit: number = 730
): Promise<any> => {
  const client = new PolygonApiClient(apiKey);
  return await client.getHistoricalPrices(symbol, interval, limit);
};

export const fetchBatchStockDataPolygon = async (
  symbols: string[],
  interval: string = 'day',
  apiKey: string = DEFAULT_API_KEY,
  limit: number = 730
): Promise<Record<string, any>> => {
  const client = new PolygonApiClient(apiKey);
  return await client.fetchBatchStockData(symbols, interval, limit);
};
