/**
 * Breakout Scanner Integration Module
 * Integrates pattern detection, breakout detection, and multi-timeframe analysis
 */

import { Candle } from '../dataService';
import { PatternData } from '@/services/types/patternTypes';
import { detectPatterns, detectMultiTimeframePatterns } from './patternDetectionService';
import { detectChannelBreakout, detectMultiTimeframeBreakouts, detectAllSignals, BreakoutData } from './breakoutDetector';
import { fetchStockData, processCandles } from '../dataService';
import { STOCK_UNIVERSES } from '../stockUniverses';

/**
 * Scan for breakout opportunities across multiple symbols and timeframes
 * @param symbols Array of stock symbols to scan
 * @param timeframes Array of timeframes to scan
 * @param apiKey Optional API key
 * @returns Promise with scan results
 */
export const scanForBreakouts = async (
  symbols: string[] = STOCK_UNIVERSES.dayTrading20,
  timeframes: string[] = ['15m', '30m', '1h'],
  apiKey?: string
): Promise<(PatternData | BreakoutData)[]> => {
  const allSignals: (PatternData | BreakoutData)[] = [];
  
  // Process each symbol
  for (const symbol of symbols) {
    try {
      // Fetch data for all timeframes
      const candlesByTimeframe: Record<string, Candle[]> = {};
      
      for (const timeframe of timeframes) {
        // Fetch data
        const data = await fetchStockData(symbol, timeframe, apiKey);
        
        if (!data || !data.results || data.results.length === 0) {
          console.warn(`No data found for ${symbol} (${timeframe})`);
          continue;
        }
        
        // Process candles
        const candles = processCandles(data.results.map((result: any) => ({
          ...result,
          symbol,
          timeframe
        })));
        
        candlesByTimeframe[timeframe] = candles;
      }
      
      // Skip if we don't have data for all timeframes
      if (Object.keys(candlesByTimeframe).length !== timeframes.length) {
        console.warn(`Incomplete data for ${symbol}, skipping multi-timeframe analysis`);
        continue;
      }
      
      // Detect all signals with multi-timeframe confirmation
      const signals = detectAllSignals(candlesByTimeframe);
      
      // Add to results
      allSignals.push(...signals);
    } catch (error) {
      console.error(`Error scanning ${symbol}:`, error);
    }
  }
  
  // Sort by confidence score (highest first)
  return allSignals.sort((a, b) => b.confidenceScore - a.confidenceScore);
};

/**
 * Run day trading scanner
 * @param apiKey Optional API key
 * @returns Promise with scan results
 */
export const runDayTradingScanner = async (apiKey?: string): Promise<(PatternData | BreakoutData)[]> => {
  return scanForBreakouts(
    STOCK_UNIVERSES.dayTrading20,
    ['15m', '30m', '1h'],
    apiKey
  );
};

/**
 * Run swing trading scanner
 * @param apiKey Optional API key
 * @returns Promise with scan results
 */
export const runSwingTradingScanner = async (apiKey?: string): Promise<(PatternData | BreakoutData)[]> => {
  return scanForBreakouts(
    STOCK_UNIVERSES.swingOptions100,
    ['4h', '1d', 'weekly'],
    apiKey
  );
};

/**
 * Run golden scanner (combines day and swing with higher confidence threshold)
 * @param apiKey Optional API key
 * @returns Promise with scan results
 */
export const runGoldenScanner = async (apiKey?: string): Promise<(PatternData | BreakoutData)[]> => {
  // Run both scanners
  const dayResults = await runDayTradingScanner(apiKey);
  const swingResults = await runSwingTradingScanner(apiKey);
  
  // Combine results
  const allResults = [...dayResults, ...swingResults];
  
  // Filter for high confidence signals only (75+)
  const highConfidenceResults = allResults.filter(signal => signal.confidenceScore >= 75);
  
  // Sort by confidence score
  return highConfidenceResults.sort((a, b) => b.confidenceScore - a.confidenceScore);
};

export default {
  scanForBreakouts,
  runDayTradingScanner,
  runSwingTradingScanner,
  runGoldenScanner
};
