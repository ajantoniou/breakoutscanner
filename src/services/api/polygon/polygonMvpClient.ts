import axios from 'axios';
import lodash from 'lodash';
const { throttle } = lodash;

// Define basic types for our focused MVP
export interface PolygonTicker {
  symbol: string;
  name: string;
  market: string;
  type: string;
}

export interface PolygonPrice {
  symbol: string;
  price: number;
  timestamp: number;
}

export interface PolygonHistoricalBar {
  o: number; // Open price
  h: number; // High price
  l: number; // Low price
  c: number; // Close price
  v: number; // Volume
  t: number; // Timestamp (Unix ms)
}

export interface PolygonAggregateResult {
  symbol: string;
  bars: PolygonHistoricalBar[];
  timeframe: string;
  fetchedAt: number;
}

/**
 * Focused MVP Polygon.io client that handles only the essential
 * endpoints needed for the day trading scanner
 */
export class PolygonMvpClient {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.polygon.io';
  private readonly maxRequestsPerMinute = 5;
  
  // Target universe of stocks for our MVP
  private readonly targetUniverse = [
    'AAPL', 'MSFT', 'AMZN', 'NVDA', 'GOOGL', 
    'META', 'TSLA', 'AMD', 'NFLX', 'PYPL',
    'DIS', 'BAC', 'JPM', 'GS', 'V',
    'COIN', 'SNAP', 'UBER', 'GME', 'AMC',
    'SPY', 'QQQ' // Key indices
  ];
  
  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Polygon API key is required');
    }
    this.apiKey = apiKey;
    
    // Log successful initialization
    console.log('Polygon MVP client initialized for target universe:', this.targetUniverse);
  }
  
  /**
   * Build a URL with the API key as a query parameter
   */
  private buildUrl(endpoint: string): string {
    // Always append the API key as a query parameter
    const separator = endpoint.includes('?') ? '&' : '?';
    return `${this.baseUrl}${endpoint}${separator}apiKey=${this.apiKey}`;
  }
  
  /**
   * Throttled method to prevent exceeding API rate limits
   */
  private throttledRequest = throttle(
    async (endpoint: string) => {
      try {
        const url = this.buildUrl(endpoint);
        const response = await axios.get(url);
        
        // Validate response
        if (response.status !== 200) {
          throw new Error(`Polygon API error: ${response.status} ${response.statusText}`);
        }
        
        return response.data;
      } catch (error: any) {
        console.error('Polygon API request failed:', error.message);
        throw error;
      }
    },
    60000 / this.maxRequestsPerMinute,
    { leading: true, trailing: false }
  );
  
  /**
   * Get current prices for the target universe
   */
  public async getCurrentPrices(): Promise<PolygonPrice[]> {
    const tickerString = this.targetUniverse.join(',');
    const endpoint = `/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${tickerString}`;
    
    console.log(`Fetching current prices for ${this.targetUniverse.length} symbols`);
    
    try {
      const response = await this.throttledRequest(endpoint);
      
      // Verify and transform response data
      if (!response || !response.tickers || !Array.isArray(response.tickers)) {
        throw new Error('Invalid response format from Polygon API');
      }
      
      const now = Date.now();
      return response.tickers.map((ticker: any) => ({
        symbol: ticker.ticker,
        price: ticker.lastTrade?.p || ticker.lastQuote?.p || 0,
        timestamp: now
      }));
    } catch (error) {
      console.error('Failed to fetch current prices:', error);
      return [];
    }
  }
  
  /**
   * Get historical bars for a given symbol and timeframe
   */
  public async getHistoricalBars(
    symbol: string,
    timeframe: string = '1h',
    from: Date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days by default
    to: Date = new Date()
  ): Promise<PolygonAggregateResult> {
    if (!this.targetUniverse.includes(symbol)) {
      console.warn(`Symbol ${symbol} is not in the target universe`);
    }
    
    // Convert timeframe to Polygon format
    const multiplier = timeframe.match(/\d+/)?.[0] || '1';
    const timespan = timeframe.includes('min') ? 'minute' 
                  : timeframe.includes('h') ? 'hour'
                  : timeframe.includes('d') ? 'day'
                  : timeframe.includes('w') ? 'week' : 'minute';
    
    const fromUnix = Math.floor(from.getTime() / 1000);
    const toUnix = Math.floor(to.getTime() / 1000);
    
    const endpoint = `/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${fromUnix}/${toUnix}?limit=5000`;
    
    console.log(`Fetching ${timeframe} bars for ${symbol} from ${from.toISOString()} to ${to.toISOString()}`);
    
    try {
      const response = await this.throttledRequest(endpoint);
      
      // Verify response format
      if (!response || !response.results || !Array.isArray(response.results)) {
        throw new Error(`Invalid response format for ${symbol} historical data`);
      }
      
      return {
        symbol,
        bars: response.results,
        timeframe,
        fetchedAt: Date.now()
      };
    } catch (error) {
      console.error(`Failed to fetch historical bars for ${symbol}:`, error);
      return {
        symbol,
        bars: [],
        timeframe,
        fetchedAt: Date.now()
      };
    }
  }
  
  /**
   * Verify API connectivity by fetching a single quote
   * Useful for debugging and connection testing
   */
  public async verifyConnectivity(): Promise<boolean> {
    const testSymbol = 'AAPL'; // Use Apple as a test
    const endpoint = `/v1/last/stocks/${testSymbol}`;
    
    try {
      await this.throttledRequest(endpoint);
      console.log('Polygon API connectivity verified successfully');
      return true;
    } catch (error) {
      console.error('Polygon API connectivity test failed:', error);
      return false;
    }
  }
  
  /**
   * Get the entire target universe at once with the most recent prices
   * Optimized for efficiency with a single API call
   */
  public async getTargetUniverseData(): Promise<PolygonPrice[]> {
    return this.getCurrentPrices();
  }
}

// Export a singleton instance
export const createPolygonMvpClient = (apiKey: string): PolygonMvpClient => {
  return new PolygonMvpClient(apiKey);
};

export default createPolygonMvpClient; 