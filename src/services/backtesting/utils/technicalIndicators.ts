import { HistoricalPrice } from '../backtestTypes';

/**
 * OHLCV (Open, High, Low, Close, Volume) candlestick interface
 */
export interface OHLCV {
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  timestamp?: number;
}

/**
 * Calculate RSI (Relative Strength Index)
 */
export const calculateRSI = (prices: number[], period: number = 14): number => {
  if (prices.length < period + 1) {
    return 50; // Default to neutral if not enough data
  }
  
  let gains = 0;
  let losses = 0;
  
  // Calculate initial average gain and loss
  for (let i = 1; i <= period; i++) {
    const change = prices[i - 1] - prices[i];
    if (change >= 0) {
      gains += change;
    } else {
      losses -= change;
    }
  }
  
  // Calculate initial RS value
  let avgGain = gains / period;
  let avgLoss = losses / period;
  
  // Calculate smoothed RSI using Wilder's smoothing method
  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i - 1] - prices[i];
    
    // Update average gain and loss
    if (change >= 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - change) / period;
    }
  }
  
  // Calculate RSI
  const RS = avgLoss > 0 ? avgGain / avgLoss : 100;
  const RSI = 100 - (100 / (1 + RS));
  
  return RSI;
};

/**
 * Calculate Average True Range (ATR)
 */
export const calculateATR = (prices: HistoricalPrice[], period: number = 14): number => {
  if (prices.length < period) {
    return 0;
  }
  
  const trValues: number[] = [];
  
  // Calculate True Range values
  for (let i = 0; i < prices.length - 1; i++) {
    const high = prices[i].high;
    const low = prices[i].low;
    const prevClose = prices[i + 1].close;
    
    const tr1 = high - low;
    const tr2 = Math.abs(high - prevClose);
    const tr3 = Math.abs(low - prevClose);
    
    const trueRange = Math.max(tr1, tr2, tr3);
    trValues.push(trueRange);
  }
  
  // Calculate initial ATR as simple average
  const initialATR = trValues.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  
  // Apply smoothing for remaining periods
  let atr = initialATR;
  for (let i = period; i < trValues.length; i++) {
    atr = ((atr * (period - 1)) + trValues[i]) / period;
  }
  
  return atr;
};

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 */
export const calculateMACD = (prices: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9): { 
  macd: number; 
  signal: number; 
  histogram: number;
} => {
  // Calculate EMAs
  const fastEMA = calculateEMA(prices, fastPeriod).pop() || 0;
  const slowEMA = calculateEMA(prices, slowPeriod).pop() || 0;
  
  // Calculate MACD line
  const macdLine = fastEMA - slowEMA;
  
  // Calculate signal line (EMA of MACD)
  const macdValues = [macdLine];
  // In a real implementation, we would calculate MACD for multiple periods
  // and then take the EMA of those values
  const signalLine = macdLine;
  
  // Calculate histogram
  const histogram = macdLine - signalLine;
  
  return {
    macd: macdLine,
    signal: signalLine,
    histogram
  };
};

/**
 * Calculate Exponential Moving Average (EMA)
 */
export const calculateEMA = (prices: number[] | OHLCV[], period: number): number[] => {
  // Convert to numeric array if OHLCV objects are provided
  const numericValues: number[] = Array.isArray(prices) && typeof prices[0] !== 'number' 
    ? (prices as OHLCV[]).map(candle => Number(candle.close))
    : (prices as number[]).map(price => Number(price));
  
  if (numericValues.length < period) {
    // Return simple average if not enough data
    const sum: number = numericValues.reduce((sum, price) => sum + price, 0);
    const avg: number = sum / numericValues.length;
    return numericValues.map(() => avg);
  }
  
  // Calculate SMA for initial EMA
  const sum: number = numericValues.slice(0, period).reduce((sum, price) => sum + price, 0);
  const sma: number = sum / period;
  
  // Calculate multiplier
  const multiplier: number = 2 / (period + 1);
  
  // Calculate EMA for all periods
  const emaValues: number[] = Array(numericValues.length).fill(0);
  
  // Initialize with SMA
  for (let i = 0; i < period; i++) {
    emaValues[i] = sma;
  }
  
  // Calculate EMA values
  for (let i = period; i < numericValues.length; i++) {
    const currentValue: number = numericValues[i];
    const prevEma: number = emaValues[i-1];
    emaValues[i] = (currentValue - prevEma) * multiplier + prevEma;
  }
  
  return emaValues;
};

