import { PatternData } from '@/services/types/patternTypes';
import { DataMetadata } from '@/services/api/marketData/dataService';

// Define Candle interface if it's not exported from patternTypes
interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Extend DataMetadata to include patternDetectionCount
interface ExtendedDataMetadata extends DataMetadata {
  patternDetectionCount?: number;
  lastPatternDetection?: string;
}

/**
 * Interface for breakout pattern data
 */
export interface BreakoutData extends PatternData {
  breakoutType: 'ascending' | 'descending';
  daysInChannel: number;
  volumeIncrease: number;
}

/**
 * Breakout pattern detector with timestamp tracking
 */
class BreakoutDetector {
  /**
   * Detect breakout patterns in candle data
   * @param symbol Stock symbol
   * @param candles Array of candles
   * @param timeframe Timeframe string
   * @param metadata Data metadata
   * @returns Array of detected patterns with metadata
   */
  detect(
    symbol: string,
    candles: Candle[],
    timeframe: string,
    metadata: DataMetadata
  ): { patterns: BreakoutData[], metadata: ExtendedDataMetadata } {
    // Implementation of the detect method
    const patterns = this.detectBreakout(symbol, candles, timeframe);
    
    // Update metadata with detection timestamp
    const updatedMetadata: ExtendedDataMetadata = {
      ...metadata,
      lastPatternDetection: new Date().toISOString(),
      patternDetectionCount: (metadata as ExtendedDataMetadata).patternDetectionCount 
        ? (metadata as ExtendedDataMetadata).patternDetectionCount! + patterns.length 
        : patterns.length
    };
    
    return { patterns, metadata: updatedMetadata };
  }

  /**
   * Detect breakout patterns in candle data
   * @param symbol Stock symbol
   * @param candles Array of candles
   * @param timeframe Timeframe string
   * @returns Array of detected breakout patterns
   */
  private detectBreakout(
    symbol: string,
    candles: Candle[],
    timeframe: string
  ): BreakoutData[] {
    if (!candles || candles.length < 20) {
      return [];
    }
    
    const results: BreakoutData[] = [];
    
    // Extract high and low prices
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    
    // Find resistance and support levels
    const resistanceLevel = this.findMostTouchedLevel(highs, 0.5); // 0.5% tolerance
    const supportLevel = this.findMostTouchedLevel(lows, 0.5);
    
    // Current price
    const currentPrice = candles[candles.length - 1].close;
    const previousPrice = candles[candles.length - 2].close;
    
    // Check for ascending breakout
    if (currentPrice > resistanceLevel && previousPrice <= resistanceLevel) {
      // Calculate confidence score
      const pricePercentageMove = (currentPrice - previousPrice) / previousPrice;
      const volumeIncrease = this.calculateVolumeIncrease(candles);
      const touchCount = highs.filter(h => Math.abs(h - resistanceLevel) / resistanceLevel < 0.005).length;
      const daysInChannel = this.calculateDaysInChannel(timeframe, touchCount);
      
      // Calculate risk/reward ratio
      const stopLoss = Math.min(...lows.slice(-10)) * 0.995; // 0.5% below recent low
      const targetPrice = currentPrice + (currentPrice - stopLoss) * 2; // 2:1 reward/risk
      const riskRewardRatio = (targetPrice - currentPrice) / (currentPrice - stopLoss);
      
      // Only add if risk/reward is favorable
      if (riskRewardRatio >= 1.5) {
        const direction = 'bullish';
        const entryPrice = currentPrice;
        
        results.push({
          id: `${symbol}-${timeframe}-${Date.now()}`,
          symbol,
          timeframe,
          patternType: 'breakout',
          direction,
          entryPrice,
          targetPrice,
          stopLoss,
          confidenceScore: this.calculateConfidenceScore(pricePercentageMove, volumeIncrease, timeframe, touchCount),
          createdAt: new Date().toISOString(),
          status: 'active',
          breakoutType: 'ascending',
          daysInChannel,
          volumeIncrease
        });
      }
    }
    
    // Check for descending breakout
    if (currentPrice < supportLevel && previousPrice >= supportLevel) {
      // Calculate confidence score
      const pricePercentageMove = (previousPrice - currentPrice) / previousPrice;
      const volumeIncrease = this.calculateVolumeIncrease(candles);
      const touchCount = lows.filter(l => Math.abs(l - supportLevel) / supportLevel < 0.005).length;
      const daysInChannel = this.calculateDaysInChannel(timeframe, touchCount);
      
      // Calculate risk/reward ratio
      const stopLoss = Math.max(...highs.slice(-10)) * 1.005; // 0.5% above recent high
      const targetPrice = currentPrice - (stopLoss - currentPrice) * 2; // 2:1 reward/risk
      const riskRewardRatio = (currentPrice - targetPrice) / (stopLoss - currentPrice);
      
      // Only add if risk/reward is favorable
      if (riskRewardRatio >= 1.5) {
        const direction = 'bearish';
        const entryPrice = currentPrice;
        
        results.push({
          id: `${symbol}-${timeframe}-${Date.now()}`,
          symbol,
          timeframe,
          patternType: 'breakout',
          direction,
          entryPrice,
          targetPrice,
          stopLoss,
          confidenceScore: this.calculateConfidenceScore(pricePercentageMove, volumeIncrease, timeframe, touchCount),
          createdAt: new Date().toISOString(),
          status: 'active',
          breakoutType: 'descending',
          daysInChannel,
          volumeIncrease
        });
      }
    }
    
    return results;
  }

