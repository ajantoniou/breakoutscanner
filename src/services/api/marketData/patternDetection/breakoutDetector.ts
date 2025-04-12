import { Candle, PatternData } from '@/services/types/patternTypes';
import { calculateConfidenceScore } from '@/utils/confidenceScoring';

/**
 * Breakout data interface extending PatternData
 */
export interface BreakoutData extends PatternData {
  breakoutType: 'horizontal' | 'ascending' | 'descending';
  daysInChannel: number;
  volumeIncrease: number;
}

/**
 * Detect breakout patterns in candle data
 * @param symbol Stock symbol
 * @param candles Array of candles
 * @param timeframe Timeframe string (e.g., '1m', '5m', '1h', '1d')
 * @param currentPrice Current price of the stock
 * @returns Array of detected breakout patterns
 */
export const detectBreakout = (
  symbol: string,
  candles: Candle[],
  timeframe: string,
  currentPrice: number
): BreakoutData[] => {
  if (candles.length < 30) return [];
  
  const results: BreakoutData[] = [];
  
  // Look for different types of breakouts:
  // 1. Horizontal channel breakout
  // 2. Ascending channel breakout
  // 3. Descending channel breakout
  
  // Detect horizontal channel breakout
  const horizontalBreakouts = detectHorizontalChannelBreakout(symbol, candles, timeframe, currentPrice);
  results.push(...horizontalBreakouts);
  
  // Detect ascending channel breakout
  const ascendingBreakouts = detectAscendingChannelBreakout(symbol, candles, timeframe, currentPrice);
  results.push(...ascendingBreakouts);
  
  // Detect descending channel breakout
  const descendingBreakouts = detectDescendingChannelBreakout(symbol, candles, timeframe, currentPrice);
  results.push(...descendingBreakouts);
  
  return results;
};

/**
 * Detect horizontal channel breakout
 * @param symbol Stock symbol
 * @param candles Array of candles
 * @param timeframe Timeframe string
 * @param currentPrice Current price
 * @returns Array of detected horizontal channel breakouts
 */
