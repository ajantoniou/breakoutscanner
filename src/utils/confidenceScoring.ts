/**
 * Confidence scoring system for pattern detection
 * Provides standardized scoring based on multiple factors
 */

// Interface for confidence factors
export interface ConfidenceFactors {
  // Pattern quality factors (0-1)
  patternQuality?: number;      // How well the pattern matches the ideal formation
  priceAction?: number;         // Quality of price action within the pattern
  volumeConfirmation?: number;  // Volume confirmation of the pattern
  
  // Technical factors (0-1)
  trendStrength?: number;       // Strength of the underlying trend
  volatility?: number;          // Volatility of the stock (normalized)
  momentum?: number;            // Momentum indicators (RSI, MACD, etc.)
  support?: number;             // Proximity to support/resistance levels
  
  // Timeframe factors (0-1)
  timeframe?: number;           // Weight based on timeframe reliability
  multiTimeframeAlignment?: number; // Alignment with higher timeframes
  
  // Market factors (0-1)
  marketCondition?: number;     // Overall market condition
  sectorStrength?: number;      // Sector performance relative to market
  
  // Historical factors (0-1)
  historicalAccuracy?: number;  // Historical accuracy of this pattern type
  backtestResults?: number;     // Results from backtesting this pattern
}

/**
 * Calculate confidence score based on weighted factors
 * @param factors Object containing confidence factors (0-1 range)
 * @returns Confidence score (0-100)
 */
export const calculateConfidenceScore = (factors: ConfidenceFactors): number => {
  // Define weights for each factor category
  const weights = {
    // Pattern quality factors (40% total weight)
    patternQuality: 15,
    priceAction: 15,
    volumeConfirmation: 10,
    
    // Technical factors (30% total weight)
    trendStrength: 10,
    volatility: 5,
    momentum: 10,
    support: 5,
    
    // Timeframe factors (15% total weight)
    timeframe: 5,
    multiTimeframeAlignment: 10,
    
    // Market factors (10% total weight)
    marketCondition: 5,
    sectorStrength: 5,
    
    // Historical factors (5% total weight)
    historicalAccuracy: 3,
    backtestResults: 2
  };
  
  // Initialize score and total weight used
  let score = 0;
  let totalWeightUsed = 0;
  
  // Calculate weighted score for each factor
  for (const [factor, weight] of Object.entries(weights)) {
    const factorKey = factor as keyof ConfidenceFactors;
    const factorValue = factors[factorKey];
    
    // Only include factors that have values
    if (factorValue !== undefined) {
      // Ensure factor value is in 0-1 range
      const normalizedValue = Math.max(0, Math.min(1, factorValue));
      
      // Add weighted factor to score
      score += normalizedValue * weight;
      totalWeightUsed += weight;
    }
  }
  
  // If no factors provided, return default score of 50
  if (totalWeightUsed === 0) {
    return 50;
  }
  
  // Normalize score to account for missing factors
  const normalizedScore = (score / totalWeightUsed) * 100;
  
  // Round to nearest integer and ensure score is in 0-100 range
  return Math.round(Math.max(0, Math.min(100, normalizedScore)));
};

/**
 * Calculate pattern quality factor based on pattern formation
 * @param pattern Pattern data
 * @returns Pattern quality factor (0-1)
 */
export const calculatePatternQuality = (
  highs: number[],
  lows: number[],
  patternType: string
): number => {
  switch (patternType.toLowerCase()) {
    case 'bull flag':
      return calculateBullFlagQuality(highs, lows);
    case 'bear flag':
      return calculateBearFlagQuality(highs, lows);
    case 'ascending triangle':
      return calculateAscendingTriangleQuality(highs, lows);
    case 'descending triangle':
      return calculateDescendingTriangleQuality(highs, lows);
    default:
      return 0.7; // Default quality for unknown patterns
  }
};

/**
 * Calculate Bull Flag pattern quality
 * @param highs Array of price highs
 * @param lows Array of price lows
 * @returns Pattern quality factor (0-1)
 */
