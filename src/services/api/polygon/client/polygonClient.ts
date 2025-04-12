import axios from 'axios';
import { Candle } from '@/services/types/patternTypes';

/**
 * Polygon.io API client for fetching market data with improved timestamp tracking
 * and proper authentication
 */
class PolygonClient {
  private apiKey: string;
  private baseUrl: string;
  private requestQueue: Array<() => Promise<any>> = [];
  private processingQueue: boolean = false;
  private requestsPerMinute: number = 5; // Default conservative limit for Stocks Starter plan
  private lastRequestTime: number = 0;

  constructor() {
    // Get API key from environment variables
    this.apiKey = import.meta.env.VITE_POLYGON_API_KEY || 'onEimwzRMEYR2FhgLVBZnAmyz9EC8KfI';
    this.baseUrl = 'https://api.polygon.io';
    
    // Set higher rate limit if using a paid plan
    const plan = import.meta.env.VITE_POLYGON_PLAN || 'starter';
    if (plan === 'basic') {
      this.requestsPerMinute = 10;
    } else if (plan === 'developer') {
      this.requestsPerMinute = 20;
    } else if (plan === 'advanced') {
      this.requestsPerMinute = 100;
    }
  }

  /**
   * Add a request to the queue and process it with rate limiting
   * @param requestFn Function that returns a promise with the API request
   * @returns Promise with the API response
   */
  private async queueRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      // Add request to queue
      this.requestQueue.push(async () => {
        try {
          const result = await requestFn();
          resolve(result);
          return result;
        } catch (error) {
          reject(error);
          throw error;
        }
      });
      
