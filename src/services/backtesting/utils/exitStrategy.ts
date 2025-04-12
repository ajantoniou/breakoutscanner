import { OHLCV, calculateEMA, calculateATR } from './technicalIndicators';
import { HistoricalPrice } from '../backtestTypes';

/**
 * Calculates target price based on ATR, next resistance level and average candles to breakout
 * Uses higher timeframe channels for target calculation to improve accuracy
 * 
 * @param entryPrice The price at which the trade was entered
 * @param candles Historical price candles
 * @param nextResistance The next resistance level after breakout
 * @param avgCandlesToBreakout Average number of candles to breakout
 * @param higherTimeframeCandles Optional higher timeframe candles for more accurate targets
 * @returns Calculated target price
 */
export function calculateTargetPrice(
  entryPrice: number,
  candles: OHLCV[],
  nextResistance: number,
  avgCandlesToBreakout: number,
  higherTimeframeCandles?: OHLCV[]
): number {
  // Calculate ATR based on the last 14 candles
  const atrPeriod = 14;
  
  // Convert OHLCV to HistoricalPrice for ATR calculation
  const historicalPrices: HistoricalPrice[] = candles.slice(-atrPeriod).map(candle => ({
    date: new Date(candle.timestamp || Date.now()),
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume || 0
  }));
  
  const atr = calculateATR(historicalPrices, atrPeriod);
  
  // HIGHER TIMEFRAME ANALYSIS
  // If higher timeframe data is available, use it for target calculation
  let higherTfTarget = 0;
  let higherTfWeight = 0;
  
  if (higherTimeframeCandles && higherTimeframeCandles.length >= 20) {
    // Convert higher timeframe candles to HistoricalPrice format
    const htfHistorical: HistoricalPrice[] = higherTimeframeCandles.slice(-20).map(candle => ({
      date: new Date(candle.timestamp || Date.now()),
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume || 0
    }));
    
    // Find significant resistance levels from higher timeframe
    const htfLevels = findSignificantLevels(htfHistorical);
    const htfResistanceLevels = htfLevels.resistance
      .filter(level => level > entryPrice)
      .sort((a, b) => a - b);
    
    if (htfResistanceLevels.length > 0) {
      // Primary target: next significant resistance
      // Secondary target: following resistance if available
      higherTfTarget = htfResistanceLevels[0];
      
      // If we have a second resistance level, adjust target to be more ambitious
      if (htfResistanceLevels.length > 1) {
        higherTfTarget = (htfResistanceLevels[0] * 0.7) + (htfResistanceLevels[1] * 0.3);
      }
      
      // Calculate range from entry to target for percentage evaluation
      const entryToTargetPercent = ((higherTfTarget - entryPrice) / entryPrice) * 100;
      
      // Ensure target is substantial enough (minimum 5% move)
      if (entryToTargetPercent < 5) {
        // If target is too close, use the next resistance or project further
        if (htfResistanceLevels.length > 1) {
          higherTfTarget = htfResistanceLevels[1];
        } else {
          // Project a minimum 5% target if no suitable resistance found
          higherTfTarget = entryPrice * 1.05;
        }
      }
      
      higherTfWeight = 3.0; // Higher timeframe targets have stronger weight
    }
  }
  
  // Calculate regular price targets from the trading timeframe
  const levels = findSignificantLevels(
    candles.map(c => ({
      date: new Date(c.timestamp || Date.now()),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume || 0
    }))
  );
  
  const nextRegularResistances = levels.resistance
    .filter(level => level > entryPrice)
    .sort((a, b) => a - b);
  
  let regularTarget = 0;
  
  if (nextRegularResistances.length > 0) {
    regularTarget = nextRegularResistances[0];
    
    // Check if target is meaningful (minimum 5% move)
    const entryToTargetPercent = ((regularTarget - entryPrice) / entryPrice) * 100;
    
    if (entryToTargetPercent < 5 && nextRegularResistances.length > 1) {
      // Use next resistance if available and first is too close
      regularTarget = nextRegularResistances[1];
    }
  } else {
    // If no resistance found, use ATR projection
    regularTarget = entryPrice + (atr * 5); // 5x ATR for significant moves
  }
  
  // Check if user provided a next resistance
  let externalTarget = 0;
  if (nextResistance > entryPrice) {
    externalTarget = nextResistance;
  }
  
  // Combine targets based on their reliability and availability
  let finalTarget = 0;
  let totalWeight = 0;
  
  if (higherTfTarget > 0) {
    finalTarget += higherTfTarget * higherTfWeight;
    totalWeight += higherTfWeight;
  }
  
  if (regularTarget > 0) {
    finalTarget += regularTarget * 1.0;
    totalWeight += 1.0;
  }
  
  if (externalTarget > 0) {
    finalTarget += externalTarget * 1.0;
    totalWeight += 1.0;
  }
  
  // Calculate weighted average of all available targets
  if (totalWeight > 0) {
    finalTarget = finalTarget / totalWeight;
  } else {
    // Fallback if no targets are available (minimum 5% target)
    finalTarget = entryPrice * 1.05;
  }
  
  // Ensure minimum 5% target
  const minTarget = entryPrice * 1.05;
  return Math.max(finalTarget, minTarget);
}

