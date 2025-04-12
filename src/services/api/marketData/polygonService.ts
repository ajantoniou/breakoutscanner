
import { fetchStockData, fetchBatchStockData } from './dataService';

// Scanner configuration
export const scannerConfig = {
  defaultTimeframes: ['day', 'week', 'hour'],
  defaultSymbols: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA'],
  supportedPatterns: ['Double Bottom', 'Double Top', 'Bull Flag', 'Bear Flag'],
  defaultLimit: 730,
  defaultUniverseSize: 'top100',
  defaultHistoricalYears: 2
};

// Re-export for backward compatibility
export { fetchStockData, fetchBatchStockData };

// Add mock function for scanStocks
export const scanStocks = async (
  symbols: string[],
  timeframe: string,
  apiKey: string
) => {
  console.log(`Scanning ${symbols.length} stocks on ${timeframe} timeframe`);
  // This is a placeholder - in a real implementation, this would call an actual scanning service
  return [];
};
