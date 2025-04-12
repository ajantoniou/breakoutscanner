import { PatternData } from '../../types/patternTypes';
import { HistoricalPrice } from '../backtestTypes';
import { validateDoubleBottom, validateDoubleTop, validateFlag } from '../validators/patternValidators';
import { determinePatternDirection } from './patternDirection';
import { isRsiFavorable, isMacdFavorable, calculateATR, isVolumeRising, OHLCV } from './technicalIndicators';
import { identifyPriceChannel } from './channelIdentification';

// Define price candle type to match OHLCV structure but with timestamp
interface PriceCandle extends OHLCV {
  timestamp: number;
}

// Define trendline data structure
interface TrendlineData {
  startIndex: number;
  endIndex: number;
  startPrice: number;
  endPrice: number;
  isSupport: boolean;
  strength: number;
  touches: number;
  currentPrice: number;
  type: 'horizontal' | 'diagonal' | 'ema';
  subType: 'support' | 'resistance';
  emaType?: 7 | 50 | 100;
  bouncePercentage: number;
  isActive: boolean;
  points?: Array<{timestamp: number, price: number}>;
  priceAtIndex?: (index: number) => number;
}

// Define interfaces for pattern validation results
interface PatternValidationResult {
  isValid: boolean;
  confidence: number;
}

interface MacdResult {
  isFavorable: boolean;
  isConflicting: boolean;
}

interface ChannelInfo {
  type: 'ascending' | 'descending' | 'horizontal' | 'undefined';
  strength: number;
  isNearSupport?: boolean;
  isNearResistance?: boolean;
}

/**
 * Interface for validation options
 */
export interface EnhancedValidationOptions {
  minConfirmationCandles: number;
  requireVolumeConfirmation: boolean;
  minVolumeFactor: number;
  requireHigherTimeframeAlignment: boolean;
  confidenceThreshold: number;
  // New options for multi-timeframe validation
  requireMultiTimeframeConfirmation: boolean;
  higherTimeframeWeight: number; // How much weight to give higher timeframe signals (0-1)
  useChannelBreakoutConfirmation: boolean; // Whether to specifically prioritize channel breakouts
}

/**
 * Interface for breakout validation result
 */
export interface BreakoutValidationResult {
  isValid: boolean;
  confidence: number;
  reason: string;
  volumeConfirmation?: {
    isConfirmed: boolean;
    volumeFactor: number;
  };
  higherTimeframeConfirmation?: {
    isConfirmed: boolean;
    strength: number;
  };
  momentumScore?: number;
  breakoutStrength?: number;
  isHigherTimeframeBreakout?: boolean; // Added to indicate if this is a higher timeframe breakout
}

/**
 * Validates a pattern using technical indicators and price action
 * Returns the validation result and confidence score
 */
