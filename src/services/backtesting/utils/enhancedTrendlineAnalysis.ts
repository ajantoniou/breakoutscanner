import { HistoricalPrice } from '../backtestTypes';
import { calculateEMA, OHLCV } from './technicalIndicators';

/**
 * Enhanced trendline data with additional metrics for validation
 */
export interface EnhancedTrendlineData {
  // Basic properties
  startIndex: number;
  endIndex: number;
  startPrice: number;
  endPrice: number;
  
  // Type information
  type: 'horizontal' | 'diagonal' | 'ema';
  subType: 'support' | 'resistance';
  emaType?: 7 | 50 | 100; // Only for EMA trendlines
  
  // Validation metrics
  strength: number;     // 0-1 scale, higher means stronger trendline
  touches: number;      // How many times price has touched this line
  bouncePercentage: number; // Percentage of touches that result in bounces (0-100%)
  
  // Current status
  currentPrice: number; // Current value of the trendline
  isActive: boolean;    // Whether the trendline is still valid
  
  // Function to calculate price at any index
  priceAtIndex: (index: number) => number;
}

/**
 * Enhanced trendline detection configuration
 */
export interface TrendlineConfig {
  minConfirmationTouches: number;    // Minimum touches required to validate a trendline
  lookbackPeriod: number;            // Number of candles to look back for pattern identification
  validationThreshold: number;       // Percentage of touches that must be valid (0-1)
  proximityThreshold: number;        // How close price must get to be considered a touch (% of price)
  strengthThreshold: number;         // Minimum strength required for a valid trendline (0-1)
  emaPeriods: number[];              // EMA periods to use (typically [7, 50, 100])
}

/**
 * Default configuration for trendline detection
 */
const DEFAULT_CONFIG: TrendlineConfig = {
  minConfirmationTouches: 2,
  lookbackPeriod: 100,
  validationThreshold: 0.75, // 75% accuracy requirement
  proximityThreshold: 0.005, // 0.5% of price
  strengthThreshold: 0.3,
  emaPeriods: [7, 50, 100]
};

/**
 * Identify all types of trendlines (horizontal, diagonal, and EMA-based)
 */
export const identifyAllTrendlines = (
  prices: HistoricalPrice[],
  customConfig?: Partial<TrendlineConfig>
): EnhancedTrendlineData[] => {
  // Merge default config with custom config
  const config = { ...DEFAULT_CONFIG, ...customConfig };
  
  if (prices.length < Math.max(config.lookbackPeriod, Math.max(...config.emaPeriods))) {
    return [];
  }
  
  // Identify all types of trendlines
  const horizontalTrendlines = identifyHorizontalTrendlines(prices, config);
  const diagonalTrendlines = identifyDiagonalTrendlines(prices, config);
  const emaTrendlines = identifyEMATrendlines(prices, config);
  
  // Combine all trendlines and sort by strength
  const allTrendlines = [
    ...horizontalTrendlines,
    ...diagonalTrendlines,
    ...emaTrendlines
  ].sort((a, b) => b.strength - a.strength);
  
  return allTrendlines;
};

/**
 * Identify horizontal trendlines (support and resistance levels)
 */
export const identifyHorizontalTrendlines = (
  prices: HistoricalPrice[],
  config: TrendlineConfig
): EnhancedTrendlineData[] => {
  if (prices.length < config.lookbackPeriod) {
    return [];
  }
  
  const relevantPrices = prices.slice(0, config.lookbackPeriod);
  const trendlines: EnhancedTrendlineData[] = [];
  
  // Find swing highs and lows
  const swingHighs = findSwingHighs(relevantPrices);
  const swingLows = findSwingLows(relevantPrices);
  
  // Create horizontal support levels
  for (const swingLow of swingLows) {
    const level = swingLow.value;
    const supportLine = createHorizontalTrendline(
      swingLow.index,
      relevantPrices.length - 1,
      level,
      'support',
      relevantPrices
    );
    
    // Validate and add if strong enough
    if (validateTrendline(supportLine, relevantPrices, config)) {
      trendlines.push(supportLine);
    }
  }
  
  // Create horizontal resistance levels
  for (const swingHigh of swingHighs) {
    const level = swingHigh.value;
    const resistanceLine = createHorizontalTrendline(
      swingHigh.index,
      relevantPrices.length - 1,
      level,
      'resistance',
      relevantPrices
    );
    
    // Validate and add if strong enough
    if (validateTrendline(resistanceLine, relevantPrices, config)) {
      trendlines.push(resistanceLine);
    }
  }
  
  return trendlines;
};

