import { Candle, PatternData } from '@/services/types/patternTypes';
import { DataMetadata } from '@/services/api/marketData/dataService';
import bullFlagDetector from './bullFlagDetector';
import bearFlagDetector from './bearFlagDetector';
import ascendingTriangleDetector from './ascendingTriangleDetector';
import descendingTriangleDetector from './descendingTriangleDetector';
import breakoutDetector, { BreakoutData } from './breakoutDetector';

/**
 * Service for detecting chart patterns
 */
class PatternDetectionService {
  /**
   * Detect all patterns in a set of candles
   * @param symbol Stock symbol
   * @param candles Array of candles
   * @param timeframe Timeframe string
   * @param metadata Data metadata
   * @returns Object with detected patterns and updated metadata
   */
  async detectPatterns(
    symbol: string,
    candles: Candle[],
    timeframe: string,
    metadata: DataMetadata
  ): Promise<{ patterns: PatternData[], metadata: DataMetadata }> {
    if (!candles || candles.length < 20) {
      console.warn(`Not enough candles for ${symbol} (${timeframe}) to detect patterns`);
      return { patterns: [], metadata };
    }
    
    // Get current price
    const currentPrice = candles[candles.length - 1].close;
    
    // Detect patterns
    const bullFlags = bullFlagDetector.detect(symbol, candles, timeframe, metadata).patterns;
    const bearFlags = bearFlagDetector.detect(symbol, candles, timeframe, metadata).patterns;
    const ascendingTriangles = ascendingTriangleDetector.detect(symbol, candles, timeframe, metadata).patterns;
    const descendingTriangles = descendingTriangleDetector.detect(symbol, candles, timeframe, metadata).patterns;
    const breakouts = breakoutDetector.detect(symbol, candles, timeframe, metadata).patterns;
    
    // Combine all patterns
    const allPatterns = [
      ...bullFlags,
      ...bearFlags,
      ...ascendingTriangles,
      ...descendingTriangles,
      ...breakouts
    ];
    
    // Update metadata
    const combinedMetadata = {
      ...metadata,
      patternDetection: {
        timestamp: new Date().toISOString(),
        patternsFound: allPatterns.length,
        patternCounts: {
          bullFlag: bullFlags.length,
          bearFlag: bearFlags.length,
          ascendingTriangle: ascendingTriangles.length,
          descendingTriangle: descendingTriangles.length
        }
      }
    };
    
    return { patterns: allPatterns, metadata: combinedMetadata };
  }
  
  /**
   * Scan a symbol for patterns across multiple timeframes
   * @param symbol Stock symbol
   * @param timeframes Array of timeframe strings
   * @param candleData Object mapping timeframes to candle arrays
   * @param metadataMap Object mapping timeframes to metadata
   * @returns Array of detected patterns with metadata
   */
  async scanSymbol(
    symbol: string,
    timeframes: string[],
    candleData: Record<string, Candle[]>,
    metadataMap: Record<string, DataMetadata>
  ): Promise<{ patterns: PatternData[], metadata: Record<string, DataMetadata> }> {
    const allPatterns: PatternData[] = [];
    const updatedMetadata: Record<string, DataMetadata> = { ...metadataMap };
    
    // Process each timeframe
    for (const timeframe of timeframes) {
      const candles = candleData[timeframe] || [];
      const metadata = metadataMap[timeframe] || {
        fetchedAt: new Date().toISOString(),
        isDelayed: true,
        source: 'unknown'
      };
      
      if (candles.length >= 20) {
        const result = await this.detectPatterns(symbol, candles, timeframe, metadata);
        allPatterns.push(...result.patterns);
        updatedMetadata[timeframe] = result.metadata;
      }
    }
    
    return { patterns: allPatterns, metadata: updatedMetadata };
  }
  