export const validatePattern = (
  pattern: PatternData, 
  historicalPrices: HistoricalPrice[],
  higherTimeframePrices?: HistoricalPrice[], // Optional higher timeframe data for confirmation
  dailyTimeframePrices?: HistoricalPrice[]   // Optional daily timeframe for longer-term confirmation
): { isValid: boolean; confidence: number; channelType?: string; channelStrength?: number; isHigherTimeframeBreakout?: boolean } => {
  // Require at least 7 candles for reliable pattern validation
  if (!historicalPrices || historicalPrices.length < 7) {
    console.warn("Insufficient historical data for pattern validation - minimum 7 candles required");
    return { isValid: false, confidence: 0 };
  }
  
  const direction = determinePatternDirection(pattern.patternType);
  let confidenceScore = 50; // Base confidence score
  let isHigherTimeframeBreakout = false; // Initialize to false
  
  // 1. Check volume confirmation - focus on rising average volume over the past few candles
  // Enhanced volume analysis - look for progressive volume increase and volume climax
  const isVolumeConfirmed = isVolumeRising(historicalPrices);
  const recentVolumes = historicalPrices.slice(0, 5).map(p => p.volume);
  const olderVolumes = historicalPrices.slice(5, 10).map(p => p.volume);
  const recentAvgVolume = recentVolumes.reduce((sum, vol) => sum + vol, 0) / recentVolumes.length;
  const olderAvgVolume = olderVolumes.reduce((sum, vol) => sum + vol, 0) / olderVolumes.length;
  const volumeExpansion = recentAvgVolume / olderAvgVolume;
  
  // Strong volume expansion is highly favorable
  if (volumeExpansion > 1.5 && isVolumeConfirmed) {
    confidenceScore += 20; // Significant volume expansion - very strong confirmation
  } else if (isVolumeConfirmed) {
    confidenceScore += 15; // Volume trend is increasing - strong indicator
  } else if (volumeExpansion < 0.7) {
    confidenceScore -= 15; // Volume drying up - potential lack of interest
  } else {
    confidenceScore -= 10; // Volume trend is decreasing - weak setup
  }
  
  // 2. Check price action - looking for strong momentum in the pattern's direction
  const priceChange = (historicalPrices[0].close - historicalPrices[5].close) / historicalPrices[5].close;
  const isPositiveMomentum = priceChange > 0;
  
  // Ensure momentum aligns with pattern direction
  if ((direction === 'bullish' && isPositiveMomentum) || 
      (direction === 'bearish' && !isPositiveMomentum)) {
    confidenceScore += 10; // Price momentum aligns with pattern direction
  } else {
    confidenceScore -= 15; // Price momentum contradicts pattern direction - high failure risk
  }
  
  // 3. Check pattern-specific validation
  let patternValidity = false;
  let patternConfidence = 0;
  
  // Validate each pattern type with specific criteria for that pattern
  switch (pattern.patternType.toLowerCase()) {
    case 'double bottom': {
      const result = validateDoubleBottom(historicalPrices);
      if (typeof result === 'object' && 'isValid' in result && 'confidence' in result) {
        patternValidity = result.isValid;
        patternConfidence = result.confidence;
      } else {
        patternValidity = Boolean(result);
        patternConfidence = patternValidity ? 70 : 30;
      }
      break;
    }
    case 'double top': {
      const result = validateDoubleTop(historicalPrices);
      if (typeof result === 'object' && 'isValid' in result && 'confidence' in result) {
        patternValidity = result.isValid;
        patternConfidence = result.confidence;
      } else {
        patternValidity = Boolean(result);
        patternConfidence = patternValidity ? 70 : 30;
      }
      break;
    }
    case 'bull flag':
    case 'bear flag': {
      const isBullish = direction === 'bullish';
      const result = validateFlag(historicalPrices, isBullish ? 'bullish' : 'bearish');
      if (typeof result === 'object' && 'isValid' in result && 'confidence' in result) {
        patternValidity = result.isValid;
        patternConfidence = result.confidence;
      } else {
        patternValidity = Boolean(result);
        patternConfidence = patternValidity ? 70 : 30;
      }
      break;
    }
    // Add additional pattern types as needed
    default:
      // Generic validation for other patterns
      patternValidity = true;
      patternConfidence = 60;
  }
  
  if (!patternValidity) {
    confidenceScore -= 20; // Pattern doesn't meet specific criteria - major concern
  } else {
    confidenceScore += (patternConfidence - 50) / 2; // Adjust based on pattern-specific confidence
  }
  
  // 4. Check channel type and strength
  const channelInfo = identifyPriceChannel(historicalPrices);
  const channelType = channelInfo.channelType || 'undefined';
  const channelStrength = channelInfo.strength;
  
  // Check if channel type aligns with pattern direction
  if ((direction === 'bullish' && channelType === 'ascending') ||
      (direction === 'bearish' && channelType === 'descending')) {
    confidenceScore += 15; // Channel direction matches pattern direction - strong confirmation
  } else if (channelType === 'horizontal') {
    confidenceScore += 5; // Horizontal channels work for both directions
  } else {
    confidenceScore -= 15; // Channel contradicts pattern direction - higher failure risk
  }
  
  // Channel strength is a key factor for breakout potential
  if (channelStrength > 0.7) {
    confidenceScore += 10; // Strong channel - more likely to respect breakout
  } else if (channelStrength < 0.4) {
    confidenceScore -= 10; // Weak channel - may not respect breakout levels
  }
  
  // 5. Check MACD confirmation - good momentum indicator
  const macdResult = isMacdFavorable(historicalPrices, direction === 'bullish', 12, 26);
  const isMacdFavorableResult = typeof macdResult === 'boolean' ? { 
    isFavorable: macdResult, 
    isConflicting: !macdResult 
  } : macdResult;
  
  if (isMacdFavorableResult.isFavorable) {
    confidenceScore += 15; // MACD confirms direction - strong momentum
  } else if (isMacdFavorableResult.isConflicting) {
    confidenceScore -= 15; // MACD contradicts direction - warning sign
  }
  
  // 6. Check RSI confirmation - good for identifying potential reversals
  const latestRSI = isRsiFavorable(historicalPrices, direction === 'bullish');
  
  if (typeof latestRSI === 'number') {
    if (direction === 'bullish') {
      // For bullish patterns, prefer lower RSI (better entry potential)
      if (latestRSI < 40) {
        confidenceScore += 15; // Great entry point - RSI relatively low
      } else if (latestRSI < 60) {
        confidenceScore += 5; // Acceptable entry
      } else {
        confidenceScore -= 10; // RSI too high for good entry
      }
    } else {
      // For bearish patterns, prefer higher RSI (better entry potential)
      if (latestRSI > 60) {
        confidenceScore += 15; // Great entry point - RSI relatively high
      } else if (latestRSI > 40) {
        confidenceScore += 5; // Acceptable entry
      } else {
        confidenceScore -= 10; // RSI too low for good entry
      }
    }
  }
  
  // 7. Consider the EMA pattern
  if (pattern.emaPattern) {
    if ((direction === 'bullish' && 
        (pattern.emaPattern === 'allBullish' || pattern.emaPattern === '7over50')) ||
        (direction === 'bearish' && 
        (pattern.emaPattern === 'allBearish' || pattern.emaPattern === '7under50'))) {
      confidenceScore += 10; // EMA pattern confirms the direction
    } else if (pattern.emaPattern === 'mixed') {
      confidenceScore -= 5; // Mixed EMA signals reduce confidence
    } else {
      confidenceScore -= 15; // EMA alignment contradicts pattern direction
    }
  }
  
  // 8. Calculate ATR to assess volatility and potential move size
  const atr = calculateATR(historicalPrices.slice(0, 14));
  const atrPercent = atr / historicalPrices[0].close * 100;
  
  // Higher ATR means bigger potential moves but also more risk
  if (atrPercent > 3) {
    confidenceScore += 5; // Higher volatility = larger potential movement
  } else if (atrPercent > 1.5) {
    confidenceScore += 3; // Moderate volatility
  } else {
    confidenceScore -= 5; // Low volatility, may be harder to reach target
  }
  
  // 9. Check if the stock meets minimum price requirements ($10+)
  const currentPrice = historicalPrices[0].close;
  if (currentPrice < 10) {
    confidenceScore -= 10; // Lower priced stocks tend to be more manipulated and erratic
  }
  
  // 10. ENHANCED: Check for higher timeframe confirmation - now with more weight
  if (higherTimeframePrices && higherTimeframePrices.length >= 7) {
    // Check trend direction in higher timeframe
    const higherTfChange = (higherTimeframePrices[0].close - higherTimeframePrices[5].close) / 
                           higherTimeframePrices[5].close;
    const higherTfPositive = higherTfChange > 0;
    
    if ((direction === 'bullish' && higherTfPositive) || 
        (direction === 'bearish' && !higherTfPositive)) {
      confidenceScore += 25; // Increased: Higher timeframe confirms direction - very strong signal
    } else {
      confidenceScore -= 30; // Increased: Higher timeframe contradicts - trading against the larger trend
    }
    
    // Check if higher timeframe is at a key support/resistance level
    const htfChannel = identifyPriceChannel(higherTimeframePrices);
    const htfChannelInfo: ChannelInfo = {
      type: htfChannel.channelType as 'ascending' | 'descending' | 'horizontal' | 'undefined',
      strength: htfChannel.strength,
      isNearSupport: htfChannel.trendlineSupport > 0 && 
                     Math.abs(higherTimeframePrices[0].low - htfChannel.trendlineSupport) / htfChannel.trendlineSupport < 0.03,
      isNearResistance: htfChannel.trendlineResistance > 0 && 
                     Math.abs(higherTimeframePrices[0].high - htfChannel.trendlineResistance) / htfChannel.trendlineResistance < 0.03
    };
    
    if ((direction === 'bullish' && htfChannelInfo.isNearSupport) ||
        (direction === 'bearish' && htfChannelInfo.isNearResistance)) {
      confidenceScore += 20; // Increased: Higher timeframe at key level - strong confirmation
    }
    
    // Check for higher timeframe breakout - this is a significant positive factor
    const htfBreakout = checkHigherTimeframeBreakout(
      higherTimeframePrices, 
      direction === 'bullish'
    );
    
    if (htfBreakout.isBreakout) {
      confidenceScore += 30; // Major boost for higher timeframe breakout
      isHigherTimeframeBreakout = true; // Mark as higher timeframe breakout
    }
  }
  
  // 11. NEW: Daily timeframe confirmation (for even longer-term alignment)
  if (dailyTimeframePrices && dailyTimeframePrices.length >= 10) {
    const dailyChannelResult = identifyPriceChannel(dailyTimeframePrices);
    const dailyChannel: ChannelInfo = {
      type: dailyChannelResult.channelType as 'ascending' | 'descending' | 'horizontal' | 'undefined',
      strength: dailyChannelResult.strength,
      isNearSupport: dailyChannelResult.trendlineSupport > 0 && 
                     Math.abs(dailyTimeframePrices[0].low - dailyChannelResult.trendlineSupport) / dailyChannelResult.trendlineSupport < 0.03,
      isNearResistance: dailyChannelResult.trendlineResistance > 0 && 
                     Math.abs(dailyTimeframePrices[0].high - dailyChannelResult.trendlineResistance) / dailyChannelResult.trendlineResistance < 0.03
    };
    
    const dailyTrend = dailyTimeframePrices[0].close > dailyTimeframePrices[9].close ? 'bullish' : 'bearish';
    
    // Major boost if daily trend aligns with pattern direction
    if ((direction === 'bullish' && dailyTrend === 'bullish') || 
        (direction === 'bearish' && dailyTrend === 'bearish')) {
      confidenceScore += 20; // Strong daily alignment
    } else {
      confidenceScore -= 25; // Counter-trend to daily direction
    }
    
    // If breaking out of a strong daily channel, this is extremely significant
    if (dailyChannel.strength > 0.6 && ((direction === 'bullish' && dailyChannel.isNearResistance) || 
        (direction === 'bearish' && dailyChannel.isNearSupport))) {
      confidenceScore += 25; // Major boost for daily channel breakout
      isHigherTimeframeBreakout = true; // This is definitely a higher timeframe breakout
    }
  }
  
  // 12. Previous false breakouts analysis (lower confidence if recent failed breakouts)
  const recentBreakoutFailures = countRecentFalseBreakouts(historicalPrices, direction);
  if (recentBreakoutFailures > 1) {
    confidenceScore -= 15; // Multiple recent failed breakouts - pattern unreliable
  } else if (recentBreakoutFailures === 1) {
    confidenceScore -= 5; // One recent failed breakout - some concern
  }
  
  // 13. Price structure analysis (clean patterns are more reliable)
  const isCleanPattern = analyzePriceStructure(historicalPrices);
  if (isCleanPattern) {
    confidenceScore += 10; // Clean price structure suggests more reliable pattern
  } else {
    confidenceScore -= 5; // Messy price structure lowers reliability
  }
  
  // 14. Gap analysis (avoid entries after gaps)
  if (hasRecentGap(historicalPrices)) {
    confidenceScore -= 15; // Recent gap increases uncertainty and risk
  }
  
  // 15. NEW: Multi-timeframe confluence boost (if we have confirmation from multiple timeframes)
  if (higherTimeframePrices && dailyTimeframePrices) {
    const htfChannel = identifyPriceChannel(higherTimeframePrices);
    const dailyChannel = identifyPriceChannel(dailyTimeframePrices);
    
    if ((direction === 'bullish' && 
         htfChannel.channelType !== 'descending' && 
         dailyChannel.channelType !== 'descending') || 
        (direction === 'bearish' && 
         htfChannel.channelType !== 'ascending' && 
         dailyChannel.channelType !== 'ascending')) {
      confidenceScore += 15; // Multi-timeframe channel alignment is a strong signal
    }
  }
  
  // Limit confidence score to range 0-100
  confidenceScore = Math.max(0, Math.min(100, confidenceScore));
  
  // Determine validity based on confidence threshold - increased for higher accuracy
  const isValid = confidenceScore >= 70; // Increased threshold from 65 to 70
  
  return { 
    isValid,
    confidence: confidenceScore,
    channelType,
    channelStrength,
    isHigherTimeframeBreakout
  };
};

