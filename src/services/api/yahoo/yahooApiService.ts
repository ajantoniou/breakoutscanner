import axios from 'axios';
import { Candle } from '@/services/types/patternTypes';

/**
 * Service to interact with Yahoo Finance API through Python data_api
 */
class YahooApiService {
  /**
   * Execute a Python script to fetch data from Yahoo Finance API
   * @param scriptContent Python script content
   * @returns Promise with execution result
   */
  private async executePythonScript(scriptContent: string): Promise<any> {
    try {
      const fs = require('fs');
      const path = require('path');
      const { execSync } = require('child_process');
      
      // Create a temporary Python file
      const tempDir = '/tmp';
      const pythonFilePath = path.join(tempDir, `yahoo_api_${Date.now()}.py`);
      
      fs.writeFileSync(pythonFilePath, scriptContent);
      
      // Execute the Python script
      const result = execSync(`python3 ${pythonFilePath}`).toString();
      
      // Clean up the temporary file
      fs.unlinkSync(pythonFilePath);
      
      // Parse the result
      return JSON.parse(result);
    } catch (error) {
      console.error('Error executing Python script:', error);
      throw error;
    }
  }

  /**
   * Get real-time stock quote from Yahoo Finance
   * @param symbol Stock symbol
   * @returns Promise with stock quote
   */
  async getRealTimeQuote(symbol: string): Promise<any> {
    const pythonCode = `
import sys
sys.path.append('/opt/.manus/.sandbox-runtime')
from data_api import ApiClient
client = ApiClient()

# Get real-time stock quote from Yahoo Finance
stock_data = client.call_api('YahooFinance/get_stock_chart', query={
    'symbol': '${symbol}',
    'region': 'US',
    'interval': '1m',
    'range': '1d',
    'includeAdjustedClose': True
})

# Extract the most recent price from meta data
if stock_data and stock_data.get('chart') and stock_data['chart'].get('result') and len(stock_data['chart']['result']) > 0:
    result = stock_data['chart']['result'][0]
    meta = result.get('meta', {})
    
    # Create a simplified response with just the current price data
    response = {
        'symbol': meta.get('symbol'),
        'regularMarketPrice': meta.get('regularMarketPrice'),
        'previousClose': meta.get('chartPreviousClose'),
        'currency': meta.get('currency'),
        'timestamp': meta.get('regularMarketTime')
    }
    print(response)
else:
    print({})
`;

    return this.executePythonScript(pythonCode);
  }

  /**
   * Get historical stock data from Yahoo Finance
   * @param symbol Stock symbol
   * @param interval Timeframe interval (1m, 2m, 5m, 15m, 30m, 60m, 1d, 1wk, 1mo)
   * @param range Time range (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max)
   * @returns Promise with historical stock data
   */
  async getHistoricalData(
    symbol: string,
    interval: string = '1d',
    range: string = '1mo'
  ): Promise<any> {
    const pythonCode = `
import sys
sys.path.append('/opt/.manus/.sandbox-runtime')
from data_api import ApiClient
client = ApiClient()

# Get historical stock data from Yahoo Finance
stock_data = client.call_api('YahooFinance/get_stock_chart', query={
    'symbol': '${symbol}',
    'region': 'US',
    'interval': '${interval}',
    'range': '${range}',
    'includeAdjustedClose': True
})

print(stock_data)
`;

    return this.executePythonScript(pythonCode);
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
   * Get batch quotes for multiple symbols
   * @param symbols Array of stock symbols
   * @returns Promise with batch quotes
   */
  async getBatchQuotes(symbols: string[]): Promise<Record<string, any>> {
    try {
      const results: Record<string, any> = {};
      
      // Process symbols in batches to avoid rate limiting
      const batchSize = 5;
      for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        
        // Fetch quotes for each symbol in batch
        const promises = batch.map(symbol => 
          this.getRealTimeQuote(symbol)
            .then(quote => {
              results[symbol] = quote;
            })
            .catch(error => {
              console.error(`Error fetching quote for ${symbol}:`, error);
              results[symbol] = {};
            })
        );
        
        // Wait for batch to complete
        await Promise.all(promises);
        
        // Add a small delay between batches to avoid rate limiting
        if (i + batchSize < symbols.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error getting batch quotes:', error);
      return {};
    }
  }
}

// Export singleton instance
export const yahooApiService = new YahooApiService();

// Export types
export type { YahooApiService };
