// Simple script to generate high-confidence predictions from the Golden Scanner
// This script uses the core functionality we've implemented without requiring the full web app

const axios = require('axios');

// Polygon API key
const POLYGON_API_KEY = 'onEimwzRMEYR2FhgLVBZnAmyz9EC8KfI';

// Test symbols - focus on liquid stocks with good volatility
const SYMBOLS = [
  'AAPL', 'MSFT', 'TSLA', 'AMZN', 'GOOGL', 'META', 'NVDA', 'AMD', 
  'NFLX', 'DIS', 'BA', 'JPM', 'V', 'WMT', 'PG', 'JNJ', 'UNH', 'HD',
  'INTC', 'CSCO', 'VZ', 'T', 'PFE', 'MRK', 'KO', 'PEP', 'ADBE', 'CRM'
];

// Timeframes to analyze
const TIMEFRAMES = ['1h', '4h', '1d'];

// Minimum confidence score for Golden Scanner
const CONFIDENCE_THRESHOLD = 80;

// Minimum profit target percentage
const PROFIT_TARGET_THRESHOLD = 5;

// Main function to get high-confidence predictions
async function getHighConfidencePredictions() {
  console.log('🔍 Golden Scanner: Generating high-confidence predictions...');
  console.log(`Analyzing ${SYMBOLS.length} symbols across ${TIMEFRAMES.join(', ')} timeframes\n`);
  
  const scanStartTime = new Date();
  const results = [];
  
  try {
    // Process each symbol
    for (const symbol of SYMBOLS) {
      console.log(`Processing ${symbol}...`);
      
      // Get current price
      const currentPrice = await getCurrentPrice(symbol);
      
      // Process each timeframe
      for (const timeframe of TIMEFRAMES) {
        // Get candles for the symbol and timeframe
        const { candles, metadata } = await getCandles(symbol, timeframe);
        
        if (candles.length < 20) {
          console.log(`  Insufficient data for ${symbol} on ${timeframe} timeframe`);
          continue;
        }
        
        // Detect patterns
        const patterns = detectPatterns(symbol, candles, timeframe, metadata);
        
        // Calculate confidence scores
        const patternsWithScores = calculateConfidenceScores(patterns, candles);
        
        // Filter for high-confidence patterns
        const highConfidencePatterns = patternsWithScores.filter(pattern => 
          pattern.confidenceScore >= CONFIDENCE_THRESHOLD &&
          pattern.potentialProfit >= PROFIT_TARGET_THRESHOLD
        );
        
        // Add current price to patterns
        highConfidencePatterns.forEach(pattern => {
          pattern.currentPrice = currentPrice;
          pattern.expectedBreakoutTime = calculateExpectedBreakoutTime(pattern.timeframe);
          pattern.expectedCandlesToBreakout = getExpectedCandlesToBreakout(pattern.timeframe);
        });
        
        // Add to results
        results.push(...highConfidencePatterns);
      }
    }
    
    // Sort by confidence score (highest first)
    results.sort((a, b) => b.confidenceScore - a.confidenceScore);
    
    // Display results
    displayResults(results, scanStartTime);
    
    return results;
  } catch (error) {
    console.error('Error generating predictions:', error);
    return [];
  }
}

// Get current price for a symbol
async function getCurrentPrice(symbol) {
  try {
    const url = `https://api.polygon.io/v2/last/trade/${symbol}?apiKey=${POLYGON_API_KEY}`;
    const response = await axios.get(url);
    
    if (response.data.status === 'OK' && response.data.results) {
      return response.data.results.p;
    }
    
    // Fallback to previous close
    return getPreviousClose(symbol);
  } catch (error) {
    console.error(`Error getting current price for ${symbol}:`, error.message);
    return getPreviousClose(symbol);
  }
}

