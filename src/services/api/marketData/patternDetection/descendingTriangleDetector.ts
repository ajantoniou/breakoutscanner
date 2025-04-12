import { Candle, PatternData } from '@/services/types/patternTypes';
import { DataMetadata } from '@/services/api/marketData/dataService';

/**
 * Descending Triangle pattern detector with timestamp tracking
 */
class DescendingTriangleDetector {
  /**
   * Detect Descending Triangle patterns in candle data
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
    
    // Look for descending triangle pattern
    // Descending triangle consists of a flat support (bottom) and falling resistance (top)
    
    // We need at least 20 candles to identify a pattern
    for (let i = 20; i < candles.length; i++) {
      const patternCandles = candles.slice(i - 20, i);
      
      // Check for flat support
      const hasSupport = this.hasFlatSupport(patternCandles);
      if (!hasSupport) continue;
      
      // Check for falling resistance
      const hasFallingResistance = this.hasFallingResistance(patternCandles);
      if (!hasFallingResistance) continue;
      
      // Calculate pattern parameters
      const supportLevel = this.calculateSupportLevel(patternCandles);
      const entry = supportLevel * 0.99; // Entry just below support
      const patternHeight = patternCandles[patternCandles.length - 1].high - supportLevel;
      const target = entry - patternHeight; // Target is pattern height projected from entry
      const stopLoss = patternCandles[patternCandles.length - 1].high * 1.01; // Stop loss just above the last high
      
      // Calculate risk-reward ratio and potential profit
      const risk = stopLoss - entry;
      const reward = entry - target;
      const riskRewardRatio = reward / risk;
      const potentialProfit = ((entry - target) / entry) * 100;
      
      // Only include patterns with good risk-reward ratio
      if (riskRewardRatio < 2) continue;
      
      // Create pattern object
      const pattern: PatternData = {
        symbol,
        patternType: 'Descending Triangle',
        direction: 'bearish',
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
   * Check if candles have a flat support level
   * @param candles Array of candles
   * @returns Boolean indicating if candles have a flat support
   */
  private hasFlatSupport(candles: Candle[]): boolean {
    // Get all lows
    const lows = candles.map(candle => candle.low);
    
    // Find potential support level (average of bottom 3 lows)
    const sortedLows = [...lows].sort((a, b) => a - b);
    const supportLevel = (sortedLows[0] + sortedLows[1] + sortedLows[2]) / 3;
    
    // Count how many candles touch the support level (within 0.5%)
    const touchesSupport = lows.filter(low => 
      Math.abs(low - supportLevel) / supportLevel < 0.005
    ).length;
    
    // Need at least 3 touches of support
    return touchesSupport >= 3;
  }
  
  /**
   * Check if candles have a falling resistance level
   * @param candles Array of candles
   * @returns Boolean indicating if candles have a falling resistance
   */
  private hasFallingResistance(candles: Candle[]): boolean {
    // Divide candles into segments
    const segments = 4;
    const segmentSize = Math.floor(candles.length / segments);
    
    // Calculate highest high for each segment
    const segmentHighs: number[] = [];
    for (let i = 0; i < segments; i++) {
      const start = i * segmentSize;
      const end = start + segmentSize;
      const segmentCandles = candles.slice(start, end);
      const highestHigh = Math.max(...segmentCandles.map(candle => candle.high));
      segmentHighs.push(highestHigh);
    }
    
    // Check if highs are generally falling
    let fallingCount = 0;
    for (let i = 1; i < segmentHighs.length; i++) {
      if (segmentHighs[i] < segmentHighs[i - 1]) {
        fallingCount++;
      }
    }
    
    // Need at least 2 out of 3 segments to show falling highs
    return fallingCount >= 2;
  }
  
  /**
   * Calculate support level from candles
   * @param candles Array of candles
   * @returns Support level price
   */
  private calculateSupportLevel(candles: Candle[]): number {
    // Get all lows
    const lows = candles.map(candle => candle.low);
    
    // Find potential support level (average of bottom 3 lows)
    const sortedLows = [...lows].sort((a, b) => a - b);
    return (sortedLows[0] + sortedLows[1] + sortedLows[2]) / 3;
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

export default new DescendingTriangleDetector();
