
import { fetchPatternData } from '@/services/api/marketData/patternAnalysis';
import { runBacktest } from '@/services/backtesting/backtestService';
import { getApiKey } from '@/services/api/marketData/apiKeyService';
import { savePatternToSupabase, saveBacktestToSupabase } from './patternMutationService';
import { toast } from '@/hooks/use-toast';

// Define the symbols we want to track for each type of scanning
const DAY_TRADING_SYMBOLS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'AMD', 'INTC', 'MU',
  'SPY', 'QQQ', 'DIA', 'IWM', 'XLF', 'XLE', 'XLK', 'XLV', 'XLI', 'XLU'
];

const SWING_TRADING_SYMBOLS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'AMD', 'JPM', 'V',
  'SPY', 'QQQ', 'DIA', 'IWM', 'XLF', 'XLE', 'XLK', 'XLV', 'XLI', 'XLU',
  'GLD', 'SLV', 'USO', 'UNG', 'ROKU', 'SHOP', 'SNAP', 'UBER', 'LYFT', 'ABNB'
];

// Update the timeframes for each type of scanning to match the requirements
const DAY_TRADING_TIMEFRAMES = ['1min', '5min', '15min', '30min', '1hour'];
const SWING_TRADING_TIMEFRAMES = ['4hour', 'daily', 'weekly'];

// Main function to sync data from Polygon API to Supabase
export const syncPolygonToSupabase = async (
  scanType: 'day' | 'swing',
  forceRefresh: boolean = false
): Promise<boolean> => {
  try {
    // Get stored API key configuration
    const apiKeyConfig = getApiKey();
    if (!apiKeyConfig || !apiKeyConfig.key) {
      console.error('API key not found');
      return false;
    }

    // Determine symbols and timeframes based on scan type
    const symbols = scanType === 'day' ? DAY_TRADING_SYMBOLS : SWING_TRADING_SYMBOLS;
    const timeframes = scanType === 'day' ? DAY_TRADING_TIMEFRAMES : SWING_TRADING_TIMEFRAMES;
    
    let totalPatterns = 0;
    let totalBacktests = 0;

    // Process each timeframe
    for (const timeframe of timeframes) {
      console.log(`Syncing ${scanType} data for timeframe: ${timeframe}`);
      
      // Fetch pattern data from Polygon API
      const patterns = await fetchPatternData(
        symbols, 
        timeframe, 
        apiKeyConfig.key, 
        apiKeyConfig.isPremium
      );
      
      if (patterns.length === 0) {
        console.log(`No patterns found for ${timeframe}`);
        continue;
      }
      
      // Run backtests on the patterns
      const backtestResults = await runBacktest(
        patterns, 
        scanType === 'day' ? 1 : 2, // Use 1 year for day trading, 2 for swing
        apiKeyConfig.key
      );
      
      // Save data to Supabase
      for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i];
        
        // First save the pattern
        const savedPattern = await savePatternToSupabase(pattern);
        
        // Find matching backtest result
        const backtestResult = backtestResults.find(r => r.patternId === pattern.id);
        
        if (savedPattern && backtestResult) {
          // Update the backtest with the new pattern ID
          const modifiedBacktest = {
            ...backtestResult,
            patternId: savedPattern.id
          };
          
          // Save the backtest result
          await saveBacktestToSupabase(modifiedBacktest);
          totalBacktests++;
        }
        
        totalPatterns++;
      }
      
      console.log(`Synced ${patterns.length} patterns and ${backtestResults.length} backtests for ${timeframe}`);
    }
    
    console.log(`Sync complete: ${totalPatterns} patterns and ${totalBacktests} backtests saved to Supabase`);
    return true;
  } catch (error) {
    console.error('Error syncing data to Supabase:', error);
    return false;
  }
};

// Function to sync day trading data
export const syncDayTradingData = async (forceRefresh: boolean = false): Promise<boolean> => {
  return syncPolygonToSupabase('day', forceRefresh);
};

// Function to sync swing trading data
export const syncSwingTradingData = async (forceRefresh: boolean = false): Promise<boolean> => {
  return syncPolygonToSupabase('swing', forceRefresh);
}; 
