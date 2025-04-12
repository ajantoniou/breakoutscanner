
import { HistoricalPrice } from '../backtestTypes';

/**
 * Validates a Double Bottom pattern formation
 * Double bottom is a bullish reversal pattern characterized by two distinct lows at roughly the same level
 */
export const validateDoubleBottom = (prices: HistoricalPrice[]): boolean => {
  if (prices.length < 20) return false;
  
  // We need to analyze a sufficient price history to detect the pattern
  const relevantPrices = prices.slice(0, 20);
  
  // Find local minimums (potential bottoms)
  const localMinimums: number[] = [];
  
  for (let i = 1; i < relevantPrices.length - 1; i++) {
    if (relevantPrices[i].low < relevantPrices[i - 1].low && 
        relevantPrices[i].low < relevantPrices[i + 1].low) {
      localMinimums.push(i);
    }
  }
  
  // Need at least two minimums to form a double bottom
  if (localMinimums.length < 2) return false;
  
  // Check if the two bottoms are at similar price levels (within 2% range)
  const firstBottom = relevantPrices[localMinimums[0]].low;
  const secondBottom = relevantPrices[localMinimums[1]].low;
  
  const priceDifference = Math.abs(firstBottom - secondBottom) / firstBottom;
  if (priceDifference > 0.02) return false;
  
  // Check if there's a recovery (higher high) between the two bottoms
  let highestBetween = 0;
  for (let i = localMinimums[0] + 1; i < localMinimums[1]; i++) {
    highestBetween = Math.max(highestBetween, relevantPrices[i].high);
  }
  
  // The middle peak should be at least 3% higher than the bottoms
  const middlePeakHeight = (highestBetween - firstBottom) / firstBottom;
  if (middlePeakHeight < 0.03) return false;
  
  // Check if price is now moving up from the second bottom
  const currentPrice = relevantPrices[0].close;
  return currentPrice > secondBottom * 1.01; // 1% above the second bottom
};

/**
 * Validates a Double Top pattern formation
 * Double top is a bearish reversal pattern characterized by two distinct highs at roughly the same level
 */
export const validateDoubleTop = (prices: HistoricalPrice[]): boolean => {
  if (prices.length < 20) return false;
  
  // We need to analyze a sufficient price history to detect the pattern
  const relevantPrices = prices.slice(0, 20);
  
  // Find local maximums (potential tops)
  const localMaximums: number[] = [];
  
  for (let i = 1; i < relevantPrices.length - 1; i++) {
    if (relevantPrices[i].high > relevantPrices[i - 1].high && 
        relevantPrices[i].high > relevantPrices[i + 1].high) {
      localMaximums.push(i);
    }
  }
  
  // Need at least two maximums to form a double top
  if (localMaximums.length < 2) return false;
  
  // Check if the two tops are at similar price levels (within 2% range)
  const firstTop = relevantPrices[localMaximums[0]].high;
  const secondTop = relevantPrices[localMaximums[1]].high;
  
  const priceDifference = Math.abs(firstTop - secondTop) / firstTop;
  if (priceDifference > 0.02) return false;
  
  // Check if there's a pullback (lower low) between the two tops
  let lowestBetween = Infinity;
  for (let i = localMaximums[0] + 1; i < localMaximums[1]; i++) {
    lowestBetween = Math.min(lowestBetween, relevantPrices[i].low);
  }
  
  // The middle trough should be at least 3% lower than the tops
  const middleTroughDepth = (firstTop - lowestBetween) / firstTop;
  if (middleTroughDepth < 0.03) return false;
  
  // Check if price is now moving down from the second top
  const currentPrice = relevantPrices[0].close;
  return currentPrice < secondTop * 0.99; // 1% below the second top
};

/**
 * Validates a Bull or Bear Flag pattern
 * Flag patterns are continuation patterns characterized by a strong move (flagpole)
 * followed by a consolidation period (flag)
 */
export const validateFlag = (
  prices: HistoricalPrice[], 
  direction: 'bullish' | 'bearish'
): boolean => {
  if (prices.length < 15) return false;
  
  // We need a decent amount of history to identify the flagpole and flag
  const relevantPrices = prices.slice(0, 15);
  
  // Determine the flagpole (initial strong move)
  // For bull flag: a strong upward move
  // For bear flag: a strong downward move
  const flagpoleStart = relevantPrices[relevantPrices.length - 1]; // Oldest price
  const flagpoleEnd = relevantPrices[relevantPrices.length - 6]; // ~5 bars for the pole
  
  // Calculate the flagpole magnitude
  const flagpoleMagnitude = direction === 'bullish'
    ? (flagpoleEnd.close - flagpoleStart.close) / flagpoleStart.close
    : (flagpoleStart.close - flagpoleEnd.close) / flagpoleStart.close;
  
  // Flagpole should represent a strong move (at least 5%)
  if (flagpoleMagnitude < 0.05) return false;
  
  // Analyze the flag portion (consolidation)
  const flagPrices = relevantPrices.slice(0, relevantPrices.length - 6);
  
  // Calculate the flag's slope
  const flagStart = flagPrices[flagPrices.length - 1];
  const flagEnd = flagPrices[0];
  
  // For a valid flag, the consolidation should move counter to the flagpole
  // Bull flag: slight downward or sideways consolidation
  // Bear flag: slight upward or sideways consolidation
  const flagSlope = (flagEnd.close - flagStart.close) / flagStart.close;
  
  if (direction === 'bullish' && flagSlope > 0.02) return false; // Bull flag shouldn't move up strongly
  if (direction === 'bearish' && flagSlope < -0.02) return false; // Bear flag shouldn't move down strongly
  
  // Check the flag's range (should be narrower than the flagpole)
  let flagHighest = -Infinity;
  let flagLowest = Infinity;
  
  for (const price of flagPrices) {
    flagHighest = Math.max(flagHighest, price.high);
    flagLowest = Math.min(flagLowest, price.low);
  }
  
  const flagRange = (flagHighest - flagLowest) / flagLowest;
  
  // Flag's range should be less than the flagpole's magnitude
  return flagRange < flagpoleMagnitude;
};