  /**
   * Scan multiple symbols for patterns
   * @param symbols Array of stock symbols
   * @param timeframes Array of timeframe strings
   * @param candleDataMap Object mapping symbols and timeframes to candle arrays
   * @param metadataMap Object mapping symbols and timeframes to metadata
   * @returns Object mapping symbols to detected patterns with metadata
   */
  async scanMultipleSymbols(
    symbols: string[],
    timeframes: string[],
    candleDataMap: Record<string, Record<string, Candle[]>>,
    metadataMap: Record<string, Record<string, DataMetadata>>
  ): Promise<{ 
    patternsBySymbol: Record<string, PatternData[]>, 
    metadata: Record<string, Record<string, DataMetadata>> 
  }> {
    const patternsBySymbol: Record<string, PatternData[]> = {};
    const updatedMetadata: Record<string, Record<string, DataMetadata>> = { ...metadataMap };
    
    // Process each symbol
    for (const symbol of symbols) {
      const candleData = candleDataMap[symbol] || {};
      const symbolMetadata = metadataMap[symbol] || {};
      
      const result = await this.scanSymbol(symbol, timeframes, candleData, symbolMetadata);
      patternsBySymbol[symbol] = result.patterns;
      updatedMetadata[symbol] = result.metadata;
    }
    
    return { patternsBySymbol, metadata: updatedMetadata };
  }
  
  /**
   * Get data freshness summary for multiple symbols and timeframes
   * @param metadataMap Object mapping symbols and timeframes to metadata
   * @returns Object with data freshness summary
   */
  getDataFreshnessSummary(metadataMap: Record<string, Record<string, DataMetadata>>): {
    realTimeCount: number;
    delayedCount: number;
    cachedCount: number;
    errorCount: number;
    totalCount: number;
    freshestSymbols: string[];
  } {
    let realTimeCount = 0;
    let delayedCount = 0;
    let cachedCount = 0;
    let errorCount = 0;
    let totalCount = 0;
    
    const symbolFreshnessScore: Record<string, number> = {};
    
    // Process each symbol and timeframe
    for (const [symbol, timeframeMap] of Object.entries(metadataMap)) {
      let symbolScore = 0;
      let symbolCount = 0;
      
      for (const [timeframe, metadata] of Object.entries(timeframeMap)) {
        totalCount++;
        
        if (!metadata) {
          errorCount++;
          continue;
        }
        
        if (metadata.source === 'error') {
          errorCount++;
          symbolScore += 0;
        } else if (metadata.source === 'cache') {
          cachedCount++;
          symbolScore += 1;
        } else if (metadata.isDelayed) {
          delayedCount++;
          symbolScore += 2;
        } else {
          realTimeCount++;
          symbolScore += 3;
        }
        
        symbolCount++;
      }
      
      // Calculate average freshness score for the symbol
      symbolFreshnessScore[symbol] = symbolCount > 0 ? symbolScore / symbolCount : 0;
    }
    
    // Get top 5 freshest symbols
    const freshestSymbols = Object.entries(symbolFreshnessScore)
      .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
      .slice(0, 5)
      .map(([symbol]) => symbol);
    
    return {
      realTimeCount,
      delayedCount,
      cachedCount,
      errorCount,
      totalCount,
      freshestSymbols
    };
  }
}

// Create instance of the detector
const patternDetectionService = new PatternDetectionService();

// Add named export function for detectMultiTimeframePatterns that's imported by patternDetectionManager.ts
export const detectMultiTimeframePatterns = async (
  symbol: string,
  candlesByTimeframe: Record<string, Candle[]>,
  currentPrice: number
): Promise<PatternData[]> => {
  try {
    // This is a wrapper function that delegates to the main implementation in patternDetectionService.ts
    // It's needed because patternDetectionManager.ts imports from this location
    
    // Process each timeframe
    const allPatterns: PatternData[] = [];
    
    for (const [timeframe, candles] of Object.entries(candlesByTimeframe)) {
      if (candles.length >= 20) {
        const metadata = {
          fetchedAt: new Date().toISOString(),
          isDelayed: false,
          source: 'realtime'
        };
        
        const result = await patternDetectionService.detectPatterns(symbol, candles, timeframe, metadata);
        allPatterns.push(...result.patterns);
      }
    }
    
    return allPatterns;
  } catch (error) {
    console.error(`Error in detectMultiTimeframePatterns for ${symbol}:`, error);
    return [];
  }
};

// Keep the default export for backward compatibility
export default patternDetectionService;
