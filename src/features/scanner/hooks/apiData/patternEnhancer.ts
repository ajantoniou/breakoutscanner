
import { PatternData } from '@/services/types/patternTypes';
import { HistoricalPrice } from '@/services/backtesting/backtestTypes';
import { 
  calculateRSI, 
  calculateATR, 
  checkEMACrossover, 
  analyzeVolume 
} from '@/services/api/marketData/technicalIndicators';
import { PolygonApiClient } from '@/services/api/marketData/polygon/polygonApiClient';

/**
 * Function to enhance patterns with channel information from raw price data
 */
export const enhancePatternsWithChannelInfo = async (
  patterns: PatternData[], 
  timeframe: string,
  apiKey: string = ''
): Promise<PatternData[]> => {
  // Create a cached client instance if API key is provided
  const client = apiKey ? new PolygonApiClient(apiKey) : null;
  
  // Process patterns in batches to avoid overwhelming the API
  const enhancedPatterns: PatternData[] = [];
  
  for (const pattern of patterns) {
    try {
      // Skip if necessary data is already present
      if (pattern.trendlineSupport && 
          pattern.trendlineResistance && 
          pattern.channelType && 
          pattern.atr) {
        enhancedPatterns.push(pattern);
        continue;
      }
      
      // If we don't have a client, just add basic channel info
      if (!client) {
        const enhancedPattern = {
          ...pattern,
          trendlineSupport: pattern.supportLevel || 0,
          trendlineResistance: pattern.resistanceLevel || 0,
          channelType: inferChannelType(pattern),
          atr: pattern.atr || estimateATR(pattern)
        };
        enhancedPatterns.push(enhancedPattern);
        continue;
      }
      
      // Fetch historical data for this symbol
      const historicalData = await client.fetchAggregatesForSymbol(
        pattern.symbol,
        timeframe === 'hour' ? 'hour' : 'day', 
        100 // Get last 100 bars
      );
      
      // If we have data, enhance the pattern
      if (historicalData && historicalData.results && historicalData.results.length > 0) {
        // Convert to our HistoricalPrice format
        const prices: HistoricalPrice[] = historicalData.results.map((bar: any) => ({
          date: new Date(bar.t).toISOString(), // Convert to string for type compatibility
          open: bar.o,
          high: bar.h,
          low: bar.l, 
          close: bar.c,
          volume: bar.v,
          symbol: pattern.symbol
        })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Newest first
        
        // Calculate technical indicators
        const rsi = calculateRSI(prices, 14);
        const atr = calculateATR(prices);
        const emaCrossoverResult = checkEMACrossover(prices);
        const volumeTrend = analyzeVolume(prices);
        
        // Identify trendlines
        const { 
          trendlineSupport, 
          trendlineResistance, 
          channelType 
        } = identifyTrendlines(prices);
        
        // Enhance pattern with calculated data
        const enhancedPattern: PatternData = {
          ...pattern,
          rsi,
          atr,
          // Store emaCrossovers without type error
          trendlineSupport,
          trendlineResistance,
          channelType,
          volumeConfirmation: volumeTrend.increasing
        };
        
        enhancedPatterns.push(enhancedPattern);
      } else {
        // If we couldn't get data, just add basic channel info
        const enhancedPattern = {
          ...pattern,
          trendlineSupport: pattern.supportLevel || 0,
          trendlineResistance: pattern.resistanceLevel || 0,
          channelType: inferChannelType(pattern),
          atr: pattern.atr || estimateATR(pattern)
        };
        enhancedPatterns.push(enhancedPattern);
      }
    } catch (error) {
      console.error(`Error enhancing pattern for ${pattern.symbol}:`, error);
      // Add the original pattern in case of error
      enhancedPatterns.push(pattern);
    }
  }
  
  return enhancedPatterns;
};

/**
 * Identify trend lines from price data
 */
const identifyTrendlines = (prices: HistoricalPrice[]): {
  trendlineSupport: number;
  trendlineResistance: number;
  channelType: 'ascending' | 'descending' | 'horizontal';
} => {
  if (prices.length < 10) {
    return { 
      trendlineSupport: 0, 
      trendlineResistance: 0, 
      channelType: 'horizontal' 
    };
  }
  
  const recentPrices = prices.slice(0, 20); // Use most recent 20 bars
  
  // Simple linear regression for trendlines
  const points = recentPrices.map((p, i) => ({ 
    x: i, 
    yLow: p.low, 
    yHigh: p.high 
  }));
  
  // Support line calculation (connecting lows)
  let n = points.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  points.forEach(point => {
    sumX += point.x;
    sumY += point.yLow;
    sumXY += point.x * point.yLow;
    sumX2 += point.x * point.x;
  });
  
  // Calculate slope and intercept for support line
  const slopeSupport = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const interceptSupport = (sumY - slopeSupport * sumX) / n;
  
  // Calculate projected support at current point (x=0)
  const trendlineSupport = interceptSupport;
  
  // Resistance line calculation (connecting highs)
  sumX = 0; sumY = 0; sumXY = 0; sumX2 = 0;
  
  points.forEach(point => {
    sumX += point.x;
    sumY += point.yHigh;
    sumXY += point.x * point.yHigh;
    sumX2 += point.x * point.x;
  });
  
  // Calculate slope and intercept for resistance line
  const slopeResistance = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const interceptResistance = (sumY - slopeResistance * sumX) / n;
  
  // Calculate projected resistance at current point (x=0)
  const trendlineResistance = interceptResistance;
  
  // Determine channel type based on slopes
  let channelType: 'ascending' | 'descending' | 'horizontal' = 'horizontal';
  
  const averageSlope = (slopeSupport + slopeResistance) / 2;
  
  if (averageSlope > 0.5) {
    channelType = 'ascending';
  } else if (averageSlope < -0.5) {
    channelType = 'descending';
  }
  
  return {
    trendlineSupport: parseFloat(trendlineSupport.toFixed(2)),
    trendlineResistance: parseFloat(trendlineResistance.toFixed(2)),
    channelType
  };
};

/**
 * Infer channel type from basic pattern data
 */
const inferChannelType = (pattern: PatternData): 'ascending' | 'descending' | 'horizontal' => {
  if (!pattern.direction) {
    return 'horizontal';
  }
  
  if (pattern.direction === 'bullish') {
    return 'ascending';
  } else if (pattern.direction === 'bearish') {
    return 'descending';
  }
  
  return 'horizontal';
};

/**
 * Estimate ATR when real data isn't available
 */
const estimateATR = (pattern: PatternData): number => {
  const currentPrice = pattern.currentPrice || pattern.entryPrice || 0;
  
  if (currentPrice <= 0) {
    return 0;
  }
  
  // Rough estimate of ATR as 2% of price for stocks over $10, 3% for cheaper stocks
  return currentPrice > 10 ? currentPrice * 0.02 : currentPrice * 0.03;
};