/**
 * Identify diagonal trendlines (ascending and descending channels)
 */
export const identifyDiagonalTrendlines = (
  prices: HistoricalPrice[],
  config: TrendlineConfig
): EnhancedTrendlineData[] => {
  if (prices.length < config.lookbackPeriod) {
    return [];
  }
  
  const relevantPrices = prices.slice(0, config.lookbackPeriod);
  const trendlines: EnhancedTrendlineData[] = [];
  
  // Find swing highs and lows
  const swingHighs = findSwingHighs(relevantPrices);
  const swingLows = findSwingLows(relevantPrices);
  
  // Create support trendlines (connect swing lows)
  for (let i = 0; i < swingLows.length - 1; i++) {
    for (let j = i + 1; j < swingLows.length; j++) {
      const supportLine = createDiagonalTrendline(
        swingLows[i].index,
        relevantPrices[swingLows[i].index].low,
        swingLows[j].index,
        relevantPrices[swingLows[j].index].low,
        'support',
        relevantPrices
      );
      
      // Validate and add if strong enough
      if (validateTrendline(supportLine, relevantPrices, config)) {
        trendlines.push(supportLine);
      }
    }
  }
  
  // Create resistance trendlines (connect swing highs)
  for (let i = 0; i < swingHighs.length - 1; i++) {
    for (let j = i + 1; j < swingHighs.length; j++) {
      const resistanceLine = createDiagonalTrendline(
        swingHighs[i].index,
        relevantPrices[swingHighs[i].index].high,
        swingHighs[j].index,
        relevantPrices[swingHighs[j].index].high,
        'resistance',
        relevantPrices
      );
      
      // Validate and add if strong enough
      if (validateTrendline(resistanceLine, relevantPrices, config)) {
        trendlines.push(resistanceLine);
      }
    }
  }
  
  return trendlines;
};

/**
 * Identify EMA-based trendlines
 */
export const identifyEMATrendlines = (
  prices: HistoricalPrice[],
  config: TrendlineConfig
): EnhancedTrendlineData[] => {
  if (prices.length < Math.max(...config.emaPeriods)) {
    return [];
  }
  
  const trendlines: EnhancedTrendlineData[] = [];
  const closes = prices.map(p => p.close);
  
  // Calculate EMAs for each period
  for (const period of config.emaPeriods) {
    const emaValues = calculateEMA(closes, period);
    
    // Create EMA support/resistance trendlines
    const emaTrendline = createEMATrendline(
      0,
      prices.length - 1,
      period,
      emaValues,
      prices
    );
    
    // Validate and add if strong enough
    if (validateTrendline(emaTrendline, prices, config)) {
      trendlines.push(emaTrendline);
    }
  }
  
  return trendlines;
};

/**
 * Find swing highs in price data
 */
const findSwingHighs = (prices: HistoricalPrice[]): { index: number; value: number }[] => {
  const swingHighs: { index: number; value: number }[] = [];
  const lookLeft = 3; // Number of bars to look left
  const lookRight = 3; // Number of bars to look right
  
  for (let i = lookLeft; i < prices.length - lookRight; i++) {
    let isSwingHigh = true;
    const currentHigh = prices[i].high;
    
    // Check if this is higher than all bars to the left and right
    for (let j = i - lookLeft; j <= i + lookRight; j++) {
      if (j === i) continue; // Skip the current bar
      
      if (prices[j].high >= currentHigh) {
        isSwingHigh = false;
        break;
      }
    }
    
    if (isSwingHigh) {
      swingHighs.push({ index: i, value: currentHigh });
    }
  }
  
  return swingHighs;
};

/**
 * Find swing lows in price data
 */
const findSwingLows = (prices: HistoricalPrice[]): { index: number; value: number }[] => {
  const swingLows: { index: number; value: number }[] = [];
  const lookLeft = 3; // Number of bars to look left
  const lookRight = 3; // Number of bars to look right
  
  for (let i = lookLeft; i < prices.length - lookRight; i++) {
    let isSwingLow = true;
    const currentLow = prices[i].low;
    
    // Check if this is lower than all bars to the left and right
    for (let j = i - lookLeft; j <= i + lookRight; j++) {
      if (j === i) continue; // Skip the current bar
      
      if (prices[j].low <= currentLow) {
        isSwingLow = false;
        break;
      }
    }
    
    if (isSwingLow) {
      swingLows.push({ index: i, value: currentLow });
    }
  }
  
  return swingLows;
};

