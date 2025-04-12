import { Candle, PatternData } from '@/services/types/patternTypes';
import { DataMetadata } from '@/services/api/marketData/dataService';
import bullFlagDetector from './bullFlagDetector';
import bearFlagDetector from './bearFlagDetector';
import ascendingTriangleDetector from './ascendingTriangleDetector';
import descendingTriangleDetector from './descendingTriangleDetector';

/**
 * Pattern Detection Service with timestamp tracking
 * Coordinates pattern detection across different algorithms
 */
class PatternDetectionService {
  /**
   * Detect patterns in candle data
   * @param symbol Stock symbol
   * @param candles Array of candles
   * @param timeframe Timeframe string
   * @param metadata Data metadata
   * @returns Array of detected patterns with metadata
   */
  async detectPatterns(
    symbol: string,
    candles: Candle[],
    timeframe: string,
    metadata: DataMetadata
  ): Promise<{ patterns: PatternData[], metadata: DataMetadata }> {
    if (candles.length < 20) {
      return { 
        patterns: [], 
        metadata: {
          ...metadata,
          source: 'insufficient_data'
        } 
      };
    }

    // Run all pattern detectors
    const bullFlagResult = bullFlagDetector.detect(symbol, candles, timeframe, metadata);
    const bearFlagResult = bearFlagDetector.detect(symbol, candles, timeframe, metadata);
    const ascendingTriangleResult = ascendingTriangleDetector.detect(symbol, candles, timeframe, metadata);
    const descendingTriangleResult = descendingTriangleDetector.detect(symbol, candles, timeframe, metadata);
    
    // Combine all patterns
    const allPatterns = [
      ...bullFlagResult.patterns,
      ...bearFlagResult.patterns,
      ...ascendingTriangleResult.patterns,
      ...descendingTriangleResult.patterns
    ];
    
    // Combine metadata
    const combinedMetadata = {
      ...metadata,
      patternDetection: {
        timestamp: new Date().toISOString(),
        patternsFound: allPatterns.length,
        patternTypes: {
          bullFlag: bullFlagResult.patterns.length,
          bearFlag: bearFlagResult.patterns.length,
          ascendingTriangle: ascendingTriangleResult.patterns.length,
          descendingTriangle: descendingTriangleResult.patterns.length
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

export default new PatternDetectionService();
