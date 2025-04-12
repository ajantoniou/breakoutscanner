import axios from 'axios';
import { Candle } from '@/services/types/patternTypes';

/**
 * Yahoo Finance API client for fetching market data
 */
class YahooFinanceClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = '/api/yahoo'; // Will be proxied through our backend
  }

  /**
   * Fetch stock data from Yahoo Finance API
   * @param symbol Stock symbol
   * @param interval Timeframe interval (1m, 2m, 5m, 15m, 30m, 60m, 1d, 1wk, 1mo)
   * @param range Time range (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max)
   * @returns Promise with stock data
   */
  async getStockData(
    symbol: string,
    interval: string = '1d',
    range: string = '1mo'
  ): Promise<any> {
    try {
      // Use the data API module to fetch data
      const pythonCode = `
import sys
sys.path.append('/opt/.manus/.sandbox-runtime')
from data_api import ApiClient
client = ApiClient()

# Get stock data from Yahoo Finance
stock_data = client.call_api('YahooFinance/get_stock_chart', query={
    'symbol': '${symbol}',
    'region': 'US',
    'interval': '${interval}',
    'range': '${range}',
    'includeAdjustedClose': True
})

print(stock_data)
`;

      // Create a temporary Python file
      const fs = require('fs');
      const path = require('path');
      const tempDir = '/tmp';
      const pythonFilePath = path.join(tempDir, `yahoo_${symbol}_${Date.now()}.py`);
      
      fs.writeFileSync(pythonFilePath, pythonCode);
      
      // Execute the Python script
      const { execSync } = require('child_process');
      const result = execSync(`python3 ${pythonFilePath}`).toString();
      
      // Clean up the temporary file
      fs.unlinkSync(pythonFilePath);
      
      // Parse the result
      return JSON.parse(result);
    } catch (error) {
      console.error('Error fetching data from Yahoo Finance:', error);
      throw error;
    }
  }

  /**
   * Convert Yahoo Finance data to our Candle format
   * @param yahooData Yahoo Finance data
   * @returns Array of candles
   */
  convertToCandles(yahooData: any): Candle[] {
    try {
      if (!yahooData || !yahooData.chart || !yahooData.chart.result || yahooData.chart.result.length === 0) {
        console.warn('No data returned from Yahoo Finance');
        return [];
      }
      
      const result = yahooData.chart.result[0];
      const timestamps = result.timestamp;
      const quote = result.indicators.quote[0];
      const adjclose = result.indicators.adjclose ? result.indicators.adjclose[0].adjclose : null;
      
      const candles: Candle[] = [];
      
      for (let i = 0; i < timestamps.length; i++) {
        // Skip entries with missing data
        if (quote.open[i] === null || quote.high[i] === null || 
            quote.low[i] === null || quote.close[i] === null) {
          continue;
        }
        
        candles.push({
          timestamp: timestamps[i] * 1000, // Convert to milliseconds
          open: quote.open[i],
          high: quote.high[i],
          low: quote.low[i],
          close: quote.close[i],
          volume: quote.volume[i] || 0,
          // Add additional fields that will be calculated later
          ema7: 0,
          ema20: 0,
          ema50: 0,
          ema100: 0,
          ema200: 0,
          rsi14: 0,
          atr14: 0
        });
      }
      
      return candles;
    } catch (error) {
      console.error('Error converting Yahoo Finance data to candles:', error);
      return [];
    }
  }

  /**
   * Fetch candles for a symbol
   * @param symbol Stock symbol
   * @param timeframe Timeframe string (e.g., '1m', '5m', '1h', '1d')
   * @param limit Maximum number of candles to return
   * @returns Promise with candle data
   */
  async getCandles(
    symbol: string,
    timeframe: string,
    limit: number = 120
  ): Promise<Candle[]> {
    try {
      // Convert our timeframe format to Yahoo Finance format
      const interval = this.convertTimeframeToYahooInterval(timeframe);
      
      // Determine appropriate range based on timeframe
      const range = this.getAppropriateRange(timeframe, limit);
      
      // Fetch data from Yahoo Finance
      const yahooData = await this.getStockData(symbol, interval, range);
      
      // Convert to our Candle format
      let candles = this.convertToCandles(yahooData);
      
      // Limit the number of candles if needed
      if (candles.length > limit) {
        candles = candles.slice(candles.length - limit);
      }
      
      return candles;
    } catch (error) {
      console.error(`Error fetching candles for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Get current price for a symbol
   * @param symbol Stock symbol
   * @returns Promise with current price
   */
  async getCurrentPrice(symbol: string): Promise<number> {
    try {
      // Fetch the most recent data (1d range with 1m interval should give us the latest price)
      const yahooData = await this.getStockData(symbol, '1m', '1d');
      
      if (!yahooData || !yahooData.chart || !yahooData.chart.result || yahooData.chart.result.length === 0) {
        console.warn(`No data returned from Yahoo Finance for ${symbol}`);
        return 0;
      }
      
      const result = yahooData.chart.result[0];
      
      // Get the regular market price from meta data (most accurate current price)
      if (result.meta && result.meta.regularMarketPrice) {
        return result.meta.regularMarketPrice;
      }
      
      // Fallback to the last close price from the quotes
      const quote = result.indicators.quote[0];
      const timestamps = result.timestamp;
      
      if (timestamps.length > 0 && quote.close[timestamps.length - 1] !== null) {
        return quote.close[timestamps.length - 1];
      }
      
      console.warn(`Could not get current price for ${symbol}`);
      return 0;
    } catch (error) {
      console.error(`Error getting current price for ${symbol}:`, error);
      return 0;
    }
  }

  /**
   * Convert our timeframe format to Yahoo Finance interval format
   * @param timeframe Timeframe string (e.g., '1m', '5m', '1h', '1d')
   * @returns Yahoo Finance interval string
   */
  private convertTimeframeToYahooInterval(timeframe: string): string {
    switch (timeframe) {
      case '1m':
        return '1m';
      case '5m':
        return '5m';
      case '15m':
        return '15m';
      case '30m':
        return '30m';
      case '1h':
        return '60m';
      case '4h':
        // Yahoo doesn't have 4h, so we'll use 1d and then aggregate in our code
        return '1d';
      case '1d':
        return '1d';
      case '1w':
        return '1wk';
      default:
        return '1d';
    }
  }

  /**
   * Get appropriate range based on timeframe and limit
   * @param timeframe Timeframe string (e.g., '1m', '5m', '1h', '1d')
   * @param limit Maximum number of candles to return
   * @returns Yahoo Finance range string
   */
  private getAppropriateRange(timeframe: string, limit: number): string {
    // For minute-based timeframes
    if (['1m', '5m', '15m', '30m'].includes(timeframe)) {
      if (limit <= 60) return '1d';
      if (limit <= 300) return '5d';
      return '1mo';
    }
    
    // For hourly timeframes
    if (timeframe === '1h') {
      if (limit <= 24) return '1d';
      if (limit <= 120) return '5d';
      return '1mo';
    }
    
    // For 4-hour timeframe
    if (timeframe === '4h') {
      if (limit <= 30) return '5d';
      if (limit <= 180) return '1mo';
      return '6mo';
    }
    
    // For daily timeframe
    if (timeframe === '1d') {
      if (limit <= 30) return '1mo';
      if (limit <= 90) return '3mo';
      if (limit <= 180) return '6mo';
      return '1y';
    }
    
    // For weekly timeframe
    if (timeframe === '1w') {
      if (limit <= 52) return '1y';
      if (limit <= 260) return '5y';
      return 'max';
    }
    
    // Default
    return '1mo';
  }

  /**
   * Test the API connection
   * @returns Promise with test result
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try to fetch a simple data point to test the connection
      const yahooData = await this.getStockData('AAPL', '1d', '1d');
      
      return !!yahooData && !!yahooData.chart && !!yahooData.chart.result;
    } catch (error) {
      console.error('Error testing Yahoo Finance connection:', error);
      return false;
    }
  }
}

export default YahooFinanceClient;