const detectHorizontalChannelBreakout = (
  symbol: string,
  candles: Candle[],
  timeframe: string,
  currentPrice: number
): BreakoutData[] => {
  const results: BreakoutData[] = [];
  
  // We need at least 30 candles to detect a channel
  for (let i = 30; i < candles.length; i++) {
    // Check for horizontal channel over the last 20 candles
    const channelStart = i - 20;
    const channelEnd = i - 1;
    
    // Get highs and lows in the channel
    const highs: number[] = [];
    const lows: number[] = [];
    
    for (let j = channelStart; j <= channelEnd; j++) {
      highs.push(candles[j].high);
      lows.push(candles[j].low);
    }
    
    // Calculate channel boundaries
    const upperBoundary = findMostTouchedLevel(highs, 0.5);
    const lowerBoundary = findMostTouchedLevel(lows, 0.5);
    
    // Check if channel is horizontal
    const highsSlope = calculateSlope(highs);
    const lowsSlope = calculateSlope(lows);
    
    const isHorizontalChannel = Math.abs(highsSlope) < 0.05 && Math.abs(lowsSlope) < 0.05;
    
    // Check for breakout
    const isBullishBreakout = currentPrice > upperBoundary * 1.01; // 1% above upper boundary
    const isBearishBreakout = currentPrice < lowerBoundary * 0.99; // 1% below lower boundary
    
    // Calculate channel height
    const channelHeight = upperBoundary - lowerBoundary;
    
    // Check volume increase
    const recentVolume = candles[i].volume;
    const avgVolume = calculateAverageVolume(candles, channelStart, channelEnd);
    const volumeIncrease = (recentVolume / avgVolume) - 1; // Percentage increase
    
    // If we have a valid horizontal channel breakout
    if (isHorizontalChannel && (isBullishBreakout || isBearishBreakout)) {
      // Calculate pattern metrics
      const entry = currentPrice;
      let target, stopLoss, direction;
      
      if (isBullishBreakout) {
        // Target is typically the channel height added to the breakout point
        target = entry + channelHeight;
        // Stop loss is typically below the upper boundary
        stopLoss = upperBoundary * 0.99; // 1% below upper boundary
        direction = 'bullish';
      } else {
        // Target is typically the channel height subtracted from the breakout point
        target = entry - channelHeight;
        // Stop loss is typically above the lower boundary
        stopLoss = lowerBoundary * 1.01; // 1% above lower boundary
        direction = 'bearish';
      }
      
      // Calculate risk/reward ratio
      const risk = direction === 'bullish' ? (entry - stopLoss) : (stopLoss - entry);
      const reward = direction === 'bullish' ? (target - entry) : (entry - target);
      const riskRewardRatio = reward / risk;
      
      // Calculate potential profit
      const potentialProfit = direction === 'bullish' 
        ? ((target - entry) / entry) * 100 
        : ((entry - target) / entry) * 100;
      
      // Calculate days in channel
      const daysInChannel = calculateDaysInChannel(timeframe, 20); // 20 candles in channel
      
      // Calculate confidence score
      const confidenceFactors = {
        channelQuality: isHorizontalChannel ? 0.9 : 0.7, // Quality of horizontal channel
        breakoutStrength: isBullishBreakout || isBearishBreakout ? 0.9 : 0.7, // Strength of breakout
        volumeConfirmation: volumeIncrease > 0.5 ? 0.9 : 0.7, // Volume confirmation
        priceAction: 0.9, // Mock value, would be calculated from price action
        timeframe: getTimeframeWeight(timeframe) // Weight based on timeframe
      };
      
      const confidenceScore = calculateConfidenceScore(confidenceFactors);
      
      // Create breakout data
      const breakout: BreakoutData = {
        symbol,
        patternType: 'Channel Breakout',
        breakoutType: 'horizontal',
        direction,
        timeframe,
        entry,
        target,
        stopLoss,
        riskRewardRatio,
        potentialProfit,
        confidenceScore,
        detectedAt: new Date().toISOString(),
        multiTimeframeConfirmation: false, // Will be set later if confirmed
        daysInChannel,
        volumeIncrease: volumeIncrease * 100 // Convert to percentage
      };
      
      results.push(breakout);
    }
  }
  
  return results;
};

/**
 * Detect ascending channel breakout
 * @param symbol Stock symbol
 * @param candles Array of candles
 * @param timeframe Timeframe string
 * @param currentPrice Current price
 * @returns Array of detected ascending channel breakouts
 */
