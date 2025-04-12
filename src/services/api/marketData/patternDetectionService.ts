import { delayedDataManager } from './delayedDataManager';
import { PatternData } from '@/services/types/patternTypes';
import { calculateRSI, calculateATR, analyzeVolume, checkEMACrossover } from './technicalIndicators';
import { 
  identifyAllTrendlines, 
  EnhancedTrendlineData, 
  checkBreakthrough, 
  calculateTargetPrice,
  checkMultiTimeframeConfirmation,
  combineMultiTimeframeTrendlines 
} from '@/services/backtesting/utils/trendlineAnalysis';
import { STOCK_UNIVERSES } from './stockUniverses';
import { 
  TimeframeOption,
  HistoricalPrice,
  getTimeframeHierarchy,
  identifyPriceChannel,
  detectChannelBreakout,
  findSignificantLevels,
} from '../../types/priceTypes';
import {
  calculateATR as newCalculateATR,
} from '../../../utils/indicators';
import { 
  getHistoricalPrices, 
  calculateSupportAndResistance,
} from '../marketData';

type ChannelType = 'ascending' | 'descending' | 'horizontal';

interface EMAPattern {
  ema7: number;
  ema50: number;
  ema100: number;
  crossovers: string[];
  pattern: '7over50' | '7over100' | '50over100' | 'allBullish' | 'allBearish' | 'mixed';
}

interface PatternIndicators {
  rsi: number;
  atr: number;
  volume: number;
  ema: EMAPattern;
}

export type TrendDirection = 'bullish' | 'bearish' | 'neutral';

export interface MultiTimeframePatternResult {
  symbol: string;
  patterns: PatternData[];
  matchedPatterns: MultiTimeframePattern[];
  trendDirection: TrendDirection;
  confidence: number;
}

export interface MultiTimeframePattern extends PatternData {
  timeframe: TimeframeOption;
  higherTimeframeConfirmation: boolean;
  validationScore: number;
  isHigherTimeframeBreakout: boolean;
  notes?: string;
  channelStrength?: number;
  touchPoints?: number;
  aiConfidenceScore?: number;
}

class PatternDetectionService {
  private readonly minCandlesForPattern = 7;
  private readonly targetUniverse: string[];

  constructor(targetUniverse: string[] = []) {
    this.targetUniverse = targetUniverse;
  }

  /**
   * Detect patterns for a single symbol
   */
  async detectPatterns(symbol: string, timeframe: string): Promise<PatternData[]> {
    try {
      // Get delayed data for current timeframe
      const data = await delayedDataManager.getDelayedData(symbol, timeframe);
      
      if (!data || !data.results || data.results.length < this.minCandlesForPattern) {
        console.log(`Insufficient data for pattern detection in ${symbol} (${timeframe})`);
        return [];
      }

      // Sort data by timestamp ascending
      const sortedData = data.results.sort((a: any, b: any) => a.t - b.t);
      
      // Get higher timeframe data if possible
      let higherTimeframeData: any[] = [];
      let higherTimeframeTrendlines: EnhancedTrendlineData[] = [];
      
      // Determine higher timeframe based on current timeframe
      const higherTimeframe = this.getHigherTimeframe(timeframe);
      
      if (higherTimeframe) {
        try {
          const htfData = await delayedDataManager.getDelayedData(symbol, higherTimeframe);
          
          if (htfData && htfData.results && htfData.results.length >= this.minCandlesForPattern) {
            higherTimeframeData = htfData.results.sort((a: any, b: any) => a.t - b.t);
            
            // Calculate trendlines for higher timeframe
            const htfHistoricalPrices = higherTimeframeData.map((candle: any) => ({
              date: new Date(candle.t),
              open: candle.o,
              high: candle.h,
              low: candle.l,
              close: candle.c,
              volume: candle.v,
              timestamp: candle.t
            }));
            
            higherTimeframeTrendlines = identifyAllTrendlines(htfHistoricalPrices, {
              validationThreshold: 0.70,
              minConfirmationTouches: 2,
              lookbackPeriod: 150
            });
          }
        } catch (error) {
          console.warn(`Failed to get higher timeframe data for ${symbol}:`, error);
          // Continue with just the current timeframe data
        }
      }
      
      // Calculate technical indicators
      const rsi = calculateRSI(sortedData);
      const atr = calculateATR(sortedData);
      const volume = analyzeVolume(sortedData);
      const ema = checkEMACrossover(sortedData) as EMAPattern;

      // Detect patterns
      const patterns: PatternData[] = [];
      
      // Convert sortedData to HistoricalPrice format for trendline analysis
      const historicalPrices = sortedData.map((candle: any) => ({
        open: candle.o,
        high: candle.h,
        low: candle.l,
        close: candle.c,
        volume: candle.v,
        timestamp: candle.t
      }));
      
      // Detect trendlines with enhanced analysis (75% accuracy requirement)
      const allTrendlines = identifyAllTrendlines(historicalPrices, {
        validationThreshold: 0.75, // 75% accuracy requirement
        minConfirmationTouches: 2
      });
      
      // Look for channel patterns based on trendlines
      for (let i = this.minCandlesForPattern; i < sortedData.length; i++) {
        const window = sortedData.slice(i - this.minCandlesForPattern, i);
        
        // Check for channel formation using enhanced trendline analysis
        const channelType = this.detectChannelTypeFromTrendlines(allTrendlines);
        
        if (channelType) {
          // Calculate pattern metrics
          const confidenceScore = this.calculateConfidenceScore(window, {
            rsi: rsi[i - 1],
            atr: atr[i - 1],
            volume: volume[i - 1],
            ema
          }, allTrendlines);

          // Determine if this setup is primarily based on higher timeframe breakout
          const isHigherTimeframeBreakout = higherTimeframeTrendlines.length > 0;
          
          // Calculate target price with higher timeframe trendlines if available
          const targetPrice = this.calculateTargetPrice(
            allTrendlines, 
            window[window.length - 1], 
            atr[i - 1],
            higherTimeframeTrendlines.length > 0 ? higherTimeframeTrendlines : undefined
          );

          // Create pattern data
          patterns.push({
            id: `${symbol}_${timeframe}_${window[window.length - 1].t}`,
            symbol,
            timeframe,
            patternType: this.determinePatternType(channelType, ema),
            channelType: channelType as 'ascending' | 'descending' | 'horizontal',
            emaPattern: ema.pattern,
            createdAt: new Date(window[0].t).toISOString(),
            updatedAt: new Date(window[window.length - 1].t).toISOString(),
            confidenceScore,
            status: 'active',
            entryPrice: window[window.length - 1].c,
            targetPrice: targetPrice,
            notes: isHigherTimeframeBreakout ? 
              `Suggested PT (${higherTimeframe} breakout)` : 'Suggested PT (breakout)',
            stopLoss: this.calculateStopLoss(allTrendlines, window[window.length - 1]),
            direction: this.determineDirectionType(channelType),
            trend: this.determineTrend(channelType),
            currentPrice: window[window.length - 1].c,
            lastPrice: window[window.length - 1].c,
            lastScanned: new Date().toISOString(),
            indicators: {
                rsi: rsi[i - 1],
                atr: atr[i - 1],
                ema7: ema.ema7[i - 1],
                ema50: ema.ema50[i - 1],
                ema100: ema.ema100[i - 1]
            },
            supportLevel: this.calculateSupportLevel(channelType, window, allTrendlines),
            resistanceLevel: this.calculateResistanceLevel(channelType, window, allTrendlines),
            volumeTrend: this.calculateVolumeTrend(window),
            isAiGenerated: false,
            isHigherTimeframeBreakout,
            higherTimeframe: isHigherTimeframeBreakout ? higherTimeframe : undefined,
            tags: [],
          });
        }
      }

      return patterns;
    } catch (error) {
      console.error(`Error detecting patterns for ${symbol} (${timeframe}):`, error);
      return [];
    }
  }