/**
 * Find significant support and resistance levels from price data
 */
function findSignificantLevels(prices: HistoricalPrice[]): { support: number[], resistance: number[] } {
  const support: number[] = [];
  const resistance: number[] = [];
  
  // Threshold for price proximity (0.5%)
  const proximityThreshold = 0.005;
  
  // Identify potential support/resistance levels
  for (let i = 5; i < prices.length - 5; i++) {
    // Check for potential support (local low)
    if (prices[i].low <= prices[i-1].low && 
        prices[i].low <= prices[i-2].low &&
        prices[i].low <= prices[i+1].low && 
        prices[i].low <= prices[i+2].low) {
      
      // Avoid adding duplicate levels
      const isDuplicate = support.some(level => 
        Math.abs(level - prices[i].low) / level < proximityThreshold
      );
      
      if (!isDuplicate) {
        support.push(prices[i].low);
      }
    }
    
    // Check for potential resistance (local high)
    if (prices[i].high >= prices[i-1].high && 
        prices[i].high >= prices[i-2].high &&
        prices[i].high >= prices[i+1].high && 
        prices[i].high >= prices[i+2].high) {
      
      // Avoid adding duplicate levels
      const isDuplicate = resistance.some(level => 
        Math.abs(level - prices[i].high) / level < proximityThreshold
      );
      
      if (!isDuplicate) {
        resistance.push(prices[i].high);
      }
    }
  }
  
  return { support, resistance };
}

/**
 * Finds the next resistance level above current price
 * @param price Current price
 * @param resistanceLevels Array of known resistance levels
 * @returns Next resistance level
 */
export function findNextResistanceLevel(price: number, resistanceLevels: number[]): number {
  // Sort resistance levels
  const sortedLevels = [...resistanceLevels].sort((a, b) => a - b);
  
  // Find first level above current price
  const nextLevel = sortedLevels.find(level => level > price);
  
  // If no higher resistance is found, estimate one based on price and ATR
  if (!nextLevel) {
    return price * 1.1; // Default 10% above if no resistance found
  }
  
  return nextLevel;
}

/**
 * Determines if a trade should be exited based on technical analysis
 * Uses support/resistance levels, trendlines, and EMAs for exit decisions
 * Implements the principle that broken resistance becomes support
 *
 * @param currentCandle Current price candle
 * @param historicalCandles Historical price candles
 * @param entryPrice Price at which the trade was entered
 * @param entryTime Time at which the trade was entered
 * @param isLong Whether this is a long trade
 * @param avgCandlesToBreakout Average number of candles to breakout from backtesting
 * @returns Whether the trade should be exited
 */