/**
 * Create a horizontal trendline (support or resistance level)
 */
const createHorizontalTrendline = (
  startIndex: number,
  endIndex: number,
  level: number,
  subType: 'support' | 'resistance',
  prices: HistoricalPrice[]
): EnhancedTrendlineData => {
  // Function to calculate price at any index (constant for horizontal trendlines)
  const priceAtIndex = (_index: number): number => level;
  
  // Calculate touches
  let touches = 0;
  let bounces = 0;
  const proximityThreshold = 0.005; // 0.5% of price
  
  for (let i = startIndex; i <= endIndex; i++) {
    const price = subType === 'support' ? prices[i].low : prices[i].high;
    const percentDiff = Math.abs((price - level) / level);
    
    if (percentDiff < proximityThreshold) {
      touches++;
      
      // Check if this touch resulted in a bounce
      if (i < endIndex - 1) {
        const nextPrice = subType === 'support' 
          ? prices[i + 1].close 
          : prices[i + 1].close;
        
        const isValidBounce = (subType === 'support' && nextPrice > price) || 
                             (subType === 'resistance' && nextPrice < price);
        
        if (isValidBounce) {
          bounces++;
        }
      }
    }
  }
  
  const bouncePercentage = touches > 0 ? (bounces / touches) * 100 : 0;
  
  return {
    startIndex,
    endIndex,
    startPrice: level,
    endPrice: level,
    type: 'horizontal',
    subType,
    strength: calculateStrength(touches, bouncePercentage, endIndex - startIndex),
    touches,
    bouncePercentage,
    currentPrice: level,
    isActive: true,
    priceAtIndex
  };
};

/**
 * Create a diagonal trendline (connecting two points)
 */
const createDiagonalTrendline = (
  startIndex: number,
  startPrice: number,
  endIndex: number,
  endPrice: number,
  subType: 'support' | 'resistance',
  prices: HistoricalPrice[]
): EnhancedTrendlineData => {
  // Calculate slope and intercept for the line equation
  const slope = (endPrice - startPrice) / (endIndex - startIndex);
  const intercept = startPrice - (slope * startIndex);
  
  // Function to calculate price at any index
  const priceAtIndex = (index: number): number => {
    return slope * index + intercept;
  };
  
  // Calculate touches and bounces
  let touches = 0;
  let bounces = 0;
  const proximityThreshold = 0.005; // 0.5% of price
  
  for (let i = startIndex; i <= endIndex; i++) {
    const linePrice = priceAtIndex(i);
    const price = subType === 'support' ? prices[i].low : prices[i].high;
    const percentDiff = Math.abs((price - linePrice) / linePrice);
    
    if (percentDiff < proximityThreshold) {
      touches++;
      
      // Check if this touch resulted in a bounce
      if (i < endIndex - 1) {
        const nextPrice = subType === 'support' 
          ? prices[i + 1].close 
          : prices[i + 1].close;
        
        const isValidBounce = (subType === 'support' && nextPrice > price) || 
                             (subType === 'resistance' && nextPrice < price);
        
        if (isValidBounce) {
          bounces++;
        }
      }
    }
  }
  
  const bouncePercentage = touches > 0 ? (bounces / touches) * 100 : 0;
  
  return {
    startIndex,
    endIndex,
    startPrice,
    endPrice,
    type: 'diagonal',
    subType,
    strength: calculateStrength(touches, bouncePercentage, endIndex - startIndex),
    touches,
    bouncePercentage,
    currentPrice: priceAtIndex(0), // Price at the most recent bar
    isActive: true,
    priceAtIndex
  };
};

/**
 * Create an EMA-based trendline
 */
