import { PatternData } from '@/services/types/patternTypes';
import { toast } from "sonner";
import { DEFAULT_API_KEY } from '@/services/api/marketData/apiKeyService';
import { ApiKeyConfig } from '@/services/backtesting/backtestTypes';
import { checkApiKeyStatus } from '@/services/api/marketData';
import { 
  fetchPolygonStockDataInternal as fetchPolygonStockData, 
  fetchPolygonBatchStockDataInternal as fetchPolygonBatchStockData 
} from '@/services/api/marketData/polygon';
import { saveHistoricalPrices, getHistoricalPrices } from '@/services/supabase';

/**
 * Function to fetch raw price data from Polygon API with Supabase caching
 */
export const fetchRawPolygonData = async (
  symbols: string[], 
  timeframe: string,
  apiKey: string = DEFAULT_API_KEY,
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
      const apiResults = await fetchPolygonBatchStockData(
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
const transformCachedDataToApiFormat = (
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

/**
 * Function to enhance patterns with channel information from raw price data
 */
export const enhancePatternsWithChannelInfo = async (
  patterns: PatternData[], 
  timeframe: string
): Promise<PatternData[]> => {
  return patterns;
};

/**
 * Function to update and save API key configuration
 */
export const updateApiKey = async (
  key: string,
  provider: string = "Polygon.io",
  setIsCheckingKey: (isChecking: boolean) => void,
  setApiKeyConfig: (config: ApiKeyConfig) => void
): Promise<boolean> => {
  setIsCheckingKey(true);
  
  try {
    const keyStatus = await checkApiKeyStatus(key, provider);
    
    // Save API key configuration
    const newConfig: ApiKeyConfig = {
      key,
      provider,
      isPremium: keyStatus.isPremium
    };
    
    setApiKeyConfig(newConfig);
    
    // Save to localStorage
    localStorage.setItem("market_api_key", key);
    localStorage.setItem("market_api_provider", provider);
    localStorage.setItem("market_api_is_premium", keyStatus.isPremium.toString());
    
    toast.success(
      keyStatus.isPremium 
        ? `Premium ${provider} API key configured`
        : `${provider} API key set (free tier)`
    );
    
    return true;
  } catch (error) {
    console.error("Error validating API key:", error);
    toast.error("Invalid API key", {
      description: "The provided API key could not be validated."
    });
    return false;
  } finally {
    setIsCheckingKey(false);
  }
};

/**
 * Function to fetch API key from localStorage
 */
export const fetchApiKey = async () => {
  try {
    // Check localStorage first
    const storedKey = localStorage.getItem('polygon_api_key');
    
    if (storedKey) {
      const parsedKey = JSON.parse(storedKey);
      return parsedKey;
    }
    
    // If no key in localStorage, return empty config
    return {
      key: '',
      provider: 'polygon',
      isPremium: false
    };
  } catch (error) {
    console.error('Error fetching API key:', error);
    toast("Error fetching API key");
    return {
      key: '',
      provider: 'polygon',
      isPremium: false
    };
  }
};
