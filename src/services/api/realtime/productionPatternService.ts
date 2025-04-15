import { toast } from 'sonner';
import { getApiKey } from '../marketData/apiKeyService';
import { PatternData } from '@/services/types/patternTypes';
import { stockUniverses } from '../marketData/stockUniverses';

/**
 * Production-ready pattern detection service with real-time data, 
 * robust error handling, and proper API integration
 */
export class ProductionPatternService {
  // API call tracking for rate limiting
  private static lastApiCallTime = 0;
  private static apiCallCount = 0;
  private static readonly API_RATE_LIMIT = 5; // calls per second
  private static readonly API_COOLDOWN = 1200; // ms between batches
  
  // Universe sizes
  private static readonly UNIVERSE_SIZES = {
    small: 20,   // For quick testing
    medium: 50,  // Default - good balance
    large: 100,  // For thorough market scanning
    xlarge: 200  // For comprehensive market analysis
  };
  
  // Cache for detected patterns
  private static patternCache: Record<string, {
    patterns: PatternData[];
    timestamp: number;
    expiresAt: number;
  }> = {};
  
  // Cache expiration time - 15 minutes
  private static readonly CACHE_EXPIRATION_MS = 15 * 60 * 1000;

  /**
   * Detect patterns for a specific timeframe
   * @param timeframe Timeframe to detect patterns for (e.g., '1h', '4h', '1d')
   * @param universeSize Size of the universe to scan
   * @param forceRefresh Force refresh patterns instead of using cache
   * @returns Promise with detected patterns and metadata
   */
  static async detectPatterns(
    timeframe: string = '1h',
    universeSize: 'small' | 'medium' | 'large' | 'xlarge' = 'medium',
    forceRefresh: boolean = false,
    onProgress?: (progress: number, total: number) => void
  ): Promise<{
    patterns: PatternData[];
    metadata: {
      timestamp: string;
      universeSize: string;
      symbolsScanned: number;
      patternsDetected: number;
      timeframeScanned: string;
      apiCallsMade: number;
      cachedResult: boolean;
      processingTimeMs: number;
    }
  }> {
    const startTime = Date.now();
    const cacheKey = `${timeframe}_${universeSize}`;
    
    // Return from cache if available and not force refreshing
    if (!forceRefresh && this.patternCache[cacheKey] && this.patternCache[cacheKey].expiresAt > Date.now()) {
      console.log(`Using cached patterns for ${timeframe} (${universeSize} universe)`);
      const cachedData = this.patternCache[cacheKey];
      
      return {
        patterns: cachedData.patterns,
        metadata: {
          timestamp: new Date(cachedData.timestamp).toISOString(),
          universeSize,
          symbolsScanned: this.getUniverseSymbols(timeframe, universeSize).length,
          patternsDetected: cachedData.patterns.length,
          timeframeScanned: timeframe,
          apiCallsMade: 0,
          cachedResult: true,
          processingTimeMs: Date.now() - startTime
        }
      };
    }
    
    // Get API key configuration
    const apiKeyConfig = getApiKey();
    if (!apiKeyConfig || !apiKeyConfig.key) {
      toast.error("Missing API Key", { 
        description: "Cannot detect patterns without a valid Polygon.io API key"
      });
      return { 
        patterns: [], 
        metadata: {
          timestamp: new Date().toISOString(),
          universeSize,
          symbolsScanned: 0,
          patternsDetected: 0,
          timeframeScanned: timeframe,
          apiCallsMade: 0,
          cachedResult: false,
          processingTimeMs: Date.now() - startTime
        }
      };
    }
    
    // Get symbols for the selected universe
    const symbols = this.getUniverseSymbols(timeframe, universeSize);
    console.log(`Detecting patterns for ${symbols.length} symbols (${universeSize} universe) on ${timeframe} timeframe`);
    
    // Track API calls
    let apiCallsMade = 0;
    
    // Detect patterns for each symbol
    const allPatterns: PatternData[] = [];
    
    // Process symbols in batches to avoid API rate limits
    const batchSize = 5;
    for (let i = 0; i < symbols.length; i += batchSize) {
      // Report progress if callback provided
      if (onProgress) {
        onProgress(i, symbols.length);
      }
      
      const batch = symbols.slice(i, i + batchSize);
      const batchPromises = batch.map(async (symbol) => {
        try {
          const patterns = await this.detectPatternsForSymbol(symbol, timeframe, apiKeyConfig.key);
          apiCallsMade += 1;
          return patterns;
        } catch (error) {
          console.error(`Error detecting patterns for ${symbol}:`, error);
          return [];
        }
      });
      
      try {
        // Wait for the batch to complete
        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach(patterns => allPatterns.push(...patterns));
        
        // Respect API rate limits by adding delay between batches
        await this.respectRateLimit();
      } catch (error) {
        console.error("Error processing batch:", error);
      }
    }
    
    // Final progress report
    if (onProgress) {
      onProgress(symbols.length, symbols.length);
    }
    
    // Cache the results
    this.patternCache[cacheKey] = {
      patterns: allPatterns,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.CACHE_EXPIRATION_MS
    };
    
    // Return the results
    return {
      patterns: allPatterns,
      metadata: {
        timestamp: new Date().toISOString(),
        universeSize,
        symbolsScanned: symbols.length,
        patternsDetected: allPatterns.length,
        timeframeScanned: timeframe,
        apiCallsMade,
        cachedResult: false,
        processingTimeMs: Date.now() - startTime
      }
    };
  }
  