  /**
   * Find the most touched price level in an array of prices
   * @param prices Array of prices
   * @param tolerance Percentage tolerance for considering a touch
   * @returns Most touched price level
   */
  private findMostTouchedLevel = (prices: number[], tolerance: number): number => {
    // Create bins of price levels
    const bins: { [key: number]: number } = {};
    
    // Group prices into bins based on tolerance
    for (const price of prices) {
      let foundBin = false;
      
      // Check if price fits in an existing bin
      for (const binPrice in bins) {
        const binPriceNum = parseFloat(binPrice);
        const toleranceAmount = binPriceNum * tolerance / 100;
        
        if (Math.abs(price - binPriceNum) <= toleranceAmount) {
          bins[binPriceNum]++;
          foundBin = true;
          break;
        }
      }
      
      // If no bin found, create a new one
      if (!foundBin) {
        bins[price] = 1;
      }
    }
    
    // Find bin with most touches
    let mostTouchedLevel = 0;
    let maxTouches = 0;
    
    for (const binPrice in bins) {
      if (bins[binPrice] > maxTouches) {
        maxTouches = bins[binPrice];
        mostTouchedLevel = parseFloat(binPrice);
      }
    }
    
    return mostTouchedLevel;
  };

  /**
   * Calculate slope of a line using linear regression
   * @param values Array of values
   * @returns Slope of the line
   */
  private calculateSlope = (values: number[]): number => {
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
   * Calculate value on a trendline at a specific point
   * @param values Array of values
   * @param point Point on the trendline
   * @returns Value at the point
   */
  private calculateTrendlineValue = (values: number[], point: number): number => {
    const slope = this.calculateSlope(values);
    const n = values.length;
    
    // Calculate y-intercept
    let sumX = 0;
    let sumY = 0;
    
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
    }
    
    const meanX = sumX / n;
    const meanY = sumY / n;
    
    const yIntercept = meanY - (slope * meanX);
    
    // Calculate value at point
    return (slope * point) + yIntercept;
  };

  /**
   * Calculate average volume over a range of candles
   * @param candles Array of candles
   * @param start Start index
   * @param end End index
   * @returns Average volume
   */
  private calculateAverageVolume = (candles: Candle[], start: number, end: number): number => {
    let sum = 0;
    let count = 0;
    
    for (let i = start; i <= end; i++) {
      if (candles[i].volume) {
        sum += candles[i].volume;
        count++;
      }
    }
    
    return count === 0 ? 0 : sum / count;
  };

  /**
   * Calculate days in channel based on timeframe and number of candles
   * @param timeframe Timeframe string
   * @param candles Number of candles
   * @returns Days in channel
   */
  private calculateDaysInChannel = (timeframe: string, candles: number): number => {
    switch (timeframe) {
      case '1m':
        return candles / 1440; // 1440 minutes in a day
      case '5m':
        return candles / 288; // 288 5-minute candles in a day
      case '15m':
        return candles / 96; // 96 15-minute candles in a day
      case '30m':
        return candles / 48; // 48 30-minute candles in a day
      case '1h':
        return candles / 24; // 24 hours in a day
      case '4h':
        return candles / 6; // 6 4-hour candles in a day
      case '1d':
        return candles; // 1 day per candle
      case '1w':
        return candles * 7; // 7 days per week
      default:
        return candles;
    }
  };

  /**
   * Get weight for timeframe in confidence calculation
   * @param timeframe Timeframe string
   * @returns Weight value
   */
  private getTimeframeWeight = (timeframe: string): number => {
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

  private calculateVolumeIncrease = (candles: Candle[]): number => {
    // Implementation of calculateVolumeIncrease method
    return 0; // Placeholder return, actual implementation needed
  };

  private calculateConfidenceScore = (pricePercentageMove: number, volumeIncrease: number, timeframe: string, touchCount: number): number => {
    // Implementation of calculateConfidenceScore method
    return 0; // Placeholder return, actual implementation needed
  };
}

// Create an instance of the detector
const breakoutDetector = new BreakoutDetector();

// Add named export function that matches what apiService.ts is importing
export const detectBreakout = (
  symbol: string,
  candles: Candle[],
  timeframe: string,
  metadata: DataMetadata
): BreakoutData[] => {
  const result = breakoutDetector.detect(symbol, candles, timeframe, metadata);
  return result.patterns;
};

// Keep the default export for backward compatibility
export default breakoutDetector;
