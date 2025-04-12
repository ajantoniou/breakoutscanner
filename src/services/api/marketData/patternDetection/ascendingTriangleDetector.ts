import { Candle, PatternData } from '@/services/types/patternTypes';
import { DataMetadata } from '@/services/api/marketData/dataService';

/**
 * Ascending Triangle pattern detector with timestamp tracking
 */
class AscendingTriangleDetector {
  /**
   * Detect Ascending Triangle patterns in candle data
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
  ): { patterns: PatternData[], metadata: DataMetadata } {
    if (candles.length < 20) {
      return { 
        patterns: [], 
        metadata: {
          ...metadata,
          source: 'insufficient_data'
        } 
      };
    }

    const patterns: PatternData[] = [];
    
    // Look for ascending triangle pattern
    // Ascending triangle consists of a flat resistance (top) and rising support (bottom)
    
    // We need at least 20 candles to identify a pattern
    for (let i = 20; i < candles.length; i++) {
      const patternCandles = candles.slice(i - 20, i);
      
      // Check for flat resistance
      const hasResistance = this.hasFlatResistance(patternCandles);
      if (!hasResistance) continue;
      
      // Check for rising support
      const hasRisingSupport = this.hasRisingSupport(patternCandles);
      if (!hasRisingSupport) continue;
      
      // Calculate pattern parameters
      const resistanceLevel = this.calculateResistanceLevel(patternCandles);
      const entry = resistanceLevel * 1.01; // Entry just above resistance
      const patternHeight = resistanceLevel - patternCandles[patternCandles.length - 1].low;
      const target = entry + patternHeight; // Target is pattern height projected from entry
      const stopLoss = patternCandles[patternCandles.length - 1].low * 0.99; // Stop loss just below the last low
      
      // Calculate risk-reward ratio and potential profit
      const risk = entry - stopLoss;
      const reward = target - entry;
      const riskRewardRatio = reward / risk;
      const potentialProfit = ((target - entry) / entry) * 100;
      
      // Only include patterns with good risk-reward ratio
      if (riskRewardRatio < 2) continue;
      
      // Create pattern object
      const pattern: PatternData = {
        symbol,
        patternType: 'Ascending Triangle',
        direction: 'bullish',
        timeframe,
        entry,
        target,
        stopLoss,
        riskRewardRatio,
        potentialProfit,
        confidenceScore: 0, // Will be calculated later
        multiTimeframeConfirmation: false, // Will be checked later
        detectedAt: new Date().toISOString(),
        candleData: patternCandles,
        dataFreshness: this.getDataFreshnessStatus(metadata)
      };
      
      patterns.push(pattern);
    }
    
    return { 
      patterns, 
      metadata: {
        ...metadata,
        patternDetection: {
          timestamp: new Date().toISOString(),
          patternsFound: patterns.length
        }
      } 
    };
  }
  
  /**
   * Check if candles have a flat resistance level
   * @param candles Array of candles
   * @returns Boolean indicating if candles have a flat resistance
   */
  private hasFlatResistance(candles: Candle[]): boolean {
    // Get all highs
    const highs = candles.map(candle => candle.high);
    
    // Find potential resistance level (average of top 3 highs)
    const sortedHighs = [...highs].sort((a, b) => b - a);
    const resistanceLevel = (sortedHighs[0] + sortedHighs[1] + sortedHighs[2]) / 3;
    
    // Count how many candles touch the resistance level (within 0.5%)
    const touchesResistance = highs.filter(high => 
      Math.abs(high - resistanceLevel) / resistanceLevel < 0.005
    ).length;
    
    // Need at least 3 touches of resistance
    return touchesResistance >= 3;
  }
  
  /**
   * Check if candles have a rising support level
   * @param candles Array of candles
   * @returns Boolean indicating if candles have a rising support
   */
  private hasRisingSupport(candles: Candle[]): boolean {
    // Divide candles into segments
    const segments = 4;
    const segmentSize = Math.floor(candles.length / segments);
    
    // Calculate lowest low for each segment
    const segmentLows: number[] = [];
    for (let i = 0; i < segments; i++) {
      const start = i * segmentSize;
      const end = start + segmentSize;
      const segmentCandles = candles.slice(start, end);
      const lowestLow = Math.min(...segmentCandles.map(candle => candle.low));
      segmentLows.push(lowestLow);
    }
    
    // Check if lows are generally rising
    let risingCount = 0;
    for (let i = 1; i < segmentLows.length; i++) {
      if (segmentLows[i] > segmentLows[i - 1]) {
        risingCount++;
      }
    }
    
    // Need at least 2 out of 3 segments to show rising lows
    return risingCount >= 2;
  }
  
  /**
   * Calculate resistance level from candles
   * @param candles Array of candles
   * @returns Resistance level price
   */
  private calculateResistanceLevel(candles: Candle[]): number {
    // Get all highs
    const highs = candles.map(candle => candle.high);
    
    // Find potential resistance level (average of top 3 highs)
    const sortedHighs = [...highs].sort((a, b) => b - a);
    return (sortedHighs[0] + sortedHighs[1] + sortedHighs[2]) / 3;
  }

  /**
   * Get data freshness status string
   * @param metadata Data metadata
   * @returns Data freshness status string
   */
  private getDataFreshnessStatus(metadata: DataMetadata): string {
    if (!metadata) {
      return 'Unknown';
    }

    if (metadata.source === 'error') {
      return 'Error';
    }

    if (metadata.source === 'cache') {
      const lastUpdated = new Date(metadata.lastUpdated || metadata.fetchedAt).getTime();
      const ageMinutes = Math.floor((Date.now() - lastUpdated) / (60 * 1000));
      return `Cached (${ageMinutes}m old)`;
    }

    if (metadata.isDelayed) {
      return 'Delayed (15m)';
    }

    return 'Real-time';
  }
}

// Create instance of the detector
const ascendingTriangleDetector = new AscendingTriangleDetector();

// Add named export function that matches what apiService.ts is importing
export const detectAscendingTriangle = (
  symbol: string,
  candles: Candle[],
  timeframe: string,
  metadata: DataMetadata
): PatternData[] => {
  const result = ascendingTriangleDetector.detect(symbol, candles, timeframe, metadata);
  return result.patterns;
};

// Keep the default export for backward compatibility
export default ascendingTriangleDetector;