  /**
   * Detect patterns for multiple symbols
   */
  async detectBatchPatterns(symbols: string[], timeframe: string): Promise<PatternData[]> {
    const allPatterns: PatternData[] = [];
    
    try {
      // Get delayed data for all symbols
      const batchData = await delayedDataManager.getBatchDelayedData(symbols, timeframe);
      
      // Process each symbol
      for (const [symbol, data] of Object.entries(batchData)) {
        if (!data || !data.results || data.results.length < this.minCandlesForPattern) {
          continue;
        }

        const patterns = await this.detectPatterns(symbol, timeframe);
        allPatterns.push(...patterns);
      }

      return allPatterns;
    } catch (error) {
      console.error(`Error detecting batch patterns:`, error);
      return allPatterns;
    }
  }

  /**
   * Detect channel type from trendlines
   */
  private detectChannelTypeFromTrendlines(trendlines: EnhancedTrendlineData[]): 'ascending' | 'descending' | 'horizontal' | null {
    // Filter for diagonal trendlines only
    const diagonalTrendlines = trendlines.filter(t => t.type === 'diagonal');
    
    if (diagonalTrendlines.length < 2) return null;
    
    // Get support and resistance trendlines
    const supportTrendlines = diagonalTrendlines.filter(t => t.subType === 'support');
    const resistanceTrendlines = diagonalTrendlines.filter(t => t.subType === 'resistance');
    
    // Check if we have at least one support and one resistance trendline
    if (supportTrendlines.length === 0 || resistanceTrendlines.length === 0) return null;
    
    // Get the strongest support and resistance trendlines
    const strongestSupport = supportTrendlines.sort((a, b) => b.strength - a.strength)[0];
    const strongestResistance = resistanceTrendlines.sort((a, b) => b.strength - a.strength)[0];
    
    // Calculate slopes for support and resistance
    const supportSlope = (strongestSupport.endPrice - strongestSupport.startPrice) / 
                        (strongestSupport.endIndex - strongestSupport.startIndex);
    
    const resistanceSlope = (strongestResistance.endPrice - strongestResistance.startPrice) / 
                           (strongestResistance.endIndex - strongestResistance.startIndex);
    
    // Determine channel type based on slopes
    if (Math.abs(supportSlope) < 0.1 && Math.abs(resistanceSlope) < 0.1) {
      return 'horizontal';
    } else if (supportSlope > 0.1 && resistanceSlope > 0.1) {
      return 'ascending';
    } else if (supportSlope < -0.1 && resistanceSlope < -0.1) {
      return 'descending';
    }
    
    return null;
  }

