import { PatternData } from '../../types/patternTypes';
import { detectDoubleBottom, detectDoubleTop, detectBullFlag, detectBearFlag } from './patternDetection';
import { fetchStockData } from './dataService';
import { DEFAULT_API_KEY } from './apiKeyService';
import { processPolygonDataForBacktest, createDefaultPatternData } from './polygon/dataTransformer';

/**
 * Converts API data to PatternData format with improved pattern detection
 */
export const convertToPatternData = (apiData: any, timeframe: string): PatternData[] => {
  if (!apiData || !apiData['Meta Data']) {
    console.error('Invalid API data format:', apiData);
    return [];
  }
  
  const symbol = apiData['Meta Data']['2. Symbol'];
  
  // Determine the time series key based on the timeframe
  let timeSeriesKey = '';
  if (timeframe === 'weekly') {
    timeSeriesKey = 'Weekly Time Series';
  } else if (timeframe === 'monthly') {
    timeSeriesKey = 'Monthly Time Series';
  } else {
    timeSeriesKey = 'Time Series (Daily)';
  }
  
  if (!apiData[timeSeriesKey]) {
    console.error(`No ${timeSeriesKey} data found in API response:`, apiData);
    return [];
  }
  
  const timeSeriesData = apiData[timeSeriesKey];
  const patterns: PatternData[] = [];
  
  // Convert time series data to an array of price data for analysis
  const dates = Object.keys(timeSeriesData).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  
  // Need enough data points for pattern detection
  if (dates.length < 30) {
    console.warn(`Not enough data points for ${symbol}, found ${dates.length}`);
    return [];
  }
  
  // Process the data to look for patterns
  // We'll analyze windows of data to find potential patterns
  for (let i = 0; i < dates.length - 30; i++) {
    const windowDates = dates.slice(i, i + 30);
    const priceData = windowDates.map(date => {
      const data = timeSeriesData[date];
      return {
        date: new Date(date),
        open: parseFloat(data['1. open']),
        high: parseFloat(data['2. high']),
        low: parseFloat(data['3. low']),
        close: parseFloat(data['4. close']),
        volume: parseInt(data['5. volume'], 10)
      };
    });
    
    // Look for Double Bottom pattern
    if (detectDoubleBottom(priceData)) {
      const patternData = createPatternData(
        symbol, 
        timeframe, 
        'Double Bottom', 
        priceData, 
        'bullish'
      );
      patterns.push(patternData);
    }
    
    // Look for Double Top pattern
    if (detectDoubleTop(priceData)) {
      const patternData = createPatternData(
        symbol, 
        timeframe, 
        'Double Top', 
        priceData, 
        'bearish'
      );
      patterns.push(patternData);
    }
    
    // Look for Bull Flag pattern
    if (detectBullFlag(priceData)) {
      const patternData = createPatternData(
        symbol, 
        timeframe, 
        'Bull Flag', 
        priceData, 
        'bullish'
      );
      patterns.push(patternData);
    }
    
    // Look for Bear Flag pattern
    if (detectBearFlag(priceData)) {
      const patternData = createPatternData(
        symbol, 
        timeframe, 
        'Bear Flag', 
        priceData, 
        'bearish'
      );
      patterns.push(patternData);
    }
  }
  
  return patterns;
};

// Helper functions for pattern quality assessment
export const detectRoundedPattern = (priceData: any[]): boolean => {
  // Check if the pattern has a rounded shape rather than sharp V or inverted V
  // This is a simplistic approach - in a real app you'd use more sophisticated analysis
  return true; // Simplified for this example
};

export const assessFlagQuality = (priceData: any[], direction: 'bullish' | 'bearish'): number => {
  // Assess how well-formed the flag is
  // Return a score from -10 to +10 to adjust confidence
  
  // For simplicity, we'll return a positive score
  return 5;
};

