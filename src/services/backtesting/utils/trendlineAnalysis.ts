import { HistoricalPrice } from '../backtestTypes';
import { calculateEMA, OHLCV } from './technicalIndicators';

export interface TrendlineData {
  startIndex: number;
  endIndex: number;
  startPrice: number;
  endPrice: number;
  isSupport: boolean;
  strength: number;  // 0-1 scale, higher means stronger trendline
  touches: number;   // How many times price has touched this line
  currentPrice: number; // Current value of the trendline
  
  // Additional metrics for enhanced validation
  type: 'horizontal' | 'diagonal' | 'ema';
  subType: 'support' | 'resistance';
  emaType?: 7 | 50 | 100; // Only for EMA trendlines
  bouncePercentage: number; // Percentage of touches that result in bounces (0-100%)
  isActive: boolean;    // Whether the trendline is still valid
  
  // Method to calculate price at any index
  priceAtIndex: (index: number) => number;
}

export interface TrendlineConfig {
  minConfirmationTouches: number;
  validationThreshold: number;
  strengthThreshold: number;
  minSlope: number;
  maxSlope: number;
  touchPointSensitivity: number;
  minTrendDuration: number; // In days
  maxTouchPointDeviation: number;
  requiredRecentTouch: boolean;
  higherTimeframeAlignment: boolean; // New parameter to enforce alignment with higher timeframe trends
  lookbackPeriod: number;            // Number of candles to look back for pattern identification
  emaPeriods: number[];              // EMA periods to use (typically [7, 50, 100])
  useWicks: boolean;                 // Whether to use wicks or bodies for trendline calculation
  maxSlopeAngle: number;             // Maximum slope angle in degrees (e.g., 45)
  minSlopeAngle: number;             // Minimum slope angle in degrees (e.g., 5)
  volatilityAdjustment: boolean;     // Whether to adjust trendline approach based on volatility
  proximityThreshold: number;        // How close price must get to be considered a touch (% of price)
}

export const DEFAULT_TRENDLINE_CONFIG: TrendlineConfig = {
  minConfirmationTouches: 3, // Increased from 2 to 3 for more reliable trendlines
  validationThreshold: 0.7,
  strengthThreshold: 0.6,
  minSlope: 0.1,
  maxSlope: 30,
  touchPointSensitivity: 0.003,
  minTrendDuration: 5, // Minimum 5 days for a trend to be considered valid
  maxTouchPointDeviation: 0.02,
  requiredRecentTouch: true, // Require a recent touch for more relevant trendlines
  higherTimeframeAlignment: true, // Require alignment with higher timeframe trends
  lookbackPeriod: 100,
  emaPeriods: [7, 50, 100],
  useWicks: true,
  maxSlopeAngle: 45,
  minSlopeAngle: 5,
  volatilityAdjustment: true,
  proximityThreshold: 0.005 // 0.5% of price
};

// Identify all types of trendlines (horizontal, diagonal, and EMA-based)
export const identifyAllTrendlines = (
  prices: HistoricalPrice[],
  customConfig?: Partial<TrendlineConfig>
): TrendlineData[] => {
  // Merge default config with custom config
  const config = { ...DEFAULT_TRENDLINE_CONFIG, ...customConfig };
  
  if (prices.length < Math.max(config.lookbackPeriod, Math.max(...config.emaPeriods))) {
    return [];
  }
  
  // Identify all types of trendlines
  const horizontalTrendlines = identifyHorizontalTrendlines(prices, config);
  const diagonalTrendlines = identifyDiagonalTrendlines(prices, config);
  const emaTrendlines = identifyEMATrendlines(prices, config);
  
  // Enhance diagonal trendlines with additional properties
  const enhancedDiagonalTrendlines = diagonalTrendlines.map(trendline => {
    return {
      ...trendline,
      type: 'diagonal' as 'horizontal' | 'diagonal' | 'ema',
      subType: trendline.isSupport ? 'support' as 'support' | 'resistance' : 'resistance' as 'support' | 'resistance',
      bouncePercentage: calculateBouncePercentage(trendline, prices),
      isActive: true
    };
  });
  
  // Combine all trendlines and sort by strength
  const allTrendlines = [
    ...horizontalTrendlines,
    ...enhancedDiagonalTrendlines,
    ...emaTrendlines
  ].sort((a, b) => b.strength - a.strength);
  
  // Filter out weaker trendlines that don't meet the required strength threshold
  return allTrendlines.filter(trendline => 
    trendline.strength >= config.strengthThreshold && 
    trendline.touches >= config.minConfirmationTouches &&
    trendline.bouncePercentage >= config.validationThreshold * 100
  );
};

