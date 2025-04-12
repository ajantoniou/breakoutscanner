
import { HistoricalPrice } from '../backtestTypes';

/**
 * Calculates how many candles it takes to reach the target price
 */
export const calculateCandlesToBreakout = (
  historicalPrices: HistoricalPrice[],
  entryPrice: number,
  targetPrice: number, 
  direction: 'bullish' | 'bearish'
): number => {
  // For bullish patterns, we look for the price to go up
  if (direction === 'bullish') {
    for (let i = 0; i < historicalPrices.length; i++) {
      if (historicalPrices[i].high >= targetPrice) {
        return i + 1; // +1 because we count from the first candle
      }
    }
  } 
  // For bearish patterns, we look for the price to go down
  else {
    for (let i = 0; i < historicalPrices.length; i++) {
      if (historicalPrices[i].low <= targetPrice) {
        return i + 1; // +1 because we count from the first candle
      }
    }
  }
  
  // If we don't reach the target price, return the number of candles
  return historicalPrices.length;
};

/**
 * Determines if a breakout occurred within a specific timeframe
 * @param historicalPrices Array of price data
 * @param targetPrice Price that needs to be reached for a breakout
 * @param direction Direction of the breakout (bullish or bearish)
 * @param maxDays Maximum number of days to check for breakout
 * @returns Object with breakout status and details
 */
export const analyzeBreakoutWithinPeriod = (
  historicalPrices: HistoricalPrice[],
  targetPrice: number,
  direction: 'bullish' | 'bearish',
  maxDays: number = 20
): { 
  occurred: boolean;
  daysToBreakout: number; 
  priceAtBreakout?: number;
  percentMove?: number;
} => {
  // Ensure we don't look beyond available data
  const daysToCheck = Math.min(maxDays, historicalPrices.length);
  
  // For bullish patterns, we look for the price to go up
  if (direction === 'bullish') {
    for (let i = 0; i < daysToCheck; i++) {
      if (historicalPrices[i].high >= targetPrice) {
        const percentMove = ((historicalPrices[i].high - historicalPrices[0].close) / 
          historicalPrices[0].close) * 100;
        
        return { 
          occurred: true, 
          daysToBreakout: i + 1,
          priceAtBreakout: historicalPrices[i].high,
          percentMove
        };
      }
    }
  } 
  // For bearish patterns, we look for the price to go down
  else {
    for (let i = 0; i < daysToCheck; i++) {
      if (historicalPrices[i].low <= targetPrice) {
        const percentMove = ((historicalPrices[0].close - historicalPrices[i].low) / 
          historicalPrices[0].close) * 100;
        
        return { 
          occurred: true, 
          daysToBreakout: i + 1,
          priceAtBreakout: historicalPrices[i].low,
          percentMove
        };
      }
    }
  }
  
  // If we don't reach the target price within maxDays
  return { occurred: false, daysToBreakout: maxDays };
};

/**
 * Analyzes long-term performance after a pattern forms
 * This is useful for backtesting with extended historical data (1-5 years)
 */
export const analyzeLongTermPerformance = (
  historicalPrices: HistoricalPrice[],
  entryPrice: number,
  direction: 'bullish' | 'bearish'
): {
  max1MonthReturn: number;
  max3MonthReturn: number;
  max6MonthReturn: number;
  max1YearReturn: number;
  drawdown: number;
} => {
  // Initialize return values
  let max1MonthReturn = 0;
  let max3MonthReturn = 0;
  let max6MonthReturn = 0;
  let max1YearReturn = 0;
  let maxDrawdown = 0;
  
  // Check if we have enough data
  if (historicalPrices.length < 20) {
    return { 
      max1MonthReturn: 0, 
      max3MonthReturn: 0, 
      max6MonthReturn: 0, 
      max1YearReturn: 0,
      drawdown: 0 
    };
  }
  
  // Approximate trading days for different periods
  const oneMonth = 21;
  const threeMonths = 63;
  const sixMonths = 126;
  const oneYear = 252;
  
  // Calculate returns for bullish patterns
  if (direction === 'bullish') {
    let peakPrice = entryPrice;
    let troughPrice = entryPrice;
    
    for (let i = 0; i < historicalPrices.length; i++) {
      const currentHigh = historicalPrices[i].high;
      const currentLow = historicalPrices[i].low;
      
      // Update peak price if we found a new high
      if (currentHigh > peakPrice) {
        peakPrice = currentHigh;
      }
      
      // Update trough price if we found a new low
      if (currentLow < troughPrice) {
        troughPrice = currentLow;
      }
      
      // Calculate current drawdown
      const currentDrawdown = (peakPrice - troughPrice) / peakPrice * 100;
      if (currentDrawdown > maxDrawdown) {
        maxDrawdown = currentDrawdown;
      }
      
      // Calculate return at this point
      const currentReturn = (currentHigh - entryPrice) / entryPrice * 100;
      
      // Update maximum returns for different time periods
      if (i < oneMonth && currentReturn > max1MonthReturn) {
        max1MonthReturn = currentReturn;
      }
      
      if (i < threeMonths && currentReturn > max3MonthReturn) {
        max3MonthReturn = currentReturn;
      }
      
      if (i < sixMonths && currentReturn > max6MonthReturn) {
        max6MonthReturn = currentReturn;
      }
      
      if (i < oneYear && currentReturn > max1YearReturn) {
        max1YearReturn = currentReturn;
      }
    }
  } 
  // Calculate returns for bearish patterns
  else {
    let peakPrice = entryPrice;
    let troughPrice = entryPrice;
    
    for (let i = 0; i < historicalPrices.length; i++) {
      const currentHigh = historicalPrices[i].high;
      const currentLow = historicalPrices[i].low;
      
      // Update peak price if we found a new high
      if (currentHigh > peakPrice) {
        peakPrice = currentHigh;
      }
      
      // Update trough price if we found a new low
      if (currentLow < troughPrice) {
        troughPrice = currentLow;
      }
      
      // Calculate current drawdown (for bearish patterns, this is upside risk)
      const currentDrawdown = (peakPrice - troughPrice) / troughPrice * 100;
      if (currentDrawdown > maxDrawdown) {
        maxDrawdown = currentDrawdown;
      }
      
      // Calculate return at this point (for bearish patterns, profit is when price goes down)
      const currentReturn = (entryPrice - currentLow) / entryPrice * 100;
      
      // Update maximum returns for different time periods
      if (i < oneMonth && currentReturn > max1MonthReturn) {
        max1MonthReturn = currentReturn;
      }
      
      if (i < threeMonths && currentReturn > max3MonthReturn) {
        max3MonthReturn = currentReturn;
      }
      
      if (i < sixMonths && currentReturn > max6MonthReturn) {
        max6MonthReturn = currentReturn;
      }
      
      if (i < oneYear && currentReturn > max1YearReturn) {
        max1YearReturn = currentReturn;
      }
    }
  }
  
  return {
    max1MonthReturn,
    max3MonthReturn,
    max6MonthReturn,
    max1YearReturn,
    drawdown: maxDrawdown
  };
};