const createEMATrendline = (
  startIndex: number,
  endIndex: number,
  emaPeriod: number,
  emaValues: number[],
  prices: HistoricalPrice[]
): EnhancedTrendlineData => {
  // Function to calculate EMA price at any index
  const priceAtIndex = (index: number): number => {
    // Ensure index is within bounds
    if (index < 0 || index >= emaValues.length) {
      return emaValues[0]; // Default to most recent value
    }
    return emaValues[emaValues.length - 1 - index];
  };
  
  // Default subType based on recent price action
  const recentPrice = prices[0].close;
  const emaPrice = emaValues[emaValues.length - 1];
  const subType: 'support' | 'resistance' = recentPrice > emaPrice ? 'support' : 'resistance';
  
  // Calculate touches and bounces
  let touches = 0;
  let bounces = 0;
  const proximityThreshold = 0.005; // 0.5% of price
  
  for (let i = startIndex; i <= endIndex; i++) {
    const emaPrice = priceAtIndex(i);
    const highPrice = prices[i].high;
    const lowPrice = prices[i].low;
    
    // Check for price crossing or touching the EMA
    const isTouchingAbove = Math.abs((lowPrice - emaPrice) / emaPrice) < proximityThreshold;
    const isTouchingBelow = Math.abs((highPrice - emaPrice) / emaPrice) < proximityThreshold;
    
    if (isTouchingAbove || isTouchingBelow) {
      touches++;
      
      // Check if this touch resulted in a bounce
      if (i < endIndex - 1) {
        const nextClose = prices[i + 1].close;
        
        // For support, price should move up after touching
        // For resistance, price should move down after touching
        const isValidBounce = (subType === 'support' && nextClose > lowPrice) || 
                             (subType === 'resistance' && nextClose < highPrice);
        
        if (isValidBounce) {
          bounces++;
        }
      }
    }
  }
  
  const bouncePercentage = touches > 0 ? (bounces / touches) * 100 : 0;
  
  return {
    startIndex,
    endIndex,
    startPrice: priceAtIndex(startIndex),
    endPrice: priceAtIndex(endIndex),
    type: 'ema',
    subType,
    emaType: emaPeriod as 7 | 50 | 100,
    strength: calculateStrength(touches, bouncePercentage, endIndex - startIndex),
    touches,
    bouncePercentage,
    currentPrice: priceAtIndex(0), // Price at the most recent bar
    isActive: true,
    priceAtIndex
  };
};

/**
 * Calculate strength of a trendline
 */
const calculateStrength = (
  touches: number, 
  bouncePercentage: number,
  length: number
): number => {
  // Factors that contribute to strength:
  // 1. Number of price touches (more touches = stronger)
  // 2. Bounce percentage (higher percentage = stronger)
  // 3. Length of the trendline (longer = stronger)
  
  // Calculate touches score (more touches mean stronger trendline, up to 5)
  const touchFactor = Math.min(1, touches / 5);
  
  // Calculate bounce score (higher percentage of bounces = stronger)
  const bounceFactor = bouncePercentage / 100;
  
  // Calculate length score (longer trendlines are stronger, up to 30 bars)
  const lengthFactor = Math.min(1, length / 30);
  
  // Combine factors into a strength score
  return (touchFactor * 0.4) + (bounceFactor * 0.4) + (lengthFactor * 0.2);
};

/**
 * Validate a trendline to ensure it meets the accuracy threshold
 */
const validateTrendline = (
  trendline: EnhancedTrendlineData,
  prices: HistoricalPrice[],
  config: TrendlineConfig
): boolean => {
  // Check minimum touches requirement
  if (trendline.touches < config.minConfirmationTouches) {
    return false;
  }
  
  // Check bounce percentage (accuracy) requirement
  if (trendline.bouncePercentage < config.validationThreshold * 100) {
    return false;
  }
  
  // Check strength requirement
  if (trendline.strength < config.strengthThreshold) {
    return false;
  }
  
  return true;
};

/**
 * Check if a price breaks through a trendline
 */
export const checkBreakthrough = (
  trendline: EnhancedTrendlineData,
  candle: HistoricalPrice,
  index: number
): { isBreakthrough: boolean, direction: 'up' | 'down' } => {
  const trendlinePrice = trendline.priceAtIndex(index);
  
  // For support trendlines, price breaks down
  if (trendline.subType === 'support') {
    // Consider a breakthrough if most of the candle body is below the trendline
    const bodyCenter = (candle.open + candle.close) / 2;
    const isBreakthrough = bodyCenter < trendlinePrice;
    
    return {
      isBreakthrough,
      direction: 'down'
    };
  }
  // For resistance trendlines, price breaks up
  else {
    // Consider a breakthrough if most of the candle body is above the trendline
    const bodyCenter = (candle.open + candle.close) / 2;
    const isBreakthrough = bodyCenter > trendlinePrice;
    
    return {
      isBreakthrough,
      direction: 'up'
    };
  }
};

