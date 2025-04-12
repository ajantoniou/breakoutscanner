
/**
 * Advanced analysis for support, resistance and trendlines
 */

import { HistoricalPrice } from '@/services/backtesting/backtestTypes';
import { identifyTrendlines, TrendlineData } from '@/services/backtesting/utils/trendlineAnalysis';
import { identifyPriceChannel } from '@/services/backtesting/utils/channelIdentification';
import { calculateATR } from './technicalIndicators';

/**
 * Find horizontal support and resistance levels
 */
export const findHorizontalLevels = (
  prices: HistoricalPrice[],
  lookbackPeriod: number = 90
): { 
  supportLevels: number[], 
  resistanceLevels: number[] 
} => {
  if (prices.length < lookbackPeriod) {
    return { supportLevels: [], resistanceLevels: [] };
  }
  
  const relevantPrices = prices.slice(0, lookbackPeriod);
  
  // Find swing highs and lows
  const swingHighs: { price: number, count: number }[] = [];
  const swingLows: { price: number, count: number }[] = [];
  
  const lookLeftRight = 5; // Bars to look left and right for swing points
  
  // Find swing highs (local maxima)
  for (let i = lookLeftRight; i < relevantPrices.length - lookLeftRight; i++) {
    let isSwingHigh = true;
    const currentHigh = relevantPrices[i].high;
    
    // Check if this is higher than all bars to the left and right
    for (let j = i - lookLeftRight; j <= i + lookLeftRight; j++) {
      if (j === i) continue; // Skip the current bar
      
      if (relevantPrices[j].high >= currentHigh) {
        isSwingHigh = false;
        break;
      }
    }
    
    if (isSwingHigh) {
      // Check if we already have a similar level
      const existingLevel = swingHighs.find(h => 
        Math.abs(h.price - currentHigh) / currentHigh < 0.01
      );
      
      if (existingLevel) {
        existingLevel.count++;
        // Average the levels
        existingLevel.price = (existingLevel.price * (existingLevel.count - 1) + currentHigh) / existingLevel.count;
      } else {
        swingHighs.push({ price: currentHigh, count: 1 });
      }
    }
  }
  
  // Find swing lows (local minima)
  for (let i = lookLeftRight; i < relevantPrices.length - lookLeftRight; i++) {
    let isSwingLow = true;
    const currentLow = relevantPrices[i].low;
    
    // Check if this is lower than all bars to the left and right
    for (let j = i - lookLeftRight; j <= i + lookLeftRight; j++) {
      if (j === i) continue; // Skip the current bar
      
      if (relevantPrices[j].low <= currentLow) {
        isSwingLow = false;
        break;
      }
    }
    
    if (isSwingLow) {
      // Check if we already have a similar level
      const existingLevel = swingLows.find(l => 
        Math.abs(l.price - currentLow) / currentLow < 0.01
      );
      
      if (existingLevel) {
        existingLevel.count++;
        // Average the levels
        existingLevel.price = (existingLevel.price * (existingLevel.count - 1) + currentLow) / existingLevel.count;
      } else {
        swingLows.push({ price: currentLow, count: 1 });
      }
    }
  }
  
  // Sort levels by strength (more touches = stronger level)
  const sortedHighs = swingHighs.sort((a, b) => b.count - a.count);
  const sortedLows = swingLows.sort((a, b) => b.count - a.count);
  
  // Take the top 3 levels (or less if not enough found)
  const topResistanceLevels = sortedHighs.slice(0, 3).map(h => parseFloat(h.price.toFixed(2)));
  const topSupportLevels = sortedLows.slice(0, 3).map(l => parseFloat(l.price.toFixed(2)));
  
  return {
    supportLevels: topSupportLevels,
    resistanceLevels: topResistanceLevels
  };
};

/**
 * Perform comprehensive multi-timeframe analysis
 */
