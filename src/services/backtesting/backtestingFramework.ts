/**
 * Backtesting Framework
 * Tests the performance of breakout detection algorithms on historical data
 */

import { Candle } from '../dataService';
import { PatternData } from '@/services/types/patternTypes';
import { BreakoutData } from './breakoutDetector';
import { fetchStockData, processCandles } from '../dataService';
import { STOCK_UNIVERSES } from '../stockUniverses';

// Define the backtest result interface
export interface BacktestResult {
  id: string;
  signalId: string;
  symbol: string;
  timeframe: string;
  signalType: string;
  direction: 'bullish' | 'bearish';
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  exitPrice: number;
  entryDate: string;
  exitDate: string;
  daysToExit: number;
  profitLossPercent: number;
  maxDrawdownPercent: number;
  successful: boolean;
  hitTarget: boolean;
  hitStopLoss: boolean;
  timeoutExit: boolean;
  confidenceScore: number;
  riskRewardRatio: number;
}

/**
 * Run backtest on a single signal
 * @param signal Pattern or breakout signal
 * @param futureCandles Candles after the signal date
 * @param maxDaysToHold Maximum days to hold the position
 * @returns Backtest result
 */
export const backtestSignal = (
  signal: PatternData | BreakoutData,
  futureCandles: Candle[],
  maxDaysToHold: number = 30
): BacktestResult => {
  if (!futureCandles || futureCandles.length === 0) {
    throw new Error('No future candles provided for backtesting');
  }

  // Extract signal details
  const { id, symbol, timeframe, direction, entryPrice, targetPrice, stopLoss, confidenceScore } = signal;
  const signalType = 'patternType' in signal ? signal.patternType : signal.breakoutType;
  const entryDate = new Date(signal.createdAt);
  
  // Initialize tracking variables
  let exitPrice = entryPrice;
  let exitDate = entryDate;
  let daysToExit = 0;
  let maxDrawdown = 0;
  let successful = false;
  let hitTarget = false;
  let hitStopLoss = false;
  let timeoutExit = false;
  
  // Calculate risk/reward ratio
  const risk = direction === 'bullish' ? entryPrice - stopLoss : stopLoss - entryPrice;
  const reward = direction === 'bullish' ? targetPrice - entryPrice : entryPrice - targetPrice;
  const riskRewardRatio = risk > 0 ? reward / risk : 0;
  
  // Simulate the trade
  for (let i = 0; i < Math.min(futureCandles.length, maxDaysToHold); i++) {
    const candle = futureCandles[i];
    daysToExit = i + 1;
    
    // Check for target hit
    if (direction === 'bullish' && candle.high >= targetPrice) {
      exitPrice = targetPrice;
      exitDate = new Date(candle.date);
      successful = true;
      hitTarget = true;
      break;
    } else if (direction === 'bearish' && candle.low <= targetPrice) {
      exitPrice = targetPrice;
      exitDate = new Date(candle.date);
      successful = true;
      hitTarget = true;
      break;
    }
    
    // Check for stop loss hit
    if (direction === 'bullish' && candle.low <= stopLoss) {
      exitPrice = stopLoss;
      exitDate = new Date(candle.date);
      hitStopLoss = true;
      break;
    } else if (direction === 'bearish' && candle.high >= stopLoss) {
      exitPrice = stopLoss;
      exitDate = new Date(candle.date);
      hitStopLoss = true;
      break;
    }
    
    // Calculate drawdown
    let currentDrawdown = 0;
    if (direction === 'bullish') {
      currentDrawdown = (entryPrice - candle.low) / entryPrice * 100;
    } else {
      currentDrawdown = (candle.high - entryPrice) / entryPrice * 100;
    }
    
    maxDrawdown = Math.max(maxDrawdown, currentDrawdown);
    
    // Update exit price to current close (will be used if we hit maxDaysToHold)
    exitPrice = candle.close;
    exitDate = new Date(candle.date);
  }
  
  // Check if we hit the maximum holding period
  if (!hitTarget && !hitStopLoss && daysToExit >= maxDaysToHold) {
    timeoutExit = true;
    successful = direction === 'bullish' ? exitPrice > entryPrice : exitPrice < entryPrice;
  }
  
  // Calculate profit/loss percentage
  const profitLossPercent = direction === 'bullish' 
    ? (exitPrice - entryPrice) / entryPrice * 100 
    : (entryPrice - exitPrice) / entryPrice * 100;
  
  // Return backtest result
  return {
    id: `backtest_${id}_${Date.now()}`,
    signalId: id,
    symbol,
    timeframe,
    signalType,
    direction,
    entryPrice,
    targetPrice,
    stopLoss,
    exitPrice,
    entryDate: entryDate.toISOString(),
    exitDate: exitDate.toISOString(),
    daysToExit,
    profitLossPercent,
    maxDrawdownPercent: maxDrawdown,
    successful,
    hitTarget,
    hitStopLoss,
    timeoutExit,
    confidenceScore,
    riskRewardRatio
  };
};

/**
 * Fetch future candles for backtesting
 * @param symbol Stock symbol
 * @param timeframe Timeframe
 * @param fromDate Start date
 * @param days Number of days to fetch
 * @param apiKey Optional API key
 * @returns Promise with processed candles
 */