// Get previous close price as fallback
async function getPreviousClose(symbol) {
  try {
    const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?adjusted=true&apiKey=${POLYGON_API_KEY}`;
    const response = await axios.get(url);
    
    if (response.data.status === 'OK' && response.data.results && response.data.results.length > 0) {
      return response.data.results[0].c;
    }
    
    return 0;
  } catch (error) {
    console.error(`Error getting previous close for ${symbol}:`, error.message);
    return 0;
  }
}

// Get candles for a symbol and timeframe
async function getCandles(symbol, timeframe) {
  try {
    // Convert timeframe to Polygon parameters
    const { multiplier, timespan } = convertTimeframe(timeframe);
    
    // Calculate date range
    const to = new Date().toISOString().split('T')[0];
    let from;
    
    if (timeframe === '1d') {
      // For daily, get 60 days of data
      const start = new Date();
      start.setDate(start.getDate() - 60);
      from = start.toISOString().split('T')[0];
    } else if (timeframe === '4h') {
      // For 4-hour, get 20 days of data
      const start = new Date();
      start.setDate(start.getDate() - 20);
      from = start.toISOString().split('T')[0];
    } else {
      // For hourly, get 10 days of data
      const start = new Date();
      start.setDate(start.getDate() - 10);
      from = start.toISOString().split('T')[0];
    }
    
    // Fetch data from Polygon
    const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${from}/${to}?adjusted=true&sort=asc&limit=120&apiKey=${POLYGON_API_KEY}`;
    const response = await axios.get(url);
    
    if (response.data.status === 'OK' && response.data.results) {
      // Convert to candle format
      const candles = response.data.results.map(bar => ({
        timestamp: bar.t,
        open: bar.o,
        high: bar.h,
        low: bar.l,
        close: bar.c,
        volume: bar.v,
        ema7: 0,
        ema20: 0,
        ema50: 0,
        rsi14: 0,
        atr14: 0
      }));
      
      // Calculate indicators
      const candlesWithIndicators = calculateIndicators(candles);
      
      // Check if data is delayed
      const isDelayed = isDataDelayed(candlesWithIndicators);
      
      return {
        candles: candlesWithIndicators,
        metadata: {
          fetchedAt: new Date().toISOString(),
          isDelayed,
          source: 'polygon_api'
        }
      };
    }
    
    return { candles: [], metadata: { fetchedAt: new Date().toISOString(), isDelayed: true, source: 'error' } };
  } catch (error) {
    console.error(`Error getting candles for ${symbol} (${timeframe}):`, error.message);
    return { candles: [], metadata: { fetchedAt: new Date().toISOString(), isDelayed: true, source: 'error' } };
  }
}

// Convert timeframe string to Polygon parameters
function convertTimeframe(timeframe) {
  switch (timeframe) {
    case '1h':
      return { timespan: 'hour', multiplier: 1 };
    case '4h':
      return { timespan: 'hour', multiplier: 4 };
    case '1d':
      return { timespan: 'day', multiplier: 1 };
    default:
      return { timespan: 'hour', multiplier: 1 };
  }
}

// Check if data is delayed
function isDataDelayed(candles) {
  if (candles.length === 0) return true;
  
  const latestCandleTime = candles[candles.length - 1].timestamp;
  const currentTime = Date.now();
  
  // Check if latest candle is more than 15 minutes old
  return (currentTime - latestCandleTime) > 15 * 60 * 1000;
}

// Calculate technical indicators for candles
function calculateIndicators(candles) {
  if (candles.length === 0) return [];
  
  // Make a copy of candles to avoid modifying the original
  const result = [...candles];
  
  // Calculate EMAs
  calculateEMA(result, 7);
  calculateEMA(result, 20);
  calculateEMA(result, 50);
  
  // Calculate RSI
  calculateRSI(result, 14);
  
  // Calculate ATR
  calculateATR(result, 14);
  
  return result;
}

// Calculate Exponential Moving Average (EMA)
function calculateEMA(candles, period) {
  if (candles.length < period) return;
  
  // Calculate first SMA as starting point for EMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += candles[i].close;
  }
  
  const multiplier = 2 / (period + 1);
  const emaKey = `ema${period}`;
  
  // Set first EMA as SMA
  candles[period - 1][emaKey] = sum / period;
  
  // Calculate EMA for remaining candles
  for (let i = period; i < candles.length; i++) {
    candles[i][emaKey] = (candles[i].close - candles[i - 1][emaKey]) * multiplier + candles[i - 1][emaKey];
  }
}

// Calculate Relative Strength Index (RSI)
function calculateRSI(candles, period) {
  if (candles.length <= period) return;
  
  let gains = 0;
  let losses = 0;
  
  // Calculate first average gain and loss
  for (let i = 1; i <= period; i++) {
    const change = candles[i].close - candles[i - 1].close;
    if (change >= 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }
  
  let avgGain = gains / period;
  let avgLoss = losses / period;
  
  // Calculate RSI for remaining candles
  for (let i = period + 1; i < candles.length; i++) {
    const change = candles[i].close - candles[i - 1].close;
    
    if (change >= 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
    }
    
    if (avgLoss === 0) {
      candles[i].rsi14 = 100;
    } else {
      const rs = avgGain / avgLoss;
      candles[i].rsi14 = 100 - (100 / (1 + rs));
    }
  }
}

// Calculate Average True Range (ATR)
function calculateATR(candles, period) {
  if (candles.length <= period) return;
  
  // Calculate True Range for each candle
  const trueRanges = [];
  
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;
    
    const tr1 = high - low;
    const tr2 = Math.abs(high - prevClose);
    const tr3 = Math.abs(low - prevClose);
    
    const trueRange = Math.max(tr1, tr2, tr3);
    trueRanges.push(trueRange);
  }
  
  // Calculate first ATR as simple average of true ranges
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += trueRanges[i];
  }
  
  let atr = sum / period;
  candles[period].atr14 = atr;
  
  // Calculate ATR for remaining candles
  for (let i = period + 1; i < candles.length; i++) {
    atr = (atr * (period - 1) + trueRanges[i - 1]) / period;
    candles[i].atr14 = atr;
  }
}

