/**
 * Pattern detection for Double Top pattern
 */

import { PriceDataPoint } from './doubleBottomDetector';

export const detectDoubleTop = (priceData: PriceDataPoint[]): boolean => {
  // Check for two highs at approximately the same price level
  // with a lower point between them
  try {
    const highs = priceData.map(data => data.high);
    const maxHighValue = Math.max(...highs);
    
    // Find the position of potential tops (highest points)
    const potentialTops = highs
      .map((high, index) => ({ high, index }))
      .filter(item => item.high > maxHighValue * 0.97) // Allow some tolerance
      .sort((a, b) => b.high - a.high);
    
    // Need at least 2 tops that are separated by some distance
    if (potentialTops.length < 2) return false;
    
    // Get the two highest points
    const firstTopIndex = potentialTops[0].index;
    
    // Find a second top that is at least 5 bars away
    const secondTop = potentialTops.find(item => 
      Math.abs(item.index - firstTopIndex) >= 5
    );
    
    if (!secondTop) return false;
    
    const secondTopIndex = secondTop.index;
    
    // Check if there's a valley between these two tops
    const middleSection = priceData.slice(
      Math.min(firstTopIndex, secondTopIndex) + 1,
      Math.max(firstTopIndex, secondTopIndex)
    );
    
    if (middleSection.length < 3) return false;
    
    const middleLow = Math.min(...middleSection.map(data => data.low));
    const highestOfTops = Math.max(
      priceData[firstTopIndex].high, 
      priceData[secondTopIndex].high
    );
    
    // The middle valley should be at least 3% lower than the tops
    if (middleLow > highestOfTops * 0.97) return false;
    
    // Check if the price is now moving down after the second top
    const mostRecentIndex = Math.min(priceData.length - 1, Math.max(firstTopIndex, secondTopIndex) + 3);
    const recentClose = priceData[mostRecentIndex].close;
    
    return recentClose < highestOfTops * 0.99;
  } catch (error) {
    console.error('Error detecting double top:', error);
    return false;
  }
};