const detectAscendingChannelBreakout = (
  symbol: string,
  candles: Candle[],
  timeframe: string,
  currentPrice: number
): BreakoutData[] => {
  const results: BreakoutData[] = [];
  
  // We need at least 30 candles to detect a channel
  for (let i = 30; i < candles.length; i++) {
    // Check for ascending channel over the last 20 candles
    const channelStart = i - 20;
    const channelEnd = i - 1;
    
    // Get highs and lows in the channel
    const highs: number[] = [];
    const lows: number[] = [];
    
    for (let j = channelStart; j <= channelEnd; j++) {
      highs.push(candles[j].high);
      lows.push(candles[j].low);
    }
    
    // Calculate slopes
    const highsSlope = calculateSlope(highs);
    const lowsSlope = calculateSlope(lows);
    
    // Check if channel is ascending
    const isAscendingChannel = highsSlope > 0.1 && lowsSlope > 0.1;
    
    // Calculate channel boundaries at the end of the channel
    const upperBoundary = calculateTrendlineValue(highs, channelEnd - channelStart);
    const lowerBoundary = calculateTrendlineValue(lows, channelEnd - channelStart);
    
    // Check for breakout
    const isBullishBreakout = currentPrice > upperBoundary * 1.01; // 1% above upper boundary
    const isBearishBreakout = currentPrice < lowerBoundary * 0.99; // 1% below lower boundary
    
    // Calculate channel height
    const channelHeight = upperBoundary - lowerBoundary;
    
    // Check volume increase
    const recentVolume = candles[i].volume;
    const avgVolume = calculateAverageVolume(candles, channelStart, channelEnd);
    const volumeIncrease = (recentVolume / avgVolume) - 1; // Percentage increase
    
    // If we have a valid ascending channel breakout
    if (isAscendingChannel && (isBullishBreakout || isBearishBreakout)) {
      // Calculate pattern metrics
      const entry = currentPrice;
      let target, stopLoss, direction;
      
      if (isBullishBreakout) {
        // Target is typically the channel height added to the breakout point
        target = entry + channelHeight;
        // Stop loss is typically below the upper boundary
        stopLoss = upperBoundary * 0.99; // 1% below upper boundary
        direction = 'bullish';
      } else {
        // Target is typically the channel height subtracted from the breakout point
        target = entry - channelHeight;
        // Stop loss is typically above the lower boundary
        stopLoss = lowerBoundary * 1.01; // 1% above lower boundary
        direction = 'bearish';
      }
      
      // Calculate risk/reward ratio
      const risk = direction === 'bullish' ? (entry - stopLoss) : (stopLoss - entry);
      const reward = direction === 'bullish' ? (target - entry) : (entry - target);
      const riskRewardRatio = reward / risk;
      
      // Calculate potential profit
      const potentialProfit = direction === 'bullish' 
        ? ((target - entry) / entry) * 100 
        : ((entry - target) / entry) * 100;
      
      // Calculate days in channel
      const daysInChannel = calculateDaysInChannel(timeframe, 20); // 20 candles in channel
      
      // Calculate confidence score
      const confidenceFactors = {
        channelQuality: isAscendingChannel ? 0.9 : 0.7, // Quality of ascending channel
        breakoutStrength: isBullishBreakout || isBearishBreakout ? 0.9 : 0.7, // Strength of breakout
        volumeConfirmation: volumeIncrease > 0.5 ? 0.9 : 0.7, // Volume confirmation
        priceAction: 0.9, // Mock value, would be calculated from price action
        timeframe: getTimeframeWeight(timeframe) // Weight based on timeframe
      };
      
      const confidenceScore = calculateConfidenceScore(confidenceFactors);
      
      // Create breakout data
      const breakout: BreakoutData = {
        symbol,
        patternType: 'Channel Breakout',
        breakoutType: 'ascending',
        direction,
        timeframe,
        entry,
        target,
        stopLoss,
        riskRewardRatio,
        potentialProfit,
        confidenceScore,
        detectedAt: new Date().toISOString(),
        multiTimeframeConfirmation: false, // Will be set later if confirmed
        daysInChannel,
        volumeIncrease: volumeIncrease * 100 // Convert to percentage
      };
      
      results.push(breakout);
    }
  }
  
  return results;
};

/**
 * Detect descending channel breakout
 * @param symbol Stock symbol
 * @param candles Array of candles
 * @param timeframe Timeframe string
 * @param currentPrice Current price
 * @returns Array of detected descending channel breakouts
 */
