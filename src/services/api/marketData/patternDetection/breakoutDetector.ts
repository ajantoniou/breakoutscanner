import { Candle, PatternData } from '@/services/types/patternTypes';

/**
 * Interface for breakout pattern data
 */
export interface BreakoutData extends PatternData {
  breakoutType: 'ascending' | 'descending';
  daysInChannel: number;
  volumeIncrease: number;
}

/**
 * Detect breakout patterns in candle data
 * @param symbol Stock symbol
 * @param candles Array of candles
 * @param timeframe Timeframe string
 * @returns Array of detected breakout patterns
 */
export const detectBreakout = (
  symbol: string,
  candles: Candle[],
  timeframe: string
): BreakoutData[] => {
  if (!candles || candles.length < 20) {
    return [];
  }
  
  const results: BreakoutData[] = [];
  const lookbackPeriod = Math.min(candles.length, 60); // Look back up to 60 candles
  
  // Get recent candles for analysis
  const recentCandles = candles.slice(-lookbackPeriod);
  
  // Extract highs and lows
  const highs = recentCandles.map(c => c.high);
  const lows = recentCandles.map(c => c.low);
  
  // Find resistance and support levels
  const resistanceLevel = findMostTouchedLevel(highs, 0.5); // 0.5% tolerance
  const supportLevel = findMostTouchedLevel(lows, 0.5);
  
  // Current price
  const currentPrice = candles[candles.length - 1].close;
  const previousPrice = candles[candles.length - 2].close;
  
  // Check for ascending channel breakout (above resistance)
  if (previousPrice < resistanceLevel && currentPrice > resistanceLevel) {
    // Calculate days in channel
    const touchCount = highs.filter(h => Math.abs(h - resistanceLevel) / resistanceLevel < 0.005).length;
    const daysInChannel = calculateDaysInChannel(timeframe, touchCount);
    
    // Calculate volume increase
    const avgVolume = calculateAverageVolume(candles, candles.length - 11, candles.length - 2);
    const currentVolume = candles[candles.length - 1].volume || 0;
    const volumeIncrease = avgVolume > 0 ? (currentVolume - avgVolume) / avgVolume : 0;
    
    // Calculate confidence score
    const pricePercentageMove = (currentPrice - previousPrice) / previousPrice;
    const volumeWeight = volumeIncrease > 0.5 ? 0.3 : 0.15;
    const timeframeWeight = getTimeframeWeight(timeframe);
    const touchWeight = Math.min(touchCount / 10, 0.3);
    
    const confidenceScore = Math.min(
      (pricePercentageMove * 100) + 
      (volumeIncrease * volumeWeight * 100) + 
      (timeframeWeight * 100) + 
      (touchWeight * 100),
      100
    );
    
    // Calculate potential profit and stop loss
    const channelHeight = resistanceLevel - supportLevel;
    const target = currentPrice + channelHeight;
    const stopLoss = supportLevel;
    const potentialProfit = (target - currentPrice) / currentPrice;
    const potentialLoss = (currentPrice - stopLoss) / currentPrice;
    const riskRewardRatio = potentialLoss > 0 ? potentialProfit / potentialLoss : 0;
    
    // Only add if risk/reward is favorable
    if (riskRewardRatio >= 1.5) {
      const direction = 'long';
      const entry = currentPrice;
      
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
  
  // Check for descending channel breakout (below support)
  if (previousPrice > supportLevel && currentPrice < supportLevel) {
    // Calculate days in channel
    const touchCount = lows.filter(l => Math.abs(l - supportLevel) / supportLevel < 0.005).length;
    const daysInChannel = calculateDaysInChannel(timeframe, touchCount);
    
    // Calculate volume increase
    const avgVolume = calculateAverageVolume(candles, candles.length - 11, candles.length - 2);
    const currentVolume = candles[candles.length - 1].volume || 0;
    const volumeIncrease = avgVolume > 0 ? (currentVolume - avgVolume) / avgVolume : 0;
    
    // Calculate confidence score
    const pricePercentageMove = (previousPrice - currentPrice) / previousPrice;
    const volumeWeight = volumeIncrease > 0.5 ? 0.3 : 0.15;
    const timeframeWeight = getTimeframeWeight(timeframe);
    const touchWeight = Math.min(touchCount / 10, 0.3);
    
    const confidenceScore = Math.min(
      (pricePercentageMove * 100) + 
      (volumeIncrease * volumeWeight * 100) + 
      (timeframeWeight * 100) + 
      (touchWeight * 100),
      100
    );
    
    // Calculate potential profit and stop loss
    const channelHeight = resistanceLevel - supportLevel;
    const target = currentPrice - channelHeight;
    const stopLoss = resistanceLevel;
    const potentialProfit = (currentPrice - target) / currentPrice;
    const potentialLoss = (stopLoss - currentPrice) / currentPrice;
    const riskRewardRatio = potentialLoss > 0 ? potentialProfit / potentialLoss : 0;
    
    // Only add if risk/reward is favorable
    if (riskRewardRatio >= 1.5) {
      const direction = 'short';
      const entry = currentPrice;
      
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

// Create a default export object that includes the detectBreakout function
// This matches the pattern used in other detector files and fixes the import in patternDetectionService.ts
const breakoutDetector = {
  detect: detectBreakout
};

export default breakoutDetector;
