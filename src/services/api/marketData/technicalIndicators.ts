
/**
 * Technical indicators for stock analysis
 */

import { HistoricalPrice } from '@/services/backtesting/backtestTypes';

/**
 * Calculate Relative Strength Index (RSI)
 */
export const calculateRSI = (prices: HistoricalPrice[], period: number = 14): number => {
  if (prices.length < period + 1) {
    return 50; // Default to neutral if not enough data
  }
  
  // Get price changes
  const changes = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i].close - prices[i-1].close);
  }
  
  // Take the most recent 'period' changes
  const recentChanges = changes.slice(0, period);
  
  // Calculate average gains and losses
  let gains = 0;
  let losses = 0;
  
  recentChanges.forEach(change => {
    if (change > 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  });
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  // Calculate RSI
  if (avgLoss === 0) {
    return 100; // No losses means RSI = 100
  }
  
  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));
  
  return parseFloat(rsi.toFixed(2));
};

/**
 * Calculate Average True Range (ATR)
 */
export const calculateATR = (prices: HistoricalPrice[], period: number = 14): number => {
  if (prices.length < period + 1) {
    return 0;
  }
  
  const trs: number[] = [];
  
  // Calculate True Range for each period
  for (let i = 1; i < prices.length; i++) {
    const high = prices[i].high;
    const low = prices[i].low;
    const prevClose = prices[i - 1].close;
    
    const tr1 = high - low;
    const tr2 = Math.abs(high - prevClose);
    const tr3 = Math.abs(low - prevClose);
    
    trs.push(Math.max(tr1, tr2, tr3));
  }
  
  // Calculate simple average of first 'period' TRs
  if (trs.length < period) {
    return trs.reduce((sum, tr) => sum + tr, 0) / trs.length;
  }
  
  // Initialize ATR with simple average
  let atr = trs.slice(0, period).reduce((sum, tr) => sum + tr, 0) / period;
  
  // Calculate smoothed ATR
  for (let i = period; i < trs.length; i++) {
    atr = ((atr * (period - 1)) + trs[i]) / period;
  }
  
  return parseFloat(atr.toFixed(2));
};

/**
 * Calculate Exponential Moving Average (EMA)
 */
export const calculateEMA = (prices: HistoricalPrice[], period: number): number => {
  if (prices.length < period) {
    return prices[0]?.close || 0;
  }
  
  // Get closing prices
  const closes = prices.map(p => p.close);
  
  // Calculate multiplier
  const multiplier = 2 / (period + 1);
  
  // Start with SMA for the first EMA value
  let ema = closes.slice(0, period).reduce((sum, close) => sum + close, 0) / period;
  
  // Calculate EMA for remaining prices
  for (let i = period; i < closes.length; i++) {
    ema = (closes[i] - ema) * multiplier + ema;
  }
  
  return parseFloat(ema.toFixed(2));
};

/**
 * Check for EMA crossovers
 */
export const checkEMACrossover = (
  prices: HistoricalPrice[]
): { 
  ema7: number, 
  ema50: number, 
  ema100: number,
  crossovers: string[] 
} => {
  if (prices.length < 105) { // Need enough data for EMA100 calculation
    return { ema7: 0, ema50: 0, ema100: 0, crossovers: [] };
  }
  
  // Calculate current EMAs
  const currentEMA7 = calculateEMA(prices, 7);
  const currentEMA50 = calculateEMA(prices, 50);
  const currentEMA100 = calculateEMA(prices, 100);
  
  // Calculate previous day's EMAs (using prices[1:] which is yesterday onwards)
  const prevPrices = prices.slice(1);
  const prevEMA7 = calculateEMA(prevPrices, 7);
  const prevEMA50 = calculateEMA(prevPrices, 50);
  const prevEMA100 = calculateEMA(prevPrices, 100);
  
  const crossovers: string[] = [];
  
  // Check for 7 crossing above 50
  if (prevEMA7 <= prevEMA50 && currentEMA7 > currentEMA50) {
    crossovers.push('7above50');
  }
  
  // Check for 7 crossing below 50
  if (prevEMA7 >= prevEMA50 && currentEMA7 < currentEMA50) {
    crossovers.push('7below50');
  }
  
  // Check for 7 crossing above 100
  if (prevEMA7 <= prevEMA100 && currentEMA7 > currentEMA100) {
    crossovers.push('7above100');
  }
  
  // Check for 7 crossing below 100
  if (prevEMA7 >= prevEMA100 && currentEMA7 < currentEMA100) {
    crossovers.push('7below100');
  }
  
  // Check for 50 crossing above 100
  if (prevEMA50 <= prevEMA100 && currentEMA50 > currentEMA100) {
    crossovers.push('50above100');
  }
  
  // Check for 50 crossing below 100
  if (prevEMA50 >= prevEMA100 && currentEMA50 < currentEMA100) {
    crossovers.push('50below100');
  }
  
  return { 
    ema7: currentEMA7, 
    ema50: currentEMA50, 
    ema100: currentEMA100, 
    crossovers 
  };
};