/**
 * Check if volume is rising over recent candles
 */
export const isVolumeRising = (prices: HistoricalPrice[], recentPeriod: number = 5): boolean => {
  if (prices.length < recentPeriod * 2) {
    return false;
  }
  
  const recentVolumes = prices.slice(0, recentPeriod).map(p => p.volume);
  const olderVolumes = prices.slice(recentPeriod, recentPeriod * 2).map(p => p.volume);
  
  const recentAvg = recentVolumes.reduce((sum, vol) => sum + vol, 0) / recentPeriod;
  const olderAvg = olderVolumes.reduce((sum, vol) => sum + vol, 0) / recentPeriod;
  
  return recentAvg > olderAvg * 1.1; // Volume should be at least 10% higher
};

/**
 * Add technical indicators to historical prices
 */
export const addTechnicalIndicators = (prices: HistoricalPrice[]): HistoricalPrice[] => {
  if (!prices || prices.length === 0) return [];
  
  const closes = prices.map(p => p.close);
  
  // Calculate indicators for all prices
  const atrValues = prices.map((_, i) => {
    const slice = prices.slice(i, i + 14);
    return calculateATR(slice);
  });
  
  const rsiValues = closes.map((_, i) => {
    const slice = closes.slice(i, i + 14);
    return calculateRSI(slice);
  });
  
  const macdResults = closes.map((_, i) => {
    const slice = closes.slice(i, i + 26);
    return calculateMACD(slice);
  });
  
  // Add indicators to price data
  return prices.map((price, i) => ({
    ...price,
    atr: atrValues[i] || undefined,
    rsi: rsiValues[i] || undefined,
    macd: macdResults[i]?.macd,
    macdSignal: macdResults[i]?.signal,
    macdHistogram: macdResults[i]?.histogram,
    volumeRising: isVolumeRising(prices.slice(i))
  }));
};

/**
 * Check if RSI is favorable for the given pattern direction
 */
export const isRsiFavorable = (rsi: number | undefined, direction: 'bullish' | 'bearish' | 'neutral'): boolean => {
  if (rsi === undefined) return false;
  
  // For bullish patterns, lower RSI is better (potential oversold condition)
  if (direction === 'bullish') {
    return rsi < 60; // Prefer RSI below 60 for bullish setups
  }
  
  // For bearish patterns, higher RSI is better (potential overbought condition)
  if (direction === 'bearish') {
    return rsi > 40; // Prefer RSI above 40 for bearish setups
  }
  
  return true; // Neutral patterns can be taken at any RSI
};

/**
 * Check if MACD is favorable for the given pattern direction
 */
export const isMacdFavorable = (
  macd: number, 
  signal: number, 
  histogram: number, 
  direction: 'bullish' | 'bearish' | 'neutral'
): boolean => {
  // For bullish patterns, we want MACD above signal or histogram turning positive
  if (direction === 'bullish') {
    return macd > signal || histogram > 0;
  }
  
  // For bearish patterns, we want MACD below signal or histogram turning negative
  if (direction === 'bearish') {
    return macd < signal || histogram < 0;
  }
  
  return true; // Neutral patterns can be taken with any MACD condition
};

/**
 * Calculate target price based on ATR
 */
export const calculateTargetWithATR = (
  entryPrice: number, 
  atr: number, 
  direction: 'bullish' | 'bearish' | 'neutral',
  multiplier: number = 2.5
): number => {
  if (direction === 'bullish') {
    return entryPrice + (atr * multiplier);
  }
  
  if (direction === 'bearish') {
    return entryPrice - (atr * multiplier);
  }
  
  return entryPrice; // No target change for neutral patterns
};

/**
 * Calculate stop loss based on ATR
 */
export const calculateStopLossWithATR = (
  entryPrice: number, 
  atr: number, 
  direction: 'bullish' | 'bearish' | 'neutral',
  multiplier: number = 1.5
): number => {
  if (direction === 'bullish') {
    return entryPrice - (atr * multiplier);
  }
  
  if (direction === 'bearish') {
    return entryPrice + (atr * multiplier);
  }
  
  // For neutral patterns, use a symmetric stop loss
  return entryPrice - (atr * multiplier);
};