// Detect patterns in candle data
function detectPatterns(symbol, candles, timeframe, metadata) {
  const patterns = [];
  
  // Detect Bull Flag patterns
  const bullFlags = detectBullFlags(symbol, candles, timeframe);
  patterns.push(...bullFlags);
  
  // Detect Ascending Triangle patterns
  const ascendingTriangles = detectAscendingTriangles(symbol, candles, timeframe);
  patterns.push(...ascendingTriangles);
  
  // Add data freshness to patterns
  patterns.forEach(pattern => {
    pattern.dataFreshness = getDataFreshnessStatus(metadata);
  });
  
  return patterns;
}

// Detect Bull Flag patterns
function detectBullFlags(symbol, candles, timeframe) {
  const patterns = [];
  
  // We need at least 20 candles to identify a pattern
  for (let i = 20; i < candles.length; i++) {
    // Check for pole (strong uptrend)
    const poleStart = i - 20;
    const poleEnd = i - 10;
    
    const poleCandles = candles.slice(poleStart, poleEnd);
    const isPole = isPoleForBullFlag(poleCandles);
    
    if (!isPole) continue;
    
    // Check for flag (consolidation)
    const flagStart = poleEnd;
    const flagEnd = i;
    
    const flagCandles = candles.slice(flagStart, flagEnd);
    const isFlag = isFlagForBullFlag(flagCandles);
    
    if (!isFlag) continue;
    
    // Calculate pattern parameters
    const entry = candles[i - 1].high * 1.01; // Entry just above the flag
    const poleHeight = poleCandles[poleCandles.length - 1].high - poleCandles[0].low;
    const target = entry + poleHeight; // Target is pole height projected from entry
    const stopLoss = flagCandles.reduce((min, candle) => Math.min(min, candle.low), Infinity) * 0.99; // Stop loss just below flag low
    
    // Calculate risk-reward ratio and potential profit
    const risk = entry - stopLoss;
    const reward = target - entry;
    const riskRewardRatio = reward / risk;
    const potentialProfit = ((target - entry) / entry) * 100;
    
    // Only include patterns with good risk-reward ratio
    if (riskRewardRatio < 2) continue;
    
    // Create pattern object
    const pattern = {
      symbol,
      patternType: 'Bull Flag',
      direction: 'bullish',
      timeframe,
      entry,
      target,
      stopLoss,
      riskRewardRatio,
      potentialProfit,
      confidenceScore: 0, // Will be calculated later
      detectedAt: new Date().toISOString()
    };
    
    patterns.push(pattern);
  }
  
  return patterns;
}

// Check if candles form a pole for Bull Flag
function isPoleForBullFlag(candles) {
  if (candles.length < 5) return false;
  
  // Calculate price change over the period
  const startPrice = candles[0].open;
  const endPrice = candles[candles.length - 1].close;
  const priceChange = (endPrice - startPrice) / startPrice;
  
  // Check if price increased significantly (at least 5%)
  if (priceChange < 0.05) return false;
  
  // Check if most candles are bullish
  const bullishCandles = candles.filter(candle => candle.close > candle.open);
  if (bullishCandles.length < candles.length * 0.6) return false;
  
  // Check for increasing volume
  const startVolume = candles.slice(0, 3).reduce((sum, candle) => sum + candle.volume, 0) / 3;
  const endVolume = candles.slice(-3).reduce((sum, candle) => sum + candle.volume, 0) / 3;
  if (endVolume < startVolume) return false;
  
  return true;
}