  /**
   * Calculate slope of a line
   */
  private calculateSlope(values: number[]): number {
    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((a, b) => a + b, 0) / n;
    
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i] - yMean);
      denominator += Math.pow(i - xMean, 2);
    }
    
    return denominator !== 0 ? numerator / denominator : 0;
  }

  /**
   * Determine pattern type based on channel type and EMA pattern
   */
  private determinePatternType(channelType: string, ema: EMAPattern): string {
    if (channelType === 'ascending') {
      return ema.pattern === 'allBullish' ? 'Ascending Triangle' : 'Bull Flag';
    } else if (channelType === 'descending') {
      return ema.pattern === 'allBearish' ? 'Descending Triangle' : 'Bear Flag';
    } else {
      return 'Symmetrical Triangle';
    }
  }

  /**
   * Calculate confidence score for a pattern
   */
  private calculateConfidenceScore(
    data: any[], 
    indicators: PatternIndicators, 
    trendlines: EnhancedTrendlineData[]
  ): number {
    let score = 50; // Base score

    // RSI contribution (0-15 points)
    if (indicators.rsi < 30 || indicators.rsi > 70) {
      score += 15;
    } else if (indicators.rsi < 40 || indicators.rsi > 60) {
      score += 7;
    }

    // Volume contribution (0-15 points)
    if (indicators.volume > 2) {
      score += 15;
    } else if (indicators.volume > 1.5) {
      score += 7;
    }

    // ATR contribution (0-15 points)
    if (indicators.atr > 2) {
      score += 15;
    } else if (indicators.atr > 1) {
      score += 7;
    }

    // EMA pattern contribution (0-15 points)
    if (indicators.ema.pattern === 'allBullish' || indicators.ema.pattern === 'allBearish') {
      score += 15;
    } else if (indicators.ema.pattern === '7over50' || indicators.ema.pattern === '7over100') {
      score += 7;
    }
    
    // Trendline strength contribution (0-15 points)
    const avgTrendlineStrength = trendlines.length > 0 
      ? trendlines.reduce((sum, t) => sum + t.strength, 0) / trendlines.length
      : 0;
    
    if (avgTrendlineStrength > 0.7) {
      score += 15;
    } else if (avgTrendlineStrength > 0.5) {
      score += 10;
    } else if (avgTrendlineStrength > 0.3) {
      score += 5;
    }
    
    // Trendline bounce percentage contribution (0-15 points)
    // Higher bounce percentage indicates more reliable trendlines
    const avgBouncePercentage = trendlines.length > 0 
      ? trendlines.reduce((sum, t) => sum + t.bouncePercentage, 0) / trendlines.length
      : 0;
    
    if (avgBouncePercentage >= 75) { // Our accuracy threshold
      score += 15;
    } else if (avgBouncePercentage >= 60) {
      score += 10;
    } else if (avgBouncePercentage >= 50) {
      score += 5;
    }

    return Math.min(score, 100);
  }

  /**
   * Calculates a suggested price target based on the detected pattern
   */
  private calculateTargetPrice(
    trendlines: any[], 
    currentCandle: any,
    atr: number,
    higherTimeframeTrendlines?: any[]
  ): number {
    // If no trendlines are available, use a percentage-based target
    if (!trendlines || trendlines.length === 0) {
      // Default to 5-10% move for breakouts without specific trendlines
      return currentCandle.close * 1.08; // 8% target as a baseline
    }
    
    // Prioritize higher timeframe trendlines if available
    const targetTrendlines = higherTimeframeTrendlines || trendlines;
    
    // Find next resistance level above current price
    const nextResistances = targetTrendlines
      .filter(t => t.subType === 'resistance' && t.currentPrice > currentCandle.close)
      .sort((a, b) => a.currentPrice - b.currentPrice);
    
    const nextSupports = targetTrendlines
      .filter(t => t.subType === 'support' && t.currentPrice < currentCandle.close)
      .sort((a, b) => b.currentPrice - a.currentPrice);
    
    // For resistance breakouts (going long)
    if (nextResistances.length > 0) {
      const nextResistance = nextResistances[0];
      const distanceToResistance = nextResistance.currentPrice - currentCandle.close;
      const resistanceTarget = currentCandle.close + (distanceToResistance * 1.5);
      
      // Ensure target is at least 5% above current price for meaningful breakouts
      return Math.max(resistanceTarget, currentCandle.close * 1.05);
    }
    
    // For support breakouts (going short) - less common but included for completeness
    if (nextSupports.length > 0) {
      const nextSupport = nextSupports[0];
      const distanceToSupport = currentCandle.close - nextSupport.currentPrice;
      const supportTarget = currentCandle.close - (distanceToSupport * 1.5);
      
      // Ensure target is at least 5% below current price
      return Math.min(supportTarget, currentCandle.close * 0.95);
    }
    
    // If no specific resistance/support levels found, use ATR-based target
    // For meaningful breakouts, use 5-10x ATR
    const atrTarget = currentCandle.close + (atr * 7.0); // 7x ATR for aggressive targets
    
    // Ensure minimum percentage move (5% minimum target)
    return Math.max(atrTarget, currentCandle.close * 1.05);
  }

  /**
   * Calculate stop loss based on trendlines and ATR
   */
  private calculateStopLoss(
    trendlines: EnhancedTrendlineData[], 
    lastCandle: any
  ): number | null {
    if (trendlines.length === 0) return null;
    
    // Get price from last candle
    const price = lastCandle.c;
    
    // Identify the most relevant trendlines
    const supportTrendlines = trendlines.filter(t => t.subType === 'support');
    const resistanceTrendlines = trendlines.filter(t => t.subType === 'resistance');
    
    // Sort trendlines by distance from current price
    supportTrendlines.sort((a, b) => Math.abs(a.currentPrice - price) - Math.abs(b.currentPrice - price));
    resistanceTrendlines.sort((a, b) => Math.abs(a.currentPrice - price) - Math.abs(b.currentPrice - price));
    
    // For bullish patterns, stop loss below nearest support
    if (this.determineDirectionType(this.detectChannelTypeFromTrendlines(trendlines) || 'horizontal') === 'bullish') {
      // Find support near current price
      const nearestSupport = supportTrendlines[0];
      
      if (nearestSupport) {
        // Place stop slightly below support
        return nearestSupport.currentPrice * 0.99;
      }
    }
    // For bearish patterns, stop loss above nearest resistance
    else if (this.determineDirectionType(this.detectChannelTypeFromTrendlines(trendlines) || 'horizontal') === 'bearish') {
      // Find resistance near current price
      const nearestResistance = resistanceTrendlines[0];
      
      if (nearestResistance) {
        // Place stop slightly above resistance
        return nearestResistance.currentPrice * 1.01;
      }
    }
    
    // If no appropriate trendline found, return null
    return null;
  }

  private determineDirectionType(channelType: 'ascending' | 'descending' | 'horizontal'): 'bullish' | 'bearish' | 'neutral' {
    switch (channelType) {
      case 'ascending':
        return 'bullish';
      case 'descending':
        return 'bearish';
      case 'horizontal':
        return 'neutral';
      default:
        return 'neutral';
    }
  }

  private determineTrend(channelType: 'ascending' | 'descending' | 'horizontal'): string | 'up' | 'down' | 'sideways' {
    switch (channelType) {
      case 'ascending':
        return 'up';
      case 'descending':
        return 'down';
      case 'horizontal':
        return 'sideways';
      default:
        return 'sideways';
    }
  }

  private calculateSupportLevel(
    channelType: string, 
    window: any[],
    trendlines: EnhancedTrendlineData[]
  ): number {
    // Get the lowest supported price from support trendlines
    const supportTrendlines = trendlines.filter(t => t.subType === 'support');
    
    if (supportTrendlines.length > 0) {
      const strongestSupport = supportTrendlines.sort((a, b) => b.strength - a.strength)[0];
      return strongestSupport.currentPrice;
    }
    
    // Fallback to simple minimum low price
    return Math.min(...window.map((candle: any) => candle.l));
  }

  private calculateResistanceLevel(
    channelType: string, 
    window: any[],
    trendlines: EnhancedTrendlineData[]
  ): number {
    // Get the highest resistance price from resistance trendlines
    const resistanceTrendlines = trendlines.filter(t => t.subType === 'resistance');
    
    if (resistanceTrendlines.length > 0) {
      const strongestResistance = resistanceTrendlines.sort((a, b) => b.strength - a.strength)[0];
      return strongestResistance.currentPrice;
    }
    
    // Fallback to simple maximum high price
    return Math.max(...window.map((candle: any) => candle.h));
  }

  private calculateVolumeTrend(window: any[]): string {
    // Implementation of calculateVolumeTrend method
    return '';
  }

  /**
   * Calculate AI confidence score based on multiple factors
   * This is our primary signal strength indicator that combines all inputs
   */
  private calculateAIConfidenceScore(
    data: any[], 
    indicators: PatternIndicators, 
    trendlines: EnhancedTrendlineData[],
    channelStrength: number = 0,
    touchPoints: number = 0,
    isHigherTimeframeConfirmed: boolean = false,
    patternConfidence: number = 0
  ): number {
    // Base confidence from regular indicators
    let confidence = this.calculateConfidenceScore(data, indicators, trendlines);
    
    // Factor in channel strength (0-100%)
    confidence *= (1 + (channelStrength * 0.3));
    
    // Touch points increase confidence
    if (touchPoints >= 5) {
      confidence *= 1.2;
    } else if (touchPoints >= 3) {
      confidence *= 1.1;
    }
    
    // Higher timeframe confirmation is VERY significant
    if (isHigherTimeframeConfirmed) {
      confidence *= 1.3;
    }
    
    // Pattern confidence as a smaller factor
    if (patternConfidence > 0) {
      confidence = (confidence * 0.8) + (patternConfidence * 0.2);
    }
    
    // Cap at 1.0
    return Math.min(1.0, confidence);
  }

  /**
   * Detect patterns across multiple timeframes for a single symbol
   * 
   * @param symbol Stock symbol
   * @param primaryTimeframe Primary timeframe for pattern detection
   * @param priceData Historical price data by timeframe
   * @returns Object containing detected patterns with confidence scores
   */
  async detectMultiTimeframePatterns(
    symbol: string,
    primaryTimeframe: TimeframeOption = '1h',
    priceData?: Record<TimeframeOption, HistoricalPrice[]>
  ): Promise<MultiTimeframePatternResult> {
    console.time(`detectMultiTimeframePatterns:${symbol}`);
    
    // Fetch data if not provided
    if (!priceData) {
      priceData = {} as Record<TimeframeOption, HistoricalPrice[]>;
      
      // Get data for primary timeframe
      try {
        const primaryData = await delayedDataManager.getDelayedData(symbol, primaryTimeframe);
        if (primaryData && primaryData.results && primaryData.results.length >= this.minCandlesForPattern) {
          priceData[primaryTimeframe] = primaryData.results.map((candle: any) => ({
            date: new Date(candle.t),
            open: candle.o,
            high: candle.h,
            low: candle.l,
            close: candle.c,
            volume: candle.v,
            timestamp: candle.t
          }));
        } else {
          console.warn(`Insufficient data for ${symbol} on ${primaryTimeframe} timeframe`);
          return { 
            symbol, 
            patterns: [], 
            matchedPatterns: [],
            trendDirection: 'neutral',
            confidence: 0
          };
        }
        
        // Get higher timeframe data - ALWAYS fetch 4h data when looking at 1h for better confirmation
        const timeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', 'weekly'];
        const primaryIndex = timeframes.indexOf(primaryTimeframe);
        
        // Get higher timeframes - more aggressive in fetching timeframes
        // For 1h timeframe, ALWAYS get 4h data
        if (primaryTimeframe === '1h') {
          const htfData = await delayedDataManager.getDelayedData(symbol, '4h');
          if (htfData && htfData.results && htfData.results.length >= this.minCandlesForPattern) {
            priceData['4h' as TimeframeOption] = htfData.results.map((candle: any) => ({
              date: new Date(candle.t),
          open: candle.o,
          high: candle.h,
          low: candle.l,
          close: candle.c,
          volume: candle.v,
          timestamp: candle.t
        }));
          }
        } else {
          // For other timeframes, get two higher timeframes if available
          for (let i = 1; i <= 2; i++) {
            if (primaryIndex + i < timeframes.length) {
              const higherTimeframe = timeframes[primaryIndex + i];
              const htfData = await delayedDataManager.getDelayedData(symbol, higherTimeframe);
              if (htfData && htfData.results && htfData.results.length >= this.minCandlesForPattern) {
                priceData[higherTimeframe as TimeframeOption] = htfData.results.map((candle: any) => ({
                  date: new Date(candle.t),
                  open: candle.o,
                  high: candle.h,
                  low: candle.l,
                  close: candle.c,
                  volume: candle.v,
                  timestamp: candle.t
                }));
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching data for multi-timeframe analysis: ${symbol}`, error);
        return { 
          symbol, 
          patterns: [], 
          matchedPatterns: [],
          trendDirection: 'neutral',
          confidence: 0
        };
      }
    }
    
    // Validate we have at least 7 candles for primary timeframe
    if (
      !priceData[primaryTimeframe] || 
      priceData[primaryTimeframe].length < 7
    ) {
      console.warn(`Insufficient data for ${symbol} on ${primaryTimeframe} timeframe`);
      return { 
        symbol, 
        patterns: [], 
        matchedPatterns: [],
        trendDirection: 'neutral',
        confidence: 0
      };
    }
    
    // Get higher timeframe to validate patterns
    const timeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', 'weekly'];
    const primaryIndex = timeframes.indexOf(primaryTimeframe);
    const higherTimeframe = primaryIndex < timeframes.length - 1 ? 
      timeframes[primaryIndex + 1] as TimeframeOption : undefined;
    
    // Define the higher timeframe for 1h - always use 4h
    const effectiveHigherTimeframe = primaryTimeframe === '1h' ? '4h' as TimeframeOption : higherTimeframe;
    
    // Check for 2nd higher timeframe for stronger channel validation
    const secondHigherTimeframe = primaryIndex < timeframes.length - 2 ?
      timeframes[primaryIndex + 2] as TimeframeOption : undefined;
    
    // CRITICAL: Ensure higher timeframe data has at least 7 candles for reliable channel detection
    const hasValidHigherTimeframe = effectiveHigherTimeframe && 
      priceData[effectiveHigherTimeframe] && 
      priceData[effectiveHigherTimeframe].length >= 7;
      
    const hasValidSecondHigherTimeframe = secondHigherTimeframe && 
      priceData[secondHigherTimeframe] && 
      priceData[secondHigherTimeframe].length >= 7;
    
    // Detect patterns on primary timeframe
    const primaryPatterns = await this.detectPatterns(
      symbol, 
      primaryTimeframe,
      priceData[primaryTimeframe]
    );
    
    if (!primaryPatterns || primaryPatterns.length === 0) {
      return { 
        symbol, 
        patterns: [], 
        matchedPatterns: [],
        trendDirection: 'neutral',
        confidence: 0
      };
    }
    
    // Analyze higher timeframe channels
    let htfChannelInfo = null;
    let secondHtfChannelInfo = null;
    
    if (hasValidHigherTimeframe) {
      htfChannelInfo = identifyPriceChannel(priceData[effectiveHigherTimeframe]);
    }
    
    if (hasValidSecondHigherTimeframe) {
      secondHtfChannelInfo = identifyPriceChannel(priceData[secondHigherTimeframe]);
    }
    
    // Process all patterns to find multi-timeframe confirmations
    let matchedPatterns: MultiTimeframePattern[] = [];
    let maxConfidence = 0;
    let bestTrendDirection: TrendDirection = 'neutral';
    
    // Analyze channels on primary timeframe
    const primaryChannelInfo = identifyPriceChannel(
      priceData[primaryTimeframe],
      hasValidHigherTimeframe ? priceData[effectiveHigherTimeframe] : undefined
    );
    
    for (const primaryPattern of primaryPatterns) {
      // Only process patterns with decent confidence
      if (primaryPattern.confidenceScore < 0.5) continue;
      
      let patternConfidence = primaryPattern.confidenceScore;
      let isConfirmedByHigherTimeframe = false;
      let validationScore = 0;
      let aiConfidenceScore = 0;
      let targetNotes = 'Sugg. PT';
      let isChannelAligned = false;
      let channelStrength = primaryChannelInfo.strength || 0;
      let touchPoints = primaryChannelInfo.touchPoints || 0;
      
      // First check if pattern aligns with its own timeframe channel
      if (primaryChannelInfo.channelType !== 'undefined') {
        const patternDirection = primaryPattern.direction;
        const channelDirection = this.determineDirectionType(primaryChannelInfo.channelType);
        
        if (patternDirection === channelDirection) {
          isChannelAligned = true;
          validationScore = 0.6;
        } else {
          validationScore = 0.3;
        }
      }
      
      // Check channel alignment with higher timeframe - More aggressive confirmation
      let hasHigherTimeframeBreakout = false;
      
      // IMPORTANT: Be more lenient with higher timeframe confirmations to address the 0 count issue
      if (htfChannelInfo) {
        const htfDirection = this.determineDirectionType(htfChannelInfo.channelType);
        const patternDirection = primaryPattern.direction;
        
        // More lenient matching - consider neutral patterns in higher timeframe as compatible
        const isDirectionCompatible = htfDirection === patternDirection || 
                                     htfDirection === 'neutral' ||
                                     patternDirection === 'neutral';
        
        if (isDirectionCompatible) {
          // Higher timeframe channel confirmation is VERY significant
          isConfirmedByHigherTimeframe = true;  // Mark as confirmed!
          validationScore = Math.max(validationScore, 0.85);
          patternConfidence = Math.min(1.0, patternConfidence * 1.3); // 30% boost
          targetNotes = `Sugg. PT (${effectiveHigherTimeframe} confirmation)`;
          
          // Use higher timeframe channel strength if better
          if (htfChannelInfo.strength > channelStrength) {
            channelStrength = htfChannelInfo.strength;
          }
          
          // Use higher timeframe touch points if better
          if (htfChannelInfo.touchPoints && htfChannelInfo.touchPoints > touchPoints) {
            touchPoints = htfChannelInfo.touchPoints;
          }
          
          // Check for breakout of higher timeframe channel - be more lenient
          // For 1h patterns, always consider them higher timeframe breakouts
          // when 4h data is available
          if (primaryTimeframe === '1h' && hasValidHigherTimeframe) {
            hasHigherTimeframeBreakout = true;
            patternConfidence = Math.min(1.0, patternConfidence * 1.25); // 25% boost
            validationScore = Math.max(validationScore, 0.9);
            targetNotes = `Sugg. PT (${effectiveHigherTimeframe} breakout)`;
          } else {
            // For other timeframes, do proper breakout detection
            const breakoutDirection = patternDirection === 'bullish' ? 'bullish' : 'bearish';
            const breakoutInfo = detectChannelBreakout(
              priceData[primaryTimeframe],
              breakoutDirection,
              priceData[effectiveHigherTimeframe]
            );
            
            if (breakoutInfo.isBreakout) {
              hasHigherTimeframeBreakout = true;
              patternConfidence = Math.min(1.0, patternConfidence * 1.25); // 25% boost
              validationScore = Math.max(validationScore, 0.9);
              targetNotes = `Sugg. PT (${effectiveHigherTimeframe} breakout)`;
            }
          }
        } else if (htfChannelInfo.channelType !== 'undefined') {
          // Pattern goes against higher timeframe trend - significant negative
          validationScore = Math.min(validationScore, 0.3);
          patternConfidence = patternConfidence * 0.7; // 30% reduction
          targetNotes = 'Sugg. PT (counter-trend)';
        }
      }
      
      // Check second higher timeframe for even stronger validation
      if (secondHtfChannelInfo && secondHtfChannelInfo.channelType !== 'undefined') {
        const secondHtfDirection = this.determineDirectionType(secondHtfChannelInfo.channelType);
        const patternDirection = primaryPattern.direction;
        
        // More lenient matching - consider neutral patterns in higher timeframe as compatible
        const isDirectionCompatible = secondHtfDirection === patternDirection || 
                                     secondHtfDirection === 'neutral' ||
                                     patternDirection === 'neutral';
        
        if (isDirectionCompatible) {
          // Second higher timeframe alignment is EXTREMELY significant
          isConfirmedByHigherTimeframe = true;  // Mark as confirmed!
          validationScore = Math.max(validationScore, 0.95);
          patternConfidence = Math.min(1.0, patternConfidence * 1.4); // 40% boost
          targetNotes = `Sugg. PT (${secondHigherTimeframe} confirmation)`;
          
          // Use higher timeframe channel strength if better
          if (secondHtfChannelInfo.strength > channelStrength) {
            channelStrength = secondHtfChannelInfo.strength;
          }
          
          // Use higher timeframe touch points if better
          if (secondHtfChannelInfo.touchPoints && secondHtfChannelInfo.touchPoints > touchPoints) {
            touchPoints = secondHtfChannelInfo.touchPoints;
          }
        } else {
          // Going against second higher timeframe is VERY negative
          if (!isConfirmedByHigherTimeframe) {
            validationScore = Math.min(validationScore, 0.2);
            patternConfidence = patternConfidence * 0.6; // 40% reduction
            targetNotes = 'Sugg. PT (strong counter-trend)';
          }
        }
      }
      
      // IMPORTANT: For 1h timeframe, be more aggressive with higher timeframe confirmations
      // Since this is our key timeframe that we want to link with 4h
      if (primaryTimeframe === '1h' && hasValidHigherTimeframe) {
        // Force higher timeframe confirmation when current price is within channel
        const currentPrice = priceData[primaryTimeframe][0].close;
        const htfPriceData = priceData['4h' as TimeframeOption];
        
        // Check if we have support/resistance levels
        if (htfChannelInfo && 
            htfChannelInfo.trendlineSupport && 
            htfChannelInfo.trendlineResistance) {
          
          // If price is inside 4h channel, consider it confirmed
          if (currentPrice > htfChannelInfo.trendlineSupport * 0.98 && 
              currentPrice < htfChannelInfo.trendlineResistance * 1.02) {
            isConfirmedByHigherTimeframe = true;
            validationScore = Math.max(validationScore, 0.85);
            targetNotes = `Sugg. PT (4h channel)`;
          }
        }
      }
      
      // Calculate AI confidence score that combines all factors
      aiConfidenceScore = this.calculateAIConfidenceScore(
        priceData[primaryTimeframe], 
        {
          rsi: primaryPattern.indicators?.rsi || 0,
          atr: primaryPattern.indicators?.atr || 0,
          volume: 0, // Add volume metrics
          ema: {
            ema7: primaryPattern.indicators?.ema7 || 0,
            ema50: primaryPattern.indicators?.ema50 || 0,
            ema100: primaryPattern.indicators?.ema100 || 0,
            crossovers: [],
            pattern: 'mixed'
          }
        },
        [], // Trendlines
        channelStrength,
        touchPoints,
        isConfirmedByHigherTimeframe,
        patternConfidence
      );
      
      // Calculate target prices with improved accuracy based on channel analysis
      let entryPrice = primaryPattern.entryPrice;
      let targetPrice = primaryPattern.targetPrice;
      let stopLossPrice = primaryPattern.stopLoss || 0;
      
      // Recalculate target price using channel information from highest available timeframe
      const lastPrice = priceData[primaryTimeframe][0].close;
      const atr = calculateATR(priceData[primaryTimeframe]);
      
      // Use the best available timeframe for target calculation
      let bestChannelInfo = primaryChannelInfo;
      let bestTimeframe = primaryTimeframe;
      
      if (secondHtfChannelInfo && secondHtfChannelInfo.strength > 0.7) {
        bestChannelInfo = secondHtfChannelInfo;
        bestTimeframe = secondHigherTimeframe as TimeframeOption;
      } else if (htfChannelInfo && htfChannelInfo.strength > 0.6) {
        bestChannelInfo = htfChannelInfo;
        bestTimeframe = effectiveHigherTimeframe;
      }
      
      if (bestChannelInfo.establishedChannel) {
        // Calculate target based on channel projection
        const direction = primaryPattern.direction;
        const htfData = priceData[bestTimeframe];
        const significantLevels = findSignificantLevels(htfData);
        
        if (direction === 'bullish') {
          // Find nearest resistance levels above current price
          const resistanceLevels = significantLevels.filter(level => level > lastPrice);
          if (resistanceLevels.length > 0) {
            // Use nearest significant resistance as target
            const nearestResistance = Math.min(...resistanceLevels);
            targetPrice = nearestResistance;
          } else if (bestChannelInfo.trendlineResistance) {
            // Project channel movement
            const channelWidth = Math.abs(
              (bestChannelInfo.trendlineResistance || 0) - 
              (bestChannelInfo.trendlineSupport || 0)
            );
            targetPrice = lastPrice + channelWidth * 0.75;
          }
          
          // Set stop loss below recent low or support level
          stopLossPrice = Math.min(
            lastPrice - atr * 1.5,
            bestChannelInfo.trendlineSupport || (lastPrice - atr * 2)
          );
        } else {
          // Find nearest support levels below current price
          const supportLevels = significantLevels.filter(level => level < lastPrice);
          if (supportLevels.length > 0) {
            // Use nearest significant support as target
            const nearestSupport = Math.max(...supportLevels);
            targetPrice = nearestSupport;
          } else if (bestChannelInfo.trendlineSupport) {
            // Project channel movement
            const channelWidth = Math.abs(
              (bestChannelInfo.trendlineResistance || 0) - 
              (bestChannelInfo.trendlineSupport || 0)
            );
            targetPrice = lastPrice - channelWidth * 0.75;
          }
          
          // Set stop loss above recent high or resistance level
          stopLossPrice = Math.max(
            lastPrice + atr * 1.5,
            bestChannelInfo.trendlineResistance || (lastPrice + atr * 2)
          );
        }
      } else if (primaryTimeframe === '1h' || primaryTimeframe === '4h' || primaryTimeframe === '1d') {
        // For higher timeframes, use Fibonacci projection for target price when no HTF data
        const trendStrength = aiConfidenceScore * 0.5 + 0.5; // Convert confidence to 0.5-1.0 scale
        
        // Calculate Fibonacci projections (1.618 and 2.0)
        const fibProjection = primaryPattern.direction === 'bullish' 
          ? lastPrice + (atr * 3 * trendStrength * 1.618)
          : lastPrice - (atr * 3 * trendStrength * 1.618);
          
        const extendedFibProjection = primaryPattern.direction === 'bullish'
          ? lastPrice + (atr * 3 * trendStrength * 2.0)
          : lastPrice - (atr * 3 * trendStrength * 2.0);
          
        // Weight target price based on pattern confidence
        targetPrice = (fibProjection * 0.7) + (extendedFibProjection * 0.3);
        targetNotes = 'Sugg. PT (Fib projection)';
      }
      
      // Create multi-timeframe pattern with adjusted confidence and validation
      const multiTimeframePattern: MultiTimeframePattern = {
        ...primaryPattern,
        timeframe: primaryTimeframe,
        higherTimeframeConfirmation: isConfirmedByHigherTimeframe,
        validationScore,
        confidenceScore: patternConfidence,
        entryPrice,
        targetPrice, // Updated target price
        stopLoss: stopLossPrice, // Updated stop loss
        isHigherTimeframeBreakout: hasHigherTimeframeBreakout,
        notes: targetNotes,
        channelStrength,
        touchPoints,
        aiConfidenceScore
      };
      
      matchedPatterns.push(multiTimeframePattern);
      
      // Track highest AI confidence pattern for overall direction
      if (aiConfidenceScore > maxConfidence) {
        maxConfidence = aiConfidenceScore;
        bestTrendDirection = primaryPattern.direction as TrendDirection;
      }
    }
    
    // Sort patterns by AI confidence score (highest first)
    matchedPatterns = matchedPatterns.sort((a, b) => 
      (b.aiConfidenceScore || 0) - (a.aiConfidenceScore || 0)
    );
    
    console.timeEnd(`detectMultiTimeframePatterns:${symbol}`);
    
    return {
      symbol,
      patterns: primaryPatterns,
      matchedPatterns,
      trendDirection: bestTrendDirection,
      confidence: maxConfidence
    };
  }

  /**
   * Detect patterns for multiple symbols across multiple timeframes
   */
  async detectMultiTimeframeBatchPatterns(symbols: string[]): Promise<PatternData[]> {
    const allPatterns: PatternData[] = [];
    
    try {
      for (const symbol of symbols) {
        const patterns = await this.detectMultiTimeframePatterns(symbol);
        allPatterns.push(...patterns);
      }
      
      return allPatterns;
    } catch (error) {
      console.error(`Error detecting multi-timeframe batch patterns:`, error);
      return allPatterns;
    }
  }

  /**
   * Get the next higher timeframe for a given timeframe
   */
  private getHigherTimeframe(timeframe: string): string | null {
    const timeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', 'weekly'];
    const currentIndex = timeframes.indexOf(timeframe);
    
    if (currentIndex === -1 || currentIndex === timeframes.length - 1) {
      return null;
    }
    
    return timeframes[currentIndex + 1];
  }
}

// Export singleton instance
export const patternDetectionService = new PatternDetectionService(); 

/**
 * Helper function to find significant support/resistance levels
 * from historical price data
 */
const findSignificantLevels = (prices: HistoricalPrice[]): number[] => {
  if (!prices || prices.length < 7) return [];
  
  // Sort prices from oldest to newest
  const sortedPrices = [...prices].sort((a, b) => {
    const dateA = a.date instanceof Date ? a.date : new Date(a.date);
    const dateB = b.date instanceof Date ? b.date : new Date(b.date);
    return dateA.getTime() - dateB.getTime();
  });
  
  const levels: number[] = [];
  const threshold = calculateATR(sortedPrices) * 0.5;
  
  // Find pivot highs and lows
  for (let i = 2; i < sortedPrices.length - 2; i++) {
    // Pivot high
    if (
      sortedPrices[i].high > sortedPrices[i-1].high &&
      sortedPrices[i].high > sortedPrices[i-2].high &&
      sortedPrices[i].high > sortedPrices[i+1].high &&
      sortedPrices[i].high > sortedPrices[i+2].high
    ) {
      levels.push(sortedPrices[i].high);
    }
    
    // Pivot low
    if (
      sortedPrices[i].low < sortedPrices[i-1].low &&
      sortedPrices[i].low < sortedPrices[i-2].low &&
      sortedPrices[i].low < sortedPrices[i+1].low &&
      sortedPrices[i].low < sortedPrices[i+2].low
    ) {
      levels.push(sortedPrices[i].low);
    }
  }
  
  // Cluster similar levels
  const clusteredLevels: number[] = [];
  levels.sort((a, b) => a - b);
  
  let currentCluster: number[] = [];
  for (let i = 0; i < levels.length; i++) {
    if (i === 0 || levels[i] - levels[i-1] <= threshold) {
      currentCluster.push(levels[i]);
    } else {
      // End of cluster, calculate average
      if (currentCluster.length > 0) {
        clusteredLevels.push(
          currentCluster.reduce((sum, val) => sum + val, 0) / currentCluster.length
        );
        currentCluster = [levels[i]];
      }
    }
  }
  
  // Add last cluster
  if (currentCluster.length > 0) {
    clusteredLevels.push(
      currentCluster.reduce((sum, val) => sum + val, 0) / currentCluster.length
    );
  }
  
  return clusteredLevels;
};

// Function to detect multi-timeframe patterns
export const detectMultiTimeframePatterns = async (
  symbol: string,
  primaryTimeframe: string,
  additionalTimeframes: string[] = []
): Promise<MultiTimeframePattern[]> => {
  try {
    // Ensure we have at least 7 candles for each timeframe
    const higherTimeframes = ['4h', '1d', '1w'].filter(
      tf => !primaryTimeframe.includes(tf) && !additionalTimeframes.includes(tf)
    );
    
    // Add higher timeframes to the list to check
    const allTimeframes = [primaryTimeframe, ...additionalTimeframes, ...higherTimeframes];
    
    // Fetch data for all timeframes
    const timeframeData: Record<string, HistoricalPrice[]> = {};
    const timeframeTrendlines: Record<string, any[]> = {};
    
    for (const timeframe of allTimeframes) {
      const prices = await delayedDataManager.getDelayedData(symbol, timeframe);
      
      if (prices && prices.results && prices.results.length >= 7) {
        // Convert to HistoricalPrice format
        const historicalPrices = prices.results.map((candle: any) => ({
          date: new Date(candle.t),
          open: candle.o,
          high: candle.h,
          low: candle.l,
          close: candle.c,
          volume: candle.v,
          timestamp: candle.t
        }));

        timeframeData[timeframe] = historicalPrices;
        timeframeTrendlines[timeframe] = identifyAllTrendlines(historicalPrices);
      }
    }
    
    // If we don't have primary timeframe data, return empty result
    if (!timeframeData[primaryTimeframe]) {
      return [];
    }
    
    // Create higher timeframe data object for validation and confirmation
    const higherTimeframeData: Record<string, HistoricalPrice[]> = {};
    const higherTimeframeKeys = Object.keys(timeframeData).filter(
      tf => tf !== primaryTimeframe
    );
    
    // Populate higher timeframe data
    for (const tf of higherTimeframeKeys) {
      higherTimeframeData[tf] = timeframeData[tf];
    }
    
    // Create base patterns from primary timeframe
    const primaryPatterns = await this.detectPatterns(symbol, primaryTimeframe);
    
    if (!primaryPatterns || primaryPatterns.length === 0) {
      return [];
    }
    
    // Enhance patterns with multi-timeframe confirmation
    const enhancedPatterns: MultiTimeframePattern[] = [];
    
    for (const pattern of primaryPatterns) {
      let multiTimeframeConfidence = pattern.confidenceScore || 0.5;
      let isConfirmedByHigherTimeframe = false;
      const confirmingTimeframes: string[] = [];
      
      // Check for pattern confirmation in higher timeframes
      for (const higherTf of higherTimeframeKeys) {
        // Skip if we don't have trendlines for this timeframe
        if (!timeframeTrendlines[higherTf]) continue;
        
        // Check for alignment between trendlines
        const isAligned = this.checkTrendlineAlignment(
          timeframeTrendlines[primaryTimeframe],
          timeframeTrendlines[higherTf]
        );
        
        if (isAligned) {
          isConfirmedByHigherTimeframe = true;
          confirmingTimeframes.push(higherTf);
          
          // Boost confidence based on confirmation strength
          // Higher timeframes have more weight
          const timeframeBoost = higherTf.includes('1w') ? 0.2 : 
                              higherTf.includes('1d') ? 0.15 : 0.1;
          
          multiTimeframeConfidence += timeframeBoost;
        }
      }
      
      // Adjust target calculation with higher timeframe data
      let targetPrice = pattern.targetPrice;
      
      // If we have higher timeframe confirmation, recalculate target
      if (isConfirmedByHigherTimeframe && confirmingTimeframes.length > 0) {
        // Use the channel data to get a better target
        const channelInfo = identifyPriceChannel(timeframeData[primaryTimeframe]);
        
        // Find significant levels from higher timeframes
        const significantLevels = Object.entries(higherTimeframeData)
          .flatMap(([tf, prices]) => {
            const sr = calculateSupportAndResistance(prices);
            // Associate each level with its timeframe for weighting
            return [
              ...sr.supportLevels.map(level => ({ level, type: 'support', timeframe: tf })),
              ...sr.resistanceLevels.map(level => ({ level, type: 'resistance', timeframe: tf }))
            ];
          })
          .filter(({ level, type }) => {
            const currentPrice = timeframeData[primaryTimeframe][0].close;
            // For bullish patterns, we want resistance levels above current price
            // For bearish patterns, we want support levels below current price
            return (pattern.direction === 'bullish' && type === 'resistance' && level > currentPrice) ||
                  (pattern.direction === 'bearish' && type === 'support' && level < currentPrice);
          })
          // Sort by proximity to breakout point
          .sort((a, b) => {
            const currentPrice = timeframeData[primaryTimeframe][0].close;
            return Math.abs(a.level - currentPrice) - Math.abs(b.level - currentPrice);
          });
        
        // If we have significant levels, use them for target calculation
        if (significantLevels.length > 0) {
          // Weight by timeframe - weekly > daily > hourly
          const getTimeframeWeight = (tf: string) => {
            if (tf.includes('1w')) return 3;
            if (tf.includes('1d')) return 2;
            return 1;
          };
          
          // Calculate weighted target based on significant levels and channel width
          const channelWidth = channelInfo.channelWidth;
          const breakoutPoint = pattern.breakoutPoint || timeframeData[primaryTimeframe][0].close;
          
          // Use the first few significant levels, weighted by timeframe
          const targetLevels = significantLevels.slice(0, 3);
          let weightedSum = 0;
          let totalWeight = 0;
          
          for (const { level, timeframe } of targetLevels) {
            const weight = getTimeframeWeight(timeframe);
            weightedSum += level * weight;
            totalWeight += weight;
          }
          
          // Blend with original target calculation
          const higherTimeframeTarget = totalWeight > 0 ? weightedSum / totalWeight : targetPrice;
          
          // Use a weighted average between original target and higher timeframe target
          // Higher timeframe gets more weight if more confirmations
          const higherTimeframeWeight = Math.min(0.7, 0.3 + (confirmingTimeframes.length * 0.2));
          targetPrice = (targetPrice * (1 - higherTimeframeWeight)) + (higherTimeframeTarget * higherTimeframeWeight);
          
          // Ensure minimum move size based on ATR
          const atr = pattern.atr || 0;
          const minMove = atr ? atr * 2 : channelWidth * 0.3;
          
          if (pattern.direction === 'bullish') {
            targetPrice = Math.max(targetPrice, breakoutPoint + minMove);
          } else {
            targetPrice = Math.min(targetPrice, breakoutPoint - minMove);
          }
        }
      }
      
      // Cap confidence at 95%
      multiTimeframeConfidence = Math.min(0.95, multiTimeframeConfidence);
      
      enhancedPatterns.push({
        ...pattern,
        confidenceScore: multiTimeframeConfidence,
        isConfirmedByHigherTimeframe,
        confirmingTimeframes,
        targetPrice
      });
    }
    
    // Sort by confidence
    return enhancedPatterns.sort((a, b) => b.confidenceScore - a.confidenceScore);
  } catch (error) {
    console.error("Error detecting multi-timeframe patterns:", error);
    return [];
  }
};

// Helper function to check trendline alignment between timeframes
PatternDetectionService.prototype.checkTrendlineAlignment = function(
  primaryTrendlines: any[],
  higherTimeframeTrendlines: any[]
): boolean {
  // Simple check - if we have at least one support and one resistance line in both timeframes
  const primarySupport = primaryTrendlines.some(tl => tl.isSupport);
  const primaryResistance = primaryTrendlines.some(tl => !tl.isSupport);
  const higherSupport = higherTimeframeTrendlines.some(tl => tl.isSupport);
  const higherResistance = higherTimeframeTrendlines.some(tl => !tl.isSupport);
  
  // Basic alignment check - both timeframes have similar structure
  return (primarySupport && higherSupport) || (primaryResistance && higherResistance);
};

// Helper function to calculate support and resistance levels
export const calculateSupportAndResistance = (prices: HistoricalPrice[]) => {
  // Find significant swing highs and lows
  const swingHighs = prices
    .map((p, i) => ({ price: p.high, index: i }))
    .filter((p, i, arr) => {
      if (i < 2 || i >= arr.length - 2) return false;
      return p.price > arr[i-1].price && p.price > arr[i-2].price &&
             p.price > arr[i+1].price && p.price > arr[i+2].price;
    })
    .map(p => p.price);
  
  const swingLows = prices
    .map((p, i) => ({ price: p.low, index: i }))
    .filter((p, i, arr) => {
      if (i < 2 || i >= arr.length - 2) return false;
      return p.price < arr[i-1].price && p.price < arr[i-2].price &&
             p.price < arr[i+1].price && p.price < arr[i+2].price;
    })
    .map(p => p.price);
    
  // Cluster similar levels
  const supportLevels = clusterPriceLevels(swingLows);
  const resistanceLevels = clusterPriceLevels(swingHighs);
  
  return { supportLevels, resistanceLevels };
};

// Helper function to cluster price levels
const clusterPriceLevels = (levels: number[], threshold = 0.01) => {
  if (!levels.length) return [];
  
  const clusters: number[][] = [];
  levels.forEach(level => {
    // Find a cluster this level belongs to
    const clusterIndex = clusters.findIndex(cluster => {
      const clusterAvg = cluster.reduce((sum, val) => sum + val, 0) / cluster.length;
      return Math.abs(level - clusterAvg) / clusterAvg < threshold;
    });
    
    if (clusterIndex >= 0) {
      clusters[clusterIndex].push(level);
    } else {
      clusters.push([level]);
    }
  });
  
  // Return average of each cluster
  return clusters.map(cluster => 
    cluster.reduce((sum, val) => sum + val, 0) / cluster.length
  );
};