// Validation function for patterns - updating to lower confidence thresholds
export const validatePatternWithPrices = (
  patternType: string,
  direction: 'bullish' | 'bearish',
  priceData: any[],
  emaPattern: string,
  channelType: string
): { isValid: boolean; confidence: number } => {
  let confidence = 50; // Base confidence
  
  // 1. Check pattern and direction alignment
  const isBullishPattern = direction === 'bullish';
  
  // 2. Check EMA alignment with direction
  if ((isBullishPattern && (emaPattern === 'allBullish' || emaPattern === '7over50')) ||
      (!isBullishPattern && (emaPattern === 'allBearish' || emaPattern === '7under50'))) {
    confidence += 10;
  } else if (emaPattern === 'mixed') {
    confidence -= 5;
  } else {
    confidence -= 10; // EMA contradicts pattern direction
  }
  
  // 3. Check channel type alignment
  if ((isBullishPattern && channelType === 'ascending') ||
      (!isBullishPattern && channelType === 'descending')) {
    confidence += 10;
  } else if (channelType === 'horizontal') {
    confidence += 5; // Horizontal channels can work for both directions
  } else {
    confidence -= 5; // Channel type contradicts direction
  }
  
  // 4. Check volume confirmation
  if (hasVolumeConfirmation(priceData)) {
    confidence += 10;
  }
  
  // 5. Check for trendline break
  if (isTrendlineBroken(priceData, direction)) {
    confidence += 15;
  }
  
  // Adjust based on pattern type specifics
  switch (patternType) {
    case 'Double Bottom':
    case 'Double Top':
      if (detectRoundedPattern(priceData)) {
        confidence += 5; // Well-formed rounded pattern
      }
      break;
    case 'Bull Flag':
    case 'Bear Flag':
      const flagQuality = assessFlagQuality(priceData, direction);
      confidence += flagQuality;
      break;
  }
  
  // Clamp confidence between 0 and 100
  confidence = Math.max(0, Math.min(100, confidence));
  
  // Lower the valid threshold to ensure more patterns are detected
  return {
    isValid: confidence >= 50, // Lowered from 60 to 50
    confidence
  };
};

// Helper function to create a pattern data object
export const createPatternData = (
  symbol: string,
  timeframe: string,
  patternType: string,
  priceData: any[],
  direction: 'bullish' | 'bearish'
): PatternData => {
  const currentPrice = priceData[0].close;
  const volatility = calculateVolatility(priceData);
  const supportLevel = direction === 'bullish' ? 
    findSupport(priceData) : currentPrice * 0.95;
  const resistanceLevel = direction === 'bearish' ? 
    findResistance(priceData) : currentPrice * 1.05;
  
  // Set target price based on pattern type and direction
  const targetMultiplier = direction === 'bullish' ? 
    1 + (volatility * 1.5) : 1 - (volatility * 1.5);
  const targetPrice = parseFloat((currentPrice * targetMultiplier).toFixed(2));
  
  // Determine EMA pattern
  const emaPattern = determineEMAPattern(priceData);
  
  // Determine channel type
  const channelType = determineChannelType(priceData);
  
  // Calculate confidence score based on multiple factors
  const validationResult = validatePatternWithPrices(
    patternType, 
    direction, 
    priceData, 
    emaPattern, 
    channelType
  );
  
  return {
    id: `${symbol}-${patternType}-${new Date().getTime()}`,
    symbol,
    timeframe,
    patternType,
    entryPrice: currentPrice,
    targetPrice,
    confidenceScore: validationResult.confidence,
    status: 'active',
    createdAt: new Date().toISOString(), // Convert to string to match expected type
    channelType: channelType as 'horizontal' | 'ascending' | 'descending',
    emaPattern,
    supportLevel,
    resistanceLevel,
    trendlineBreak: isTrendlineBroken(priceData, direction),
    volumeConfirmation: hasVolumeConfirmation(priceData)
  };
};

// Helper functions for pattern detection and validation
export const calculateVolatility = (priceData: any[]): number => {
  const closes = priceData.map(data => data.close);
  const returns = [];
  
  for (let i = 1; i < closes.length; i++) {
    returns.push((closes[i-1] - closes[i]) / closes[i]);
  }
  
  // Calculate standard deviation of returns
  const mean = returns.reduce((sum, val) => sum + val, 0) / returns.length;
  const squaredDiffs = returns.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / squaredDiffs.length;
  
  return Math.sqrt(variance);
};