export function shouldExitTrade(
  currentCandle: OHLCV,
  historicalCandles: OHLCV[],
  entryPrice: number,
  entryTime: number,
  isLong: boolean,
  avgCandlesToBreakout: number = 3.87 // Default from current backtest results
): boolean {
  if (!currentCandle || !historicalCandles || historicalCandles.length < 20) {
    return false; // Insufficient data
  }
  
  // Find entry candle index
  const entryIndex = historicalCandles.findIndex(candle => candle.timestamp === entryTime);
  if (entryIndex < 0) return false;
  
  // Get post-entry candles
  const postEntryCandles = historicalCandles.slice(entryIndex);
  if (postEntryCandles.length < 2) return false; // Need at least 2 candles after entry
  
  // Convert candles to historical price format for calculations
  const historicalPrices = historicalCandles.map(candle => ({
    date: new Date(candle.timestamp || Date.now()),
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume || 0
  }));
  
  // Calculate key technical levels
  const levels = findSignificantLevels(historicalPrices);
  
  // Calculate EMA values
  const ema7Prices = calculateEMA(historicalCandles.map(c => c.close), 7);
  const ema20Prices = calculateEMA(historicalCandles.map(c => c.close), 20);
  const ema50Prices = calculateEMA(historicalCandles.map(c => c.close), 50);
  const ema100Prices = calculateEMA(historicalCandles.map(c => c.close), 100);
  const ema200Prices = calculateEMA(historicalCandles.map(c => c.close), 200);
  
  const currentEma7 = ema7Prices[ema7Prices.length - 1];
  const currentEma20 = ema20Prices[ema20Prices.length - 1];
  const currentEma50 = ema50Prices[ema50Prices.length - 1];
  const currentEma100 = ema100Prices[ema100Prices.length - 1];
  const currentEma200 = ema200Prices[ema200Prices.length - 1];
  
  // Find the key levels (support or resistance) that were broken at entry
  // These will become the new support/resistance for our exit decision
  const brokenLevel = findBrokenLevelAtEntry(
    historicalCandles[entryIndex],
    historicalCandles.slice(0, entryIndex),
    levels,
    isLong
  );
  
  // NEW: Identify which technical levels have been most significant historically
  // This helps prioritize the most relevant support/resistance levels for this specific stock
  const significantLevels = identifySignificantLevels(
    historicalCandles.slice(0, entryIndex), // Use pre-entry data to identify significant levels
    [
      { type: 'ema7', value: currentEma7 },
      { type: 'ema20', value: currentEma20 },
      { type: 'ema50', value: currentEma50 },
      { type: 'ema100', value: currentEma100 },
      { type: 'ema200', value: currentEma200 },
      ...levels.support.map(level => ({ type: 'support', value: level })),
      ...levels.resistance.map(level => ({ type: 'resistance', value: level })),
      ...(brokenLevel ? [{ type: 'brokenLevel', value: brokenLevel }] : [])
    ],
    isLong
  );
  
  // For long trades, we look for price falling below key support levels
  if (isLong) {
    // Check the most significant levels first (in order of historical importance)
    for (const level of significantLevels) {
      // Skip levels that are above current price (not relevant as support)
      if (level.value > currentCandle.close) continue;
      
      const buffer = level.type.startsWith('ema') ? 0.01 : 0.005; // 1% buffer for EMAs, 0.5% for price levels
      
      // Check if price has broken below this significant level
      if (currentCandle.close < level.value * (1 - buffer)) {
        // Confirm with volume and candle pattern for more reliable exit
        const isConfirmed = 
          // Higher volume than previous candle
          currentCandle.volume > historicalCandles[historicalCandles.indexOf(currentCandle) - 1].volume &&
          // Strong bearish candle (red candle with substantial body)
          (currentCandle.open - currentCandle.close) > (currentCandle.high - currentCandle.low) * 0.4;
        
        // For the most significant levels (top 3), we require less confirmation
        const isHighSignificance = significantLevels.indexOf(level) < 3;
        
        if (isConfirmed || isHighSignificance) {
          return true; // Exit when significant support is broken
        }
      }
    }
    
    // Special check for broken resistance that became support (highest priority)
    if (brokenLevel && currentCandle.close < brokenLevel * 0.99) { // 1% buffer
      return true; // Exit when broken resistance (now support) is broken
    }
  } 
  // For short trades (reverse logic)
  else {
    // Check the most significant levels first (in order of historical importance)
    for (const level of significantLevels) {
      // Skip levels that are below current price (not relevant as resistance)
      if (level.value < currentCandle.close) continue;
      
      const buffer = level.type.startsWith('ema') ? 0.01 : 0.005; // 1% buffer for EMAs, 0.5% for price levels
      
      // Check if price has broken above this significant level
      if (currentCandle.close > level.value * (1 + buffer)) {
        // Confirm with volume and candle pattern for more reliable exit
        const isConfirmed = 
          // Higher volume than previous candle
          currentCandle.volume > historicalCandles[historicalCandles.indexOf(currentCandle) - 1].volume &&
          // Strong bullish candle (green candle with substantial body)
          (currentCandle.close - currentCandle.open) > (currentCandle.high - currentCandle.low) * 0.4;
        
        // For the most significant levels (top 3), we require less confirmation
        const isHighSignificance = significantLevels.indexOf(level) < 3;
        
        if (isConfirmed || isHighSignificance) {
          return true; // Exit when significant resistance is broken
        }
      }
    }
    
    // Special check for broken support that became resistance (highest priority)
    if (brokenLevel && currentCandle.close > brokenLevel * 1.01) { // 1% buffer
      return true; // Exit when broken support (now resistance) is broken
    }
  }
  
  // Safeguard: Exit after reasonable profit has been taken or max holding period reached
  const currentIndex = historicalCandles.indexOf(currentCandle);
  const holdingPeriod = currentIndex - entryIndex;
  const maxHoldingPeriod = Math.max(20, Math.round(avgCandlesToBreakout * 6)); // Cap at reasonable period
  
  if (holdingPeriod >= maxHoldingPeriod) {
    return true; // Exit after maximum holding period
  }
  
  // Calculate profit percentage
  const profitPercent = isLong ? 
    ((currentCandle.close - entryPrice) / entryPrice) * 100 :
    ((entryPrice - currentCandle.close) / entryPrice) * 100;
  
  // Exit after significant profit (15%+) but only if showing reversal signs
  if (profitPercent > 15) {
    // Check for reversal candle pattern
    const prevCandle = historicalCandles[currentIndex - 1];
    const isReversalCandle = isLong ?
      (currentCandle.close < currentCandle.open && 
       currentCandle.high - currentCandle.close > (currentCandle.high - currentCandle.low) * 0.5) :
      (currentCandle.close > currentCandle.open && 
       currentCandle.close - currentCandle.low > (currentCandle.high - currentCandle.low) * 0.5);
    
    if (isReversalCandle) {
      return true; // Exit on reversal signs after large profit
    }
  }
  
  // Default to staying in the trade
  return false;
}

