import { toast } from '@/hooks/use-toast';
import { DEFAULT_API_KEY } from '../apiKeyService';

/**
 * Fetches stock price data from Polygon.io API
 * Polygon provides up to 5 years of historical data
 */
export const fetchStockData = async (
  symbol: string, 
  interval: string = 'day', 
  apiKey: string = DEFAULT_API_KEY,
  limit: number = 730 // Default to 2 years (730 days)
): Promise<any> => {
  try {
    // Calculate date range based on the limit parameter
    const endDate = new Date();
    const startDate = new Date();
    
    // Estimate how many days back we need to go based on limit
    // For daily data, this is just the limit
    // For hourly data, divide by approx trading hours (6.5) to get days
    const daysBack = interval.includes('hour') || interval.includes('min') ? 
      Math.ceil(limit / 6.5) : limit;
    startDate.setDate(startDate.getDate() - daysBack);
    
    // Format dates as YYYY-MM-DD
    const formattedStartDate = startDate.toISOString().split('T')[0];
    const formattedEndDate = endDate.toISOString().split('T')[0];
    
    // Determine multiplier and timespan based on interval
    let multiplier = 1;
    let timespan = 'day';
    
    // Map the timeframe correctly for API call - handle all variations
    if (interval.includes('min')) {
      // Handle minute timeframes like 1min, 5min, 15min, 30min, etc.
      multiplier = parseInt(interval.replace('min', '')) || 1;
      timespan = 'minute';
    } else if (interval.includes('hour') || interval === '1h' || interval === '4h') {
      // Handle hour timeframes like 1hour, 4hour, etc.
      multiplier = parseInt(interval.replace('hour', '').replace('h', '')) || 1;
      timespan = 'hour';
    } else if (interval.includes('day') || interval === '1d') {
      // Handle day timeframe
      multiplier = 1;
      timespan = 'day';
    } else if (interval.includes('week') || interval === '1w' || interval === 'weekly') {
      // Handle week timeframe
      multiplier = 1;
      timespan = 'week';
    } else if (interval === 'month' || interval === 'monthly') {
      // Handle month timeframe
      multiplier = 1;
      timespan = 'month';
    } else if (interval === 'daily') {
      // Special case for 'daily'
      multiplier = 1;
      timespan = 'day';
    } else {
      // Default case - assume day
      console.warn(`Unknown interval: "${interval}", defaulting to daily`);
      multiplier = 1;
      timespan = 'day';
    }
    
    console.log(`[fetchStockData] Fetching ${interval} data for ${symbol} from Polygon.io (${formattedStartDate} to ${formattedEndDate})`);
    console.log(`[fetchStockData] Using multiplier=${multiplier}, timespan=${timespan}`);
    
    const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${formattedStartDate}/${formattedEndDate}?apiKey=${apiKey}&limit=${limit}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      // If we're getting rate limited, provide a clear error message
      if (response.status === 429) {
        throw new Error(`API rate limit exceeded for symbol ${symbol}. Consider using a smaller universe.`);
      } else if (response.status === 401) {
        throw new Error(`Authentication error! Status: 401 for symbol ${symbol}. Check your API key.`);
      }
      
      // Try to get more details from the response
      let errorDetails = '';
      try {
        const errorResponse = await response.json();
        errorDetails = JSON.stringify(errorResponse);
      } catch (e) {
        // If we can't parse the response, just use the status text
        errorDetails = response.statusText;
      }
      
      throw new Error(`HTTP error! Status: ${response.status} for symbol ${symbol}. Details: ${errorDetails}`);
    }
    
    const data = await response.json();
    
    // Check if we got an error
    if (data.status === 'ERROR' || data.error) {
      console.warn('API returned an error:', data);
      throw new Error(data.error || `Unknown API error for symbol ${symbol}`);
    }
    
    // Check if we actually got any results
    if (!data.results || data.results.length === 0) {
      console.warn(`No data returned for ${symbol} with interval ${interval}`);
      return {
        ticker: symbol,
        results: [],
        empty: true
      };
    }
    
    // Add debug output to see the raw response
    console.log(`[fetchStockData] Received data for ${symbol}: ${data.ticker}, with ${data.results?.length || 0} price records`);
    
    // Return the raw data directly
    return data;
  } catch (error) {
    console.error(`[fetchStockData] Error fetching stock data for ${symbol}:`, error);
    throw error;
  }
};

/**
 * New function to fetch data for multiple stocks with rate limiting
 */
export const fetchBatchStockData = async (
  symbols: string[],
  interval: string = 'day',
  apiKey: string = DEFAULT_API_KEY,
  limit: number = 730
): Promise<Record<string, any>> => {
  const batchSize = 5; // Process 5 symbols at a time to avoid rate limits
  const delayMs = 1200; // Add delay to avoid hitting API limits (1.2 seconds)
  const results: Record<string, any> = {};
  let successCount = 0;
  let failureCount = 0;
  
  // Display initial loading toast
  toast({
    title: `Fetching data for ${symbols.length} symbols`,
    description: `Processing ${batchSize} symbols at a time to avoid rate limits`
  });
  
  // Process symbols in batches
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const batchPromises = batch.map(async (symbol) => {
      try {
        const data = await fetchStockData(symbol, interval, apiKey, limit);
        results[symbol] = data;
        successCount++;
        return { symbol, success: true };
      } catch (error) {
        console.error(`Failed to fetch data for ${symbol}:`, error);
        failureCount++;
        return { symbol, success: false, error };
      }
    });
    
    // Wait for current batch to complete
    await Promise.all(batchPromises);
    
    // Update progress
    if (i + batchSize < symbols.length) {
      toast({
        title: `Progress: ${i + batchSize}/${symbols.length} symbols`,
        description: `${successCount} loaded, ${failureCount} failed`
      });
      
      // Add delay before next batch
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  // Final completion toast
  toast({
    title: `Completed loading ${successCount}/${symbols.length} symbols`,
    description: failureCount > 0 ? `${failureCount} symbols failed to load` : 'All symbols loaded successfully'
  });
  
  return results;
};