const detectDescendingChannelBreakout = (
  symbol: string,
  candles: Candle[],
  timeframe: string,
  currentPrice: number
): BreakoutData[] => {
  const results: BreakoutData[] = [];
  
  // We need at least 30 candles to detect a channel
  for (let i = 30; i < candles.length; i++) {
    // Check for descending channel over the last 20 candles
    const channelStart = i - 20;
    const channelEnd = i - 1;
    
    // Get highs and lows in the channel
    const highs: number[] = [];
    const lows: number[] = [];
    
    for (let j = channelStart; j <= channelEnd; j++) {
      highs.push(candles[j].high);
      lows.push(candles[j].low);
    }
    
    // Calculate slopes
    const highsSlope = calculateSlope(highs);
    const lowsSlope = calculateSlope(lows);
    
    // Check if channel is descending
    const isDescendingChannel = highsSlope < -0.1 && lowsSlope < -0.1;
    
    // Calculate channel boundaries at the end of the channel
    const upperBoundary = calculateTrendlineValue(highs, channelEnd - channelStart);
    const lowerBoundary = calculateTrendlineValue(lows, channelEnd - channelStart);
    
    // Check for breakout
    const isBullishBreakout = currentPrice > upperBoundary * 1.01; // 1% above upper boundary
    const isBearishBreakout = currentPrice < lowerBoundary * 0.99; // 1% below lower boundary
    
    // Calculate channel height
    const channelHeight = upperBoundary - lowerBoundary;
    
    // Check volume increase
    const recentVolume = candles[i].volume;
    const avgVolume = calculateAverageVolume(candles, channelStart, channelEnd);
    const volumeIncrease = (recentVolume / avgVolume) - 1; // Percentage increase
    
    // If we have a valid descending channel breakout
    if (isDescendingChannel && (isBullishBreakout || isBearishBreakout)) {
      // Calculate pattern metrics
      const entry = currentPrice;
      let target, stopLoss, direction;
      
      if (isBullishBreakout) {
        // Target is typically the channel height added to the breakout point
        target = entry + channelHeight;
        // Stop loss is typically below the upper boundary
        stopLoss = upperBoundary * 0.99; // 1% below upper boundary
        direction = 'bullish';
      } else {
        // Target is typically the channel height subtracted from the breakout point
        target = entry - channelHeight;
        // Stop loss is typically above the lower boundary
        stopLoss = lowerBoundary * 1.01; // 1% above lower boundary
        direction = 'bearish';
      }
      
      // Calculate risk/reward ratio
      const risk = direction === 'bullish' ? (entry - stopLoss) : (stopLoss - entry);
      const reward = direction === 'bullish' ? (target - entry) : (entry - target);
      const riskRewardRatio = reward / risk;
      
      // Calculate potential profit
      const potentialProfit = direction === 'bullish' 
        ? ((target - entry) / entry) * 100 
        : ((entry - target) / entry) * 100;
      
      // Calculate days in channel
      const daysInChannel = calculateDaysInChannel(timeframe, 20); // 20 candles in channel
      
      // Calculate confidence score
      const confidenceFactors = {
        channelQuality: isDescendingChannel ? 0.9 : 0.7, // Quality of descending channel
        breakoutStrength: isBullishBreakout || isBearishBreakout ? 0.9 : 0.7, // Strength of breakout
        volumeConfirmation: volumeIncrease > 0.5 ? 0.9 : 0.7, // Volume confirmation
        priceAction: 0.9, // Mock value, would be calculated from price action
        timeframe: getTimeframeWeight(timeframe) // Weight based on timeframe
      };
      
      const confidenceScore = calculateConfidenceScore(confidenceFactors);
      
      // Create breakout data
      const breakout: BreakoutData = {
        symbol,
        patternType: 'Channel Breakout',
        breakoutType: 'descending',
        direction,
        timeframe,
        entry,
        target,
        stopLoss,
        riskRewardRatio,
        potentialProfit,
        confidenceScore,
        detectedAt: new Date().toISOString(),
        multiTimeframeConfirmation: false, // Will be set later if confirmed
        daysInChannel,
        volumeIncrease: volumeIncrease * 100 // Convert to percentage
      };
      
      results.push(breakout);
    }
  }
  
  return results;
};

/**
 * Find the most touched price level in an array of prices
 * @param prices Array of prices
 * @param tolerance Percentage tolerance for considering a touch
 * @returns Most touched price level
 */