const calculateBullFlagQuality = (highs: number[], lows: number[]): number => {
  if (highs.length < 5 || lows.length < 5) return 0.5;
  
  // Calculate linear regression for highs and lows
  const highsSlope = calculateSlope(highs);
  const lowsSlope = calculateSlope(lows);
  
  // Ideal bull flag has slightly negative or flat slope
  const idealHighsSlope = -0.05;
  const idealLowsSlope = -0.05;
  
  // Calculate deviation from ideal slopes
  const highsSlopeDeviation = Math.abs(highsSlope - idealHighsSlope);
  const lowsSlopeDeviation = Math.abs(lowsSlope - idealLowsSlope);
  
  // Calculate channel width consistency
  const channelWidths = highs.map((high, i) => high - lows[i]);
  const channelWidthConsistency = calculateConsistency(channelWidths);
  
  // Combine factors for overall quality
  const slopeQuality = Math.max(0, 1 - (highsSlopeDeviation + lowsSlopeDeviation));
  const quality = (slopeQuality * 0.7) + (channelWidthConsistency * 0.3);
  
  return Math.max(0, Math.min(1, quality));
};

/**
 * Calculate Bear Flag pattern quality
 * @param highs Array of price highs
 * @param lows Array of price lows
 * @returns Pattern quality factor (0-1)
 */
const calculateBearFlagQuality = (highs: number[], lows: number[]): number => {
  if (highs.length < 5 || lows.length < 5) return 0.5;
  
  // Calculate linear regression for highs and lows
  const highsSlope = calculateSlope(highs);
  const lowsSlope = calculateSlope(lows);
  
  // Ideal bear flag has slightly positive or flat slope
  const idealHighsSlope = 0.05;
  const idealLowsSlope = 0.05;
  
  // Calculate deviation from ideal slopes
  const highsSlopeDeviation = Math.abs(highsSlope - idealHighsSlope);
  const lowsSlopeDeviation = Math.abs(lowsSlope - idealLowsSlope);
  
  // Calculate channel width consistency
  const channelWidths = highs.map((high, i) => high - lows[i]);
  const channelWidthConsistency = calculateConsistency(channelWidths);
  
  // Combine factors for overall quality
  const slopeQuality = Math.max(0, 1 - (highsSlopeDeviation + lowsSlopeDeviation));
  const quality = (slopeQuality * 0.7) + (channelWidthConsistency * 0.3);
  
  return Math.max(0, Math.min(1, quality));
};

/**
 * Calculate Ascending Triangle pattern quality
 * @param highs Array of price highs
 * @param lows Array of price lows
 * @returns Pattern quality factor (0-1)
 */
const calculateAscendingTriangleQuality = (highs: number[], lows: number[]): number => {
  if (highs.length < 5 || lows.length < 5) return 0.5;
  
  // Calculate linear regression for highs and lows
  const highsSlope = calculateSlope(highs);
  const lowsSlope = calculateSlope(lows);
  
  // Ideal ascending triangle has flat top (highs) and rising bottom (lows)
  const idealHighsSlope = 0;
  const idealLowsSlope = 0.1;
  
  // Calculate deviation from ideal slopes
  const highsSlopeDeviation = Math.abs(highsSlope - idealHighsSlope);
  const lowsSlopeDeviation = Math.abs(lowsSlope - idealLowsSlope);
  
  // Check for resistance level (flat top)
  const topResistance = calculateResistanceQuality(highs);
  
  // Combine factors for overall quality
  const slopeQuality = Math.max(0, 1 - (highsSlopeDeviation * 2 + lowsSlopeDeviation));
  const quality = (slopeQuality * 0.5) + (topResistance * 0.5);
  
  return Math.max(0, Math.min(1, quality));
};

/**
 * Calculate Descending Triangle pattern quality
 * @param highs Array of price highs
 * @param lows Array of price lows
 * @returns Pattern quality factor (0-1)
 */