export const multiTimeframeAnalysis = (
  dailyPrices: HistoricalPrice[],
  hourlyPrices: HistoricalPrice[],
  weeklyPrices: HistoricalPrice[]
): {
  horizontalSupport: number;
  horizontalResistance: number;
  trendlineSupport: number;
  trendlineResistance: number;
  channelType: 'ascending' | 'descending' | 'horizontal' | 'undefined';
  confidenceScore: number;
  direction: 'bullish' | 'bearish' | 'neutral';
  predictedBreakoutCandles: number;
  priceTarget: number;
} => {
  // Default response structure
  const defaultResult = {
    horizontalSupport: 0,
    horizontalResistance: 0,
    trendlineSupport: 0,
    trendlineResistance: 0,
    channelType: 'undefined' as 'ascending' | 'descending' | 'horizontal' | 'undefined',
    confidenceScore: 0,
    direction: 'neutral' as 'bullish' | 'bearish' | 'neutral',
    predictedBreakoutCandles: 0,
    priceTarget: 0
  };
  
  // Check if we have enough data for analysis
  if (!dailyPrices.length || !hourlyPrices.length || !weeklyPrices.length) {
    console.warn('Not enough price data for multi-timeframe analysis');
    return defaultResult;
  }
  
  try {
    // Get current price
    const currentPrice = dailyPrices[0].close;
    
    // 1. Find horizontal levels from different timeframes
    const dailyLevels = findHorizontalLevels(dailyPrices);
    const weeklyLevels = findHorizontalLevels(weeklyPrices);
    
    // Combine and weight the levels (weekly levels are more significant)
    let combinedSupportLevels = [
      ...weeklyLevels.supportLevels.map(level => ({ level, weight: 2 })),
      ...dailyLevels.supportLevels.map(level => ({ level, weight: 1 }))
    ];
    
    let combinedResistanceLevels = [
      ...weeklyLevels.resistanceLevels.map(level => ({ level, weight: 2 })),
      ...dailyLevels.resistanceLevels.map(level => ({ level, weight: 1 }))
    ];
    
    // Merge similar levels
    const mergedSupports = mergeSimiLevels(combinedSupportLevels, currentPrice);
    const mergedResistances = mergeSimiLevels(combinedResistanceLevels, currentPrice);
    
    // Sort by price to find closest levels
    const sortedSupports = mergedSupports
      .filter(s => s.level < currentPrice)
      .sort((a, b) => b.level - a.level);
      
    const sortedResistances = mergedResistances
      .filter(r => r.level > currentPrice)
      .sort((a, b) => a.level - b.level);
    
    // Get closest support and resistance
    const horizontalSupport = sortedSupports.length > 0 ? 
      sortedSupports[0].level : currentPrice * 0.95;
      
    const horizontalResistance = sortedResistances.length > 0 ? 
      sortedResistances[0].level : currentPrice * 1.05;
    
    // 2. Identify trendlines from daily data
    const dailyTrendlines = identifyTrendlines(dailyPrices, true);
    const weeklyTrendlines = identifyTrendlines(weeklyPrices, true);
    
    // Combine trendlines from both timeframes, prioritizing weekly
    const combinedTrendlines = [
      ...weeklyTrendlines.map(tl => ({ ...tl, weight: 2 })),
      ...dailyTrendlines.map(tl => ({ ...tl, weight: 1 }))
    ];
    
    // Get strongest support and resistance trendlines
    let trendlineSupport = 0;
    let trendlineResistance = 0;
    
    // Find strongest support trendline
    const supportTrendlines = combinedTrendlines
      .filter(tl => tl.isSupport && tl.priceAtIndex(0) < currentPrice)
      .sort((a, b) => (b.strength * b.weight) - (a.strength * a.weight));
      
    if (supportTrendlines.length > 0) {
      trendlineSupport = parseFloat(supportTrendlines[0].priceAtIndex(0).toFixed(2));
    }
    
    // Find strongest resistance trendline
    const resistanceTrendlines = combinedTrendlines
      .filter(tl => !tl.isSupport && tl.priceAtIndex(0) > currentPrice)
      .sort((a, b) => (b.strength * b.weight) - (a.strength * a.weight));
      
    if (resistanceTrendlines.length > 0) {
      trendlineResistance = parseFloat(resistanceTrendlines[0].priceAtIndex(0).toFixed(2));
    }
    
    // 3. Determine channel type from daily data
    const channelInfo = identifyPriceChannel(dailyPrices);
    
    // 4. Calculate ATR for volatility
    const atr = calculateATR(dailyPrices);
    
    // 5. Predict direction and price target
    
    // Calculate channel width (distance between support and resistance)
    const horizontalChannelWidth = horizontalResistance - horizontalSupport;
    
    // Determine direction based on channel type and position within channel
    let direction: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    let confidenceScore = 50; // Base confidence
    
    if (channelInfo.channelType === 'ascending') {
      direction = 'bullish';
      confidenceScore += 15;
    } else if (channelInfo.channelType === 'descending') {
      direction = 'bearish';
      confidenceScore += 15;
    } else if (channelInfo.channelType === 'horizontal') {
      // For horizontal channels, determine direction by position within channel
      const midpoint = (horizontalSupport + horizontalResistance) / 2;
      const positionRatio = (currentPrice - horizontalSupport) / horizontalChannelWidth;
      
      if (positionRatio < 0.3) {
        direction = 'bullish'; // Close to support, likely to move up
        confidenceScore += 10;
      } else if (positionRatio > 0.7) {
        direction = 'bearish'; // Close to resistance, likely to move down
        confidenceScore += 10;
      }
    }
    
    // Adjust confidence based on trendline strength
    if (direction === 'bullish' && trendlineSupport > 0) {
      const supportTrendlineStrength = supportTrendlines[0]?.strength || 0;
      confidenceScore += supportTrendlineStrength * 20;
    } else if (direction === 'bearish' && trendlineResistance > 0) {
      const resistanceTrendlineStrength = resistanceTrendlines[0]?.strength || 0;
      confidenceScore += resistanceTrendlineStrength * 20;
    }
    
    // Estimate average number of candles before breakout (based on historical data)
    // This is a simplified approximation
    const predictedBreakoutCandles = Math.floor(10 + (channelInfo.strength * 15));
    
    // Calculate price target based on direction, channel width, and ATR
    let priceTarget = currentPrice;
    
    if (direction === 'bullish') {
      // Target is above resistance, distance is based on channel width and ATR
      priceTarget = horizontalResistance + (Math.max(atr * 2, horizontalChannelWidth * 0.5));
    } else if (direction === 'bearish') {
      // Target is below support, distance is based on channel width and ATR
      priceTarget = horizontalSupport - (Math.max(atr * 2, horizontalChannelWidth * 0.5));
    }
    
    // Cap confidence at 95%
    confidenceScore = Math.min(95, Math.max(10, confidenceScore));
    
    return {
      horizontalSupport: parseFloat(horizontalSupport.toFixed(2)),
      horizontalResistance: parseFloat(horizontalResistance.toFixed(2)),
      trendlineSupport: parseFloat(trendlineSupport.toFixed(2)),
      trendlineResistance: parseFloat(trendlineResistance.toFixed(2)),
      channelType: channelInfo.channelType,
      confidenceScore: parseFloat(confidenceScore.toFixed(0)),
      direction,
      predictedBreakoutCandles,
      priceTarget: parseFloat(priceTarget.toFixed(2))
    };
  } catch (error) {
    console.error('Error in multi-timeframe analysis:', error);
    return defaultResult;
  }
};