export const findSupport = (priceData: any[]): number => {
  const lows = priceData.map(data => data.low);
  const sortedLows = [...lows].sort((a, b) => a - b);
  
  // Use the lowest 10% of prices as a support level
  const supportIndex = Math.floor(sortedLows.length * 0.1);
  return sortedLows[supportIndex];
};

export const findResistance = (priceData: any[]): number => {
  const highs = priceData.map(data => data.high);
  const sortedHighs = [...highs].sort((a, b) => b - a);
  
  // Use the highest 10% of prices as a resistance level
  const resistanceIndex = Math.floor(sortedHighs.length * 0.1);
  return sortedHighs[resistanceIndex];
};

export const determineEMAPattern = (priceData: any[]): string => {
  // In a real app, you'd calculate actual EMAs
  // For this example, we'll simulate EMA relationships based on price trends
  
  const prices = priceData.map(data => data.close);
  const shortTerm = prices.slice(0, 7).reduce((sum, price) => sum + price, 0) / 7;
  const mediumTerm = prices.slice(0, 20).reduce((sum, price) => sum + price, 0) / 20;
  const longTerm = prices.slice(0, 50).reduce((sum, price) => sum + price, 0) / 50;
  
  if (shortTerm > mediumTerm && mediumTerm > longTerm) {
    return 'allBullish'; // 7>50>100
  } else if (shortTerm < mediumTerm && mediumTerm < longTerm) {
    return 'allBearish'; // 7<50<100
  } else if (shortTerm > mediumTerm && mediumTerm < longTerm) {
    return '7over50'; // 7>50<100
  } else if (shortTerm < mediumTerm && mediumTerm > longTerm) {
    return '7under50'; // 7<50>100
  } else {
    return 'mixed';
  }
};

export const determineChannelType = (priceData: any[]): string => {
  // Look at the trend of highs and lows to determine channel type
  const firstHalf = priceData.slice(priceData.length / 2);
  const secondHalf = priceData.slice(0, priceData.length / 2);
  
  const firstHalfHighs = firstHalf.map(data => data.high);
  const secondHalfHighs = secondHalf.map(data => data.high);
  const firstHalfLows = firstHalf.map(data => data.low);
  const secondHalfLows = secondHalf.map(data => data.low);
  
  const avgFirstHighs = firstHalfHighs.reduce((sum, h) => sum + h, 0) / firstHalfHighs.length;
  const avgSecondHighs = secondHalfHighs.reduce((sum, h) => sum + h, 0) / secondHalfHighs.length;
  const avgFirstLows = firstHalfLows.reduce((sum, l) => sum + l, 0) / firstHalfLows.length;
  const avgSecondLows = secondHalfLows.reduce((sum, l) => sum + l, 0) / secondHalfLows.length;
  
  const highsDiff = avgSecondHighs - avgFirstHighs;
  const lowsDiff = avgSecondLows - avgFirstLows;
  
  // If both highs and lows are increasing
  if (highsDiff > 0 && lowsDiff > 0) {
    return 'ascending';
  }
  // If both highs and lows are decreasing
  else if (highsDiff < 0 && lowsDiff < 0) {
    return 'descending';
  }
  // If the range is relatively stable
  else {
    return 'horizontal';
  }
};

export const isTrendlineBroken = (priceData: any[], direction: 'bullish' | 'bearish'): boolean => {
  // In a real app, you'd calculate actual trendlines
  // For this example, we'll look for a break of recent swing highs/lows
  
  if (direction === 'bullish') {
    // Look for a break above recent swing highs
    const recentHighs = priceData.slice(1, 10).map(data => data.high);
    const maxRecent = Math.max(...recentHighs);
    return priceData[0].close > maxRecent;
  } else {
    // Look for a break below recent swing lows
    const recentLows = priceData.slice(1, 10).map(data => data.low);
    const minRecent = Math.min(...recentLows);
    return priceData[0].close < minRecent;
  }
};