const calculateDescendingTriangleQuality = (highs: number[], lows: number[]): number => {
  if (highs.length < 5 || lows.length < 5) return 0.5;
  
  // Calculate linear regression for highs and lows
  const highsSlope = calculateSlope(highs);
  const lowsSlope = calculateSlope(lows);
  
  // Ideal descending triangle has falling top (highs) and flat bottom (lows)
  const idealHighsSlope = -0.1;
  const idealLowsSlope = 0;
  
  // Calculate deviation from ideal slopes
  const highsSlopeDeviation = Math.abs(highsSlope - idealHighsSlope);
  const lowsSlopeDeviation = Math.abs(lowsSlope - idealLowsSlope);
  
  // Check for support level (flat bottom)
  const bottomSupport = calculateSupportQuality(lows);
  
  // Combine factors for overall quality
  const slopeQuality = Math.max(0, 1 - (highsSlopeDeviation + lowsSlopeDeviation * 2));
  const quality = (slopeQuality * 0.5) + (bottomSupport * 0.5);
  
  return Math.max(0, Math.min(1, quality));
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
 * Calculate consistency of a series of values
 * @param values Array of values
 * @returns Consistency factor (0-1)
 */
const calculateConsistency = (values: number[]): number => {
  if (values.length < 2) return 1;
  
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const deviations = values.map(value => Math.abs(value - mean));
  const averageDeviation = deviations.reduce((sum, deviation) => sum + deviation, 0) / deviations.length;
  
  // Normalize to 0-1 range (lower deviation means higher consistency)
  const normalizedDeviation = Math.min(1, averageDeviation / mean);
  
  return 1 - normalizedDeviation;
};

/**
 * Calculate quality of a resistance level
 * @param highs Array of price highs
 * @returns Resistance quality factor (0-1)
 */
const calculateResistanceQuality = (highs: number[]): number => {
  if (highs.length < 3) return 0.5;
  
  // Calculate mean and standard deviation
  const mean = highs.reduce((sum, value) => sum + value, 0) / highs.length;
  const deviations = highs.map(value => Math.pow(value - mean, 2));
  const variance = deviations.reduce((sum, deviation) => sum + deviation, 0) / deviations.length;
  const stdDev = Math.sqrt(variance);
  
  // Calculate how many highs are close to the mean
  const threshold = mean * 0.01; // 1% threshold
  const closeToMean = highs.filter(value => Math.abs(value - mean) <= threshold).length;
  
  // Calculate resistance quality
  const touchesQuality = closeToMean / highs.length;
  const deviationQuality = Math.max(0, 1 - (stdDev / mean));
  
  return (touchesQuality * 0.7) + (deviationQuality * 0.3);
};

/**
 * Calculate quality of a support level
 * @param lows Array of price lows
 * @returns Support quality factor (0-1)
 */
const calculateSupportQuality = (lows: number[]): number => {
  if (lows.length < 3) return 0.5;
  
  // Calculate mean and standard deviation
  const mean = lows.reduce((sum, value) => sum + value, 0) / lows.length;
  const deviations = lows.map(value => Math.pow(value - mean, 2));
  const variance = deviations.reduce((sum, deviation) => sum + deviation, 0) / deviations.length;
  const stdDev = Math.sqrt(variance);
  
  // Calculate how many lows are close to the mean
  const threshold = mean * 0.01; // 1% threshold
  const closeToMean = lows.filter(value => Math.abs(value - mean) <= threshold).length;
  
  // Calculate support quality
  const touchesQuality = closeToMean / lows.length;
  const deviationQuality = Math.max(0, 1 - (stdDev / mean));
  
  return (touchesQuality * 0.7) + (deviationQuality * 0.3);
};

/**
 * Calculate volume confirmation factor
 * @param volumes Array of volume values
 * @param patternType Type of pattern
 * @returns Volume confirmation factor (0-1)
 */
export const calculateVolumeConfirmation = (
  volumes: number[],
  patternType: string
): number => {
  if (volumes.length < 5) return 0.5;
  
  // Calculate average volume
  const avgVolume = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
  
  // Check if volume is increasing or decreasing
  const volumeTrend = calculateSlope(volumes);
  
  // Different patterns have different ideal volume profiles
  switch (patternType.toLowerCase()) {
    case 'bull flag':
      // Bull flag should have decreasing volume during consolidation
      return volumeTrend < 0 ? 0.8 : 0.5;
      
    case 'bear flag':
      // Bear flag should have decreasing volume during consolidation
      return volumeTrend < 0 ? 0.8 : 0.5;
      
    case 'ascending triangle':
      // Ascending triangle often has decreasing volume until breakout
      return volumeTrend < 0 ? 0.7 : 0.5;
      
    case 'descending triangle':
      // Descending triangle often has decreasing volume until breakout
      return volumeTrend < 0 ? 0.7 : 0.5;
      
    default:
      return 0.6; // Default for unknown patterns
  }
};

/**
 * Calculate trend strength factor
 * @param ema20 Array of EMA20 values
 * @param ema50 Array of EMA50 values
 * @param direction Direction of the pattern ('bullish' or 'bearish')
 * @returns Trend strength factor (0-1)
 */
export const calculateTrendStrength = (
  ema20: number[],
  ema50: number[],
  direction: string
): number => {
  if (ema20.length < 5 || ema50.length < 5) return 0.5;
  
  // Calculate slopes of EMAs
  const ema20Slope = calculateSlope(ema20);
  const ema50Slope = calculateSlope(ema50);
  
  // Calculate EMA separation (distance between EMA20 and EMA50)
  const emaSeparation = ema20.map((value, i) => Math.abs(value - ema50[i]) / ema50[i]);
  const avgEmaSeparation = emaSeparation.reduce((sum, sep) => sum + sep, 0) / emaSeparation.length;
  
  // Different trend strength calculations based on direction
  if (direction.toLowerCase() === 'bullish') {
    // For bullish patterns, we want positive slopes and EMA20 > EMA50
    const slopeStrength = Math.max(0, Math.min(1, (ema20Slope + ema50Slope) / 0.01 + 0.5));
    const emaAlignment = ema20[ema20.length - 1] > ema50[ema50.length - 1] ? 1 : 0;
    
    return (slopeStrength * 0.7) + (emaAlignment * 0.3);
  } else {
    // For bearish patterns, we want negative slopes and EMA20 < EMA50
    const slopeStrength = Math.max(0, Math.min(1, (-ema20Slope - ema50Slope) / 0.01 + 0.5));
    const emaAlignment = ema20[ema20.length - 1] < ema50[ema50.length - 1] ? 1 : 0;
    
    return (slopeStrength * 0.7) + (emaAlignment * 0.3);
  }
};

/**
 * Get timeframe weight for confidence calculation
 * @param timeframe Timeframe string
 * @returns Weight value (0-1)
 */
export const getTimeframeWeight = (timeframe: string): number => {
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

/**
 * Calculate combined confidence score for a pattern
 * @param patternData Pattern data
 * @param technicalData Technical indicators data
 * @returns Confidence score (0-100)
 */
export const calculateCombinedConfidenceScore = (
  patternData: any,
  technicalData: any
): number => {
  // Extract pattern data
  const { 
    patternType, 
    timeframe, 
    direction,
    multiTimeframeConfirmation 
  } = patternData;
  
  // Extract technical data
  const {
    highs,
    lows,
    volumes,
    ema20,
    ema50,
    rsi,
    historicalAccuracy
  } = technicalData;
  
  // Calculate individual confidence factors
  const patternQuality = calculatePatternQuality(highs, lows, patternType);
  const volumeConfirmation = calculateVolumeConfirmation(volumes, patternType);
  const trendStrength = calculateTrendStrength(ema20, ema50, direction);
  const timeframeWeight = getTimeframeWeight(timeframe);
  
  // Calculate momentum factor based on RSI
  let momentum = 0.5;
  if (rsi && rsi.length > 0) {
    const lastRsi = rsi[rsi.length - 1];
    if (direction.toLowerCase() === 'bullish') {
      // For bullish patterns, higher RSI is better (but not overbought)
      momentum = lastRsi > 70 ? 0.5 : lastRsi > 50 ? (lastRsi - 50) / 20 + 0.5 : 0.5;
    } else {
      // For bearish patterns, lower RSI is better (but not oversold)
      momentum = lastRsi < 30 ? 0.5 : lastRsi < 50 ? (50 - lastRsi) / 20 + 0.5 : 0.5;
    }
  }
  
  // Create confidence factors object
  const confidenceFactors: ConfidenceFactors = {
    patternQuality,
    priceAction: 0.8, // Default value
    volumeConfirmation,
    trendStrength,
    volatility: 0.7, // Default value
    momentum,
    support: 0.75, // Default value
    timeframe: timeframeWeight,
    multiTimeframeAlignment: multiTimeframeConfirmation ? 1 : 0.5,
    marketCondition: 0.7, // Default value
    sectorStrength: 0.7, // Default value
    historicalAccuracy: historicalAccuracy || 0.75
  };
  
  // Calculate combined confidence score
  return calculateConfidenceScore(confidenceFactors);
};

export default {
  calculateConfidenceScore,
  calculatePatternQuality,
  calculateVolumeConfirmation,
  calculateTrendStrength,
  getTimeframeWeight,
  calculateCombinedConfidenceScore
};
