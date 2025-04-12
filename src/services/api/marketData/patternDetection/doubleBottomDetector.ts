/**
 * Pattern detection for Double Bottom pattern
 */

// Define a proper type for price data
export interface PriceDataPoint {
  date: Date | string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export const detectDoubleBottom = (priceData: PriceDataPoint[]): boolean => {
  // Check for two lows at approximately the same price level
  // with a higher point between them
  try {
    const lows = priceData.map(data => data.low);
    const minLowValue = Math.min(...lows);
    
    // Find the position of potential bottoms (lowest points)
    const potentialBottoms = lows
      .map((low, index) => ({ low, index }))
      .filter(item => item.low < minLowValue * 1.03) // Allow some tolerance
      .sort((a, b) => a.low - b.low);
    
    // Need at least 2 bottoms that are separated by some distance
    if (potentialBottoms.length < 2) return false;
    
    // Get the two lowest points
    const firstBottomIndex = potentialBottoms[0].index;
    
    // Find a second bottom that is at least 5 bars away
    const secondBottom = potentialBottoms.find(item => 
      Math.abs(item.index - firstBottomIndex) >= 5
    );
    
    if (!secondBottom) return false;
    
    const secondBottomIndex = secondBottom.index;
    
    // Check if there's a peak between these two bottoms
    const middleSection = priceData.slice(
      Math.min(firstBottomIndex, secondBottomIndex) + 1,
      Math.max(firstBottomIndex, secondBottomIndex)
    );
    
    if (middleSection.length < 3) return false;
    
    const middleHigh = Math.max(...middleSection.map(data => data.high));
    const lowestOfBottoms = Math.min(
      priceData[firstBottomIndex].low, 
      priceData[secondBottomIndex].low
    );
    
    // The middle peak should be at least 3% higher than the bottoms
    if (middleHigh < lowestOfBottoms * 1.03) return false;
    
    // Check if the price is now moving up after the second bottom
    const mostRecentIndex = Math.min(priceData.length - 1, Math.max(firstBottomIndex, secondBottomIndex) + 3);
    const recentClose = priceData[mostRecentIndex].close;
    
    return recentClose > lowestOfBottoms * 1.01;
  } catch (error) {
    console.error('Error detecting double bottom:', error);
    return false;
  }
};
