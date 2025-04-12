import { HistoricalPrice } from '../backtestTypes';

/**
 * Uses linear regression to find the slope of price data
 */
const calculateTrendSlope = (prices: HistoricalPrice[]): number => {
  const n = prices.length;
  if (n < 5) return 0;
  
  // Use closing prices for the calculation
  const xValues = Array.from({ length: n }, (_, i) => i);
  const yValues = prices.map(p => p.close);
  
  // Calculate means
  const xMean = xValues.reduce((sum, x) => sum + x, 0) / n;
  const yMean = yValues.reduce((sum, y) => sum + y, 0) / n;
  
  // Calculate slope using least squares method
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < n; i++) {
    numerator += (xValues[i] - xMean) * (yValues[i] - yMean);
    denominator += Math.pow(xValues[i] - xMean, 2);
  }
  
  return denominator !== 0 ? numerator / denominator : 0;
};

/**
 * Calculates the average true range (ATR) to determine volatility
 */
const calculateATR = (prices: HistoricalPrice[], period: number = 14): number => {
  if (prices.length < period + 1) return 0;
  
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
  if (trs.length < period) return trs.reduce((sum, tr) => sum + tr, 0) / trs.length;
  
  // Initialize ATR with simple average
  let atr = trs.slice(0, period).reduce((sum, tr) => sum + tr, 0) / period;
  
  // Calculate smoothed ATR
  for (let i = period; i < trs.length; i++) {
    atr = ((atr * (period - 1)) + trs[i]) / period;
  }
  
  return atr;
};

/**
 * Calculate channel boundaries by finding highs and lows
 */
const calculateChannelBoundaries = (prices: HistoricalPrice[]): { 
  upperBoundary: number[],
  lowerBoundary: number[],
  channelWidth: number
} => {
  if (prices.length < 5) {
    return { upperBoundary: [], lowerBoundary: [], channelWidth: 0 };
  }
  
  // Use rolling windows to identify local highs and lows
  const windowSize = Math.min(5, Math.floor(prices.length / 3));
  const upperPoints: number[] = [];
  const lowerPoints: number[] = [];
  
  for (let i = 0; i < prices.length - windowSize + 1; i++) {
    const window = prices.slice(i, i + windowSize);
    const maxHigh = Math.max(...window.map(p => p.high));
    const minLow = Math.min(...window.map(p => p.low));
    
    upperPoints.push(maxHigh);
    lowerPoints.push(minLow);
  }
  
  // Calculate the average channel width
  const channelWidth = upperPoints.reduce((sum, val, i) => sum + (upperPoints[i] - lowerPoints[i]), 0) / upperPoints.length;
  
  return {
    upperBoundary: upperPoints,
    lowerBoundary: lowerPoints,
    channelWidth
  };
};

/**
 * Determine channel strength based on how well prices respect the boundaries
 */
const calculateChannelStrength = (
  prices: HistoricalPrice[], 
  upperBoundary: number[], 
  lowerBoundary: number[]
): number => {
  if (prices.length < 5 || upperBoundary.length < 2 || lowerBoundary.length < 2) return 0;
  
  // Count how many candles respect the channel boundaries
  let touchingBoundaries = 0;
  const touchDistance = calculateATR(prices) * 0.5; // Half ATR distance considered a touch
  
  for (let i = 0; i < prices.length && i < upperBoundary.length; i++) {
    const distToUpper = Math.abs(prices[i].high - upperBoundary[i]);
    const distToLower = Math.abs(prices[i].low - lowerBoundary[i]);
    
    if (distToUpper <= touchDistance || distToLower <= touchDistance) {
      touchingBoundaries++;
    }
  }
  
  // Strength is proportion of candles that respect the boundaries
  return touchingBoundaries / Math.min(prices.length, upperBoundary.length);
};

/**
 * Identifies the type of price channel (ascending, descending, horizontal)
 * based on the price action.
 * 
 * @param prices Historical price data
 * @param higherTimeframePrices Optional higher timeframe price data for validation
 * @returns Object containing channel type, strength and trendline levels
 */