/**
 * Check if EMA is acting as support or resistance
 */
export const checkEMASupport = (
  prices: HistoricalPrice[]
): { 
  ema7Support: boolean,
  ema7Resistance: boolean,
  ema50Support: boolean,
  ema50Resistance: boolean,
  ema100Support: boolean,
  ema100Resistance: boolean
} => {
  if (prices.length < 105) {
    return {
      ema7Support: false,
      ema7Resistance: false,
      ema50Support: false,
      ema50Resistance: false,
      ema100Support: false,
      ema100Resistance: false
    };
  }
  
  // Get recent price data for the last 20 candles
  const recentPrices = prices.slice(0, 20);
  
  // Calculate EMAs for each candle in the recent set
  const ema7Values = [];
  const ema50Values = [];
  const ema100Values = [];
  
  for (let i = 0; i < recentPrices.length; i++) {
    const pricesUpToHere = prices.slice(i);
    ema7Values.push(calculateEMA(pricesUpToHere, 7));
    ema50Values.push(calculateEMA(pricesUpToHere, 50));
    ema100Values.push(calculateEMA(pricesUpToHere, 100));
  }
  
  // Check for support/resistance touches
  // For support: low price should come close to EMA and bounce up
  // For resistance: high price should come close to EMA and bounce down
  
  // Threshold for "close" to EMA (as percentage of ATR)
  const atr = calculateATR(prices);
  const threshold = atr * 0.25; // 25% of ATR
  
  // Count touches for each EMA
  let ema7SupportTouches = 0;
  let ema7ResistanceTouches = 0;
  let ema50SupportTouches = 0;
  let ema50ResistanceTouches = 0;
  let ema100SupportTouches = 0;
  let ema100ResistanceTouches = 0;
  
  for (let i = 1; i < recentPrices.length; i++) {
    const price = recentPrices[i];
    const prevPrice = recentPrices[i-1];
    
    // EMA 7 Support/Resistance
    if (Math.abs(price.low - ema7Values[i]) < threshold && price.close > ema7Values[i] && prevPrice.close > price.open) {
      ema7SupportTouches++;
    }
    if (Math.abs(price.high - ema7Values[i]) < threshold && price.close < ema7Values[i] && prevPrice.close < price.open) {
      ema7ResistanceTouches++;
    }
    
    // EMA 50 Support/Resistance
    if (Math.abs(price.low - ema50Values[i]) < threshold && price.close > ema50Values[i] && prevPrice.close > price.open) {
      ema50SupportTouches++;
    }
    if (Math.abs(price.high - ema50Values[i]) < threshold && price.close < ema50Values[i] && prevPrice.close < price.open) {
      ema50ResistanceTouches++;
    }
    
    // EMA 100 Support/Resistance
    if (Math.abs(price.low - ema100Values[i]) < threshold && price.close > ema100Values[i] && prevPrice.close > price.open) {
      ema100SupportTouches++;
    }
    if (Math.abs(price.high - ema100Values[i]) < threshold && price.close < ema100Values[i] && prevPrice.close < price.open) {
      ema100ResistanceTouches++;
    }
  }
  
  // Determine if EMAs are acting as support/resistance (minimum 2 touches required)
  return {
    ema7Support: ema7SupportTouches >= 2,
    ema7Resistance: ema7ResistanceTouches >= 2,
    ema50Support: ema50SupportTouches >= 2,
    ema50Resistance: ema50ResistanceTouches >= 2,
    ema100Support: ema100SupportTouches >= 2,
    ema100Resistance: ema100ResistanceTouches >= 2
  };
};

/**
 * Check volume trend over a period
 */
export const analyzeVolume = (
  prices: HistoricalPrice[], 
  period: number = 5
): { increasing: boolean; percent: number } => {
  if (prices.length < period * 2) {
    return { increasing: false, percent: 0 };
  }
  
  // Get recent volumes
  const recentVolumes = prices.slice(0, period).map(p => p.volume);
  const prevVolumes = prices.slice(period, period * 2).map(p => p.volume);
  
  // Calculate average volumes
  const recentAvg = recentVolumes.reduce((sum, vol) => sum + vol, 0) / period;
  const prevAvg = prevVolumes.reduce((sum, vol) => sum + vol, 0) / period;
  
  // Calculate percent change
  const percentChange = ((recentAvg - prevAvg) / prevAvg) * 100;
  
  return {
    increasing: recentAvg > prevAvg,
    percent: parseFloat(percentChange.toFixed(2))
  };
};