// Old function for backward compatibility
export const identifyTrendlines = (
  prices: HistoricalPrice[],
  isLong: boolean,
  lookbackPeriod: number = 50
): TrendlineData[] => {
  if (prices.length < lookbackPeriod) {
    return [];
  }
  
  const relevantPrices = prices.slice(0, lookbackPeriod);
  const trendlines: TrendlineData[] = [];
  
  // Find potential swing highs and lows
  const swingHighs = findSwingHighs(relevantPrices);
  const swingLows = findSwingLows(relevantPrices);
  
  // Create support trendlines (connect swing lows)
  for (let i = 0; i < swingLows.length - 1; i++) {
    for (let j = i + 1; j < swingLows.length; j++) {
      const line = createTrendline(
        swingLows[i].index,
        relevantPrices[swingLows[i].index].low,
        swingLows[j].index,
        relevantPrices[swingLows[j].index].low,
        true
      );
      
      // Validate the trendline - prices shouldn't cross below the line
      if (validateTrendline(relevantPrices, line, true)) {
        // Calculate strength based on touches and slope consistency
        const strength = calculateTrendlineStrength(relevantPrices, line, true);
        line.strength = strength;
        
        // Only add significant trendlines
        if (strength > 0.3) {
          trendlines.push(line);
        }
      }
    }
  }
  
  // Create resistance trendlines (connect swing highs)
  for (let i = 0; i < swingHighs.length - 1; i++) {
    for (let j = i + 1; j < swingHighs.length; j++) {
      const line = createTrendline(
        swingHighs[i].index,
        relevantPrices[swingHighs[i].index].high,
        swingHighs[j].index,
        relevantPrices[swingHighs[j].index].high,
        false
      );
      
      // Validate the trendline - prices shouldn't cross above the line
      if (validateTrendline(relevantPrices, line, false)) {
        // Calculate strength based on touches and slope consistency
        const strength = calculateTrendlineStrength(relevantPrices, line, false);
        line.strength = strength;
        
        // Only add significant trendlines
        if (strength > 0.3) {
          trendlines.push(line);
        }
      }
    }
  }
  
  // Sort trendlines by strength (strongest first)
  return trendlines.sort((a, b) => b.strength - a.strength);
};

/**
 * Identify horizontal trendlines (support and resistance levels)
 */