/**
 * Helper function to merge similar price levels
 */
const mergeSimiLevels = (
  levels: { level: number, weight: number }[], 
  currentPrice: number
): { level: number, weight: number }[] => {
  if (levels.length <= 1) return levels;
  
  const mergedLevels: { level: number, weight: number }[] = [];
  const sortedLevels = [...levels].sort((a, b) => a.level - b.level);
  
  let currentGroup = [sortedLevels[0]];
  
  for (let i = 1; i < sortedLevels.length; i++) {
    const currentLevel = sortedLevels[i].level;
    const previousLevel = currentGroup[currentGroup.length - 1].level;
    
    // If levels are within 1% of each other, group them
    if (Math.abs(currentLevel - previousLevel) / currentPrice < 0.01) {
      currentGroup.push(sortedLevels[i]);
    } else {
      // Process the current group
      if (currentGroup.length > 0) {
        const totalWeight = currentGroup.reduce((sum, item) => sum + item.weight, 0);
        const weightedLevel = currentGroup.reduce(
          (sum, item) => sum + (item.level * item.weight), 
          0
        ) / totalWeight;
        
        mergedLevels.push({
          level: parseFloat(weightedLevel.toFixed(2)),
          weight: totalWeight
        });
      }
      
      // Start a new group
      currentGroup = [sortedLevels[i]];
    }
  }
  
  // Process the last group
  if (currentGroup.length > 0) {
    const totalWeight = currentGroup.reduce((sum, item) => sum + item.weight, 0);
    const weightedLevel = currentGroup.reduce(
      (sum, item) => sum + (item.level * item.weight), 
      0
    ) / totalWeight;
    
    mergedLevels.push({
      level: parseFloat(weightedLevel.toFixed(2)),
      weight: totalWeight
    });
  }
  
  return mergedLevels;
};