/**
 * Finds the key level (support or resistance) that was broken at entry
 * @param entryCandle The candle at which entry occurred
 * @param priorCandles Candles before entry
 * @param levels Support and resistance levels
 * @param isLong Whether this is a long trade
 * @returns The broken level that should become new support/resistance
 */
function findBrokenLevelAtEntry(
  entryCandle: OHLCV,
  priorCandles: OHLCV[],
  levels: { support: number[], resistance: number[] },
  isLong: boolean
): number | null {
  if (!entryCandle || !priorCandles || priorCandles.length === 0) return null;
  
  // For long trades, find broken resistance
  if (isLong) {
    // Find resistances that were just broken (close above resistance)
    const brokenResistances = levels.resistance
      .filter(level => {
        // Check if recent candles were below this level
        const wasBelowRecently = priorCandles.slice(-3).some(candle => candle.close < level);
        // Check if we closed above at entry
        const brokeAbove = entryCandle.close > level;
        
        return wasBelowRecently && brokeAbove;
      })
      .sort((a, b) => b - a); // Descending
    
    return brokenResistances.length > 0 ? brokenResistances[0] : null;
  } 
  // For short trades, find broken support
  else {
    // Find supports that were just broken (close below support)
    const brokenSupports = levels.support
      .filter(level => {
        // Check if recent candles were above this level
        const wasAboveRecently = priorCandles.slice(-3).some(candle => candle.close > level);
        // Check if we closed below at entry
        const brokeBelow = entryCandle.close < level;
        
        return wasAboveRecently && brokeBelow;
      })
      .sort((a, b) => a - b); // Ascending
    
    return brokenSupports.length > 0 ? brokenSupports[0] : null;
  }
}

/**
 * Identifies key trendlines in the price chart
 * @param candles Historical candles
 * @param isLong Whether to look for bullish or bearish trendlines
 * @returns Array of trendlines with type and value function
 */
export function findTrendlines(
  candles: OHLCV[],
  isLong: boolean
): Array<{ 
  type: 'horizontal' | 'diagonal' | 'ema7' | 'ema50' | 'ema100',
  value: number | ((timestamp: number) => number)
}> {
  // Basic implementation - can be expanded with more sophisticated trendline detection
  const trendlines = [];
  
  // Add EMA trendlines
  const closes = candles.map(c => c.close);
  const ema7Values = calculateEMA(closes, 7);
  const ema50Values = calculateEMA(closes, 50);
  const ema100Values = calculateEMA(closes, 100);
  
  // Current EMA values
  const currentEma7 = ema7Values[ema7Values.length - 1];
  const currentEma50 = ema50Values[ema50Values.length - 1];
  const currentEma100 = ema100Values[ema100Values.length - 1];
  
  // Add EMA trendlines if they have meaningful values
  if (currentEma7) {
    trendlines.push({
      type: 'ema7',
      value: currentEma7
    });
  }
  
  if (currentEma50) {
    trendlines.push({
      type: 'ema50',
      value: currentEma50
    });
  }
  
  if (currentEma100) {
    trendlines.push({
      type: 'ema100',
      value: currentEma100
    });
  }
  
  // Add horizontal support/resistance
  const prices = candles.map(c => ({
    date: new Date(c.timestamp || Date.now()),
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume || 0
  }));
  
  const levels = findSignificantLevels(prices);
  const currentPrice = candles[candles.length - 1].close;
  
  // Add nearest support level for long trades
  if (isLong) {
    const supports = levels.support
      .filter(level => level < currentPrice)
      .sort((a, b) => b - a); // Descending order
    
    if (supports.length > 0) {
      trendlines.push({
        type: 'horizontal',
        value: supports[0]
      });
    }
  } 
  // Add nearest resistance level for short trades  
  else {
    const resistances = levels.resistance
      .filter(level => level > currentPrice)
      .sort((a, b) => a - b); // Ascending order
    
    if (resistances.length > 0) {
      trendlines.push({
        type: 'horizontal',
        value: resistances[0]
      });
    }
  }
  
  return trendlines;
}