/**
 * Checks for volume confirmation of a potential breakout
 * Looks for increasing volume as price approaches the channel boundary
 */
export const validateVolumeConfirmation = (prices: HistoricalPrice[]): boolean => {
  if (prices.length < 10) return false;
  
  // Look at the most recent 5 bars
  const recentPrices = prices.slice(0, 5);
  
  // Compare recent volume to previous periods
  const previousPrices = prices.slice(5, 10);
  
  const recentVolume = recentPrices.reduce((sum, price) => sum + price.volume, 0);
  const previousVolume = previousPrices.reduce((sum, price) => sum + price.volume, 0);
  
  // Volume should be increasing as we approach potential breakout
  return recentVolume > previousVolume * 1.15; // 15% higher volume
};

/**
 * Validates if price is near the channel boundary where breakout would occur
 */
export const validateNearChannelBoundary = (
  prices: HistoricalPrice[], 
  channelType: 'horizontal' | 'ascending' | 'descending',
  direction: 'bullish' | 'bearish'
): boolean => {
  if (prices.length < 15) return false;
  
  const recentPrices = prices.slice(0, 15);
  
  // For bullish breakouts, check if price is near the upper boundary
  // For bearish breakouts, check if price is near the lower boundary
  if (direction === 'bullish') {
    // Find the highest high in the recent period
    const highestHigh = Math.max(...recentPrices.map(p => p.high));
    
    // Get the most recent close
    const currentClose = recentPrices[0].close;
    
    // Check if current price is within 2% of the highest high
    return (highestHigh - currentClose) / currentClose < 0.02;
  } else {
    // Find the lowest low in the recent period
    const lowestLow = Math.min(...recentPrices.map(p => p.low));
    
    // Get the most recent close
    const currentClose = recentPrices[0].close;
    
    // Check if current price is within 2% of the lowest low
    return (currentClose - lowestLow) / currentClose < 0.02;
  }
};

/**
 * Calculates a breakout confidence score based on multiple confirmations
 * Returns a confidence score from 0-100
 */
export const calculateBreakoutConfidence = (
  prices: HistoricalPrice[],
  pattern: {
    channelType?: 'horizontal' | 'ascending' | 'descending';
    emaPattern?: string;
    intraChannelPattern?: string;
    trendlineBreak?: boolean;
    volumeConfirmation?: boolean;
  },
  direction: 'bullish' | 'bearish'
): number => {
  // Start with a base confidence
  let confidence = 50;
  
  // Check pattern validations
  if (pattern.intraChannelPattern === 'Double Bottom' && direction === 'bullish') {
    confidence += validateDoubleBottom(prices) ? 15 : -5;
  } else if (pattern.intraChannelPattern === 'Double Top' && direction === 'bearish') {
    confidence += validateDoubleTop(prices) ? 15 : -5;
  } else if (pattern.intraChannelPattern === 'Bull Flag' && direction === 'bullish') {
    confidence += validateFlag(prices, 'bullish') ? 15 : -5;
  } else if (pattern.intraChannelPattern === 'Bear Flag' && direction === 'bearish') {
    confidence += validateFlag(prices, 'bearish') ? 15 : -5;
  }
  
  // Check volume confirmation
  const hasVolumeConfirmation = validateVolumeConfirmation(prices);
  if (hasVolumeConfirmation) {
    confidence += 10;
  }
  
  // Check if price is near channel boundary
  if (pattern.channelType) {
    const isNearBoundary = validateNearChannelBoundary(prices, pattern.channelType, direction);
    if (isNearBoundary) {
      confidence += 10;
    }
  }
  
  // Check EMA alignment
  if (pattern.emaPattern) {
    if ((direction === 'bullish' && 
        (pattern.emaPattern === 'allBullish' || pattern.emaPattern === '7over50')) ||
        (direction === 'bearish' && 
        (pattern.emaPattern === 'allBearish' || pattern.emaPattern === '7under50'))) {
      confidence += 10; // EMA pattern confirms the direction
    } else if (pattern.emaPattern === 'mixed') {
      confidence -= 5; // Mixed EMA signals reduce confidence
    }
  }
  
  // Check trendline break
  if (pattern.trendlineBreak) {
    confidence += 15;
  }
  
  // Clamp confidence between 0 and 100
  return Math.max(0, Math.min(100, confidence));
};