/**
 * Checks for higher timeframe breakout signals
 * Higher timeframe breakouts are more significant and reliable
 */
function checkHigherTimeframeBreakout(
  prices: HistoricalPrice[], 
  isBullish: boolean
): { isBreakout: boolean; strength: number } {
  if (prices.length < 10) {
    return { isBreakout: false, strength: 0 };
  }
  
  // Get recent swing points
  const swingHigh = Math.max(...prices.slice(1, 10).map(p => p.high));
  const swingLow = Math.min(...prices.slice(1, 10).map(p => p.low));
  
  // Current candle
  const current = prices[0];
  
  // For bullish breakout, we want to see price breaking above recent swing high
  // with strong momentum
  if (isBullish) {
    const breakoutStrength = (current.close - swingHigh) / swingHigh * 100;
    const isBreakout = current.close > swingHigh && breakoutStrength > 0.5;
    
    return {
      isBreakout,
      strength: Math.min(1, breakoutStrength / 2) // Normalize to 0-1
    };
  } 
  // For bearish breakout, we want to see price breaking below recent swing low
  // with strong momentum
  else {
    const breakoutStrength = (swingLow - current.close) / swingLow * 100;
    const isBreakout = current.close < swingLow && breakoutStrength > 0.5;
    
    return {
      isBreakout,
      strength: Math.min(1, breakoutStrength / 2) // Normalize to 0-1
    };
  }
}