export const identifyPriceChannel = (
  prices: HistoricalPrice[],
  higherTimeframePrices?: HistoricalPrice[]
): { 
  channelType: 'ascending' | 'descending' | 'horizontal' | 'undefined'; 
  strength: number;
  trendlineSupport?: number;
  trendlineResistance?: number;
  establishedChannel?: boolean;
  touchPoints?: number;
} => {
  // CRITICAL: Require at least 7 candles for reliable channel identification
  if (!prices || prices.length < 7) {
    console.warn("Insufficient data for channel identification - minimum 7 candles required");
    return { channelType: 'undefined', strength: 0 };
  }
  
  // Sort prices oldest to newest for channel calculations
  const sortedPrices = [...prices].sort((a, b) => {
    const dateA = a.date instanceof Date ? a.date : new Date(a.date);
    const dateB = b.date instanceof Date ? b.date : new Date(b.date);
    return dateA.getTime() - dateB.getTime();
  });
  
  // Use linear regression to determine the trend line
  const pricePoints = sortedPrices.map((price, index) => ({
    x: index,
    y: price.close 
  }));
  
  // Get the trend slope
  const slope = calculateTrendSlope(sortedPrices);
  
  // Calculate atr for context
  const atr = calculateATR(sortedPrices);
  const avgPrice = sortedPrices.reduce((sum, p) => sum + p.close, 0) / sortedPrices.length;
  
  // Normalize slope relative to ATR and price level
  const normalizedSlope = slope / (atr / avgPrice) * 100;
  
  // Determine channel boundaries and strength
  const { upperBoundary, lowerBoundary, channelWidth } = calculateChannelBoundaries(sortedPrices);
  let strength = calculateChannelStrength(sortedPrices, upperBoundary, lowerBoundary);
  
  // Count touch points as a measure of channel reliability
  const touchDistance = atr * 0.5;
  let touchPoints = 0;
  for (let i = 0; i < sortedPrices.length && i < upperBoundary.length; i++) {
    const distToUpper = Math.abs(sortedPrices[i].high - upperBoundary[i]);
    const distToLower = Math.abs(sortedPrices[i].low - lowerBoundary[i]);
    
    if (distToUpper <= touchDistance || distToLower <= touchDistance) {
      touchPoints++;
    }
  }
  
  // Determine channel type based on normalized slope
  let channelType: 'ascending' | 'descending' | 'horizontal' | 'undefined' = 'undefined';
  
  if (Math.abs(normalizedSlope) < 0.5) {
    channelType = 'horizontal';
  } else if (normalizedSlope > 0.5) {
    channelType = 'ascending';
  } else if (normalizedSlope < -0.5) {
    channelType = 'descending';
  }
  
  // Calculate support and resistance trendlines for the current price
  const latestPrice = sortedPrices[sortedPrices.length - 1];
  let trendlineSupport: number | undefined;
  let trendlineResistance: number | undefined;
  
  if (upperBoundary.length > 0 && lowerBoundary.length > 0) {
    // Use the last values from the channel boundaries
    trendlineResistance = upperBoundary[upperBoundary.length - 1];
    trendlineSupport = lowerBoundary[lowerBoundary.length - 1];
  }

  // Check if this is an established channel (at least 7 candles and multiple touches)
  const establishedChannel = sortedPrices.length >= 7 && touchPoints >= 3;
  
  // Prioritize higher timeframe channels if available
  if (higherTimeframePrices && higherTimeframePrices.length >= 7) {
    const htfChannel = identifyChannelOnHigherTimeframe(higherTimeframePrices);
    
    // Adjust strength based on alignment with higher timeframe
    if (htfChannel.channelType === channelType) {
      // Significantly increase strength when channel types align with higher timeframe
      strength = strength * 1.5;
      
      // If higher timeframe has trendlines, use them as they are more significant
      if (htfChannel.trendlineSupport) {
        trendlineSupport = htfChannel.trendlineSupport;
      }
      
      if (htfChannel.trendlineResistance) {
        trendlineResistance = htfChannel.trendlineResistance;
      }
    } else if (htfChannel.channelType !== 'undefined') {
      // Decrease strength when channel types don't align with higher timeframe
      strength = strength * 0.6;
    }
    
    // If higher timeframe has an established channel, this is highly significant
    if (htfChannel.establishedChannel) {
      strength = strength * 1.25;
    }
  }
  
  // Cap strength at 1.0
  strength = Math.min(1.0, strength);
  
  console.log(`Channel analysis for ${sortedPrices[0].symbol || 'unknown'}: Type=${channelType}, Strength=${strength.toFixed(2)}, Established=${establishedChannel}, TouchPoints=${touchPoints}, Slope=${normalizedSlope.toFixed(2)}, Width=${channelWidth.toFixed(2)}`);
  
  return { 
    channelType, 
    strength,
    trendlineSupport,
    trendlineResistance,
    establishedChannel,
    touchPoints
  };
};

/**
 * Simplified version of identifyPriceChannel for higher timeframe analysis
 */