// Check if candles form a flag for Bull Flag
function isFlagForBullFlag(candles) {
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

// Detect Ascending Triangle patterns
function detectAscendingTriangles(symbol, candles, timeframe) {
  const patterns = [];
  
  // We need at least 20 candles to identify a pattern
  for (let i = 20; i < candles.length; i++) {
    const patternCandles = candles.slice(i - 20, i);
    
    // Check for flat resistance
    const hasResistance = hasFlatResistance(patternCandles);
    if (!hasResistance) continue;
    
    // Check for rising support
    const hasRisingSupport = hasRisingSupport(patternCandles);
    if (!hasRisingSupport) continue;
    
    // Calculate pattern parameters
    const resistanceLevel = calculateResistanceLevel(patternCandles);
    const entry = resistanceLevel * 1.01; // Entry just above resistance
    const patternHeight = resistanceLevel - patternCandles[patternCandles.length - 1].low;
    const target = entry + patternHeight; // Target is pattern height projected from entry
    const stopLoss = patternCandles[patternCandles.length - 1].low * 0.99; // Stop loss just below the last low
    
    // Calculate risk-reward ratio and potential profit
    const risk = entry - stopLoss;
    const reward = target - entry;
    const riskRewardRatio = reward / risk;
    const potentialProfit = ((target - entry) / entry) * 100;
    
    // Only include patterns with good risk-reward ratio
    if (riskRewardRatio < 2) continue;
    
    // Create pattern object
    const pattern = {
      symbol,
      patternType: 'Ascending Triangle',
      direction: 'bullish',
      timeframe,
      entry,
      target,
      stopLoss,
      riskRewardRatio,
      potentialProfit,
      confidenceScore: 0, // Will be calculated later
      detectedAt: new Date().toISOString()
    };
    
    patterns.push(pattern);
  }
  
  return patterns;
}

// Check if candles have a flat resistance level
function hasFlatResistance(candles) {
  // Get all highs
  const highs = candles.map(candle => candle.high);
  
  // Find potential resistance level (average of top 3 highs)
  const sortedHighs = [...highs].sort((a, b) => b - a);
  const resistanceLevel = (sortedHighs[0] + sortedHighs[1] + sortedHighs[2]) / 3;
  
  // Count how many candles touch the resistance level (within 0.5%)
  const touchesResistance = highs.filter(high => 
    Math.abs(high - resistanceLevel) / resistanceLevel < 0.005
  ).length;
  
  // Need at least 3 touches of resistance
  return touchesResistance >= 3;
}

// Check if candles have a rising support level
function hasRisingSupport(candles) {
  // Divide candles into segments
  const segments = 4;
  const segmentSize = Math.floor(candles.length / segments);
  
  // Calculate lowest low for each segment
  const segmentLows = [];
  for (let i = 0; i < segments; i++) {
    const start = i * segmentSize;
    const end = start + segmentSize;
    const segmentCandles = candles.slice(start, end);
    const lowestLow = Math.min(...segmentCandles.map(candle => candle.low));
    segmentLows.push(lowestLow);
  }
  
  // Check if lows are generally rising
  let risingCount = 0;
  for (let i = 1; i < segmentLows.length; i++) {
    if (segmentLows[i] > segmentLows[i - 1]) {
      risingCount++;
    }
  }
  
  // Need at least 2 out of 3 segments to show rising lows
  return risingCount >= 2;
}

// Calculate resistance level from candles
function calculateResistanceLevel(candles) {
  // Get all highs
  const highs = candles.map(candle => candle.high);
  
  // Find potential resistance level (average of top 3 highs)
  const sortedHighs = [...highs].sort((a, b) => b - a);
  return (sortedHighs[0] + sortedHighs[1] + sortedHighs[2]) / 3;
}

// Calculate confidence scores for patterns
function calculateConfidenceScores(patterns, candles) {
  return patterns.map(pattern => {
    // Base confidence score
    let score = 60;
    
    // Pattern type bonus
    if (pattern.patternType === 'Bull Flag') {
      score += 5;
    } else if (pattern.patternType === 'Ascending Triangle') {
      score += 8;
    }
    
    // Timeframe bonus
    if (pattern.timeframe === '1d') {
      score += 10;
    } else if (pattern.timeframe === '4h') {
      score += 5;
    }
    
    // Risk-reward ratio bonus
    if (pattern.riskRewardRatio >= 3) {
      score += 10;
    } else if (pattern.riskRewardRatio >= 2.5) {
      score += 5;
    }
    
    // Profit potential bonus
    if (pattern.potentialProfit >= 10) {
      score += 10;
    } else if (pattern.potentialProfit >= 7) {
      score += 5;
    }
    
    // Volume confirmation
    const recentCandles = candles.slice(-5);
    const avgVolume = recentCandles.reduce((sum, candle) => sum + candle.volume, 0) / recentCandles.length;
    const prevAvgVolume = candles.slice(-10, -5).reduce((sum, candle) => sum + candle.volume, 0) / 5;
    
    if (avgVolume > prevAvgVolume * 1.2) {
      score += 5;
    }
    
    // Trend strength
    const ema20 = candles[candles.length - 1].ema20;
    const ema50 = candles[candles.length - 1].ema50;
    
    if (ema20 > ema50 && pattern.direction === 'bullish') {
      score += 5;
    } else if (ema20 < ema50 && pattern.direction === 'bearish') {
      score += 5;
    }
    
    // RSI confirmation
    const rsi = candles[candles.length - 1].rsi14;
    
    if (pattern.direction === 'bullish' && rsi > 50 && rsi < 70) {
      score += 5;
    } else if (pattern.direction === 'bearish' && rsi < 50 && rsi > 30) {
      score += 5;
    }
    
    // Cap score at 100
    score = Math.min(score, 100);
    
    return {
      ...pattern,
      confidenceScore: score
    };
  });
}

// Get data freshness status string
function getDataFreshnessStatus(metadata) {
  if (!metadata) {
    return 'Unknown';
  }

  if (metadata.source === 'error') {
    return 'Error';
  }

  if (metadata.source === 'cache') {
    return 'Cached';
  }

  if (metadata.isDelayed) {
    return 'Delayed (15m)';
  }

  return 'Real-time';
}

// Calculate expected breakout time
function calculateExpectedBreakoutTime(timeframe) {
  const now = new Date();
  const expectedCandles = getExpectedCandlesToBreakout(timeframe);
  const timeframeInMinutes = getTimeframeInMinutes(timeframe);
  
  return new Date(now.getTime() + (expectedCandles * timeframeInMinutes * 60 * 1000));
}

// Get expected candles to breakout based on timeframe
function getExpectedCandlesToBreakout(timeframe) {
  switch (timeframe) {
    case '1h':
      return 5;
    case '4h':
      return 4;
    case '1d':
      return 3;
    default:
      return 5;
  }
}

// Get timeframe in minutes
function getTimeframeInMinutes(timeframe) {
  switch (timeframe) {
    case '1h':
      return 60;
    case '4h':
      return 240;
    case '1d':
      return 1440;
    default:
      return 60;
  }
}

// Display results
function displayResults(results, scanStartTime) {
  const scanDuration = (new Date() - scanStartTime) / 1000;
  
  console.log('\n✅ Golden Scanner Results');
  console.log(`Scan completed in ${scanDuration.toFixed(2)} seconds`);
  console.log(`Found ${results.length} high-confidence patterns\n`);
  
  if (results.length === 0) {
    console.log('No high-confidence patterns found at this time.');
    return;
  }
  
  // Display top patterns
  console.log('Top High-Confidence Predictions:');
  console.log('===============================\n');
  
  results.slice(0, 5).forEach((prediction, index) => {
    console.log(`#${index + 1}: ${prediction.symbol} - ${prediction.patternType} (${prediction.timeframe})`);
    console.log(`Direction: ${prediction.direction}`);
    console.log(`Confidence: ${prediction.confidenceScore}%`);
    console.log(`Current Price: $${prediction.currentPrice ? prediction.currentPrice.toFixed(2) : 'N/A'}`);
    console.log(`Entry: $${prediction.entry.toFixed(2)}`);
    console.log(`Target: $${prediction.target.toFixed(2)}`);
    console.log(`Stop Loss: $${prediction.stopLoss.toFixed(2)}`);
    console.log(`Potential Profit: ${prediction.potentialProfit.toFixed(2)}%`);
    console.log(`Risk/Reward: ${prediction.riskRewardRatio.toFixed(2)}`);
    console.log(`Data Freshness: ${prediction.dataFreshness}`);
    
    const breakoutTime = prediction.expectedBreakoutTime;
    console.log(`Expected Breakout: ${breakoutTime.toLocaleString()} (${prediction.expectedCandlesToBreakout} candles)`);
    console.log('---------------------------------------\n');
  });
  
  // Summary by timeframe
  const timeframeCounts = {};
  TIMEFRAMES.forEach(tf => {
    timeframeCounts[tf] = results.filter(p => p.timeframe === tf).length;
  });
  
  console.log('Patterns by Timeframe:');
  Object.entries(timeframeCounts).forEach(([tf, count]) => {
    console.log(`${tf}: ${count} patterns`);
  });
  
  // Summary by pattern type
  const patternTypeCounts = {};
  results.forEach(p => {
    patternTypeCounts[p.patternType] = (patternTypeCounts[p.patternType] || 0) + 1;
  });
  
  console.log('\nPatterns by Type:');
  Object.entries(patternTypeCounts).forEach(([type, count]) => {
    console.log(`${type}: ${count} patterns`);
  });
}

// Run the script
getHighConfidencePredictions();
