import { LoggingService, LogCategory } from '../logging/LoggingService';

export interface PolygonApiOptions {
  apiKey: string;
  baseUrl?: string;
  maxRetries?: number;
  retryDelayMs?: number;
}

export interface PolygonRateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // Timestamp in seconds
}

export interface PolygonCandle {
  o: number;   // Open price
  h: number;   // High price
  l: number;   // Low price
  c: number;   // Close price
  v: number;   // Volume
  t: number;   // Timestamp in milliseconds
  vw?: number; // Volume-weighted average price
  n?: number;  // Number of trades
}

export type TimeframeString = '1min' | '5min' | '15min' | '30min' | '1h' | '2h' | '4h' | '1day';

/**
 * Service for interacting with the Polygon.io API
 */
export class PolygonService {
  private static instance: PolygonService;
  private apiKey: string;
  private baseUrl: string;
  private maxRetries: number;
  private retryDelayMs: number;
  private rateLimits: Record<string, PolygonRateLimitInfo> = {};
  private logger: LoggingService;

  private constructor(options: PolygonApiOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl || 'https://api.polygon.io';
    this.maxRetries = options.maxRetries || 3;
    this.retryDelayMs = options.retryDelayMs || 1000;
    this.logger = LoggingService.getInstance();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(options?: PolygonApiOptions): PolygonService {
    if (!PolygonService.instance) {
      if (!options || !options.apiKey) {
        throw new Error('PolygonService requires API key on initialization');
      }
      PolygonService.instance = new PolygonService(options);
    }
    return PolygonService.instance;
  }

  /**
   * Fetch historical candles for a symbol
   */
  public async getAggregates(
    symbol: string,
    timeframe: TimeframeString,
    from: Date,
    to: Date,
    options: {
      adjusted?: boolean,
      sort?: 'asc' | 'desc',
      limit?: number
    } = {}
  ): Promise<PolygonCandle[]> {
    const multiplier = this.getMultiplierFromTimeframe(timeframe);
    const timespan = this.getTimespanFromTimeframe(timeframe);
    
    const fromFormatted = this.formatDateForPolygon(from);
    const toFormatted = this.formatDateForPolygon(to);

    const endpoint = `/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${fromFormatted}/${toFormatted}`;
    const queryParams = new URLSearchParams({
      adjusted: (options.adjusted !== false).toString(),
      sort: options.sort || 'asc',
      limit: (options.limit || 5000).toString(),
    });

    const startTime = Date.now();
    try {
      const response = await this.makeRequest('GET', `${endpoint}?${queryParams}`);
      
      this.logger.logPerformance('PolygonService.getAggregates', Date.now() - startTime, {
        symbol,
        timeframe,
        from: fromFormatted,
        to: toFormatted,
        resultCount: response.results?.length || 0
      });
      
      return response.results || [];
    } catch (error) {
      this.logger.error(
        `Failed to fetch aggregates for ${symbol}`, 
        LogCategory.API, 
        { symbol, timeframe, from: fromFormatted, to: toFormatted, error: (error as Error).message }
      );
      throw error;
    }
  }

  /**
   * Fetch ticker details
   */
  public async getTickerDetails(symbol: string): Promise<any> {
    const endpoint = `/v3/reference/tickers/${symbol}`;
    
    const startTime = Date.now();
    try {
      const response = await this.makeRequest('GET', endpoint);
      
      this.logger.logPerformance('PolygonService.getTickerDetails', Date.now() - startTime, {
        symbol
      });
      
      return response.results || {};
    } catch (error) {
      this.logger.error(
        `Failed to fetch ticker details for ${symbol}`, 
        LogCategory.API, 
        { symbol, error: (error as Error).message }
      );
      throw error;
    }
  }

  /**
   * Fetch last quote for a symbol
   */
  public async getLastQuote(symbol: string): Promise<any> {
    const endpoint = `/v2/last/nbbo/${symbol}`;
    
    const startTime = Date.now();
    try {
      const response = await this.makeRequest('GET', endpoint);
      
      this.logger.logPerformance('PolygonService.getLastQuote', Date.now() - startTime, {
        symbol
      });
      
      return response.results || {};
    } catch (error) {
      this.logger.error(
        `Failed to fetch last quote for ${symbol}`, 
        LogCategory.API, 
        { symbol, error: (error as Error).message }
      );
      throw error;
    }
  }

  /**
   * Make authenticated request to Polygon API with retry logic and rate limit handling
   */
  private async makeRequest(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<any> {
    let retries = 0;
    const fullUrl = `${this.baseUrl}${endpoint}`;
    
    // Check for rate limit before making request
    if (this.isRateLimited(endpoint)) {
      const resetTime = this.getRateLimitResetTime(endpoint);
      const waitTime = (resetTime.getTime() - Date.now()) + 1000; // Add 1 second buffer
      
      this.logger.warn(
        `Rate limit reached for endpoint ${endpoint}, waiting ${waitTime}ms before retry`,
        LogCategory.API,
        { endpoint, resetTime: resetTime.toISOString(), waitTime }
      );
      
      await this.delay(waitTime);
    }

    while (retries <= this.maxRetries) {
      try {
        const response = await fetch(fullUrl, {
          method,
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: body ? JSON.stringify(body) : undefined
        });

        // Store rate limit information
        this.updateRateLimits(endpoint, response.headers);
        
        // Check if we're approaching rate limits and log
        this.checkAndLogRateLimits(endpoint);

        if (!response.ok) {
          // Handle specific HTTP errors
          if (response.status === 429) {
            this.logger.warn(
              `Rate limit exceeded for ${endpoint}`, 
              LogCategory.API, 
              { endpoint, status: response.status }
            );
            
            if (retries < this.maxRetries) {
              const retryDelay = this.getRetryDelay(response, retries);
              await this.delay(retryDelay);
              retries++;
              continue;
            }
          }
          
          const errorText = await response.text();
          throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        return await response.json();
      } catch (error) {
        if (retries < this.maxRetries) {
          const delay = this.retryDelayMs * Math.pow(2, retries);
          
          this.logger.warn(
            `API request failed, retrying in ${delay}ms`, 
            LogCategory.API, 
            { endpoint, retryCount: retries + 1, maxRetries: this.maxRetries, error: (error as Error).message }
          );
          
          await this.delay(delay);
          retries++;
        } else {
          this.logger.error(
            `API request failed after ${retries} retries`, 
            LogCategory.API, 
            { endpoint, error: (error as Error).message }
          );
          throw error;
        }
      }
    }

    throw new Error(`Failed after ${this.maxRetries} retries`);
  }

  /**
   * Calculate retry delay based on response headers and retry count
   */
  private getRetryDelay(response: Response, retryCount: number): number {
    // Check for Retry-After header
    const retryAfter = response.headers.get('Retry-After');
    if (retryAfter) {
      const retryAfterSeconds = parseInt(retryAfter, 10);
      if (!isNaN(retryAfterSeconds)) {
        return retryAfterSeconds * 1000;
      }
    }

    // Exponential backoff
    return this.retryDelayMs * Math.pow(2, retryCount);
  }

  /**
   * Update stored rate limit information from response headers
   */
  private updateRateLimits(endpoint: string, headers: Headers): void {
    const limit = headers.get('X-RateLimit-Limit');
    const remaining = headers.get('X-RateLimit-Remaining');
    const reset = headers.get('X-RateLimit-Reset');

    if (limit && remaining && reset) {
      this.rateLimits[this.getEndpointGroup(endpoint)] = {
        limit: parseInt(limit, 10),
        remaining: parseInt(remaining, 10),
        reset: parseInt(reset, 10)
      };
    }
  }

  /**
   * Check and log current rate limit status
   */
  private checkAndLogRateLimits(endpoint: string): void {
    const endpointGroup = this.getEndpointGroup(endpoint);
    const rateLimitInfo = this.rateLimits[endpointGroup];

    if (rateLimitInfo) {
      // Log when less than 10% of rate limit remaining
      const thresholdRemaining = Math.floor(rateLimitInfo.limit * 0.1);
      
      if (rateLimitInfo.remaining <= thresholdRemaining) {
        const resetDate = new Date(rateLimitInfo.reset * 1000);
        
        this.logger.logRateLimit(
          'Polygon.io',
          rateLimitInfo.remaining,
          resetDate,
          endpointGroup
        );
      }
    }
  }

  /**
   * Check if current endpoint is rate limited
   */
  private isRateLimited(endpoint: string): boolean {
    const endpointGroup = this.getEndpointGroup(endpoint);
    const rateLimitInfo = this.rateLimits[endpointGroup];

    if (!rateLimitInfo) {
      return false;
    }

    // If no remaining calls and reset time is in the future
    return rateLimitInfo.remaining <= 0 && 
           (rateLimitInfo.reset * 1000) > Date.now();
  }

  /**
   * Get rate limit reset time
   */
  private getRateLimitResetTime(endpoint: string): Date {
    const endpointGroup = this.getEndpointGroup(endpoint);
    const rateLimitInfo = this.rateLimits[endpointGroup];

    if (!rateLimitInfo) {
      return new Date();
    }

    return new Date(rateLimitInfo.reset * 1000);
  }

  /**
   * Get endpoint group for rate limit tracking
   */
  private getEndpointGroup(endpoint: string): string {
    // Extract the base endpoint path for grouping rate limits
    // Example: /v2/aggs/ticker/AAPL/range/1/day/2023-01-01/2023-01-31 -> /v2/aggs
    const parts = endpoint.split('/');
    if (parts.length >= 3) {
      return `/${parts[1]}/${parts[2]}`;
    }
    return endpoint;
  }

  /**
   * Format date for Polygon API (YYYY-MM-DD)
   */
  private formatDateForPolygon(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Get multiplier value from timeframe string
   */
  private getMultiplierFromTimeframe(timeframe: TimeframeString): number {
    switch (timeframe) {
      case '1min':
        return 1;
      case '5min':
        return 5;
      case '15min':
        return 15;
      case '30min':
        return 30;
      case '1h':
        return 1;
      case '2h':
        return 2;
      case '4h':
        return 4;
      case '1day':
        return 1;
      default:
        throw new Error(`Invalid timeframe: ${timeframe}`);
    }
  }

  /**
   * Get timespan value from timeframe string
   */
  private getTimespanFromTimeframe(timeframe: TimeframeString): string {
    switch (timeframe) {
      case '1min':
      case '5min':
      case '15min':
      case '30min':
        return 'minute';
      case '1h':
      case '2h':
      case '4h':
        return 'hour';
      case '1day':
        return 'day';
      default:
        throw new Error(`Invalid timeframe: ${timeframe}`);
    }
  }

  /**
   * Delay helper function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
} 