export const identifyHorizontalTrendlines = (
  prices: HistoricalPrice[],
  config: TrendlineConfig
): TrendlineData[] => {
  if (prices.length < config.lookbackPeriod) {
    return [];
  }
  
  const relevantPrices = prices.slice(0, config.lookbackPeriod);
  const trendlines: TrendlineData[] = [];
  
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
    
    // Only add if it meets the strength threshold
    if (supportLine.strength > config.strengthThreshold) {
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
    
    // Only add if it meets the strength threshold
    if (resistanceLine.strength > config.strengthThreshold) {
      trendlines.push(resistanceLine);
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
): TrendlineData[] => {
  if (prices.length < Math.max(...config.emaPeriods)) {
    return [];
  }
  
  const trendlines: TrendlineData[] = [];
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
    
    // Only add if it meets the strength threshold
    if (emaTrendline.strength > config.strengthThreshold) {
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
 * Create a trendline from two points
 */
const createTrendline = (
  startIndex: number,
  startPrice: number,
  endIndex: number,
  endPrice: number,
  isSupport: boolean
): TrendlineData => {
  // Calculate slope and intercept for the line equation
  const slope = (endPrice - startPrice) / (endIndex - startIndex);
  const intercept = startPrice - (slope * startIndex);
  
  // Function to calculate price at any index
  const priceAtIndex = (index: number): number => {
    return slope * index + intercept;
  };
  
  return {
    startIndex,
    endIndex,
    startPrice,
    endPrice,
    isSupport,
    strength: 0, // Will be calculated later
    touches: 0,  // Will be calculated later
    currentPrice: priceAtIndex(0), // Price at the most recent bar
    priceAtIndex,
    // Add the enhanced properties
    type: 'diagonal',
    subType: isSupport ? 'support' : 'resistance',
    bouncePercentage: 0, // Will be calculated later
    isActive: true
  };
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
): TrendlineData => {
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
    isSupport: subType === 'support',
    strength: calculateStrength(touches, bouncePercentage, endIndex - startIndex),
    touches,
    currentPrice: level,
    priceAtIndex,
    // Enhanced properties
    type: 'horizontal',
    subType,
    bouncePercentage,
    isActive: true
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
): TrendlineData => {
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
    isSupport: subType === 'support',
    strength: calculateStrength(touches, bouncePercentage, endIndex - startIndex),
    touches,
    currentPrice: priceAtIndex(0), // Price at the most recent bar
    priceAtIndex,
    // Enhanced properties
    type: 'ema',
    subType,
    emaType: emaPeriod as 7 | 50 | 100,
    bouncePercentage,
    isActive: true
  };
};

/**
 * Validate a trendline (ensure it doesn't have prices crossing it incorrectly)
 */
const validateTrendline = (
  prices: HistoricalPrice[],
  line: TrendlineData,
  isSupport: boolean
): boolean => {
  let violations = 0;
  
  for (let i = line.startIndex; i <= line.endIndex; i++) {
    const linePrice = line.priceAtIndex(i);
    
    if (isSupport && prices[i].low < linePrice - (linePrice * 0.005)) {
      violations++;
    } else if (!isSupport && prices[i].high > linePrice + (linePrice * 0.005)) {
      violations++;
    }
  }
  
  // Trendline is valid if it has few violations (allow very minor penetrations)
  return violations <= Math.max(1, Math.floor((line.endIndex - line.startIndex) * 0.05));
};

/**
 * Calculate the strength of a trendline
 */
const calculateTrendlineStrength = (
  prices: HistoricalPrice[],
  line: TrendlineData,
  isSupport: boolean
): number => {
  // Factors that contribute to strength:
  // 1. Number of price touches
  // 2. Duration/length of the trendline
  // 3. Consistency of the slope
  
  let touches = 0;
  const proximityThreshold = 0.005; // How close prices need to get to the line (0.5%)
  
  for (let i = line.startIndex; i <= line.endIndex; i++) {
    const linePrice = line.priceAtIndex(i);
    
    if (isSupport) {
      const percentDiff = (prices[i].low - linePrice) / linePrice;
      if (Math.abs(percentDiff) < proximityThreshold) {
        touches++;
      }
    } else {
      const percentDiff = (prices[i].high - linePrice) / linePrice;
      if (Math.abs(percentDiff) < proximityThreshold) {
        touches++;
      }
    }
  }
  
  // Update touches in the line
  line.touches = touches;
  
  // Calculate length score (longer trendlines are stronger)
  const lengthFactor = Math.min(1, (line.endIndex - line.startIndex) / 30);
  
  // Calculate touch score (more touches mean stronger trendline)
  const touchFactor = Math.min(1, touches / 5);
  
  // Calculate steepness factor (more horizontal lines might be more reliable)
  const slope = Math.abs((line.endPrice - line.startPrice) / line.startPrice);
  const slopeFactor = 1 - Math.min(1, slope * 10); // Prefer gentler slopes
  
  // Combine factors into a strength score
  return (lengthFactor * 0.4) + (touchFactor * 0.4) + (slopeFactor * 0.2);
};

/**
 * Calculate bounce percentage for a trendline
 */
const calculateBouncePercentage = (
  line: TrendlineData,
  prices: HistoricalPrice[]
): number => {
  let bounces = 0;
  const isSupport = line.isSupport;
  
  for (let i = line.startIndex; i < line.endIndex; i++) {
    const linePrice = line.priceAtIndex(i);
    
    // Check if price touches the trendline
    const priceValue = isSupport ? prices[i].low : prices[i].high;
    const percentDiff = Math.abs((priceValue - linePrice) / linePrice);
    
    if (percentDiff < 0.005) {
      // Check if this touch resulted in a bounce
      if (i < line.endIndex - 1) {
        const nextPrice = prices[i + 1].close;
        
        // For support, price should move up after touching
        // For resistance, price should move down after touching
        const isValidBounce = (isSupport && nextPrice > priceValue) || 
                             (!isSupport && nextPrice < priceValue);
        
        if (isValidBounce) {
          bounces++;
        }
      }
    }
  }
  
  return line.touches > 0 ? (bounces / line.touches) * 100 : 0;
};

/**
 * Calculate strength of a trendline using enhanced criteria
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
 * Check if a price breaks through a trendline
 */
export const checkBreakthrough = (
  trendline: TrendlineData,
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
  trendline: TrendlineData,
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
  trendline: TrendlineData,
  candle: HistoricalPrice,
  nextTrendlines: TrendlineData[],
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
 * Identify diagonal trendlines with enhanced accuracy and slope validation
 */
export const identifyDiagonalTrendlines = (
  prices: HistoricalPrice[],
  config: TrendlineConfig
): TrendlineData[] => {
  if (prices.length < config.lookbackPeriod) {
    return [];
  }
  
  const relevantPrices = prices.slice(0, config.lookbackPeriod);
  const trendlines: TrendlineData[] = [];
  
  // Calculate market volatility to determine if we should use wicks or bodies
  const volatility = calculateVolatility(relevantPrices);
  const useWicks = config.volatilityAdjustment 
    ? determineOptimalContactMethod(relevantPrices, volatility) 
    : config.useWicks;
  
  // Find swing highs and lows based on the chosen method (wicks or bodies)
  const swingHighs = findSwingPoints(relevantPrices, true, useWicks);
  const swingLows = findSwingPoints(relevantPrices, false, useWicks);
  
  // Create support trendlines (connect swing lows)
  for (let i = 0; i < swingLows.length - 1; i++) {
    for (let j = i + 1; j < swingLows.length; j++) {
      // Skip if points are too close to each other
      if (j - i < 3) continue;
      
      const point1 = swingLows[i];
      const point2 = swingLows[j];
      
      // Calculate slope and angle
      const slope = calculateSlope(point1.index, point1.value, point2.index, point2.value);
      const angleInDegrees = Math.abs(Math.atan(slope) * (180 / Math.PI));
      
      // Skip if slope angle is outside acceptable range
      if (angleInDegrees < config.minSlopeAngle || angleInDegrees > config.maxSlopeAngle) {
        continue;
      }
      
      const supportLine = createEnhancedTrendline(
        point1.index,
        point1.value,
        point2.index,
        point2.value,
        'support',
        relevantPrices,
        useWicks,
        angleInDegrees
      );
      
      // Validate trendline: check for body penetrations and sufficient touches
      if (validateEnhancedTrendline(supportLine, relevantPrices, useWicks, config)) {
        trendlines.push(supportLine);
      }
    }
  }
  
  // Create resistance trendlines (connect swing highs)
  for (let i = 0; i < swingHighs.length - 1; i++) {
    for (let j = i + 1; j < swingHighs.length; j++) {
      // Skip if points are too close to each other
      if (j - i < 3) continue;
      
      const point1 = swingHighs[i];
      const point2 = swingHighs[j];
      
      // Calculate slope and angle
      const slope = calculateSlope(point1.index, point1.value, point2.index, point2.value);
      const angleInDegrees = Math.abs(Math.atan(slope) * (180 / Math.PI));
      
      // Skip if slope angle is outside acceptable range
      if (angleInDegrees < config.minSlopeAngle || angleInDegrees > config.maxSlopeAngle) {
        continue;
      }
      
      const resistanceLine = createEnhancedTrendline(
        point1.index,
        point1.value,
        point2.index,
        point2.value,
        'resistance',
        relevantPrices,
        useWicks,
        angleInDegrees
      );
      
      // Validate trendline: check for body penetrations and sufficient touches
      if (validateEnhancedTrendline(resistanceLine, relevantPrices, useWicks, config)) {
        trendlines.push(resistanceLine);
      }
    }
  }
  
  return trendlines;
};

/**
 * Find swing points (highs or lows) with option to use wicks or bodies
 */
const findSwingPoints = (
  prices: HistoricalPrice[], 
  findHigh: boolean, 
  useWicks: boolean
): { index: number; value: number }[] => {
  const swingPoints: { index: number; value: number }[] = [];
  const lookLeft = 3; // Number of bars to look left
  const lookRight = 3; // Number of bars to look right
  
  for (let i = lookLeft; i < prices.length - lookRight; i++) {
    let isSwingPoint = true;
    // Use appropriate price point based on wick or body preference
    const currentValue = findHigh 
      ? (useWicks ? prices[i].high : Math.max(prices[i].open, prices[i].close))
      : (useWicks ? prices[i].low : Math.min(prices[i].open, prices[i].close));
    
    // Check if this is a swing point compared to surrounding bars
    for (let j = i - lookLeft; j <= i + lookRight; j++) {
      if (j === i) continue; // Skip the current bar
      
      const compareValue = findHigh 
        ? (useWicks ? prices[j].high : Math.max(prices[j].open, prices[j].close))
        : (useWicks ? prices[j].low : Math.min(prices[j].open, prices[j].close));
      
      if ((findHigh && compareValue >= currentValue) || 
          (!findHigh && compareValue <= currentValue)) {
        isSwingPoint = false;
        break;
      }
    }
    
    if (isSwingPoint) {
      swingPoints.push({ index: i, value: currentValue });
    }
  }
  
  return swingPoints;
};

/**
 * Calculate volatility to help determine whether to use wicks or bodies
 */
const calculateVolatility = (prices: HistoricalPrice[]): number => {
  if (prices.length < 2) return 0;
  
  let totalVolatility = 0;
  
  for (let i = 0; i < prices.length; i++) {
    const candle = prices[i];
    const wickSize = (candle.high - candle.low);
    const bodySize = Math.abs(candle.close - candle.open);
    
    // Calculate wick-to-body ratio
    if (bodySize > 0) {
      totalVolatility += wickSize / bodySize;
    }
  }
  
  return totalVolatility / prices.length;
};

/**
 * Determine if we should use wicks or bodies based on volatility
 */
const determineOptimalContactMethod = (
  prices: HistoricalPrice[], 
  volatility: number
): boolean => {
  // If volatility is high (lots of wicks), prefer using bodies
  // This threshold can be adjusted based on backtesting
  const VOLATILITY_THRESHOLD = 3.0;
  return volatility < VOLATILITY_THRESHOLD;
};

/**
 * Calculate slope between two points
 */
const calculateSlope = (
  x1: number, 
  y1: number, 
  x2: number, 
  y2: number
): number => {
  if (x2 - x1 === 0) return Infinity; // Vertical line
  return (y2 - y1) / (x2 - x1);
};

/**
 * Create an enhanced trendline with additional metadata
 */
const createEnhancedTrendline = (
  startIndex: number,
  startPrice: number,
  endIndex: number,
  endPrice: number,
  subType: 'support' | 'resistance',
  prices: HistoricalPrice[],
  useWicks: boolean,
  slopeAngle: number
): TrendlineData => {
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
    
    // Determine which price to use based on wick/body setting and support/resistance
    const price = subType === 'support' 
      ? (useWicks ? prices[i].low : Math.min(prices[i].open, prices[i].close))
      : (useWicks ? prices[i].high : Math.max(prices[i].open, prices[i].close));
    
    const percentDiff = Math.abs((price - linePrice) / linePrice);
    
    if (percentDiff < proximityThreshold) {
      touches++;
      
      // Check if this touch resulted in a bounce
      if (i < endIndex - 1) {
        const nextClose = prices[i + 1].close;
        const currentClose = prices[i].close;
        
        const isValidBounce = (subType === 'support' && nextClose > currentClose) || 
                             (subType === 'resistance' && nextClose < currentClose);
        
        if (isValidBounce) {
          bounces++;
        }
      }
    }
  }
  
  const bouncePercentage = touches > 0 ? (bounces / touches) * 100 : 0;
  
  // Calculate strength with additional factor for slope angle
  const slopeQuality = calculateSlopeQuality(slopeAngle);
  const strength = calculateEnhancedStrength(touches, bouncePercentage, endIndex - startIndex, slopeQuality);
  
  return {
    startIndex,
    endIndex,
    startPrice,
    endPrice,
    isSupport: subType === 'support',
    type: 'diagonal',
    subType,
    strength,
    touches,
    bouncePercentage,
    currentPrice: priceAtIndex(0), // Price at the most recent bar
    isActive: true,
    priceAtIndex,
    // Additional metadata
    slopeAngle,
    useWicks
  } as TrendlineData;
};

/**
 * Calculate how good a slope angle is (1.0 = perfect, 0.0 = poor)
 */
const calculateSlopeQuality = (angleInDegrees: number): number => {
  // Moderate slopes (15-30 degrees) are considered optimal
  const OPTIMAL_MIN = 15;
  const OPTIMAL_MAX = 30;
  
  if (angleInDegrees >= OPTIMAL_MIN && angleInDegrees <= OPTIMAL_MAX) {
    return 1.0; // Perfect score for optimal angles
  } else if (angleInDegrees < OPTIMAL_MIN) {
    // Score decreases as angle approaches 0
    return angleInDegrees / OPTIMAL_MIN;
  } else {
    // Score decreases as angle approaches 90
    return 1.0 - ((angleInDegrees - OPTIMAL_MAX) / (90 - OPTIMAL_MAX));
  }
};

/**
 * Calculate enhanced strength of a trendline
 */
const calculateEnhancedStrength = (
  touches: number, 
  bouncePercentage: number,
  length: number,
  slopeQuality: number
): number => {
  // Factors that contribute to strength:
  // 1. Number of price touches (more touches = stronger)
  // 2. Bounce percentage (higher percentage = stronger)
  // 3. Length of the trendline (longer = stronger)
  // 4. Slope quality (moderate slopes are stronger than extreme slopes)
  
  // Calculate touches score (more touches mean stronger trendline, up to 5)
  const touchFactor = Math.min(1, touches / 5);
  
  // Calculate bounce score (higher percentage of bounces = stronger)
  const bounceFactor = bouncePercentage / 100;
  
  // Calculate length score (longer trendlines are stronger, up to 30 bars)
  const lengthFactor = Math.min(1, length / 30);
  
  // Combine factors into a strength score, now including slope quality
  return (touchFactor * 0.35) + (bounceFactor * 0.35) + (lengthFactor * 0.15) + (slopeQuality * 0.15);
};

/**
 * Validate an enhanced trendline with additional checks
 */
const validateEnhancedTrendline = (
  trendline: TrendlineData,
  prices: HistoricalPrice[],
  useWicks: boolean,
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
  
  // Check for body penetrations (invalid trendline if it cuts through candle bodies)
  const startIdx = trendline.startIndex;
  const endIdx = trendline.endIndex;
  
  for (let i = startIdx; i <= endIdx; i++) {
    const linePrice = trendline.priceAtIndex(i);
    const candle = prices[i];
    
    const bodyTop = Math.max(candle.open, candle.close);
    const bodyBottom = Math.min(candle.open, candle.close);
    
    // For support trendlines, the line should not cut through bodies
    if (trendline.subType === 'support' && linePrice > bodyBottom && linePrice < bodyTop) {
      return false;
    }
    
    // For resistance trendlines, the line should not cut through bodies
    if (trendline.subType === 'resistance' && linePrice > bodyBottom && linePrice < bodyTop) {
      return false;
    }
  }
  
  return true;
};

/**
 * Validates a trendline based on the number of touch points and their distribution.
 * Enhanced to incorporate higher timeframe data for validation.
 * 
 * @param trendline The trendline to validate
 * @param prices Historical price data
 * @param config Trendline configuration
 * @param higherTimeframePrices Optional higher timeframe price data
 * @returns Validation score between 0 and 1
 */
export const validateTrendlineEnhanced = (
  trendline: TrendlineData,
  prices: HistoricalPrice[],
  config: TrendlineConfig = DEFAULT_TRENDLINE_CONFIG,
  higherTimeframePrices?: HistoricalPrice[]
): number => {
  // Check the number of touch points
  if (trendline.touches < config.minConfirmationTouches) {
    return 0;
  }

  // Check if the trendline has a recent touch point if required
  if (config.requiredRecentTouch) {
    const touchPoints = calculateTouchPoints(trendline, prices);
    const lastTouchIndex = Math.max(...touchPoints.map(tp => prices.findIndex(p => isSameDay(p.date, tp.date))));
    const recentThreshold = Math.floor(prices.length * 0.75); // Recent touch should be in the last quarter of the data
    if (lastTouchIndex < recentThreshold) {
      return 0;
    }
  }

  // Calculate the slope significance
  const slopeSignificance = calculateSlopeSignificance(trendline.endPrice - trendline.startPrice, config);
  if (slopeSignificance === 0) {
    return 0;
  }

  // Calculate the trend duration significance
  const trendDuration = calculateTrendDuration(trendline as any, prices);
  const durationSignificance = trendDuration >= config.minTrendDuration ? 1 : 0;
  if (durationSignificance === 0) {
    return 0;
  }

  // Calculate the touch point distribution significance
  const touchPoints = calculateTouchPoints(trendline, prices);
  const touchPointDistribution = calculateTouchPointDistribution(touchPoints, prices.length);
  
  // Calculate the touch point deviation significance
  const touchPointDeviation = calculateTouchPointDeviation(trendline as any, prices);
  const deviationSignificance = touchPointDeviation <= config.maxTouchPointDeviation ? 1 : 
    (config.maxTouchPointDeviation * 1.5 - touchPointDeviation) / (config.maxTouchPointDeviation * 0.5);
  
  // Calculate higher timeframe alignment score if available
  let higherTimeframeScore = 1.0;
  if (config.higherTimeframeAlignment && higherTimeframePrices && higherTimeframePrices.length > 0) {
    higherTimeframeScore = calculateHigherTimeframeAlignment(trendline as any, higherTimeframePrices);
    
    // If higher timeframe doesn't confirm at all, reduce validation score
    if (higherTimeframeScore < 0.3) {
      return 0;
    }
  }
  
  // Calculate the overall validation score with weighted components
  const validationScore = (
    slopeSignificance * 0.15 +
    touchPointDistribution * 0.3 +
    deviationSignificance * 0.25 +
    durationSignificance * 0.15 +
    (trendline.touches / (config.minConfirmationTouches + 2)) * 0.15
  ) * higherTimeframeScore;
  
  return Math.min(1, validationScore);
};

/**
 * Calculate touch points for a trendline
 * 
 * @param trendline The trendline data
 * @param prices Historical price data
 * @returns Array of touch points with price and date
 */
const calculateTouchPoints = (
  trendline: TrendlineData,
  prices: HistoricalPrice[]
): { price: number; date: Date }[] => {
  const touchPoints: { price: number; date: Date }[] = [];
  
  // Only process valid indices
  if (trendline.startIndex < 0 || trendline.endIndex < 0 || 
      trendline.startIndex >= prices.length || trendline.endIndex >= prices.length) {
    return touchPoints;
  }
  
  // Check each price point between start and end
  for (let i = trendline.startIndex; i <= trendline.endIndex; i++) {
    if (i >= prices.length) break;
    
    const candle = prices[i];
    const trendlinePrice = trendline.priceAtIndex(i);
    
    // For support trendlines
    if (trendline.subType === 'support') {
      // Check if price touches or comes very close to the trendline
      if (Math.abs(candle.low - trendlinePrice) / trendlinePrice < 0.005) {
        touchPoints.push({
          price: candle.low,
          date: candle.date
        });
      }
    } 
    // For resistance trendlines
    else {
      // Check if price touches or comes very close to the trendline
      if (Math.abs(candle.high - trendlinePrice) / trendlinePrice < 0.005) {
        touchPoints.push({
          price: candle.high,
          date: candle.date
        });
      }
    }
  }
  
  return touchPoints;
};

/**
 * Calculate touch point distribution
 */
const calculateTouchPointDistribution = (
  touchPoints: { date: Date; price: number }[],
  totalPricePoints: number
): number => {
  if (touchPoints.length < 2) {
    return 0;
  }
  
  // Sort touch points by date
  const sortedTouchPoints = [...touchPoints].sort((a, b) => a.date.getTime() - b.date.getTime());
  
  // Calculate indices if we had price indices
  const firstTouchDate = sortedTouchPoints[0].date.getTime();
  const lastTouchDate = sortedTouchPoints[sortedTouchPoints.length - 1].date.getTime();
  const totalDuration = lastTouchDate - firstTouchDate;
  
  if (totalDuration === 0) {
    return 0;
  }
  
  // Calculate expected spacing between touch points
  const expectedSpacing = totalDuration / (sortedTouchPoints.length - 1);
  
  // Calculate actual spacings
  let deviationSum = 0;
  for (let i = 1; i < sortedTouchPoints.length; i++) {
    const actualSpacing = sortedTouchPoints[i].date.getTime() - sortedTouchPoints[i-1].date.getTime();
    const deviation = Math.abs(actualSpacing - expectedSpacing) / expectedSpacing;
    deviationSum += deviation;
  }
  
  const avgDeviation = deviationSum / (sortedTouchPoints.length - 1);
  
  // Higher deviation means worse distribution, so we invert for the score
  return Math.max(0, 1 - avgDeviation);
};

/**
 * Calculate touch point deviation
 */
const calculateTouchPointDeviation = (
  trendline: TrendlineData,
  prices: HistoricalPrice[]
): number => {
  const touchPoints = calculateTouchPoints(trendline, prices);
  if (touchPoints.length === 0) {
    return 1; // Maximum deviation
  }
  
  let deviationSum = 0;
  
  for (const touchPoint of touchPoints) {
    const pricePoint = prices.find(p => isSameDay(p.date, touchPoint.date));
    if (!pricePoint) continue;
    
    // Calculate expected price on trendline at this point
    const dayIndex = prices.findIndex(p => isSameDay(p.date, touchPoint.date));
    const expectedPrice = trendline.priceAtIndex(dayIndex);
    
    // Calculate deviation as percentage of price
    const deviation = Math.abs(touchPoint.price - expectedPrice) / touchPoint.price;
    deviationSum += deviation;
  }
  
  return deviationSum / touchPoints.length;
};

/**
 * Calculate trend duration in days
 */
const calculateTrendDuration = (
  trendline: TrendlineData,
  prices: HistoricalPrice[]
): number => {
  // Calculate duration based on start and end indices
  if (trendline.startIndex >= 0 && trendline.endIndex >= 0 && 
      trendline.startIndex < prices.length && trendline.endIndex < prices.length) {
    
    const firstDate = prices[trendline.startIndex].date;
    const lastDate = prices[trendline.endIndex].date;
    
    const durationMs = lastDate.getTime() - firstDate.getTime();
    return Math.floor(durationMs / (1000 * 60 * 60 * 24));
  }
  
  return 0;
};

/**
 * Calculate the significance of the slope.
 * Ensures the slope is neither too flat nor too steep.
 * 
 * @param priceDifference The price difference between start and end of the trendline
 * @param config Trendline configuration
 * @returns Slope significance between 0 and 1
 */
const calculateSlopeSignificance = (
  priceDifference: number,
  config: TrendlineConfig
): number => {
  const absSlope = Math.abs(priceDifference);
  
  if (absSlope < config.minSlope || absSlope > config.maxSlope) {
    return 0;
  }
  
  // Calculate significance based on position within acceptable range
  if (absSlope <= 1) {
    // For shallow slopes, higher is better (up to 1)
    return (absSlope - config.minSlope) / (1 - config.minSlope);
  } else {
    // For steeper slopes, lower is better (above 1)
    return (config.maxSlope - absSlope) / (config.maxSlope - 1);
  }
};

/**
 * Calculate alignment with higher timeframe trend.
 * 
 * @param trendline The trendline to validate
 * @param higherTimeframePrices Higher timeframe price data
 * @returns Alignment score between 0 and 1
 */
const calculateHigherTimeframeAlignment = (
  trendline: TrendlineData,
  higherTimeframePrices: HistoricalPrice[]
): number => {
  if (higherTimeframePrices.length < 5) {
    return 1.0; // Not enough higher timeframe data, don't penalize
  }
  
  // Sort higher timeframe prices
  const sortedHTFPrices = [...higherTimeframePrices].sort((a, b) => a.date.getTime() - b.date.getTime());
  
  // Calculate higher timeframe trend slope
  const htfFirstPrice = sortedHTFPrices[0].close;
  const htfLastPrice = sortedHTFPrices[sortedHTFPrices.length - 1].close;
  const htfSlope = (htfLastPrice - htfFirstPrice) / sortedHTFPrices.length;
  
  // Calculate trendline slope
  const trendlineSlope = (trendline.endPrice - trendline.startPrice) / (trendline.endIndex - trendline.startIndex);
  
  // Check if both slopes have the same sign (both positive or both negative)
  if ((htfSlope > 0 && trendlineSlope > 0) || (htfSlope < 0 && trendlineSlope < 0)) {
    return 1.0; // Perfect alignment
  } else if (Math.abs(htfSlope) < 0.1) {
    return 0.8; // Higher timeframe is relatively flat, slight penalty
  } else {
    return 0.2; // Slopes contradict each other, major penalty
  }
};

/**
 * Helper function to check if two dates are the same day
 */
const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};