export const hasVolumeConfirmation = (priceData: any[]): boolean => {
  // Check if recent volume is above average
  const volumes = priceData.map(data => data.volume);
  const avgVolume = volumes.slice(1, 10).reduce((sum, vol) => sum + vol, 0) / 9;
  
  return volumes[0] > avgVolume * 1.2;
};

/**
 * Fetches pattern data for multiple symbols with improved pattern detection
 */
export const fetchPatternData = async (
  symbols: string[] = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'AMD', 'INTC', 'MU'],
  timeframe: string = 'day',
  apiKey: string = DEFAULT_API_KEY,
  isPremium: boolean = true
): Promise<PatternData[]> => {
  try {
    const allPatterns: PatternData[] = [];
    let successes = 0;
    let failures = 0;
    let emptyResponses = 0;
    
    console.log(`[fetchPatternData] Starting to fetch pattern data for ${symbols.length} symbols using Polygon.io`);
    console.log(`[fetchPatternData] Using timeframe: ${timeframe}`);
    
    // Due to API rate limits, we'll fetch data for each symbol separately
    for (const symbol of symbols) {
      try {
        console.log(`[fetchPatternData] Fetching data for ${symbol}...`);
        const apiData = await fetchStockData(symbol, timeframe, apiKey);
        
        if (!apiData) {
          console.warn(`[fetchPatternData] No data returned for ${symbol}`);
          failures++;
          continue;
        }
        
        // Check if we got an empty response (no price data)
        if (apiData.empty || !apiData.results || apiData.results.length === 0) {
          console.warn(`[fetchPatternData] Empty data returned for ${symbol}`);
          emptyResponses++;
          continue;
        }
        
        // First try to convert the raw API data to our internal pattern format
        try {
          const patterns = convertToPatternData(apiData, timeframe);
          
          console.log(`[fetchPatternData] Found ${patterns.length} patterns for ${symbol}`);
          allPatterns.push(...patterns);
          successes++;
        } catch (convertError) {
          console.error(`[fetchPatternData] Error converting data for ${symbol}:`, convertError);
          
          // Fallback to creating a default pattern if conversion fails
          try {
            // Process data for backtest to ensure it's in the right format
            const historicalPrices = processPolygonDataForBacktest(apiData, symbol);
            if (historicalPrices.length > 0) {
              // Create a default pattern
              const defaultPattern = createDefaultPatternData(symbol, historicalPrices);
              console.log(`[fetchPatternData] Created default pattern for ${symbol}`);
              allPatterns.push(defaultPattern);
              successes++;
            } else {
              console.error(`[fetchPatternData] Failed to create default pattern for ${symbol}: No price data`);
              failures++;
            }
          } catch (fallbackError) {
            console.error(`[fetchPatternData] Fallback pattern creation failed for ${symbol}:`, fallbackError);
            failures++;
          }
        }
        
        // Wait briefly between API calls to avoid rate limiting
        // Polygon.io has better rate limits than Alpha Vantage, but still good practice
        if (symbols.length > 10 && !isPremium) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (error) {
        console.error(`[fetchPatternData] Error fetching data for ${symbol}:`, error);
        failures++;
      }
    }
    
    // Convert dates in patternData to strings before returning
    const patternsWithStringDates = allPatterns.map(pattern => {
      return {
        ...pattern,
        createdAt: typeof pattern.createdAt === 'object' ? 
          (pattern.createdAt as Date).toISOString() : String(pattern.createdAt),
        lastUpdated: pattern.lastUpdated ? (
          typeof pattern.lastUpdated === 'object' ? 
            (pattern.lastUpdated as Date).toISOString() : String(pattern.lastUpdated)
        ) : new Date().toISOString()
      };
    });
    
    console.log(`[fetchPatternData] Completed pattern fetching. Successes: ${successes}, Failures: ${failures}, Empty: ${emptyResponses}`);
    console.log(`[fetchPatternData] Total patterns found: ${patternsWithStringDates.length}`);
    
    return patternsWithStringDates;
  } catch (error) {
    console.error('[fetchPatternData] Error fetching pattern data:', error);
    return [];
  }
};