const findMostTouchedLevel = (prices: number[], tolerance: number): number => {
  // Create bins of price levels
  const bins: { [key: number]: number } = {};
  
  // Group prices into bins based on tolerance
  for (const price of prices) {
    let foundBin = false;
    
    // Check if price fits in an existing bin
    for (const binPrice in bins) {
      const binPriceNum = parseFloat(binPrice);
      const toleranceAmount = binPriceNum * tolerance / 100;
      
      if (Math.abs(price - binPriceNum) <= toleranceAmount) {
        bins[binPriceNum]++;
        foundBin = true;
        break;
      }
    }
    
    // If no bin found, create a new one
    if (!foundBin) {
      bins[price] = 1;
    }
  }
  
  // Find bin with most touches
  let mostTouchedLevel = 0;
  let maxTouches = 0;
  
  for (const binPrice in bins) {
    if (bins[binPrice] > maxTouches) {
      maxTouches = bins[binPrice];
      mostTouchedLevel = parseFloat(binPrice);
    }
  }
  
  return mostTouchedLevel;
};

/**
 * Calculate slope of a line using linear regression
 * @param values Array of values
 * @returns Slope of the line
 */
const calculateSlope = (values: number[]): number => {
  const n = values.length;
  
  // If we have less than 2 points, slope is 0
  if (n < 2) return 0;
  
  // Calculate means
  let sumX = 0;
  let sumY = 0;
  
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
  }
  
  const meanX = sumX / n;
  const meanY = sumY / n;
  
  // Calculate slope
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < n; i++) {
    numerator += (i - meanX) * (values[i] - meanY);
    denominator += Math.pow(i - meanX, 2);
  }
  
  return denominator === 0 ? 0 : numerator / denominator;
};

/**
 * Calculate value on a trendline at a specific point
 * @param values Array of values
 * @param point Point on the trendline
 * @returns Value at the point
 */
const calculateTrendlineValue = (values: number[], point: number): number => {
  const slope = calculateSlope(values);
  const n = values.length;
  
  // Calculate y-intercept
  let sumX = 0;
  let sumY = 0;
  
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
  }
  
  const meanX = sumX / n;
  const meanY = sumY / n;
  
  const yIntercept = meanY - (slope * meanX);
  
  // Calculate value at point
  return (slope * point) + yIntercept;
};

/**
 * Calculate average volume over a range of candles
 * @param candles Array of candles
 * @param start Start index
 * @param end End index
 * @returns Average volume
 */
const calculateAverageVolume = (candles: Candle[], start: number, end: number): number => {
  let sum = 0;
  let count = 0;
  
  for (let i = start; i <= end; i++) {
    if (candles[i].volume) {
      sum += candles[i].volume;
      count++;
    }
  }
  
  return count === 0 ? 0 : sum / count;
};

/**
 * Calculate days in channel based on timeframe and number of candles
 * @param timeframe Timeframe string
 * @param candles Number of candles
 * @returns Days in channel
 */
const calculateDaysInChannel = (timeframe: string, candles: number): number => {
  switch (timeframe) {
    case '1m':
      return candles / 1440; // 1440 minutes in a day
    case '5m':
      return candles / 288; // 288 5-minute candles in a day
    case '15m':
      return candles / 96; // 96 15-minute candles in a day
    case '30m':
      return candles / 48; // 48 30-minute candles in a day
    case '1h':
      return candles / 24; // 24 hours in a day
    case '4h':
      return candles / 6; // 6 4-hour candles in a day
    case '1d':
      return candles; // 1 day per candle
    case '1w':
      return candles * 7; // 7 days per week
    default:
      return candles;
  }
};

/**
 * Get weight for timeframe in confidence calculation
 * @param timeframe Timeframe string
 * @returns Weight value
 */
const getTimeframeWeight = (timeframe: string): number => {
  switch (timeframe) {
    case '1m':
      return 0.6;
    case '5m':
      return 0.65;
    case '15m':
      return 0.7;
    case '30m':
      return 0.75;
    case '1h':
      return 0.8;
    case '4h':
      return 0.85;
    case '1d':
      return 0.9;
    case '1w':
      return 0.95;
    default:
      return 0.7;
  }
};