/**
 * Check if price bounces off a trendline
 */
export const checkBounce = (
  trendline: EnhancedTrendlineData,
  candle: HistoricalPrice,
  nextCandle: HistoricalPrice,
  index: number
): { isBounce: boolean, strength: number } => {
  const trendlinePrice = trendline.priceAtIndex(index);
  
  // For support trendlines
  if (trendline.subType === 'support') {
    // Check if price touches the trendline
    const isTouching = Math.abs((candle.low - trendlinePrice) / trendlinePrice) < 0.005;
    
    // Check if the next candle moves up significantly
    const isBouncing = nextCandle.close > candle.close;
    
    // Calculate bounce strength
    const strength = isBouncing ? (nextCandle.close - candle.low) / candle.low : 0;
    
    return {
      isBounce: isTouching && isBouncing,
      strength
    };
  }
  // For resistance trendlines
  else {
    // Check if price touches the trendline
    const isTouching = Math.abs((candle.high - trendlinePrice) / trendlinePrice) < 0.005;
    
    // Check if the next candle moves down significantly
    const isBouncing = nextCandle.close < candle.close;
    
    // Calculate bounce strength
    const strength = isBouncing ? (candle.high - nextCandle.close) / candle.high : 0;
    
    return {
      isBounce: isTouching && isBouncing,
      strength
    };
  }
};

/**
 * Calculate target price based on trendline breakout
 */
export const calculateTargetPrice = (
  trendline: EnhancedTrendlineData,
  candle: HistoricalPrice,
  nextTrendlines: EnhancedTrendlineData[],
  atr: number
): number => {
  // For support trendline breaks (bearish)
  if (trendline.subType === 'support') {
    // First, look for next support trendline below
    const nextSupport = nextTrendlines
      .filter(t => t.subType === 'support' && t.currentPrice < candle.close)
      .sort((a, b) => b.currentPrice - a.currentPrice)[0];
    
    if (nextSupport) {
      return nextSupport.currentPrice;
    }
    
    // If no support found, use ATR-based target (2.5x ATR)
    return candle.close - (atr * 2.5);
  }
  // For resistance trendline breaks (bullish)
  else {
    // First, look for next resistance trendline above
    const nextResistance = nextTrendlines
      .filter(t => t.subType === 'resistance' && t.currentPrice > candle.close)
      .sort((a, b) => a.currentPrice - b.currentPrice)[0];
    
    if (nextResistance) {
      return nextResistance.currentPrice;
    }
    
    // If no resistance found, use ATR-based target (2.5x ATR)
    return candle.close + (atr * 2.5);
  }
};

/**
 * Checks if a trendline is confirmed by trendlines in a higher timeframe
 * @param lowerTfTrendlines Trendlines from the lower timeframe
 * @param higherTfTrendlines Trendlines from the higher timeframe
 * @param priceRatio The ratio between prices in different timeframes (typically 1.0)
 * @returns Object containing confirmation details and strength
 */
