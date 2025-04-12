import { PatternData } from '@/services/types/patternTypes';
import { BacktestResult } from '@/services/backtesting/backtestTypes';
import { fetchStockData, fetchBatchStockData } from '@/services/api/marketData/dataService';
import { toast } from "sonner";
import { saveHistoricalPrices, getHistoricalPrices } from '@/services/supabase';

/**
 * Function to fetch raw price data from Polygon API with Supabase caching
 */
export const fetchRawPolygonData = async (
  symbols: string[], 
  timeframe: string,
  apiKey: string,
  historicalYears: 1 | 2 | 5 = 5
): Promise<Record<string, any>> => {
  const rawData: Record<string, any> = {};
  
  // Calculate the start date based on historical years setting
  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - historicalYears);
  
  toast.info(`Loading cached market data`, {
    description: `Checking cache for ${symbols.length} stocks`
  });
  
  let cachedCount = 0;
  let fetchedCount = 0;
  
  // First check cache for all symbols
  const cachePromises = symbols.map(async (symbol) => {
    const lookbackDays = 365 * historicalYears;
    const cachedData = await getHistoricalPrices(symbol, timeframe, lookbackDays);
    
    if (cachedData && cachedData.length > 100) {
      // Transform the cached data into the format expected by the application
      const formattedData = transformCachedDataToApiFormat(cachedData, symbol, timeframe);
      rawData[symbol] = formattedData;
      cachedCount++;
      return { symbol, fromCache: true };
    }
    
    return { symbol, fromCache: false };
  });
  
  const cacheResults = await Promise.all(cachePromises);
  
  // Get symbols that need to be fetched from API
  const symbolsToFetch = cacheResults
    .filter(result => !result.fromCache)
    .map(result => result.symbol);
  
  // Fetch remaining symbols from API in batches
  if (symbolsToFetch.length > 0) {
    toast.info(`Fetching ${symbolsToFetch.length} symbols from Polygon API`, {
      description: `${cachedCount} symbols loaded from cache`
    });
    
    try {
      // Use the batch fetching method to get data for remaining symbols
      const apiResults = await fetchBatchStockData(
        symbolsToFetch,
        timeframe,
        apiKey,
        365 * historicalYears // Limit based on years (approximate trading days)
      );
      
      // Merge API results into rawData
      Object.keys(apiResults).forEach(symbol => {
        rawData[symbol] = apiResults[symbol];
        fetchedCount++;
        
        // Extract historical prices for caching
        const data = apiResults[symbol];
        if (data && data.results && data.results.length > 0) {
          const historicalPrices = data.results.map((bar: any) => ({
            symbol,
            date: new Date(bar.t),
            open: bar.o,
            high: bar.h,
            low: bar.l,
            close: bar.c,
            volume: bar.v
          }));
          
          // Save to cache in background
          saveHistoricalPrices(historicalPrices, symbol, timeframe)
            .catch(err => console.error(`Failed to cache data for ${symbol}:`, err));
        }
      });
    } catch (error) {
      console.error("Error fetching batch stock data from Polygon:", error);
      toast.error("Error fetching market data", {
        description: "Some symbols could not be loaded from the Polygon API"
      });
    }
  } else if (cachedCount > 0) {
    toast.success(`All data loaded from cache`, {
      description: `${cachedCount} symbols loaded instantly from cache`
    });
  }
  
  return rawData;
};

/**
 * Helper function to transform cached data into the format expected by the application
 */
export const transformCachedDataToApiFormat = (
  cachedData: any[], 
  symbol: string, 
  interval: string
): any => {
  // Create a format similar to Polygon API response for compatibility
  const result: any = {
    ticker: symbol,
    results: cachedData.map(item => ({
      t: item.date.getTime(), // Convert to timestamp
      o: item.open,
      h: item.high,
      l: item.low,
      c: item.close,
      v: item.volume
    }))
  };
  
  return result;
};