const identifyChannelOnHigherTimeframe = (
  prices: HistoricalPrice[]
): { 
  channelType: 'ascending' | 'descending' | 'horizontal' | 'undefined'; 
  strength: number;
  trendlineSupport?: number;
  trendlineResistance?: number;
  establishedChannel?: boolean;
} => {
  // Also require minimum 7 candles for higher timeframe channels
  if (!prices || prices.length < 7) {
    return { channelType: 'undefined', strength: 0 };
  }
  
  // Similar logic as identifyPriceChannel, but simplified
  const sortedPrices = [...prices].sort((a, b) => {
    const dateA = a.date instanceof Date ? a.date : new Date(a.date);
    const dateB = b.date instanceof Date ? b.date : new Date(b.date);
    return dateA.getTime() - dateB.getTime();
  });
  
  const slope = calculateTrendSlope(sortedPrices);
  const atr = calculateATR(sortedPrices);
  const avgPrice = sortedPrices.reduce((sum, p) => sum + p.close, 0) / sortedPrices.length;
  const normalizedSlope = slope / (atr / avgPrice) * 100;
  
  const { upperBoundary, lowerBoundary } = calculateChannelBoundaries(sortedPrices);
  const strength = calculateChannelStrength(sortedPrices, upperBoundary, lowerBoundary);
  
  // Count touch points for higher timeframe
  const touchDistance = atr * 0.5;
  let touchPoints = 0;
  for (let i = 0; i < sortedPrices.length && i < upperBoundary.length; i++) {
    const distToUpper = Math.abs(sortedPrices[i].high - upperBoundary[i]);
    const distToLower = Math.abs(sortedPrices[i].low - lowerBoundary[i]);
    
    if (distToUpper <= touchDistance || distToLower <= touchDistance) {
      touchPoints++;
    }
  }
  
  // Determine if this is an established channel in higher timeframe
  const establishedChannel = sortedPrices.length >= 7 && touchPoints >= 3;
  
  let channelType: 'ascending' | 'descending' | 'horizontal' | 'undefined' = 'undefined';
  
  if (Math.abs(normalizedSlope) < 0.5) {
    channelType = 'horizontal';
  } else if (normalizedSlope > 0.5) {
    channelType = 'ascending';
  } else if (normalizedSlope < -0.5) {
    channelType = 'descending';
  }
  
  // Calculate support and resistance trendlines
  let trendlineSupport: number | undefined;
  let trendlineResistance: number | undefined;
  
  if (upperBoundary.length > 0 && lowerBoundary.length > 0) {
    trendlineResistance = upperBoundary[upperBoundary.length - 1];
    trendlineSupport = lowerBoundary[lowerBoundary.length - 1];
  }
  
  return { 
    channelType, 
    strength,
    trendlineSupport,
    trendlineResistance,
    establishedChannel
  };
};

/**
 * Determines if a price action represents a breakout from a channel
 */
export const detectChannelBreakout = (
  prices: HistoricalPrice[],
  direction: 'bullish' | 'bearish',
  higherTimeframePrices?: HistoricalPrice[]
): {
  isBreakout: boolean;
  breakoutStrength: number;
  isHigherTimeframeBreakout: boolean;
} => {
  // Require at least 7 candles for reliable breakout detection
  if (!prices || prices.length < 7) {
    return { isBreakout: false, breakoutStrength: 0, isHigherTimeframeBreakout: false };
  }
  
  // Identify the price channel
  const channelInfo = identifyPriceChannel(prices, higherTimeframePrices);
  
  // Only consider established channels (with at least 7 candles and multiple touches)
  if (!channelInfo.establishedChannel) {
    return { isBreakout: false, breakoutStrength: 0, isHigherTimeframeBreakout: false };
  }
  
  // Detect breakout from higher timeframe channel
  let isHigherTimeframeBreakout = false;
  if (higherTimeframePrices && higherTimeframePrices.length >= 7) {
    const htfChannel = identifyChannelOnHigherTimeframe(higherTimeframePrices);
    if (htfChannel.establishedChannel) {
      // Check for breakout of higher timeframe channel
      const lastPrice = prices[0];
      const htfResistance = htfChannel.trendlineResistance || Number.MAX_VALUE;
      const htfSupport = htfChannel.trendlineSupport || 0;
      
      if (direction === 'bullish' && lastPrice.close > htfResistance) {
        isHigherTimeframeBreakout = true;
      } else if (direction === 'bearish' && lastPrice.close < htfSupport) {
        isHigherTimeframeBreakout = true;
      }
    }
  }
  
  // Sort prices oldest to newest for channel calculations
  const sortedPrices = [...prices].sort((a, b) => {
    const dateA = a.date instanceof Date ? a.date : new Date(a.date);
    const dateB = b.date instanceof Date ? b.date : new Date(b.date);
    return dateA.getTime() - dateB.getTime();
  });
  
  // Get most recent price
  const lastPrice = sortedPrices[sortedPrices.length - 1];
  
  // Get channel boundaries
  const { upperBoundary, lowerBoundary } = calculateChannelBoundaries(sortedPrices);
  const lastUpperBoundary = upperBoundary[upperBoundary.length - 1];
  const lastLowerBoundary = lowerBoundary[lowerBoundary.length - 1];
  
  // Calculate ATR for context
  const atr = calculateATR(sortedPrices);
  const breakoutThreshold = atr * 0.5;  // Use half ATR as breakout threshold
  
  let isBreakout = false;
  let breakoutStrength = 0;
  
  if (direction === 'bullish' && lastPrice.close > lastUpperBoundary) {
    // Bullish breakout above resistance
    isBreakout = true;
    breakoutStrength = (lastPrice.close - lastUpperBoundary) / breakoutThreshold;
  } else if (direction === 'bearish' && lastPrice.close < lastLowerBoundary) {
    // Bearish breakout below support
    isBreakout = true;
    breakoutStrength = (lastLowerBoundary - lastPrice.close) / breakoutThreshold;
  }
  
  // Higher timeframe breakouts are given more weight
  if (isHigherTimeframeBreakout) {
    breakoutStrength *= 1.5;
  }
  
  return {
    isBreakout,
    breakoutStrength,
    isHigherTimeframeBreakout
  };
};