export const checkMultiTimeframeConfirmation = (
  lowerTfTrendlines: EnhancedTrendlineData[],
  higherTfTrendlines: EnhancedTrendlineData[],
  priceRatio: number = 1.0
): { isConfirmed: boolean; confirmingTrendlines: EnhancedTrendlineData[]; confirmationStrength: number } => {
  // Skip if either array is empty
  if (lowerTfTrendlines.length === 0 || higherTfTrendlines.length === 0) {
    return { isConfirmed: false, confirmingTrendlines: [], confirmationStrength: 0 };
  }
  
  // Filter for active trendlines only
  const activeLowerTrendlines = lowerTfTrendlines.filter(t => t.isActive);
  const activeHigherTrendlines = higherTfTrendlines.filter(t => t.isActive);
  
  if (activeLowerTrendlines.length === 0 || activeHigherTrendlines.length === 0) {
    return { isConfirmed: false, confirmingTrendlines: [], confirmationStrength: 0 };
  }
  
  // Find matching trendlines between timeframes
  const confirmingTrendlines: EnhancedTrendlineData[] = [];
  let totalConfirmationStrength = 0;
  
  // Prioritize higher timeframe - give them a higher weight
  const higherTimeframeWeight = 1.5; // Higher timeframes are 50% more important
  
  // Check each lower timeframe trendline against higher timeframe trendlines
  for (const lowerTrendline of activeLowerTrendlines) {
    // For each lower trendline, find similar trendlines in the higher timeframe
    const confirming = activeHigherTrendlines.filter(higherTrendline => {
      // Must be the same type (horizontal, diagonal, ema)
      if (lowerTrendline.type !== higherTrendline.type) return false;
      
      // Must be the same subtype (support or resistance)
      if (lowerTrendline.subType !== higherTrendline.subType) return false;
      
      // For EMA trendlines, must be the same period
      if (lowerTrendline.type === 'ema' && lowerTrendline.emaType !== higherTrendline.emaType) return false;
      
      // Check if price levels are similar (within 1% tolerance)
      // Reduced tolerance for better precision
      const priceTolerance = 0.008; // 0.8% tolerance for more precision
      const adjustedLowerPrice = lowerTrendline.currentPrice * priceRatio;
      const pricePercentDiff = Math.abs((adjustedLowerPrice - higherTrendline.currentPrice) / higherTrendline.currentPrice);
      
      return pricePercentDiff <= priceTolerance;
    });
    
    if (confirming.length > 0) {
      confirmingTrendlines.push(...confirming);
      
      // Calculate confirmation strength (weighted average of trendline strengths * number of confirming trendlines)
      const avgConfirmingStrength = confirming.reduce((sum, t) => sum + t.strength * higherTimeframeWeight, 0) / confirming.length;
      
      // Apply a multiplier based on number of confirming trendlines (capped at 3)
      const confirmationMultiplier = Math.min(3, confirming.length) / 2;
      totalConfirmationStrength += avgConfirmingStrength * confirmationMultiplier;
    }
  }
  
  // Consider confirmed if at least one trendline from each timeframe matches
  const isConfirmed = confirmingTrendlines.length > 0;
  
  // Normalize confirmation strength (0-1 scale)
  const confirmationStrength = isConfirmed ? 
    Math.min(1, totalConfirmationStrength / Math.max(activeLowerTrendlines.length, 2)) : 0;
  
  return {
    isConfirmed,
    confirmingTrendlines,
    confirmationStrength
  };
};

/**
 * Combines trendlines from multiple timeframes for comprehensive analysis
 * @param timeframes Object containing trendlines from different timeframes
 * @returns Combined analysis results
 */
export const combineMultiTimeframeTrendlines = (
  timeframes: Record<string, EnhancedTrendlineData[]>
): { 
  combinedTrendlines: EnhancedTrendlineData[]; 
  confirmations: Record<string, boolean>;
  strength: number;
} => {
  const timeframeKeys = Object.keys(timeframes);
  
  // Sort timeframes from lowest to highest
  const sortedTimeframes = timeframeKeys.sort((a, b) => {
    const timeframeOrder = { '15m': 0, '30m': 1, '1h': 2, '4h': 3, '1d': 4, 'weekly': 5 };
    return (timeframeOrder[a] || 999) - (timeframeOrder[b] || 999);
  });
  
  if (sortedTimeframes.length === 0) {
    return { combinedTrendlines: [], confirmations: {}, strength: 0 };
  }
  
  // Start with trendlines from the highest timeframe as the base
  // This prioritizes higher timeframe trendlines for breakout detection
  const highestTimeframe = sortedTimeframes[sortedTimeframes.length - 1];
  const combinedTrendlines = [...timeframes[highestTimeframe]];
  
  // Record which timeframes confirm each other
  const confirmations: Record<string, boolean> = {};
  let overallStrength = 0;
  
  // Check confirmations between consecutive timeframes
  for (let i = 0; i < sortedTimeframes.length - 1; i++) {
    const lowerTf = sortedTimeframes[i];
    const higherTf = sortedTimeframes[i + 1];
    
    const confirmation = checkMultiTimeframeConfirmation(
      timeframes[lowerTf],
      timeframes[higherTf]
    );
    
    const key = `${lowerTf}->${higherTf}`;
    confirmations[key] = confirmation.isConfirmed;
    
    if (confirmation.isConfirmed) {
      overallStrength += confirmation.confirmationStrength;
    }
  }
  
  // Normalize overall strength (0-1 scale)
  overallStrength = Math.min(1, overallStrength / Math.max(1, sortedTimeframes.length - 1));
  
  return {
    combinedTrendlines,
    confirmations,
    strength: overallStrength
  };
}; 