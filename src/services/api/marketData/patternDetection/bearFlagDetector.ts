import { Candle, PatternData } from '@/services/types/patternTypes';
import { DataMetadata } from '@/services/api/marketData/dataService';

/**
 * Bear Flag pattern detector with timestamp tracking
 */
class BearFlagDetector {
  /**
   * Detect Bear Flag patterns in candle data
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
    
    // Look for bear flag pattern
    // Bear flag consists of a strong downtrend (pole) followed by a consolidation (flag)
    
    // We need at least 20 candles to identify a pattern
    for (let i = 20; i < candles.length; i++) {
      // Check for pole (strong downtrend)
      const poleStart = i - 20;
      const poleEnd = i - 10;
      
      const poleCandles = candles.slice(poleStart, poleEnd);
      const isPole = this.isPole(poleCandles);
      
      if (!isPole) continue;
      
      // Check for flag (consolidation)
      const flagStart = poleEnd;
      const flagEnd = i;
      
      const flagCandles = candles.slice(flagStart, flagEnd);
      const isFlag = this.isFlag(flagCandles);
      
      if (!isFlag) continue;
      
      // Calculate pattern parameters
      const entry = candles[i - 1].low * 0.99; // Entry just below the flag
      const poleHeight = poleCandles[0].high - poleCandles[poleCandles.length - 1].low;
      const target = entry - poleHeight; // Target is pole height projected from entry
      const stopLoss = flagCandles.reduce((max, candle) => Math.max(max, candle.high), 0) * 1.01; // Stop loss just above flag high
      
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
        patternType: 'Bear Flag',
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
        candleData: candles.slice(poleStart, i),
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
   * Check if candles form a pole (strong downtrend)
   * @param candles Array of candles
   * @returns Boolean indicating if candles form a pole
   */
  private isPole(candles: Candle[]): boolean {
    if (candles.length < 5) return false;
    
    // Calculate price change over the period
    const startPrice = candles[0].open;
    const endPrice = candles[candles.length - 1].close;
    const priceChange = (endPrice - startPrice) / startPrice;
    
    // Check if price decreased significantly (at least 5%)
    if (priceChange > -0.05) return false;
    
    // Check if most candles are bearish
    const bearishCandles = candles.filter(candle => candle.close < candle.open);
    if (bearishCandles.length < candles.length * 0.6) return false;
    
    // Check for increasing volume
    const startVolume = candles.slice(0, 3).reduce((sum, candle) => sum + candle.volume, 0) / 3;
    const endVolume = candles.slice(-3).reduce((sum, candle) => sum + candle.volume, 0) / 3;
    if (endVolume < startVolume) return false;
    
    return true;
  }
  
  /**
   * Check if candles form a flag (consolidation)
   * @param candles Array of candles
   * @returns Boolean indicating if candles form a flag
   */
  private isFlag(candles: Candle[]): boolean {
    if (candles.length < 5) return false;
    
    // Calculate price range
    const highs = candles.map(candle => candle.high);
    const lows = candles.map(candle => candle.low);
    
    const maxHigh = Math.max(...highs);
    const minLow = Math.min(...lows);
    const range = (maxHigh - minLow) / minLow;
    
    // Flag should have a relatively small range (less than 10%)
    if (range > 0.1) return false;
    
    // Check for decreasing volume
    const startVolume = candles.slice(0, 3).reduce((sum, candle) => sum + candle.volume, 0) / 3;
    const endVolume = candles.slice(-3).reduce((sum, candle) => sum + candle.volume, 0) / 3;
    if (endVolume > startVolume * 0.8) return false;
    
    return true;
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
const bearFlagDetector = new BearFlagDetector();

// Add named export function that matches what apiService.ts is importing
export const detectBearFlag = (
  symbol: string,
  candles: Candle[],
  timeframe: string,
  metadata: DataMetadata
): PatternData[] => {
  const result = bearFlagDetector.detect(symbol, candles, timeframe, metadata);
  return result.patterns;
};

// Keep the default export for backward compatibility
export default bearFlagDetector;