/**
 * Counts recent false breakouts in the historical data
 * Too many recent failures suggests an unreliable pattern
 */
function countRecentFalseBreakouts(prices: HistoricalPrice[], direction: 'bullish' | 'bearish'): number {
  let falseBreakouts = 0;
  
  // Look at the most recent 20 bars
  const recentPrices = prices.slice(0, Math.min(20, prices.length));
  
  for (let i = 1; i < recentPrices.length - 1; i++) {
    if (direction === 'bullish') {
      // False bullish breakout: price breaks above resistance then falls back
      if (recentPrices[i].high > recentPrices[i-1].high * 1.01 &&
          recentPrices[i+1].close < recentPrices[i].close) {
        falseBreakouts++;
      }
    } else {
      // False bearish breakout: price breaks below support then rises back
      if (recentPrices[i].low < recentPrices[i-1].low * 0.99 &&
          recentPrices[i+1].close > recentPrices[i].close) {
        falseBreakouts++;
      }
    }
  }
  
  return falseBreakouts;
}

/**
 * Analyzes price structure to detect clean or messy patterns
 * Clean patterns with clear support/resistance are more reliable
 */
function analyzePriceStructure(prices: HistoricalPrice[]): boolean {
  // Calculate typical range
  const ranges = prices.slice(0, 10).map(p => p.high - p.low);
  const avgRange = ranges.reduce((sum, range) => sum + range, 0) / ranges.length;
  
  // Check for erratic candles (much larger than typical)
  const erraticCandles = ranges.filter(range => range > avgRange * 2).length;
  
  // Check for clean support/resistance touches
  const highs = prices.slice(0, 10).map(p => p.high);
  const lows = prices.slice(0, 10).map(p => p.low);
  
  // Standard deviation of highs and lows - lower means more aligned touches
  const highsDev = standardDeviation(highs);
  const lowsDev = standardDeviation(lows);
  
  // Higher deviation ratio indicates messier pattern
  const deviationRatio = (highsDev + lowsDev) / (2 * avgRange);
  
  // Clean patterns have few erratic candles and clear support/resistance
  return erraticCandles <= 1 && deviationRatio < 0.5;
}

/**
 * Checks for recent gaps in price movement
 * Gaps increase uncertainty in pattern development
 */
function hasRecentGap(prices: HistoricalPrice[]): boolean {
  // Look at the 5 most recent candles
  for (let i = 1; i < Math.min(5, prices.length); i++) {
    // Gap up: Today's low > yesterday's high
    const gapUp = prices[i-1].low > prices[i].high;
    
    // Gap down: Today's high < yesterday's low
    const gapDown = prices[i-1].high < prices[i].low;
    
    if (gapUp || gapDown) {
      return true;
    }
  }
  
  return false;
}

/**
 * Calculate standard deviation of an array of numbers
 */
