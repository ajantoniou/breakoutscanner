import { PatternData } from '@/services/types/patternTypes';
import { DataMetadata } from '@/services/api/marketData/dataService';
import MarketDataService from '@/services/api/marketData/dataService';
import patternDetectionService from '@/services/api/marketData/patternDetection/patternDetectionService';
import { calculateCombinedConfidenceScore } from '@/utils/confidenceScoring';

/**
 * Golden Scanner service for high-confidence pattern predictions
 * Provides the highest confidence trade recommendations
 */
class GoldenScannerService {
  private marketDataService: MarketDataService;
  private readonly CONFIDENCE_THRESHOLD = 80; // Minimum confidence score for Golden Scanner
  private readonly PROFIT_TARGET_THRESHOLD = 5; // Minimum profit target percentage
  private readonly PREFERRED_TIMEFRAMES = ['1h', '4h', '1d']; // Focus on these timeframes for immediate trading

  constructor() {
    this.marketDataService = new MarketDataService();
  }

  /**
   * Get high-confidence predictions
   * @param symbols Array of stock symbols to scan
   * @param forceRefresh Force refresh from API instead of using cache
   * @returns Promise with high-confidence patterns and metadata
   */
  async getHighConfidencePredictions(
    symbols: string[],
    forceRefresh: boolean = false
  ): Promise<{
    predictions: PatternData[],
    metadata: {
      scanTimestamp: string,
      dataFreshnessSummary: any,
      symbolsScanned: number,
      patternsFound: number,
      highConfidenceCount: number
    }
  }> {
    try {
      console.log(`Golden Scanner: Scanning ${symbols.length} symbols for high-confidence patterns`);
      const scanStartTime = Date.now();
      
      // Fetch data for all symbols across preferred timeframes
      const candleDataMap: Record<string, Record<string, any>> = {};
      const metadataMap: Record<string, Record<string, DataMetadata>> = {};
      
      // Process symbols in batches to avoid rate limiting
      const batchSize = 5;
      for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        
        // Fetch data for each symbol and timeframe
        for (const symbol of batch) {
          candleDataMap[symbol] = {};
          metadataMap[symbol] = {};
          
          for (const timeframe of this.PREFERRED_TIMEFRAMES) {
            const result = await this.marketDataService.fetchCandles(
              symbol,
              timeframe,
              120, // Get 120 candles
              undefined,
              undefined,
              forceRefresh
            );
            
            candleDataMap[symbol][timeframe] = result.candles;
            metadataMap[symbol][timeframe] = result.metadata;
          }
        }
        
        // Add a small delay between batches to avoid rate limiting
        if (i + batchSize < symbols.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Detect patterns across all symbols and timeframes
      const patternResult = await patternDetectionService.scanMultipleSymbols(
        symbols,
        this.PREFERRED_TIMEFRAMES,
        candleDataMap,
        metadataMap
      );
      
      // Get data freshness summary
      const dataFreshnessSummary = patternDetectionService.getDataFreshnessSummary(patternResult.metadata);
      
      // Collect all patterns
      let allPatterns: PatternData[] = [];
      for (const symbol of symbols) {
        const symbolPatterns = patternResult.patternsBySymbol[symbol] || [];
        allPatterns = allPatterns.concat(symbolPatterns);
      }
      
      // Calculate confidence scores for all patterns
      const patternsWithScores = await this.calculateConfidenceScores(allPatterns, candleDataMap);
      
      // Filter for high-confidence patterns
      const highConfidencePatterns = patternsWithScores.filter(pattern => 
        pattern.confidenceScore >= this.CONFIDENCE_THRESHOLD &&
        pattern.potentialProfit >= this.PROFIT_TARGET_THRESHOLD
      );
      
      // Sort by confidence score (highest first)
      highConfidencePatterns.sort((a, b) => b.confidenceScore - a.confidenceScore);
      
      // Add expected breakout timing
      const predictionsWithTiming = this.addExpectedBreakoutTiming(highConfidencePatterns);
      
      // Create metadata
      const scanMetadata = {
        scanTimestamp: new Date().toISOString(),
        dataFreshnessSummary,
        symbolsScanned: symbols.length,
        patternsFound: allPatterns.length,
        highConfidenceCount: highConfidencePatterns.length
      };
      
      return {
        predictions: predictionsWithTiming,
        metadata: scanMetadata
      };
    } catch (error) {
      console.error('Error in Golden Scanner:', error);
      return {
        predictions: [],
        metadata: {
          scanTimestamp: new Date().toISOString(),
          dataFreshnessSummary: {
            realTimeCount: 0,
            delayedCount: 0,
            cachedCount: 0,
            errorCount: 1,
            totalCount: 1,
            freshestSymbols: []
          },
          symbolsScanned: symbols.length,
          patternsFound: 0,
          highConfidenceCount: 0
        }
      };
    }
  }
  
  /**
   * Calculate confidence scores for patterns
   * @param patterns Array of patterns
   * @param candleDataMap Object mapping symbols and timeframes to candle arrays
   * @returns Promise with patterns with calculated confidence scores
   */
  private async calculateConfidenceScores(
    patterns: PatternData[],
    candleDataMap: Record<string, Record<string, any>>
  ): Promise<PatternData[]> {
    return Promise.all(patterns.map(async pattern => {
      try {
        // Get candle data for the pattern
        const candles = candleDataMap[pattern.symbol]?.[pattern.timeframe] || [];
        
        if (candles.length === 0) {
          return {
            ...pattern,
            confidenceScore: 50 // Default score when data is missing
          };
        }
        
        // Extract technical data for confidence calculation
        const technicalData = {
          highs: candles.map(c => c.high),
          lows: candles.map(c => c.low),
          volumes: candles.map(c => c.volume),
          ema20: candles.map(c => c.ema20),
          ema50: candles.map(c => c.ema50),
          rsi: candles.map(c => c.rsi14),
          historicalAccuracy: 0.75 // Default value, would be replaced with actual backtest data
        };
        
        // Calculate confidence score
        const confidenceScore = calculateCombinedConfidenceScore(pattern, technicalData);
        
        return {
          ...pattern,
          confidenceScore
        };
      } catch (error) {
        console.error(`Error calculating confidence score for ${pattern.symbol}:`, error);
        return {
          ...pattern,
          confidenceScore: 50 // Default score on error
        };
      }
    }));
  }
  
  /**
   * Add expected breakout timing to patterns
   * @param patterns Array of patterns
   * @returns Array of patterns with expected breakout timing
   */
  private addExpectedBreakoutTiming(patterns: PatternData[]): PatternData[] {
    return patterns.map(pattern => {
      // Calculate expected breakout timing based on timeframe
      let expectedCandles: number;
      let timeframeInMinutes: number;
      
      switch (pattern.timeframe) {
        case '15m':
          expectedCandles = 8;
          timeframeInMinutes = 15;
          break;
        case '30m':
          expectedCandles = 6;
          timeframeInMinutes = 30;
          break;
        case '1h':
          expectedCandles = 5;
          timeframeInMinutes = 60;
          break;
        case '4h':
          expectedCandles = 4;
          timeframeInMinutes = 240;
          break;
        case '1d':
          expectedCandles = 3;
          timeframeInMinutes = 1440;
          break;
        default:
          expectedCandles = 5;
          timeframeInMinutes = 60;
      }
      
      // Calculate expected breakout time
      const now = new Date();
      const expectedBreakoutTime = new Date(now.getTime() + (expectedCandles * timeframeInMinutes * 60 * 1000));
      
      return {
        ...pattern,
        expectedBreakoutTime: expectedBreakoutTime.toISOString(),
        expectedCandlesToBreakout: expectedCandles
      };
    });
  }
  
  /**
   * Get current prices for predictions
   * @param predictions Array of pattern predictions
   * @returns Promise with predictions with current prices
   */
  async addCurrentPrices(predictions: PatternData[]): Promise<PatternData[]> {
    const result: PatternData[] = [];
    
    for (const prediction of predictions) {
      try {
        const priceResult = await this.marketDataService.getCurrentPrice(prediction.symbol, true);
        
        result.push({
          ...prediction,
          currentPrice: priceResult.price,
          priceMetadata: priceResult.metadata
        });
      } catch (error) {
        console.error(`Error getting current price for ${prediction.symbol}:`, error);
        result.push({
          ...prediction,
          currentPrice: 0,
          priceMetadata: {
            fetchedAt: new Date().toISOString(),
            isDelayed: true,
            source: 'error'
          }
        });
      }
    }
    
    return result;
  }
}

export default new GoldenScannerService();
