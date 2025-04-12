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
    console.log(`[fetchStockData] API Request URL: ${url.replace(apiKey, '***API_KEY***')}`);
    
    const startTime = Date.now();
    const response = await fetch(url);
    const responseTime = Date.now() - startTime;
    
    console.log(`[fetchStockData] Response received for ${symbol} in ${responseTime}ms, status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      // If we're getting rate limited, provide a clear error message
      if (response.status === 429) {
        console.error(`[fetchStockData] API RATE LIMIT EXCEEDED for ${symbol}. Response headers:`, Object.fromEntries([...response.headers.entries()]));
        throw new Error(`API rate limit exceeded for symbol ${symbol}. Consider using a smaller universe or adding delays between requests.`);
      } else if (response.status === 401) {
        console.error(`[fetchStockData] AUTHENTICATION ERROR for ${symbol}. Using API key: ${apiKey === DEFAULT_API_KEY ? 'DEFAULT_KEY' : 'CUSTOM_KEY'}`);
        throw new Error(`Authentication error! Status: 401 for symbol ${symbol}. Check your API key.`);
      }
      
      // Try to get more details from the response
      let errorDetails = '';
      try {
        const errorResponse = await response.json();
        console.error(`[fetchStockData] API ERROR RESPONSE for ${symbol}:`, errorResponse);
        errorDetails = JSON.stringify(errorResponse);
      } catch (e) {
        // If we can't parse the response, just use the status text
        console.error(`[fetchStockData] Could not parse error response for ${symbol}:`, e);
        errorDetails = response.statusText;
      }
      
      throw new Error(`HTTP error! Status: ${response.status} for symbol ${symbol}. Details: ${errorDetails}`);
    }
    
    const data = await response.json();
    
    // Check if we got an error
    if (data.status === 'ERROR' || data.error) {
      console.error(`[fetchStockData] API returned ERROR status for ${symbol}:`, data);
      throw new Error(data.error || `Unknown API error for symbol ${symbol}`);
    }
    
    // Check if we actually got any results
    if (!data.results || data.results.length === 0) {
      console.warn(`[fetchStockData] No data returned for ${symbol} with interval ${interval}`);
      // Log the full response for debugging
      console.log(`[fetchStockData] Empty response details for ${symbol}:`, data);
      return {
        ticker: symbol,
        results: [],
        empty: true
      };
    }
    
    // Add debug output to see the raw response
    console.log(`[fetchStockData] Received data for ${symbol}: ${data.ticker}, with ${data.results?.length || 0} price records`);
    console.log(`[fetchStockData] First record timestamp: ${new Date(data.results[0].t).toISOString()}, Last record: ${new Date(data.results[data.results.length-1].t).toISOString()}`);
    
    // Return the raw data directly
    return data;
  } catch (error) {
    console.error(`[fetchStockData] ERROR fetching stock data for ${symbol}:`, error);
    // Rethrow with more context
    if (error instanceof Error) {
      throw new Error(`Failed to fetch data for ${symbol}: ${error.message}`);
    } else {
      throw new Error(`Failed to fetch data for ${symbol}: Unknown error`);
    }
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
  let emptyResponseCount = 0;
  
  console.log(`[fetchBatchStockData] Starting batch fetch for ${symbols.length} symbols with interval ${interval}`);
  console.log(`[fetchBatchStockData] Using batchSize=${batchSize}, delayMs=${delayMs}`);
  
  // Display initial loading toast
  toast({
    title: `Fetching data for ${symbols.length} symbols`,
    description: `Processing ${batchSize} symbols at a time to avoid rate limits`
  });
  
  // Process symbols in batches
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    console.log(`[fetchBatchStockData] Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(symbols.length/batchSize)}: ${batch.join(', ')}`);
    
    const batchPromises = batch.map(async (symbol) => {
      try {
        const data = await fetchStockData(symbol, interval, apiKey, limit);
        results[symbol] = data;
        
        if (data.empty || (data.results && data.results.length === 0)) {
          emptyResponseCount++;
          console.log(`[fetchBatchStockData] Empty data for ${symbol}`);
        } else {
          successCount++;
          console.log(`[fetchBatchStockData] Successfully loaded ${symbol} with ${data.results?.length || 0} records`);
        }
        
        return { symbol, success: true, empty: data.empty };
      } catch (error) {
        console.error(`[fetchBatchStockData] Failed to fetch data for ${symbol}:`, error);
        failureCount++;
        return { symbol, success: false, error };
      }
    });
    
    // Wait for current batch to complete
    const batchResults = await Promise.all(batchPromises);
    console.log(`[fetchBatchStockData] Batch ${Math.floor(i/batchSize) + 1} results:`, 
      batchResults.map(r => `${r.symbol}: ${r.success ? (r.empty ? 'empty' : 'success') : 'failed'}`).join(', '));
    
    // Update progress
    if (i + batchSize < symbols.length) {
      const progressMessage = `${successCount} loaded, ${emptyResponseCount} empty, ${failureCount} failed`;
      console.log(`[fetchBatchStockData] Progress: ${i + batchSize}/${symbols.length} symbols. ${progressMessage}`);
      
      toast({
        title: `Progress: ${i + batchSize}/${symbols.length} symbols`,
        description: progressMessage
      });
      
      // Add delay before next batch
      console.log(`[fetchBatchStockData] Waiting ${delayMs}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  // Final completion toast
  const finalMessage = `${successCount} loaded, ${emptyResponseCount} empty, ${failureCount} failed`;
  console.log(`[fetchBatchStockData] Completed loading data for ${symbols.length} symbols. ${finalMessage}`);
  
  toast({
    title: `Completed loading ${successCount}/${symbols.length} symbols`,
    description: failureCount > 0 ? `${failureCount} symbols failed to load` : 'All symbols loaded successfully'
  });
  
  return results;
};