/**
 * Identifies which technical levels (EMAs, horizontal support/resistance) have been 
 * most significant for this specific stock based on historical data.
 * Returns levels sorted by their historical significance (most significant first).
 * 
 * @param historicalCandles Historical price candles
 * @param levels Array of technical levels to evaluate
 * @param isLong Whether this is a long trade
 * @returns Array of levels sorted by significance
 */
function identifySignificantLevels(
  historicalCandles: OHLCV[],
  levels: Array<{ type: string, value: number }>,
  isLong: boolean
): Array<{ type: string, value: number, significance?: number }> {
  // Skip if insufficient data
  if (!historicalCandles || historicalCandles.length < 20) {
    return levels.filter(l => l.value > 0);
  }
  
  // Calculate significance scores for each level
  const evaluatedLevels = levels
    .filter(level => level.value > 0) // Filter out undefined/zero values
    .map(level => {
      // Count touches & respects of this level
      const { touches, respects } = countLevelTouchesAndRespects(
        historicalCandles,
        level.value,
        isLong
      );
      
      // Calculate significance score based on touches and respects
      // Levels that have been respected multiple times are more significant
      const respectRate = touches > 0 ? respects / touches : 0;
      
      // Base significance on number of touches and respect rate
      let significance = touches * (0.4 + (respectRate * 0.6));
      
      // Boost significance for certain level types
      if (level.type === 'brokenLevel') {
        // Recently broken levels are highly significant for the current trade
        significance *= 1.5;
      } else if (level.type === 'ema50' || level.type === 'ema200') {
        // Major EMAs are often more significant
        significance *= 1.2;
      }
      
      return {
        ...level,
        significance
      };
    });
  
  // Sort levels by significance (most significant first)
  return evaluatedLevels.sort((a, b) => 
    (b.significance || 0) - (a.significance || 0)
  );
}

/**
 * Counts how many times price has touched a specific level and
 * how many times it respected that level (bounced off it).
 * This helps determine which levels are most significant.
 * 
 * @param candles Historical price candles
 * @param level Price level to evaluate
 * @param isLong Whether we're evaluating support (long) or resistance (short)
 * @returns Count of touches and respects
 */
function countLevelTouchesAndRespects(
  candles: OHLCV[],
  level: number,
  isLong: boolean
): { touches: number, respects: number } {
  let touches = 0;
  let respects = 0;
  
  // Proximity threshold for considering a price "touching" the level
  const proximityThreshold = level * 0.005; // 0.5% of level
  
  // For EMAs, use a wider threshold since they're moving levels
  const isEmaLevel = typeof level === 'number' && !isNaN(level);
  const threshold = isEmaLevel ? proximityThreshold * 2 : proximityThreshold;
  
  // Analyze each candle for touches and respects
  for (let i = 1; i < candles.length - 1; i++) {
    const candle = candles[i];
    const nextCandle = candles[i + 1];
    
    // For support levels (long trades)
    if (isLong) {
      // Check if price touched the support level
      const touchedSupport = Math.abs(candle.low - level) <= threshold;
      
      if (touchedSupport) {
        touches++;
        
        // Check if price respected the support (bounced up)
        if (nextCandle.close > candle.low && nextCandle.close > level) {
          respects++;
        }
      }
    } 
    // For resistance levels (short trades)
    else {
      // Check if price touched the resistance level
      const touchedResistance = Math.abs(candle.high - level) <= threshold;
      
      if (touchedResistance) {
        touches++;
        
        // Check if price respected the resistance (bounced down)
        if (nextCandle.close < candle.high && nextCandle.close < level) {
          respects++;
        }
      }
    }
  }
  
  return { touches, respects };
} 