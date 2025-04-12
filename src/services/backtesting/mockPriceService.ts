import { HistoricalPriceData } from '../types/historyTypes';
import { DEFAULT_API_KEY } from '../api/marketData/apiKeyService';
import { fetchStockData } from '../api/marketData/dataService';

/**
 * Fetches historical price data for backtesting
 */
export const fetchHistoricalPrices = async (
  symbol: string,
  interval: string = 'day',
  limit: number = 365,
  apiKey: string = DEFAULT_API_KEY
): Promise<HistoricalPriceData[]> => {
  try {
    const response = await fetchStockData(symbol, interval, apiKey, limit);
    
    if (!response || !response.results || !Array.isArray(response.results)) {
      console.error(`Invalid response format for ${symbol}:`, response);
      return [];
    }
    
    // Transform Polygon data to our format
    return processPolygonDataForBacktest(response);
  } catch (error) {
    console.error(`Error fetching historical data for ${symbol}:`, error);
    return [];
  }
};

/**
 * Transforms Polygon.io API data to our internal format
 */
export const processPolygonDataForBacktest = (data: any): HistoricalPriceData[] => {
  if (!data || !data.results || !Array.isArray(data.results)) {
    return [];
  }
  
  // Reverse the data to get chronological order (oldest to newest)
  const results = [...data.results].reverse();
  
  return results.map(bar => ({
    date: bar.t.toISOString(),
    open: bar.o,
    high: bar.h,
    low: bar.l,
    close: bar.c,
    volume: bar.v
  }));
};

// Add missing function for useStrategyBacktest
export const getHistoricalPricesWithFallback = async (
  symbol: string,
  timeframe: string,
  apiKey: string = DEFAULT_API_KEY
): Promise<HistoricalPriceData[]> => {
  // First try to fetch from API
  const prices = await fetchHistoricalPrices(symbol, timeframe, 365, apiKey);
  
  if (prices.length > 0) {
    return prices;
  }
  
  // Fallback to mock data if API fails
  return generateMockPriceData(symbol, 365);
};

// Generate mock price data as a fallback
const generateMockPriceData = (symbol: string, days: number): HistoricalPriceData[] => {
  const prices: HistoricalPriceData[] = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  let basePrice = 100 + Math.random() * 200;
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    const dailyChange = (Math.random() - 0.5) * 3;
    basePrice = basePrice + dailyChange;
    if (basePrice < 5) basePrice = 5;
    
    const high = basePrice * (1 + Math.random() * 0.03);
    const low = basePrice * (1 - Math.random() * 0.03);
    
    prices.push({
      date: date.toISOString(),
      open: parseFloat(basePrice.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat((basePrice + (Math.random() - 0.5) * 2).toFixed(2)),
      volume: Math.floor(Math.random() * 10000000) + 1000000,
      symbol
    });
  }
  
  return prices;
};