function standardDeviation(values: number[]): number {
  const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squareDiffs = values.map(value => Math.pow(value - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((sum, val) => sum + val, 0) / squareDiffs.length;
  return Math.sqrt(avgSquareDiff);
}

/**
 * Validates a breakout pattern
 * @param candles Price candles
 * @param trendline Trendline to validate
 * @param higherTimeframeCandles Higher timeframe candles for confirmation
 * @param enhancedValidationOptions Additional validation options
 * @returns Validation result
 */
export const validateBreakoutPattern = (
  candles: PriceCandle[],
  trendline: TrendlineData,
  higherTimeframeCandles?: PriceCandle[],
  enhancedValidationOptions?: Partial<EnhancedValidationOptions>
): BreakoutValidationResult => {
  if (!candles || candles.length < 5) {
    return { isValid: false, confidence: 0, reason: 'Insufficient candles' };
  }

  // Default options with improved thresholds
  const options: EnhancedValidationOptions = {
    minConfirmationCandles: 1,
    requireVolumeConfirmation: true,
    minVolumeFactor: 1.2,
    requireHigherTimeframeAlignment: true,
    confidenceThreshold: 0.70, // Increased from 0.65 for higher accuracy
    requireMultiTimeframeConfirmation: true, // New option to enable multi-timeframe validation
    higherTimeframeWeight: 0.6, // Give higher timeframe signals 60% of the weight
    useChannelBreakoutConfirmation: true, // Prioritize channel breakouts
    ...enhancedValidationOptions
  };

  let confidence = 0.5; // Start with neutral confidence
  const recentCandles = candles.slice(-5); // Last 5 candles for recent analysis
  const latestCandle = candles[candles.length - 1];
  const previousCandle = candles[candles.length - 2];

  // Check if we have a breakout through the trendline
  if (!checkBreakthrough(latestCandle, trendline)) {
    return { isValid: false, confidence: 0, reason: 'No breakout detected' };
  }

  // Determine the breakout direction (up or down)
  const isUpwardBreakout = trendline.subType === 'resistance';
  
  // Check for confirmation candles (we need at least one confirmation)
  let confirmationCount = 0;
  for (let i = candles.length - 1; i >= Math.max(0, candles.length - 3); i--) {
    const candle = candles[i];
    if (isUpwardBreakout) {
      // For upward breakouts, the close should be above the trendline price
      if (candle.close > getTrendlinePrice(trendline, candle.timestamp)) {
        confirmationCount++;
      }
    } else {
      // For downward breakouts, the close should be below the trendline price
      if (candle.close < getTrendlinePrice(trendline, candle.timestamp)) {
        confirmationCount++;
      }
    }
  }

  if (confirmationCount < options.minConfirmationCandles) {
    return { isValid: false, confidence: 0.3, reason: 'Insufficient confirmation candles' };
  }

  // Add confidence for each confirmation candle - increased weight for multiple confirmations
  confidence += confirmationCount * 0.15; // Increased from 0.1

  // Check candlestick patterns
  const hasStrengthPattern = checkCandlestickStrength(recentCandles, isUpwardBreakout);
  if (hasStrengthPattern) {
    confidence += 0.15;
  }

  // Volume analysis - check if breakout volume is higher than average
  const volumeConfirmation = checkVolumeConfirmation(
    candles, 
    latestCandle, 
    options.minVolumeFactor
  );
  
  if (options.requireVolumeConfirmation && !volumeConfirmation.isConfirmed) {
    confidence -= 0.25; // Increased penalty from 0.2
    if (confidence < 0.5) {
      return { 
        isValid: false, 
        confidence, 
        reason: 'Insufficient volume confirmation',
        volumeConfirmation
      };
    }
  } else if (volumeConfirmation.isConfirmed) {
    // Apply proportional confidence boost based on volume factor
    confidence += 0.15 * Math.min(2, volumeConfirmation.volumeFactor - 1); // Increased from 0.1
  }

  // Higher timeframe alignment - significantly enhanced
  let higherTimeframeConfirmation = { isConfirmed: false, strength: 0 };
  let isHigherTimeframeBreakout = false;
  
  if (higherTimeframeCandles && higherTimeframeCandles.length > 0) {
    // Check if the higher timeframe shows the same direction bias
    higherTimeframeConfirmation = checkHigherTimeframeAlignment(
      higherTimeframeCandles,
      isUpwardBreakout,
      trendline
    );
    
    // Check if this is a breakout in the higher timeframe as well
    const higherTfBreakoutResult = checkHigherTimeframeBreakoutStrength(
      higherTimeframeCandles,
      isUpwardBreakout
    );
    
    isHigherTimeframeBreakout = higherTfBreakoutResult.isBreakout;
    
    if (options.requireHigherTimeframeAlignment && !higherTimeframeConfirmation.isConfirmed) {
      confidence -= 0.30; // Increased penalty from 0.25
    } else if (higherTimeframeConfirmation.isConfirmed) {
      // Higher timeframe confirmation - major positive factor
      confidence += 0.25 * higherTimeframeConfirmation.strength; // Increased from 0.2
      
      // Additional boost for higher timeframe breakouts
      if (isHigherTimeframeBreakout) {
        confidence += 0.20; // Significant boost for higher timeframe breakout
      }
    }
  } else if (options.requireHigherTimeframeAlignment) {
    // If we require higher timeframe alignment but don't have the data, reduce confidence
    confidence -= 0.15;
  }

  // Pattern momentum - check if recent candles show momentum in breakout direction
  const momentumScore = calculateMomentumScore(
    recentCandles, 
    isUpwardBreakout
  );
  
  // Add momentum contribution to confidence (can be positive or negative)
  confidence += momentumScore * 0.20; // Increased from 0.15

  // Check if the breakout candle closes strongly beyond the trendline
  const breakoutStrength = calculateBreakoutStrength(
    latestCandle, 
    previousCandle, 
    trendline
  );
  
  confidence += breakoutStrength * 0.20; // Increased from 0.15

  // Enhance confidence based on trendline validity
  confidence += (trendline.strength || 0.5) * 0.15; // Increased from 0.1

  // NEW: Check for false breakout risk signals
  const falseBreakoutRisk = assessFalseBreakoutRisk(
    candles,
    isUpwardBreakout,
    trendline
  );
  
  confidence -= falseBreakoutRisk * 0.25; // Substantial penalty for false breakout risk factors

  // Normalize confidence to 0-1 range
  confidence = Math.max(0, Math.min(1, confidence));

  // Check final confidence against threshold
  const isValid = confidence >= options.confidenceThreshold;

  return {
    isValid,
    confidence,
    reason: isValid ? 'Valid breakout pattern' : 'Confidence below threshold',
    volumeConfirmation,
    higherTimeframeConfirmation,
    momentumScore,
    breakoutStrength,
    isHigherTimeframeBreakout
  };
};

/**
 * Checks if higher timeframe confirms the breakout direction
 * @param higherTfCandles Candles from higher timeframe
 * @param isUpwardBreakout Whether we're looking for upward bias
 * @param trendline The trendline being analyzed
 * @returns Object indicating if higher timeframe confirms and strength
 */
const checkHigherTimeframeAlignment = (
  higherTfCandles: PriceCandle[],
  isUpwardBreakout: boolean,
  trendline: TrendlineData
): { isConfirmed: boolean; strength: number } => {
  if (higherTfCandles.length < 3) {
    return { isConfirmed: false, strength: 0 };
  }
  
  // Get relevant candles (latest 3)
  const recentCandles = higherTfCandles.slice(-3);
  const latestCandle = recentCandles[recentCandles.length - 1];
  
  // Look back further to establish a stronger trend
  const extendedCandles = higherTfCandles.slice(-7);
  
  // Check if higher timeframe is in the same direction
  let directionMatch = false;
  let directionStrength = 0;
  
  if (isUpwardBreakout) {
    // For upward breakouts, we want higher timeframe to show upward momentum
    const upCount = recentCandles.filter(c => c.close > c.open).length;
    directionMatch = upCount >= 2; // At least 2 out of 3 candles should be bullish
    
    // Strength based on how bullish the latest candle is
    if (latestCandle.close > latestCandle.open) {
      const range = latestCandle.high - latestCandle.low;
      if (range > 0) {
        directionStrength = (latestCandle.close - latestCandle.open) / range;
      }
    }
    
    // Look at the extended candles for trend analysis
    const extendedTrend = extendedCandles[0].close > extendedCandles[extendedCandles.length - 1].close;
    if (extendedTrend) {
      directionStrength += 0.3; // Add strength if longer-term trend is bullish
    }
  } else {
    // For downward breakouts, we want higher timeframe to show downward momentum
    const downCount = recentCandles.filter(c => c.close < c.open).length;
    directionMatch = downCount >= 2; // At least 2 out of 3 candles should be bearish
    
    // Strength based on how bearish the latest candle is
    if (latestCandle.close < latestCandle.open) {
      const range = latestCandle.high - latestCandle.low;
      if (range > 0) {
        directionStrength = (latestCandle.open - latestCandle.close) / range;
      }
    }
    
    // Look at the extended candles for trend analysis
    const extendedTrend = extendedCandles[0].close < extendedCandles[extendedCandles.length - 1].close;
    if (extendedTrend) {
      directionStrength += 0.3; // Add strength if longer-term trend is bearish
    }
  }
  
  // Check if higher timeframe trendline would confirm this breakout
  const trendlinePrice = getTrendlinePrice(trendline, latestCandle.timestamp);
  const priceConfirmation = isUpwardBreakout ? 
    latestCandle.close > trendlinePrice : 
    latestCandle.close < trendlinePrice;
  
  // Final strength is a combination of direction strength and price confirmation
  const finalStrength = priceConfirmation ? 
    Math.min(1, 0.5 + directionStrength * 0.5) : 
    directionStrength * 0.6;
  
  return {
    isConfirmed: directionMatch && finalStrength > 0.3,
    strength: finalStrength
  };
};

/**
 * Checks if a volume spike confirms the breakout
 * @param candles Historical candles
 * @param breakoutCandle The potential breakout candle
 * @param minVolumeFactor Minimum factor of average volume required
 * @returns Object with confirmation result and volume factor
 */
const checkVolumeConfirmation = (
  candles: PriceCandle[],
  breakoutCandle: PriceCandle,
  minVolumeFactor: number = 1.2
): { isConfirmed: boolean; volumeFactor: number } => {
  if (candles.length < 10) {
    return { isConfirmed: false, volumeFactor: 0 };
  }
  
  // Calculate average volume over the last 10 candles (excluding the current)
  const relevantCandles = candles.slice(-11, -1);
  const avgVolume = relevantCandles.reduce((sum, candle) => 
    sum + (candle.volume || 0), 0) / relevantCandles.length;
  
  if (avgVolume === 0) {
    return { isConfirmed: false, volumeFactor: 0 };
  }
  
  const currentVolume = breakoutCandle.volume || 0;
  const volumeFactor = currentVolume / avgVolume;
  
  // Enhanced analysis - look for progressive volume increase
  const volumeTrend = analyzeVolumeTrend(candles.slice(-5));
  
  return {
    isConfirmed: volumeFactor >= minVolumeFactor || volumeTrend.isIncreasing,
    volumeFactor
  };
};

/**
 * Analyzes volume trend over recent candles
 * @param candles Recent candles to analyze
 * @returns Analysis of volume trend
 */
const analyzeVolumeTrend = (
  candles: PriceCandle[]
): { isIncreasing: boolean; consecutiveIncreases: number } => {
  if (candles.length < 3) {
    return { isIncreasing: false, consecutiveIncreases: 0 };
  }
  
  let consecutiveIncreases = 0;
  
  // Check for consecutive volume increases
  for (let i = candles.length - 1; i > 0; i--) {
    const currentVolume = candles[i].volume || 0;
    const previousVolume = candles[i-1].volume || 0;
    
    if (currentVolume > previousVolume) {
      consecutiveIncreases++;
    } else {
      break; // Stop counting if we hit a decrease
    }
  }
  
  return {
    isIncreasing: consecutiveIncreases >= 2, // At least 2 consecutive increases
    consecutiveIncreases
  };
};

/**
 * Checks if recent candlestick patterns show strength in the breakout direction
 * @param candles Recent candles to analyze
 * @param isUpwardBreakout Whether we're looking for bullish patterns
 * @returns True if strong patterns are detected
 */
const checkCandlestickStrength = (
  candles: PriceCandle[],
  isUpwardBreakout: boolean
): boolean => {
  if (candles.length < 3) return false;
  
  const latestCandle = candles[candles.length - 1];
  const previousCandle = candles[candles.length - 2];
  
  if (isUpwardBreakout) {
    // Check for bullish patterns
    
    // Strong close - close in the upper third of the range
    const isStrongClose = latestCandle.close > 
      (latestCandle.low + (latestCandle.high - latestCandle.low) * 0.67);
    
    // Engulfing pattern
    const isBullishEngulfing = 
      latestCandle.open < previousCandle.close &&
      latestCandle.close > previousCandle.open &&
      latestCandle.close > latestCandle.open;
    
    // Strong body - candle body is more than 60% of the range
    const isStrongBody = 
      Math.abs(latestCandle.close - latestCandle.open) > 
      (latestCandle.high - latestCandle.low) * 0.6 &&
      latestCandle.close > latestCandle.open;
    
    return isStrongClose || isBullishEngulfing || isStrongBody;
  } else {
    // Check for bearish patterns
    
    // Strong close - close in the lower third of the range
    const isStrongClose = latestCandle.close < 
      (latestCandle.low + (latestCandle.high - latestCandle.low) * 0.33);
    
    // Engulfing pattern
    const isBearishEngulfing = 
      latestCandle.open > previousCandle.close &&
      latestCandle.close < previousCandle.open &&
      latestCandle.close < latestCandle.open;
    
    // Strong body - candle body is more than 60% of the range
    const isStrongBody = 
      Math.abs(latestCandle.close - latestCandle.open) > 
      (latestCandle.high - latestCandle.low) * 0.6 &&
      latestCandle.close < latestCandle.open;
    
    return isStrongClose || isBearishEngulfing || isStrongBody;
  }
};

/**
 * Checks if a breakout has occurred through a trendline
 * @param candle The candle to check
 * @param trendline The trendline to check against
 * @returns True if a breakout occurred
 */
export const checkBreakthrough = (
  candle: PriceCandle,
  trendline: TrendlineData
): boolean => {
  if (!trendline || !candle) return false;

  const trendlinePrice = getTrendlinePrice(trendline, candle.timestamp);
  
  // Check for breakout direction based on trendline type
  if (trendline.subType === 'resistance') {
    // For resistance lines, breakout is when price closes above the line
    return candle.close > trendlinePrice;
  } else {
    // For support lines, breakout is when price closes below the line
    return candle.close < trendlinePrice;
  }
};

/**
 * Gets the price value of a trendline at a given timestamp
 * @param trendline The trendline to calculate price for
 * @param timestamp The timestamp to get price at
 * @returns The price value at the timestamp
 */
export const getTrendlinePrice = (
  trendline: TrendlineData,
  timestamp: number
): number => {
  // Default implementation - can be enhanced based on trendline calculation logic
  if (!trendline || !trendline.points || trendline.points.length < 2) return 0;
  
  const point1 = trendline.points[0];
  const point2 = trendline.points[1];
  
  // Simple linear interpolation/extrapolation
  const slope = (point2.price - point1.price) / (point2.timestamp - point1.timestamp);
  return point1.price + slope * (timestamp - point1.timestamp);
};

/**
 * Assesses the risk of a false breakout based on various factors
 * @param candles Price candles
 * @param isUpwardBreakout Whether this is an upward breakout
 * @param trendline The trendline being broken
 * @returns Risk score between 0-1 (0 = low risk, 1 = high risk)
 */
const assessFalseBreakoutRisk = (
  candles: PriceCandle[],
  isUpwardBreakout: boolean,
  trendline: TrendlineData
): number => {
  if (candles.length < 10) return 0.5; // Default risk if not enough data
  
  let riskScore = 0;
  const latestCandle = candles[candles.length - 1];
  const previousCandles = candles.slice(candles.length - 10, candles.length - 1);
  
  // Check for prior failed breakout attempts
  let failedBreakouts = 0;
  for (let i = 0; i < previousCandles.length - 1; i++) {
    const candle = previousCandles[i];
    const nextCandle = previousCandles[i + 1];
    
    if (isUpwardBreakout) {
      // For upward breakouts, check if price broke above trendline then fell back below
      if (candle.high > getTrendlinePrice(trendline, candle.timestamp) && 
          nextCandle.close < getTrendlinePrice(trendline, nextCandle.timestamp)) {
        failedBreakouts++;
      }
    } else {
      // For downward breakouts, check if price broke below trendline then rose back above
      if (candle.low < getTrendlinePrice(trendline, candle.timestamp) && 
          nextCandle.close > getTrendlinePrice(trendline, nextCandle.timestamp)) {
        failedBreakouts++;
      }
    }
  }
  
  // Add to risk score based on failed breakouts
  riskScore += failedBreakouts * 0.15;
  
  // Check if breakout is happening near the end of the trendline
  // This is less reliable than breakouts in the middle of an established trendline
  const trendlineDuration = trendline.endIndex - trendline.startIndex;
  const breakoutPosition = trendline.endIndex;
  const positionRatio = (breakoutPosition - trendline.startIndex) / trendlineDuration;
  
  if (positionRatio > 0.9) {
    riskScore += 0.2; // Higher risk if breaking out at the very end of the trendline
  }
  
  // Check weakness in the breakout candle
  if (isUpwardBreakout) {
    // For upward breakouts, a weak close or long upper wick suggests weakness
    const wickRatio = (latestCandle.high - latestCandle.close) / 
                     (latestCandle.high - latestCandle.low);
    
    if (wickRatio > 0.6) {
      riskScore += 0.25; // Long upper wick indicates selling pressure
    }
    
    // Close in the lower half of the candle is weak
    if (latestCandle.close < (latestCandle.high + latestCandle.low) / 2) {
      riskScore += 0.15;
    }
  } else {
    // For downward breakouts, a weak close or long lower wick suggests weakness
    const wickRatio = (latestCandle.close - latestCandle.low) / 
                     (latestCandle.high - latestCandle.low);
    
    if (wickRatio > 0.6) {
      riskScore += 0.25; // Long lower wick indicates buying pressure
    }
    
    // Close in the upper half of the candle is weak
    if (latestCandle.close > (latestCandle.high + latestCandle.low) / 2) {
      riskScore += 0.15;
    }
  }
  
  return Math.min(1, riskScore); // Cap at 1
};

/**
 * Checks the strength of a breakout in higher timeframe
 * @param higherTfCandles Candles from higher timeframe
 * @param isUpwardBreakout Whether we're looking for upward breakout
 * @returns Object with breakout status and strength
 */
const checkHigherTimeframeBreakoutStrength = (
  higherTfCandles: PriceCandle[],
  isUpwardBreakout: boolean
): { isBreakout: boolean; strength: number } => {
  if (higherTfCandles.length < 10) {
    return { isBreakout: false, strength: 0 };
  }
  
  const latestCandle = higherTfCandles[higherTfCandles.length - 1];
  
  // Find swing high/low to determine breakout level
  const lookbackPeriod = 10;
  const priorCandles = higherTfCandles.slice(
    higherTfCandles.length - lookbackPeriod, 
    higherTfCandles.length - 1
  );
  
  if (isUpwardBreakout) {
    // For upward breakouts, find the recent swing high
    const swingHigh = Math.max(...priorCandles.map(c => c.high));
    
    // Check if price is breaking above the swing high
    const breakoutAmount = (latestCandle.close - swingHigh) / swingHigh;
    const isBreakout = latestCandle.close > swingHigh;
    
    return {
      isBreakout,
      strength: isBreakout ? Math.min(1, breakoutAmount * 20) : 0
    };
  } else {
    // For downward breakouts, find the recent swing low
    const swingLow = Math.min(...priorCandles.map(c => c.low));
    
    // Check if price is breaking below the swing low
    const breakoutAmount = (swingLow - latestCandle.close) / swingLow;
    const isBreakout = latestCandle.close < swingLow;
    
    return {
      isBreakout,
      strength: isBreakout ? Math.min(1, breakoutAmount * 20) : 0
    };
  }
};

/**
 * Calculates a momentum score based on recent candles
 * @param candles Recent price candles
 * @param isUpwardBreakout Whether we're looking for upward momentum
 * @returns Score between -1 (opposing momentum) and 1 (strong momentum)
 */
const calculateMomentumScore = (
  candles: PriceCandle[],
  isUpwardBreakout: boolean
): number => {
  if (candles.length < 3) return 0;
  
  // Calculate the price change percentage over the last few candles
  const lastPrice = candles[candles.length - 1].close;
  const firstPrice = candles[0].open;
  const priceChange = (lastPrice - firstPrice) / firstPrice;
  
  // Calculate average candle range
  const avgRange = candles.reduce((sum, candle) => 
    sum + Math.abs(candle.high - candle.low), 0) / candles.length;
  
  // Normalize the price change relative to the average range
  const normalizedChange = priceChange / (avgRange / firstPrice);
  
  // Score is positive if change matches breakout direction
  return isUpwardBreakout ? 
    Math.min(1, Math.max(-1, normalizedChange)) : 
    Math.min(1, Math.max(-1, -normalizedChange));
};

/**
 * Calculates how strongly a breakout candle confirms the breakout
 * @param currentCandle The potential breakout candle
 * @param previousCandle The candle before the breakout
 * @param trendline The trendline being broken
 * @returns Score between 0 (weak) and 1 (strong)
 */
const calculateBreakoutStrength = (
  currentCandle: PriceCandle,
  previousCandle: PriceCandle,
  trendline: TrendlineData
): number => {
  const trendlinePrice = getTrendlinePrice(trendline, currentCandle.timestamp);
  const candleRange = Math.abs(currentCandle.high - currentCandle.low);
  
  if (candleRange === 0) return 0;
  
  const isUpward = trendline.subType === 'resistance';
  
  if (isUpward) {
    // For upward breakouts, check how far the close is above the trendline
    const breakoutDistance = currentCandle.close - trendlinePrice;
    return Math.min(1, Math.max(0, breakoutDistance / (candleRange * 0.5)));
  } else {
    // For downward breakouts, check how far the close is below the trendline
    const breakoutDistance = trendlinePrice - currentCandle.close;
    return Math.min(1, Math.max(0, breakoutDistance / (candleRange * 0.5)));
  }
};