  /**
   * Get symbols for the selected universe size and timeframe
   */
  private static getUniverseSymbols(
    timeframe: string,
    universeSize: 'small' | 'medium' | 'large' | 'xlarge'
  ): string[] {
    // Determine appropriate universe based on timeframe
    const isSwingTimeframe = ['4h', '1d', '1w'].includes(timeframe);
    const baseUniverse = isSwingTimeframe 
      ? stockUniverses.swingTradingUniverse
      : stockUniverses.dayTradingUniverse;
    
    // Limit universe size based on selection
    const limit = this.UNIVERSE_SIZES[universeSize] || this.UNIVERSE_SIZES.medium;
    return baseUniverse.slice(0, limit);
  }
  
  /**
   * Detect patterns for a specific symbol
   */
  private static async detectPatternsForSymbol(
    symbol: string,
    timeframe: string,
    apiKey: string
  ): Promise<PatternData[]> {
    try {
      // Prepare API call with proper rate limiting
      await this.respectRateLimit();
      
      // Determine appropriate Polygon.io timeframe
      const polygonTimeframe = this.convertTimeframeToPolygon(timeframe);
      
      // Calculate date range - 100 days back for sufficient pattern detection
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 100);
      
      // Format dates for API call
      const formattedStartDate = startDate.toISOString().split('T')[0];
      const formattedEndDate = endDate.toISOString().split('T')[0];
      
      // Fetch historical data from Polygon API
      console.log(`Fetching historical data for ${symbol} from ${formattedStartDate} to ${formattedEndDate}`);
      const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/${polygonTimeframe.multiplier}/${polygonTimeframe.timespan}/${formattedStartDate}/${formattedEndDate}?apiKey=${apiKey}&limit=5000`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Validate response data
      if (!data.results || data.results.length === 0) {
        console.warn(`No historical data found for ${symbol}`);
        return [];
      }
      
      // Convert to candle format
      const candles = data.results.map(bar => ({
        timestamp: bar.t,
        date: new Date(bar.t).toISOString(),
        open: bar.o,
        high: bar.h,
        low: bar.l,
        close: bar.c,
        volume: bar.v
      }));
      
      // Detect patterns
      return this.analyzePatterns(symbol, candles, timeframe);
    } catch (error) {
      console.error(`Error detecting patterns for ${symbol}:`, error);
      return [];
    }
  }
  
  /**
   * Analyze price data to detect patterns
   */
  private static analyzePatterns(
    symbol: string,
    candles: any[],
    timeframe: string
  ): PatternData[] {
    const patterns: PatternData[] = [];
    
    // Ensure we have enough candles for analysis
    if (!candles || candles.length < 20) {
      return patterns;
    }
    
    // Sort candles from oldest to newest for pattern analysis
    candles.sort((a, b) => a.timestamp - b.timestamp);
    
    // Detect patterns
    this.detectBullFlag(symbol, candles, timeframe, patterns);
    this.detectBearFlag(symbol, candles, timeframe, patterns);
    this.detectAscendingTriangle(symbol, candles, timeframe, patterns);
    this.detectDescendingTriangle(symbol, candles, timeframe, patterns);
    
    return patterns;
  }
  
  /**
   * Detect Bull Flag pattern
   */
  private static detectBullFlag(
    symbol: string,
    candles: any[],
    timeframe: string,
    patterns: PatternData[]
  ): void {
    const minCandles = 20;
    if (candles.length < minCandles) return;
    
    // Implementation of bull flag pattern detection
    // Check for strong uptrend followed by consolidation
    for (let i = minCandles; i < candles.length; i++) {
      // Check for strong uptrend (pole)
      const poleStart = i - minCandles;
      const poleEnd = i - minCandles/2;
      
      // Calculate pole height
      const poleHighest = Math.max(...candles.slice(poleStart, poleEnd).map(c => c.high));
      const poleLowest = Math.min(...candles.slice(poleStart, poleEnd).map(c => c.low));
      const poleHeight = poleHighest - poleLowest;
      
      // Check if pole is significant enough (at least 3% height)
      const polePercentage = poleHeight / poleLowest * 100;
      if (polePercentage < 3) continue;
      
      // Check for consolidation (flag)
      const flagStart = poleEnd;
      const flagEnd = i;
      
      // Calculate flag height
      const flagHighest = Math.max(...candles.slice(flagStart, flagEnd).map(c => c.high));
      const flagLowest = Math.min(...candles.slice(flagStart, flagEnd).map(c => c.low));
      const flagHeight = flagHighest - flagLowest;
      
      // Flag should be smaller than pole
      if (flagHeight > poleHeight * 0.8) continue;
      
      // Calculate entry, target, and stop loss
      const entry = candles[i].close;
      const stopLoss = flagLowest * 0.99; // Just below flag low
      const targetDistance = poleHeight; // Target based on pole height
      const target = entry + targetDistance;
      
      // Calculate risk/reward ratio
      const risk = entry - stopLoss;
      const reward = target - entry;
      const riskRewardRatio = risk > 0 ? reward / risk : 0;
      
      // Only include patterns with good risk/reward
      if (riskRewardRatio < 1.5) continue;
      
      // Calculate confidence score based on pattern quality
      const volumeIncrease = candles[i].volume / candles[i-1].volume;
      const isVolumeGood = volumeIncrease > 1.2;
      const isTrendStrong = (poleHighest - poleLowest) / poleLowest > 0.05;
      const isFlagGood = flagHeight < poleHeight * 0.5;
      
      let confidenceScore = 60; // Base confidence
      if (isVolumeGood) confidenceScore += 10;
      if (isTrendStrong) confidenceScore += 10;
      if (isFlagGood) confidenceScore += 10;
      if (riskRewardRatio > 3) confidenceScore += 10;
      
      // Create pattern object
      const pattern: PatternData = {
        id: `${symbol}_${timeframe}_bullFlag_${Date.now()}`,
        symbol,
        pattern_type: 'Bull Flag',
        timeframe,
        direction: 'bullish',
        entry_price: entry,
        target_price: target,
        stop_loss: stopLoss,
        risk_reward_ratio: riskRewardRatio,
        confidence_score: confidenceScore,
        created_at: new Date().toISOString(),
        status: 'active',
        channel_type: 'ascending',
        volume_confirmation: isVolumeGood,
        trendline_break: true
      };
      
      patterns.push(pattern);
      
      // Skip ahead to avoid detecting overlapping patterns
      i += 5;
    }
  }
  
  /**
   * Detect Bear Flag pattern
   */
  private static detectBearFlag(
    symbol: string,
    candles: any[],
    timeframe: string,
    patterns: PatternData[]
  ): void {
    const minCandles = 20;
    if (candles.length < minCandles) return;
    
    // Implementation of bear flag pattern detection
    // Check for strong downtrend followed by consolidation
    for (let i = minCandles; i < candles.length; i++) {
      // Check for strong downtrend (pole)
      const poleStart = i - minCandles;
      const poleEnd = i - minCandles/2;
      
      // Calculate pole height
      const poleHighest = Math.max(...candles.slice(poleStart, poleEnd).map(c => c.high));
      const poleLowest = Math.min(...candles.slice(poleStart, poleEnd).map(c => c.low));
      const poleHeight = poleHighest - poleLowest;
      
      // Check if pole is significant enough (at least 3% height)
      const polePercentage = poleHeight / poleLowest * 100;
      if (polePercentage < 3) continue;
      
      // Check for upward consolidation (flag)
      const flagStart = poleEnd;
      const flagEnd = i;
      
      // Calculate flag height
      const flagHighest = Math.max(...candles.slice(flagStart, flagEnd).map(c => c.high));
      const flagLowest = Math.min(...candles.slice(flagStart, flagEnd).map(c => c.low));
      const flagHeight = flagHighest - flagLowest;
      
      // Flag should be smaller than pole
      if (flagHeight > poleHeight * 0.8) continue;
      
      // Calculate entry, target, and stop loss
      const entry = candles[i].close;
      const stopLoss = flagHighest * 1.01; // Just above flag high
      const targetDistance = poleHeight; // Target based on pole height
      const target = entry - targetDistance;
      
      // Calculate risk/reward ratio
      const risk = stopLoss - entry;
      const reward = entry - target;
      const riskRewardRatio = risk > 0 ? reward / risk : 0;
      
      // Only include patterns with good risk/reward
      if (riskRewardRatio < 1.5) continue;
      
      // Calculate confidence score based on pattern quality
      const volumeIncrease = candles[i].volume / candles[i-1].volume;
      const isVolumeGood = volumeIncrease > 1.2;
      const isTrendStrong = (poleHighest - poleLowest) / poleLowest > 0.05;
      const isFlagGood = flagHeight < poleHeight * 0.5;
      
      let confidenceScore = 60; // Base confidence
      if (isVolumeGood) confidenceScore += 10;
      if (isTrendStrong) confidenceScore += 10;
      if (isFlagGood) confidenceScore += 10;
      if (riskRewardRatio > 3) confidenceScore += 10;
      
      // Create pattern object
      const pattern: PatternData = {
        id: `${symbol}_${timeframe}_bearFlag_${Date.now()}`,
        symbol,
        pattern_type: 'Bear Flag',
        timeframe,
        direction: 'bearish',
        entry_price: entry,
        target_price: target,
        stop_loss: stopLoss,
        risk_reward_ratio: riskRewardRatio,
        confidence_score: confidenceScore,
        created_at: new Date().toISOString(),
        status: 'active',
        channel_type: 'descending',
        volume_confirmation: isVolumeGood,
        trendline_break: true
      };
      
      patterns.push(pattern);
      
      // Skip ahead to avoid detecting overlapping patterns
      i += 5;
    }
  }
  
  /**
   * Detect Ascending Triangle pattern
   */
  private static detectAscendingTriangle(
    symbol: string,
    candles: any[],
    timeframe: string,
    patterns: PatternData[]
  ): void {
    const minCandles = 20;
    if (candles.length < minCandles) return;
    
    // Implementation of ascending triangle pattern detection
    // Look for horizontal resistance with rising support
    for (let i = minCandles; i < candles.length; i++) {
      const window = candles.slice(i - minCandles, i);
      
      // Find resistance level (horizontal)
      const highPrices = window.map(c => c.high);
      const resistanceLevel = this.findHorizontalResistance(highPrices);
      
      // Find rising support level
      const lowPrices = window.map(c => c.low);
      const supportLevel = this.findRisingSupport(lowPrices);
      
      // Check if we have both levels
      if (!resistanceLevel || !supportLevel) continue;
      
      // Calculate distance between support and resistance
      const currentDistance = resistanceLevel - supportLevel.current;
      const initialDistance = resistanceLevel - supportLevel.initial;
      
      // Ensure support is rising and distance is narrowing
      if (supportLevel.current <= supportLevel.initial || currentDistance >= initialDistance) continue;
      
      // Calculate entry, target, and stop loss
      const entry = resistanceLevel * 1.01; // Just above resistance
      const supportSlope = (supportLevel.current - supportLevel.initial) / minCandles;
      const projectedSupport = supportLevel.current + supportSlope * 5; // Project support 5 candles ahead
      const stopLoss = Math.max(supportLevel.current * 0.99, projectedSupport * 0.99); // Just below support
      const patternHeight = initialDistance;
      const target = entry + patternHeight; // Target based on pattern height
      
      // Calculate risk/reward ratio
      const risk = entry - stopLoss;
      const reward = target - entry;
      const riskRewardRatio = risk > 0 ? reward / risk : 0;
      
      // Only include patterns with good risk/reward
      if (riskRewardRatio < 1.5) continue;
      
      // Calculate confidence score based on pattern quality
      const touchesCount = this.countTouchesAtLevel(highPrices, resistanceLevel, 0.01);
      const isVolumeDeclining = this.isVolumeDeclining(window.map(c => c.volume));
      const isNearResistance = candles[i-1].close > resistanceLevel * 0.97;
      
      let confidenceScore = 60; // Base confidence
      if (touchesCount >= 3) confidenceScore += 10;
      if (isVolumeDeclining) confidenceScore += 10;
      if (isNearResistance) confidenceScore += 10;
      if (riskRewardRatio > 3) confidenceScore += 10;
      
      // Create pattern object
      const pattern: PatternData = {
        id: `${symbol}_${timeframe}_ascTriangle_${Date.now()}`,
        symbol,
        pattern_type: 'Ascending Triangle',
        timeframe,
        direction: 'bullish',
        entry_price: entry,
        target_price: target,
        stop_loss: stopLoss,
        risk_reward_ratio: riskRewardRatio,
        confidence_score: confidenceScore,
        created_at: new Date().toISOString(),
        status: 'active',
        channel_type: 'ascending',
        volume_confirmation: !isVolumeDeclining,
        trendline_break: false
      };
      
      patterns.push(pattern);
      
      // Skip ahead to avoid detecting overlapping patterns
      i += 5;
    }
  }
  
  /**
   * Detect Descending Triangle pattern
   */
  private static detectDescendingTriangle(
    symbol: string,
    candles: any[],
    timeframe: string,
    patterns: PatternData[]
  ): void {
    const minCandles = 20;
    if (candles.length < minCandles) return;
    
    // Implementation of descending triangle pattern detection
    // Look for horizontal support with falling resistance
    for (let i = minCandles; i < candles.length; i++) {
      const window = candles.slice(i - minCandles, i);
      
      // Find support level (horizontal)
      const lowPrices = window.map(c => c.low);
      const supportLevel = this.findHorizontalSupport(lowPrices);
      
      // Find falling resistance level
      const highPrices = window.map(c => c.high);
      const resistanceLevel = this.findFallingResistance(highPrices);
      
      // Check if we have both levels
      if (!supportLevel || !resistanceLevel) continue;
      
      // Calculate distance between support and resistance
      const currentDistance = resistanceLevel.current - supportLevel;
      const initialDistance = resistanceLevel.initial - supportLevel;
      
      // Ensure resistance is falling and distance is narrowing
      if (resistanceLevel.current >= resistanceLevel.initial || currentDistance >= initialDistance) continue;
      
      // Calculate entry, target, and stop loss
      const entry = supportLevel * 0.99; // Just below support
      const resistanceSlope = (resistanceLevel.current - resistanceLevel.initial) / minCandles;
      const projectedResistance = resistanceLevel.current + resistanceSlope * 5; // Project resistance 5 candles ahead
      const stopLoss = Math.min(resistanceLevel.current * 1.01, projectedResistance * 1.01); // Just above resistance
      const patternHeight = initialDistance;
      const target = entry - patternHeight; // Target based on pattern height
      
      // Calculate risk/reward ratio
      const risk = stopLoss - entry;
      const reward = entry - target;
      const riskRewardRatio = risk > 0 ? reward / risk : 0;
      
      // Only include patterns with good risk/reward
      if (riskRewardRatio < 1.5) continue;
      
      // Calculate confidence score based on pattern quality
      const touchesCount = this.countTouchesAtLevel(lowPrices, supportLevel, 0.01);
      const isVolumeDeclining = this.isVolumeDeclining(window.map(c => c.volume));
      const isNearSupport = candles[i-1].close < supportLevel * 1.03;
      
      let confidenceScore = 60; // Base confidence
      if (touchesCount >= 3) confidenceScore += 10;
      if (isVolumeDeclining) confidenceScore += 10;
      if (isNearSupport) confidenceScore += 10;
      if (riskRewardRatio > 3) confidenceScore += 10;
      
      // Create pattern object
      const pattern: PatternData = {
        id: `${symbol}_${timeframe}_descTriangle_${Date.now()}`,
        symbol,
        pattern_type: 'Descending Triangle',
        timeframe,
        direction: 'bearish',
        entry_price: entry,
        target_price: target,
        stop_loss: stopLoss,
        risk_reward_ratio: riskRewardRatio,
        confidence_score: confidenceScore,
        created_at: new Date().toISOString(),
        status: 'active',
        channel_type: 'descending',
        volume_confirmation: !isVolumeDeclining,
        trendline_break: false
      };
      
      patterns.push(pattern);
      
      // Skip ahead to avoid detecting overlapping patterns
      i += 5;
    }
  }
  
  /**
   * Helper function to find horizontal resistance level
   */
  private static findHorizontalResistance(highPrices: number[]): number | null {
    if (highPrices.length < 10) return null;
    
    // Find the highest 3 prices
    const sortedPrices = [...highPrices].sort((a, b) => b - a);
    const topPrices = sortedPrices.slice(0, 3);
    
    // Calculate average of top prices
    const avgTop = topPrices.reduce((sum, price) => sum + price, 0) / topPrices.length;
    
    // Count how many prices are within 1% of this level
    const touchCount = highPrices.filter(price => Math.abs(price - avgTop) / avgTop < 0.01).length;
    
    // Need at least 3 touches to be a valid resistance
    return touchCount >= 3 ? avgTop : null;
  }
  
  /**
   * Helper function to find horizontal support level
   */
  private static findHorizontalSupport(lowPrices: number[]): number | null {
    if (lowPrices.length < 10) return null;
    
    // Find the lowest 3 prices
    const sortedPrices = [...lowPrices].sort((a, b) => a - b);
    const bottomPrices = sortedPrices.slice(0, 3);
    
    // Calculate average of bottom prices
    const avgBottom = bottomPrices.reduce((sum, price) => sum + price, 0) / bottomPrices.length;
    
    // Count how many prices are within 1% of this level
    const touchCount = lowPrices.filter(price => Math.abs(price - avgBottom) / avgBottom < 0.01).length;
    
    // Need at least 3 touches to be a valid support
    return touchCount >= 3 ? avgBottom : null;
  }
  
  /**
   * Helper function to find rising support level
   */
  private static findRisingSupport(lowPrices: number[]): { initial: number; current: number } | null {
    if (lowPrices.length < 10) return null;
    
    // Split into initial and later periods
    const firstHalf = lowPrices.slice(0, Math.floor(lowPrices.length / 2));
    const secondHalf = lowPrices.slice(Math.floor(lowPrices.length / 2));
    
    // Get lowest points in each half
    const firstLow = Math.min(...firstHalf);
    const secondLow = Math.min(...secondHalf);
    
    // Support is rising if second low is higher than first low
    if (secondLow > firstLow) {
      return { initial: firstLow, current: secondLow };
    }
    
    return null;
  }
  
  /**
   * Helper function to find falling resistance level
   */
  private static findFallingResistance(highPrices: number[]): { initial: number; current: number } | null {
    if (highPrices.length < 10) return null;
    
    // Split into initial and later periods
    const firstHalf = highPrices.slice(0, Math.floor(highPrices.length / 2));
    const secondHalf = highPrices.slice(Math.floor(highPrices.length / 2));
    
    // Get highest points in each half
    const firstHigh = Math.max(...firstHalf);
    const secondHigh = Math.max(...secondHalf);
    
    // Resistance is falling if second high is lower than first high
    if (secondHigh < firstHigh) {
      return { initial: firstHigh, current: secondHigh };
    }
    
    return null;
  }
  
  /**
   * Helper function to count touches at a price level
   */
  private static countTouchesAtLevel(prices: number[], level: number, tolerance: number): number {
    let touches = 0;
    let withinLevel = false;
    
    for (const price of prices) {
      const currentWithinLevel = Math.abs(price - level) / level < tolerance;
      
      // Count a new touch only when price moves into the level from outside
      if (currentWithinLevel && !withinLevel) {
        touches++;
      }
      
      withinLevel = currentWithinLevel;
    }
    
    return touches;
  }
  
  /**
   * Helper function to check if volume is declining
   */
  private static isVolumeDeclining(volumes: number[]): boolean {
    if (volumes.length < 10) return false;
    
    // Compare average volume of first half vs second half
    const firstHalf = volumes.slice(0, Math.floor(volumes.length / 2));
    const secondHalf = volumes.slice(Math.floor(volumes.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, vol) => sum + vol, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, vol) => sum + vol, 0) / secondHalf.length;
    
    // Volume is declining if second half average is lower
    return secondAvg < firstAvg * 0.9; // At least 10% decrease
  }
  
  /**
   * Convert app timeframe format to Polygon API format
   */
  private static convertTimeframeToPolygon(timeframe: string): { multiplier: number; timespan: string } {
    switch (timeframe) {
      case '1m':
        return { multiplier: 1, timespan: 'minute' };
      case '5m':
        return { multiplier: 5, timespan: 'minute' };
      case '15m':
        return { multiplier: 15, timespan: 'minute' };
      case '30m':
        return { multiplier: 30, timespan: 'minute' };
      case '1h':
        return { multiplier: 1, timespan: 'hour' };
      case '4h':
        return { multiplier: 4, timespan: 'hour' };
      case '1d':
        return { multiplier: 1, timespan: 'day' };
      case '1w':
        return { multiplier: 1, timespan: 'week' };
      default:
        return { multiplier: 1, timespan: 'day' }; // Default to daily
    }
  }
  
  /**
   * Implement rate limiting for API calls
   */
  private static async respectRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastApiCallTime;
    
    // Reset counter if more than 1 second has passed
    if (timeSinceLastCall > 1000) {
      this.apiCallCount = 0;
      this.lastApiCallTime = now;
    }
    
    // If we're at or above rate limit, delay the next call
    if (this.apiCallCount >= this.API_RATE_LIMIT) {
      const delayMs = this.API_COOLDOWN;
      console.log(`Rate limit reached, delaying next call by ${delayMs}ms`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      this.apiCallCount = 0;
      this.lastApiCallTime = Date.now();
    }
    
    // Increment counter
    this.apiCallCount++;
  }
} 