export const fetchFutureCandles = async (
  symbol: string,
  timeframe: string,
  fromDate: Date,
  days: number = 30,
  apiKey?: string
): Promise<Candle[]> => {
  // Calculate to date (fromDate + days)
  const toDate = new Date(fromDate);
  toDate.setDate(toDate.getDate() + days);
  
  // Fetch data
  const data = await fetchStockData(symbol, timeframe, apiKey);
  
  if (!data || !data.results || data.results.length === 0) {
    return [];
  }
  
  // Process candles
  const allCandles = processCandles(data.results.map((result: any) => ({
    ...result,
    symbol,
    timeframe
  })));
  
  // Filter candles after fromDate
  const fromTimestamp = fromDate.getTime();
  const futureCandles = allCandles.filter(candle => {
    const candleDate = new Date(candle.date);
    return candleDate.getTime() >= fromTimestamp;
  });
  
  return futureCandles;
};

/**
 * Run backtest on multiple signals
 * @param signals Array of pattern or breakout signals
 * @param maxDaysToHold Maximum days to hold the position
 * @param apiKey Optional API key
 * @returns Promise with backtest results
 */
export const backtestSignals = async (
  signals: (PatternData | BreakoutData)[],
  maxDaysToHold: number = 30,
  apiKey?: string
): Promise<BacktestResult[]> => {
  const results: BacktestResult[] = [];
  
  for (const signal of signals) {
    try {
      // Fetch future candles
      const futureCandles = await fetchFutureCandles(
        signal.symbol,
        signal.timeframe,
        new Date(signal.createdAt),
        maxDaysToHold,
        apiKey
      );
      
      if (futureCandles.length === 0) {
        console.warn(`No future candles found for ${signal.symbol} (${signal.timeframe})`);
        continue;
      }
      
      // Run backtest
      const result = backtestSignal(signal, futureCandles, maxDaysToHold);
      
      // Add to results
      results.push(result);
    } catch (error) {
      console.error(`Error backtesting signal ${signal.id}:`, error);
    }
  }
  
  return results;
};

/**
 * Run comprehensive backtest on a strategy
 * @param strategy Function that generates signals
 * @param symbols Array of stock symbols
 * @param timeframes Array of timeframes
 * @param startDate Start date for backtest
 * @param endDate End date for backtest
 * @param apiKey Optional API key
 * @returns Promise with backtest results
 */
export const backtestStrategy = async (
  strategy: (candles: Candle[]) => (PatternData | BreakoutData)[],
  symbols: string[] = STOCK_UNIVERSES.dayTrading20,
  timeframes: string[] = ['15m', '30m', '1h'],
  startDate: Date = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
  endDate: Date = new Date(),
  apiKey?: string
): Promise<BacktestResult[]> => {
  const allResults: BacktestResult[] = [];
  
  for (const symbol of symbols) {
    for (const timeframe of timeframes) {
      try {
        // Fetch historical data
        const data = await fetchStockData(symbol, timeframe, apiKey);
        
        if (!data || !data.results || data.results.length === 0) {
          console.warn(`No data found for ${symbol} (${timeframe})`);
          continue;
        }
        
        // Process candles
        const allCandles = processCandles(data.results.map((result: any) => ({
          ...result,
          symbol,
          timeframe
        })));
        
        // Filter candles within date range
        const startTimestamp = startDate.getTime();
        const endTimestamp = endDate.getTime();
        
        const filteredCandles = allCandles.filter(candle => {
          const candleDate = new Date(candle.date);
          const timestamp = candleDate.getTime();
          return timestamp >= startTimestamp && timestamp <= endTimestamp;
        });
        
        if (filteredCandles.length === 0) {
          console.warn(`No candles found in date range for ${symbol} (${timeframe})`);
          continue;
        }
        
        // Generate signals
        const signals = strategy(filteredCandles);
        
        if (signals.length === 0) {
          console.info(`No signals generated for ${symbol} (${timeframe})`);
          continue;
        }
        
        // Backtest each signal
        for (const signal of signals) {
          // Find index of signal date in filtered candles
          const signalDate = new Date(signal.createdAt);
          const signalIndex = filteredCandles.findIndex(candle => {
            const candleDate = new Date(candle.date);
            return candleDate.getTime() >= signalDate.getTime();
          });
          
          if (signalIndex === -1 || signalIndex >= filteredCandles.length - 1) {
            console.warn(`Invalid signal date or insufficient future data for ${signal.id}`);
            continue;
          }
          
          // Get future candles
          const futureCandles = filteredCandles.slice(signalIndex + 1);
          
          if (futureCandles.length === 0) {
            console.warn(`No future candles available for ${signal.id}`);
            continue;
          }
          
          // Run backtest
          const result = backtestSignal(signal, futureCandles);
          
          // Add to results
          allResults.push(result);
        }
      } catch (error) {
        console.error(`Error backtesting ${symbol} (${timeframe}):`, error);
      }
    }
  }
  
  return allResults;
};

export default {
  backtestSignal,
  backtestSignals,
  backtestStrategy,
  fetchFutureCandles
};