      // Start processing queue if not already processing
      if (!this.processingQueue) {
        this.processQueue();
      }
    });
  }

  /**
   * Process the request queue with rate limiting
   */
  private async processQueue() {
    if (this.requestQueue.length === 0) {
      this.processingQueue = false;
      return;
    }
    
    this.processingQueue = true;
    
    // Get next request from queue
    const request = this.requestQueue.shift();
    if (!request) {
      this.processingQueue = false;
      return;
    }
    
    // Calculate time to wait before making request
    const now = Date.now();
    const timeToWait = Math.max(0, (60000 / this.requestsPerMinute) - (now - this.lastRequestTime));
    
    // Wait if needed to respect rate limit
    if (timeToWait > 0) {
      await new Promise(resolve => setTimeout(resolve, timeToWait));
    }
    
    // Execute request
    try {
      this.lastRequestTime = Date.now();
      await request();
    } catch (error) {
      console.error('Error executing queued request:', error);
    }
    
    // Process next request in queue
    this.processQueue();
  }

  /**
   * Make an API request with proper error handling and retries
   * @param url API endpoint URL
   * @param params Additional query parameters
   * @param retries Number of retries on failure
   * @returns Promise with API response
   */
  private async makeRequest<T>(url: string, params: Record<string, any> = {}, retries: number = 3): Promise<T> {
    // Add API key to params
    const queryParams = {
      ...params,
      apiKey: this.apiKey
    };
    
    // Build query string
    const queryString = Object.entries(queryParams)
      .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
      .join('&');
    
    // Full URL with query parameters
    const fullUrl = `${url}${url.includes('?') ? '&' : '?'}${queryString}`;
    
    return this.queueRequest(async () => {
      try {
        console.log(`Fetching data from Polygon.io: ${fullUrl.replace(this.apiKey, 'API_KEY_HIDDEN')}`);
        
        const fetchStartTime = Date.now();
        const response = await axios.get(fullUrl);
        const fetchEndTime = Date.now();
        
        // Check for API errors
        if (response.data.status === 'ERROR') {
          console.error('Polygon API error:', response.data);
          throw new Error(response.data.error || 'Unknown Polygon API error');
        }
        
        return response.data;
      } catch (error: any) {
        // Handle rate limiting (429) with exponential backoff
        if (error.response && error.response.status === 429 && retries > 0) {
          const backoffTime = Math.pow(2, 4 - retries) * 1000; // 1s, 2s, 4s
          console.warn(`Rate limited by Polygon API. Retrying in ${backoffTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
          return this.makeRequest<T>(url, params, retries - 1);
        }
        
        // Handle authentication errors (401, 403)
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          console.error('Polygon API authentication error. Check your API key.');
          throw new Error('Authentication failed. Please check your Polygon API key.');
        }
        
        // Handle other errors with retry
        if (retries > 0) {
          const backoffTime = Math.pow(2, 4 - retries) * 1000;
          console.warn(`Error fetching from Polygon API. Retrying in ${backoffTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
          return this.makeRequest<T>(url, params, retries - 1);
        }
        
        throw error;
      }
    });
  }

  /**
   * Fetch aggregated bars (candles) for a symbol
   * @param symbol Stock symbol
   * @param timespan Timespan unit (minute, hour, day, week, month, quarter, year)
   * @param multiplier Timespan multiplier
   * @param from Start date (YYYY-MM-DD)
   * @param to End date (YYYY-MM-DD)
   * @param limit Maximum number of results
   * @returns Promise with candle data and metadata
   */
  async getAggregates(
    symbol: string,
    timespan: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year',
    multiplier: number,
    from: string,
    to: string,
    limit: number = 120
  ): Promise<{candles: Candle[], metadata: {fetchedAt: string, isDelayed: boolean, source: string}}> {
    try {
      const url = `${this.baseUrl}/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${from}/${to}`;
      
      const params = {
        adjusted: true,
        sort: 'asc',
        limit
      };
      
      const fetchStartTime = Date.now();
      const response = await this.makeRequest<any>(url, params);
      const fetchEndTime = Date.now();
      
      if (!response.results || response.results.length === 0) {
        console.warn(`No data returned for ${symbol}`);
        return {
          candles: [],
          metadata: {
            fetchedAt: new Date(fetchEndTime).toISOString(),
            isDelayed: true,
            source: 'empty'
          }
        };
      }
      
      // Convert Polygon.io format to our Candle format
      const candles: Candle[] = response.results.map((bar: any) => ({
        timestamp: bar.t,
        open: bar.o,
        high: bar.h,
        low: bar.l,
        close: bar.c,
        volume: bar.v,
        // Add additional fields that will be calculated later
        ema7: 0,
        ema20: 0,
        ema50: 0,
        ema100: 0,
        ema200: 0,
        rsi14: 0,
        atr14: 0
      }));
      
      // Calculate if data is delayed based on subscription level
      // For Stocks Starter, data is delayed by 15 minutes
      const isDelayed = this.isDataDelayed(candles);
      
      return {
        candles,
        metadata: {
          fetchedAt: new Date(fetchEndTime).toISOString(),
          isDelayed,
          source: 'aggregates'
        }
      };
    } catch (error) {
      console.error('Error fetching data from Polygon.io:', error);
      throw error;
    }
  }

  /**
   * Determine if data is delayed based on latest candle timestamp
   * @param candles Array of candles
   * @returns Boolean indicating if data is delayed
   */
  private isDataDelayed(candles: Candle[]): boolean {
    if (candles.length === 0) return true;
    
    const latestCandleTime = candles[candles.length - 1].timestamp;
    const currentTime = Date.now();
    
    // Check if latest candle is more than 15 minutes old
    // 15 minutes = 15 * 60 * 1000 milliseconds
    return (currentTime - latestCandleTime) > 15 * 60 * 1000;
  }

  /**
   * Fetch previous close for a symbol
   * @param symbol Stock symbol
   * @returns Promise with previous close price and metadata
   */
  async getPreviousClose(symbol: string): Promise<{price: number, metadata: {fetchedAt: string, isDelayed: boolean, source: string}}> {
    try {
      const url = `${this.baseUrl}/v2/aggs/ticker/${symbol}/prev`;
      
      const fetchStartTime = Date.now();
      const response = await this.makeRequest<any>(url);
      const fetchEndTime = Date.now();
      
      if (!response.results || response.results.length === 0) {
        console.warn(`No previous close data returned for ${symbol}`);
        return {
          price: 0,
          metadata: {
            fetchedAt: new Date(fetchEndTime).toISOString(),
            isDelayed: true,
            source: 'empty'
          }
        };
      }
      
      // Previous close data is always delayed by at least one day
      return {
        price: response.results[0].c,
        metadata: {
          fetchedAt: new Date(fetchEndTime).toISOString(),
          isDelayed: true,
          source: 'previous_close'
        }
      };
    } catch (error) {
      console.error('Error fetching previous close from Polygon.io:', error);
      throw error;
    }
  }

  /**
   * Fetch current price for a symbol
   * @param symbol Stock symbol
   * @returns Promise with current price and metadata
   */
  async getCurrentPrice(symbol: string): Promise<{price: number, metadata: {fetchedAt: string, isDelayed: boolean, source: string}}> {
    try {
      // Use the last trade endpoint to get the most recent price
      const url = `${this.baseUrl}/v2/last/trade/${symbol}`;
      
      const fetchStartTime = Date.now();
      const response = await this.makeRequest<any>(url);
      const fetchEndTime = Date.now();
      
      if (!response.results) {
        console.warn(`No current price data returned for ${symbol}`);
        return await this.getFallbackPrice(symbol);
      }
      
      // Check if data is delayed based on timestamp
      const tradeTimestamp = response.results.t;
      const isDelayed = (fetchEndTime - tradeTimestamp) > 15 * 60 * 1000;
      
      return {
        price: response.results.p,
        metadata: {
          fetchedAt: new Date(fetchEndTime).toISOString(),
          isDelayed,
          source: 'last_trade'
        }
      };
    } catch (error) {
      console.error('Error fetching current price from Polygon.io:', error);
      return await this.getFallbackPrice(symbol);
    }
  }

  /**
   * Get fallback price from daily bars when last trade fails
   * @param symbol Stock symbol
   * @returns Promise with fallback price and metadata
   */
  private async getFallbackPrice(symbol: string): Promise<{price: number, metadata: {fetchedAt: string, isDelayed: boolean, source: string}}> {
    try {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const from = yesterday.toISOString().split('T')[0];
      const to = today.toISOString().split('T')[0];
      
      const fetchStartTime = Date.now();
      const result = await this.getAggregates(symbol, 'day', 1, from, to, 1);
      const fetchEndTime = Date.now();
      
      if (result.candles.length > 0) {
        return {
          price: result.candles[result.candles.length - 1].close,
          metadata: {
            fetchedAt: new Date(fetchEndTime).toISOString(),
            isDelayed: true, // Fallback price is always considered delayed
            source: 'daily_bars_fallback'
          }
        };
      }
      
      // Try snapshot endpoint as a last resort
      try {
        const snapshotUrl = `${this.baseUrl}/v2/snapshot/locale/us/markets/stocks/tickers/${symbol}`;
        const snapshotResponse = await this.makeRequest<any>(snapshotUrl);
        
        if (snapshotResponse.ticker && snapshotResponse.ticker.lastTrade) {
          return {
            price: snapshotResponse.ticker.lastTrade.p,
            metadata: {
              fetchedAt: new Date().toISOString(),
              isDelayed: true,
              source: 'snapshot_fallback'
            }
          };
        }
      } catch (snapshotError) {
        console.error('Error fetching snapshot fallback:', snapshotError);
      }
      
      return {
        price: 0,
        metadata: {
          fetchedAt: new Date(fetchEndTime).toISOString(),
          isDelayed: true,
          source: 'none'
        }
      };
    } catch (fallbackError) {
      console.error('Error fetching fallback price from Polygon.io:', fallbackError);
      return {
        price: 0,
        metadata: {
          fetchedAt: new Date().toISOString(),
          isDelayed: true,
          source: 'error'
        }
      };
    }
  }

  /**
   * Convert timeframe string to Polygon.io timespan parameters
   * @param timeframe Timeframe string (e.g., '1m', '5m', '1h', '1d')
   * @returns Object with timespan and multiplier
   */
  convertTimeframe(timeframe: string): { timespan: 'minute' | 'hour' | 'day' | 'week'; multiplier: number } {
    switch (timeframe) {
      case '1m':
        return { timespan: 'minute', multiplier: 1 };
      case '5m':
        return { timespan: 'minute', multiplier: 5 };
      case '15m':
        return { timespan: 'minute', multiplier: 15 };
      case '30m':
        return { timespan: 'minute', multiplier: 30 };
      case '1h':
        return { timespan: 'hour', multiplier: 1 };
      case '4h':
        return { timespan: 'hour', multiplier: 4 };
      case '1d':
        return { timespan: 'day', multiplier: 1 };
      case '1w':
        return { timespan: 'week', multiplier: 1 };
      default:
        return { timespan: 'day', multiplier: 1 };
    }
  }

  /**
   * Fetch candles for a symbol with a specific timeframe
   * @param symbol Stock symbol
   * @param timeframe Timeframe string (e.g., '1m', '5m', '1h', '1d')
   * @param limit Maximum number of candles to return
   * @param from Start date (YYYY-MM-DD)
   * @param to End date (YYYY-MM-DD)
   * @returns Promise with candle data and metadata
   */
  async getCandles(
    symbol: string,
    timeframe: string,
    limit: number = 120,
    from?: string,
    to?: string
  ): Promise<{candles: Candle[], metadata: {fetchedAt: string, isDelayed: boolean, source: string}}> {
    // Convert timeframe to Polygon.io parameters
    const { timespan, multiplier } = this.convertTimeframe(timeframe);
    
    // Calculate default dates if not provided
    if (!from || !to) {
      const today = new Date();
      const to = today.toISOString().split('T')[0];
      
      let from;
      if (timeframe === '1d' || timeframe === '1w') {
        // For daily or weekly, get 120 days of data
        const start = new Date(today);
        start.setDate(start.getDate() - 120);
        from = start.toISOString().split('T')[0];
      } else if (timeframe === '4h' || timeframe === '1h') {
        // For hourly, get 30 days of data
        const start = new Date(today);
        start.setDate(start.getDate() - 30);
        from = start.toISOString().split('T')[0];
      } else {
        // For minute timeframes, get 7 days of data
        const start = new Date(today);
        start.setDate(start.getDate() - 7);
        from = start.toISOString().split('T')[0];
      }
      
      return this.getAggregates(symbol, timespan, multiplier, from, to, limit);
    }
    
    return this.getAggregates(symbol, timespan, multiplier, from, to, limit);
  }

  /**
   * Get ticker details
   * @param symbol Stock symbol
   * @returns Promise with ticker details
   */
  async getTickerDetails(symbol: string): Promise<any> {
    try {
      const url = `${this.baseUrl}/v3/reference/tickers/${symbol}`;
      return await this.makeRequest<any>(url);
    } catch (error) {
      console.error(`Error fetching ticker details for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Search for tickers
   * @param search Search term
   * @param limit Maximum number of results
   * @returns Promise with search results
   */
  async searchTickers(search: string, limit: number = 10): Promise<any> {
    try {
      const url = `${this.baseUrl}/v3/reference/tickers`;
      const params = {
        search,
        active: true,
        limit,
        market: 'stocks'
      };
      
      return await this.makeRequest<any>(url, params);
    } catch (error) {
      console.error(`Error searching tickers for "${search}":`, error);
      throw error;
    }
  }

  /**
   * Test the API connection
   * @returns Promise with test result
   */
  async testConnection(): Promise<{success: boolean, message: string, timestamp: string}> {
    try {
      // Try to fetch a simple data point to test the connection
      const url = `${this.baseUrl}/v2/aggs/ticker/AAPL/prev`;
      
      const response = await this.makeRequest<any>(url);
      
      return {
        success: response.status === 'OK',
        message: 'Successfully connected to Polygon.io API',
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to connect to Polygon.io API',
        timestamp: new Date().toISOString()
      };
    }
  }
}

export default PolygonClient;
