import { Candle, PatternData } from '@/services/types/patternTypes';
import { DataMetadata } from '@/services/api/marketData/dataService';
import bullFlagDetector from './bullFlagDetector';
import bearFlagDetector from './bearFlagDetector';
import ascendingTriangleDetector from './ascendingTriangleDetector';
import descendingTriangleDetector from './descendingTriangleDetector';
import breakoutDetector, { BreakoutData } from './breakoutDetector';

interface PatternCache {
  patterns: PatternData[];
  metadata: DataMetadata;
  timestamp: number;
  candles: Candle[];
}

/**
 * Service for detecting chart patterns with caching and optimization
 */
class PatternDetectionService {
  private static instance: PatternDetectionService;
  private patternCache: Map<string, PatternCache> = new Map();
  private readonly CACHE_DURATION = 60 * 1000; // 1 minute cache duration
  private readonly MIN_CANDLES = 20;
  private processingSymbols: Set<string> = new Set();

  private constructor() {}

  public static getInstance(): PatternDetectionService {
    if (!PatternDetectionService.instance) {
      PatternDetectionService.instance = new PatternDetectionService();
    }
    return PatternDetectionService.instance;
  }

  /**
   * Get cache key for a symbol and timeframe
   */
  private getCacheKey(symbol: string, timeframe: string): string {
    return `${symbol}_${timeframe}`;
  }

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(cache: PatternCache): boolean {
    return Date.now() - cache.timestamp <= this.CACHE_DURATION;
  }

  /**
   * Check if candles have changed significantly from cached version
   */
  private haveCandlesChanged(newCandles: Candle[], cachedCandles: Candle[]): boolean {
    if (newCandles.length !== cachedCandles.length) return true;
    
    // Check last 3 candles for changes
    const checkCount = Math.min(3, newCandles.length);
    for (let i = 1; i <= checkCount; i++) {
      const newCandle = newCandles[newCandles.length - i];
      const cachedCandle = cachedCandles[cachedCandles.length - i];
      
      if (newCandle.close !== cachedCandle.close || 
          newCandle.volume !== cachedCandle.volume) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Detect patterns in candle data with caching and optimization
   */
  async detectPatterns(
    symbol: string,
    candles: Candle[],
    timeframe: string,
    metadata: DataMetadata
  ): Promise<{ patterns: PatternData[], metadata: DataMetadata }> {
    // Input validation
    if (!candles || candles.length < this.MIN_CANDLES) {
      console.warn(`Not enough candles for ${symbol} (${timeframe}) to detect patterns`);
      return { 
        patterns: [], 
        metadata: {
          ...metadata,
          source: 'insufficient_data'
        }
      };
    }

    const cacheKey = this.getCacheKey(symbol, timeframe);

    // Check if we're already processing this symbol
    if (this.processingSymbols.has(cacheKey)) {
      const cache = this.patternCache.get(cacheKey);
      if (cache) {
        return { patterns: cache.patterns, metadata: cache.metadata };
      }
      return { patterns: [], metadata };
    }

    try {
      // Add to processing set
      this.processingSymbols.add(cacheKey);

      // Check cache
      const cache = this.patternCache.get(cacheKey);
      if (cache && 
          this.isCacheValid(cache) && 
          !this.haveCandlesChanged(candles, cache.candles)) {
        return { patterns: cache.patterns, metadata: cache.metadata };
      }

      // Get current price for reference
      const currentPrice = candles[candles.length - 1].close;

      // Run pattern detection in parallel
      const [
        bullFlags,
        bearFlags,
        ascendingTriangles,
        descendingTriangles,
        breakouts
      ] = await Promise.all([
        bullFlagDetector.detect(symbol, candles, timeframe, metadata),
        bearFlagDetector.detect(symbol, candles, timeframe, metadata),
        ascendingTriangleDetector.detect(symbol, candles, timeframe, metadata),
        descendingTriangleDetector.detect(symbol, candles, timeframe, metadata),
        breakoutDetector.detect(symbol, candles, timeframe, metadata)
      ]);

      // Combine all patterns
      const allPatterns = [
        ...bullFlags.patterns,
        ...bearFlags.patterns,
        ...ascendingTriangles.patterns,
        ...descendingTriangles.patterns,
        ...breakouts.patterns
      ];

      // Update pattern statuses based on current price
      const updatedPatterns = allPatterns.map(pattern => ({
        ...pattern,
        current_price: currentPrice,
        status: this.determinePatternStatus(pattern, currentPrice)
      }));

      // Create combined metadata
      const combinedMetadata = {
        ...metadata,
        patternDetection: {
          timestamp: new Date().toISOString(),
          patternsFound: updatedPatterns.length,
          patternTypes: {
            bullFlag: bullFlags.patterns.length,
            bearFlag: bearFlags.patterns.length,
            ascendingTriangle: ascendingTriangles.patterns.length,
            descendingTriangle: descendingTriangles.patterns.length,
            breakout: breakouts.patterns.length
          }
        }
      };

      // Update cache
      this.patternCache.set(cacheKey, {
        patterns: updatedPatterns,
        metadata: combinedMetadata,
        timestamp: Date.now(),
        candles
      });

      return { patterns: updatedPatterns, metadata: combinedMetadata };

    } finally {
      // Remove from processing set
      this.processingSymbols.delete(cacheKey);
    }
  }

  /**
   * Determine pattern status based on current price
   */
  private determinePatternStatus(
    pattern: PatternData,
    currentPrice: number
  ): 'active' | 'completed' | 'failed' {
    if (pattern.status !== 'active') return pattern.status;

    const priceChange = ((currentPrice - pattern.entry_price) / pattern.entry_price) * 100;
    
    if (pattern.direction === 'bullish') {
      if (currentPrice >= pattern.target_price) return 'completed';
      if (currentPrice <= pattern.stop_loss) return 'failed';
    } else {
      if (currentPrice <= pattern.target_price) return 'completed';
      if (currentPrice >= pattern.stop_loss) return 'failed';
    }

    return 'active';
  }

  /**
   * Clear cache for a specific symbol and timeframe
   */
  public clearCache(symbol: string, timeframe: string): void {
    const cacheKey = this.getCacheKey(symbol, timeframe);
    this.patternCache.delete(cacheKey);
  }

  /**
   * Clear all cached data
   */
  public clearAllCache(): void {
    this.patternCache.clear();
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

export default PatternDetectionService.getInstance();
