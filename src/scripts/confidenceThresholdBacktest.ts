import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { setTimeout } from 'timers/promises';
import { v4 as uuidv4 } from 'uuid';
dotenv.config();

// Use the Polygon API key from the project
const POLYGON_API_KEY = 'onEimwzRMEYR2FhgLVBZnAmyz9EC8KfI';

// Use the Supabase service role key instead of the anon key
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ttmeplqmrjhysyqzuaoh.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0bWVwbHFtcmpoeXN5cXp1YW9oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzIxNTQ3MCwiZXhwIjoyMDU4NzkxNDcwfQ.IEts22TIOhglV_S7pRWpyD6zYUiO8d4Wc_SICgAqHBA';
const supabase = createClient(supabaseUrl, supabaseKey);

// Generate a proper UUID
function generateUUID(): string {
  return uuidv4();
}

// Configuration
// Full day trading universe from README
const DAY_TRADING_UNIVERSE = [
  'AAPL', 'MSFT', 'AMZN', 'NVDA', 'GOOGL', 'META', 'TSLA', 'AMD', 'NFLX',
  'PYPL', 'DIS', 'BAC', 'JPM', 'GS', 'V', 'COIN', 'SNAP', 'UBER', 'GME', 'AMC',
  'SPY', 'QQQ' // Key indices
];

// Focus on timeframes that work with 15-min delay
const TIMEFRAMES = ['15m', '30m', '1h'];

// Confidence thresholds to test (from 40 to 90 in steps of 5)
const CONFIDENCE_THRESHOLDS = [40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90];

interface OHLCV {
  o: number; // open
  h: number; // high
  l: number; // low
  c: number; // close
  v: number; // volume
  t: number; // timestamp (milliseconds)
}

interface ChannelPattern {
  id: string;
  symbol: string;
  timeframe: string;
  entry_price: number;
  support_level: number;
  resistance_level: number;
  channel_type: string;
  created_at: string;
  confidence_score: number;
  volume_confirmation: boolean;
  pattern_type: string;
  target_price: number;
  status: string;
  updated_at: string;
  trendline_break: boolean | null;
  ema_pattern: string | null;
  
  // Internal fields (not saved to DB)
  _trend_strength: number;
  _momentum_score: number;
  _is_golden_scan: boolean;
}

// Results interface for confidence threshold analysis
interface ConfidenceResults {
  threshold: number;
  patterns: number;
  successes: number;
  failures: number;
  winRate: number;
  avgProfitLoss: number;
  avgWin: number;
  avgLoss: number;
  riskRewardRatio: number;
}

// Calculate EMAs for technical analysis
function calculateEMA(prices: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);

  // Start with SMA for the first period
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i];
  }
  ema.push(sum / period);

  // Calculate EMA for subsequent periods
  for (let i = period; i < prices.length; i++) {
    ema.push((prices[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1]);
  }

  return ema;
}

// Detect channel patterns in price data
function detectChannelPatterns(
  symbol: string,
  timeframe: string,
  ohlcvData: OHLCV[]
): ChannelPattern[] {
  if (ohlcvData.length < 30) return []; // Need enough data for pattern detection
  
  const patterns: ChannelPattern[] = [];
  const closes = ohlcvData.map(candle => candle.c);
  const highs = ohlcvData.map(candle => candle.h);
  const lows = ohlcvData.map(candle => candle.l);
  const volumes = ohlcvData.map(candle => candle.v);
  
  // Calculate technical indicators
  const ema7 = calculateEMA(closes, 7);
  const ema50 = calculateEMA(closes, 50);
  const ema100 = calculateEMA(closes, 100);
  
  // Need at least 100 candles for reliable EMA data
  if (ema7.length < 7 || ema50.length < 50 || ema100.length < 100) return [];
  
  // Look for channel patterns in last 20 candles
  for (let i = 100; i < ohlcvData.length - 7; i += 5) { // Step by 5 to check more diverse points
    // Minimum 7 candles in a channel to qualify as a valid pattern
    const recentHighs = highs.slice(i - 7, i + 1);
    const recentLows = lows.slice(i - 7, i + 1);
    const recentCloses = closes.slice(i - 7, i + 1);
    const recentVolumes = volumes.slice(i - 7, i + 1);
    
    // Find support and resistance levels
    const maxHigh = Math.max(...recentHighs);
    const minLow = Math.min(...recentLows);
    
    // Check if prices are forming a channel
    const highsRegression = linearRegression(recentHighs);
    const lowsRegression = linearRegression(recentLows);
    
    // Channel slopes
    const highsSlope = highsRegression.slope;
    const lowsSlope = lowsRegression.slope;
    
    // Determine channel type based on slopes
    let channelType = "horizontal";
    if (highsSlope > 0.05 && lowsSlope > 0.05) { // Lowered from 0.1 to be more sensitive
      channelType = "ascending";
    } else if (highsSlope < -0.05 && lowsSlope < -0.05) { // Lowered from -0.1 to be more sensitive
      channelType = "descending";
    }
    
    // Calculate other metrics for pattern quality
    const avgVolume = recentVolumes.reduce((sum, vol) => sum + vol, 0) / recentVolumes.length;
    const trendStrength = Math.abs(highsSlope) + Math.abs(lowsSlope);
    
    // EMAs for momentum
    const currentEma7 = ema7[i];
    const currentEma50 = ema50[i - 43]; // Adjust for array indices
    const currentEma100 = ema100[i - 93]; // Adjust for array indices
    
    // Determine EMA pattern
    let emaPattern = "mixed";
    if (currentEma7 > currentEma50 && currentEma50 > currentEma100) {
      emaPattern = "allBullish";
    } else if (currentEma7 < currentEma50 && currentEma50 < currentEma100) {
      emaPattern = "allBearish";
    } else if (currentEma7 > currentEma50) {
      emaPattern = "7over50";
    } else if (currentEma7 > currentEma100) {
      emaPattern = "7over100";
    } else if (currentEma50 > currentEma100) {
      emaPattern = "50over100";
    }
    
    // Momentum score based on EMA alignments
    let momentumScore = 0;
    if (channelType === "ascending") {
      momentumScore = (currentEma7 > currentEma50 || currentEma50 > currentEma100) ? 1 : 0.5; // More permissive OR instead of AND
    } else if (channelType === "descending") {
      momentumScore = (currentEma7 < currentEma50 || currentEma50 < currentEma100) ? 1 : 0.5; // More permissive OR instead of AND
    } else {
      momentumScore = 0.5; // Neutral for sideways
    }
    
    // Volume confirmation - check if volume is increasing
    const volumeConfirmation = recentVolumes[recentVolumes.length - 1] > avgVolume * 0.8; // More permissive
    
    // Check for Golden Scan conditions - multiple timeframe alignment
    // This is just a placeholder - actual implementation would check patterns across timeframes
    const isGoldenScan = false;
    
    // Determine pattern type based on channel and other factors
    let patternType = "Bull Flag";
    if (channelType === "ascending") {
      patternType = "Ascending Triangle";
    } else if (channelType === "descending") {
      patternType = "Descending Triangle";
    } else {
      patternType = "Symmetrical Triangle";
    }
    
    // Calculate confidence score based on all factors
    const confidenceScore = (
      (channelType !== "horizontal" ? 0.7 : 0.3) + // Channel type bonus
      (volumeConfirmation ? 0.3 : 0.1) + // Volume confirmation
      (trendStrength > 0.3 ? 0.2 : 0.1) + // Trend strength
      momentumScore * 0.3 // Momentum alignment
    ) / 1.6 * 100; // Normalize to 0-100
    
    // Calculate target price
    const targetPrice = channelType === "ascending" ? 
      maxHigh * 1.05 : 
      (channelType === "descending" ? minLow * 0.95 : ohlcvData[i].c * 1.03);
    
    // Track all patterns but store confidence score for later filtering
    const now = new Date();
    patterns.push({
      id: generateUUID(),
      symbol,
      timeframe,
      entry_price: ohlcvData[i].c,
      support_level: minLow,
      resistance_level: maxHigh,
      channel_type: channelType,
      created_at: new Date(ohlcvData[i].t).toISOString(),
      updated_at: now.toISOString(),
      confidence_score: confidenceScore,
      volume_confirmation: volumeConfirmation,
      pattern_type: patternType,
      target_price: targetPrice,
      status: "active",
      trendline_break: false,
      ema_pattern: emaPattern,
      // Store these internally but don't save to DB
      _trend_strength: trendStrength,
      _momentum_score: momentumScore,
      _is_golden_scan: isGoldenScan
    });
  }
  
  return patterns;
}

// Helper function for linear regression
function linearRegression(values: number[]): { slope: number, intercept: number } {
  const n = values.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  return { slope, intercept };
}

// Backtest a pattern with future price data
async function backtestPattern(
  pattern: ChannelPattern, 
  futurePrices: OHLCV[]
): Promise<{
  success: boolean;
  profit_loss_percent: number;
  days_to_breakout: number; 
  pattern_id: string;
}> {
  if (futurePrices.length < 20) {
    return {
      success: false,
      profit_loss_percent: 0,
      days_to_breakout: 0,
      pattern_id: pattern.id
    };
  }
  
  const entryPrice = pattern.entry_price;
  const resistanceLevel = pattern.resistance_level;
  let daysToBreakout = 0;
  let success = false;
  let exitPrice = entryPrice;
  
  // For an ascending channel, look for breakout above resistance
  // For a descending channel, look for breakout below support
  // Max lookforward period is 20 candles
  const lookForward = Math.min(futurePrices.length, 20);
  
  if (pattern.channel_type === "ascending") {
    // Look for breakout above resistance
    for (let i = 0; i < lookForward; i++) {
      if (futurePrices[i].c > resistanceLevel) {
        success = true;
        exitPrice = futurePrices[i].c;
        daysToBreakout = i + 1;
        break;
      }
    }
  } else if (pattern.channel_type === "descending") {
    // Look for breakout below support
    for (let i = 0; i < lookForward; i++) {
      if (futurePrices[i].c < pattern.support_level) {
        success = true;
        exitPrice = futurePrices[i].c;
        daysToBreakout = i + 1;
        break;
      }
    }
  } else {
    // Sideways channel - look for any significant breakout
    for (let i = 0; i < lookForward; i++) {
      if (
        futurePrices[i].c > resistanceLevel * 1.02 || 
        futurePrices[i].c < pattern.support_level * 0.98
      ) {
        success = true;
        exitPrice = futurePrices[i].c;
        daysToBreakout = i + 1;
        break;
      }
    }
  }
  
  // If no breakout occurred, use the last price
  if (!success && lookForward > 0) {
    exitPrice = futurePrices[lookForward - 1].c;
  }
  
  // Calculate profit/loss percentage
  const profitLossPercent = ((exitPrice - entryPrice) / entryPrice) * 100;
  
  return {
    success,
    profit_loss_percent: profitLossPercent,
    days_to_breakout: daysToBreakout,
    pattern_id: pattern.id
  };
}

// Convert timeframe string to Polygon.io format
function timeframeToPolygonFormat(timeframe: string): { multiplier: number, timespan: string } {
  switch (timeframe) {
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
      return { multiplier: 1, timespan: 'day' };
  }
}

// Fetch historical price data from Polygon.io
async function fetchHistoricalData(
  symbol: string,
  timeframe: string,
  startDate: string,
  endDate: string
): Promise<OHLCV[]> {
  try {
    const { multiplier, timespan } = timeframeToPolygonFormat(timeframe);
    
    const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${startDate}/${endDate}?apiKey=${POLYGON_API_KEY}&limit=50000`;
    
    console.log(`Fetching ${timeframe} data for ${symbol} from ${startDate} to ${endDate}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status} for symbol ${symbol}`);
    }
    
    const data = await response.json();
    
    if (data.status === 'ERROR' || data.error) {
      throw new Error(data.error || `Unknown API error for symbol ${symbol}`);
    }
    
    if (!data.results || data.results.length === 0) {
      console.log(`No data returned for ${symbol} in timeframe ${timeframe}`);
      return [];
    }
    
    // Transform Polygon data to OHLCV format
    return data.results.map((bar: any) => ({
      o: bar.o,
      h: bar.h,
      l: bar.l,
      c: bar.c,
      v: bar.v,
      t: bar.t // timestamp in milliseconds
    }));
  } catch (error) {
    console.error(`Error fetching ${timeframe} data for ${symbol}:`, error);
    return [];
  }
}

// Main function to run confidence threshold analysis
async function runConfidenceAnalysis() {
  console.log('Starting confidence threshold analysis...');
  
  // Calculate date range (6 months back)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 6);
  
  const formattedEndDate = endDate.toISOString().split('T')[0];
  const formattedStartDate = startDate.toISOString().split('T')[0];
  
  console.log(`Date range: ${formattedStartDate} to ${formattedEndDate}`);
  
  // Track patterns and backtest results for all confidence thresholds
  const allPatterns: ChannelPattern[] = [];
  const allBacktests: {
    pattern: ChannelPattern;
    result: {
      success: boolean;
      profit_loss_percent: number;
      days_to_breakout: number;
    };
  }[] = [];
  
  // Global statistics
  let stocksProcessed = 0;
  let symbolsWithData = 0;
  let totalPatternsDetected = 0;
  let patternsBacktested = 0;
  
  // Process each symbol and timeframe
  for (const symbol of DAY_TRADING_UNIVERSE) {
    stocksProcessed++;
    console.log(`Processing symbol ${stocksProcessed}/${DAY_TRADING_UNIVERSE.length}: ${symbol}`);
    let symbolHasData = false;
    
    for (const timeframe of TIMEFRAMES) {
      console.log(`  Timeframe: ${timeframe}`);
      
      // Fetch historical data
      const priceData = await fetchHistoricalData(symbol, timeframe, formattedStartDate, formattedEndDate);
      
      if (priceData.length === 0) {
        console.log(`  No price data available for ${symbol} on ${timeframe} timeframe`);
        continue;
      }
      
      symbolHasData = true;
      console.log(`  Fetched ${priceData.length} candles for analysis`);
      
      // Process a subset of windows to keep runtime manageable
      // More windows for shorter timeframes, fewer for longer
      const windowsToProcess = timeframe === '15m' ? 10 : (timeframe === '30m' ? 8 : 5);
      const stepSize = Math.floor((priceData.length - 130) / windowsToProcess);
      
      if (stepSize <= 0) {
        console.log(`  Not enough data points to analyze multiple windows`);
        continue;
      }
      
      console.log(`  Analyzing ${windowsToProcess} windows with step size ${stepSize}`);
      
      // Detect patterns in different windows
      for (let windowIndex = 0; windowIndex < windowsToProcess; windowIndex++) {
        const i = 100 + (windowIndex * stepSize);
        
        if (i >= priceData.length - 30) {
          console.log('  Reached end of available data');
          break;
        }
        
        const windowData = priceData.slice(0, i);
        const futurePrices = priceData.slice(i, i + 30); // 30 candles forward for backtesting
        
        const patterns = detectChannelPatterns(symbol, timeframe, windowData);
        totalPatternsDetected += patterns.length;
        
        if (patterns.length > 0) {
          console.log(`  Found ${patterns.length} patterns at window ${windowIndex + 1}`);
          
          // Save patterns for later threshold analysis
          allPatterns.push(...patterns);
          
          // Backtest each pattern
          for (const pattern of patterns) {
            patternsBacktested++;
            
            // Backtest the pattern
            const backtestResult = await backtestPattern(pattern, futurePrices);
            
            // Save backtest result for threshold analysis
            allBacktests.push({
              pattern,
              result: {
                success: backtestResult.success,
                profit_loss_percent: backtestResult.profit_loss_percent,
                days_to_breakout: backtestResult.days_to_breakout
              }
            });
            
            // Log progress periodically
            if (patternsBacktested % 100 === 0) {
              console.log(`  Backtested ${patternsBacktested} patterns so far...`);
            }
          }
        }
        
        // Rate limit API calls to avoid hitting limits
        await setTimeout(100);
      }
    }
    
    if (symbolHasData) {
      symbolsWithData++;
    }
  }
  
  console.log(`\nAnalysis complete for ${symbolsWithData}/${DAY_TRADING_UNIVERSE.length} symbols`);
  console.log(`Detected ${totalPatternsDetected} patterns, backtested ${patternsBacktested} patterns`);
  
  // Analyze different confidence thresholds
  const thresholdResults: ConfidenceResults[] = [];
  
  for (const threshold of CONFIDENCE_THRESHOLDS) {
    // Filter patterns by confidence threshold
    const filteredBacktests = allBacktests.filter(
      backtest => backtest.pattern.confidence_score >= threshold
    );
    
    if (filteredBacktests.length === 0) {
      console.log(`No patterns meet confidence threshold ${threshold}`);
      continue;
    }
    
    // Calculate metrics
    const successCount = filteredBacktests.filter(b => b.result.success).length;
    const failureCount = filteredBacktests.length - successCount;
    const winRate = successCount / filteredBacktests.length;
    
    const allProfitLoss = filteredBacktests.map(b => b.result.profit_loss_percent);
    const avgProfitLoss = allProfitLoss.reduce((sum, pl) => sum + pl, 0) / allProfitLoss.length;
    
    const wins = filteredBacktests.filter(b => b.result.success);
    const losses = filteredBacktests.filter(b => !b.result.success);
    
    const avgWin = wins.length > 0 ? 
      wins.reduce((sum, b) => sum + b.result.profit_loss_percent, 0) / wins.length : 0;
    
    const avgLoss = losses.length > 0 ? 
      Math.abs(losses.reduce((sum, b) => sum + b.result.profit_loss_percent, 0) / losses.length) : 0;
    
    const riskRewardRatio = avgLoss > 0 ? avgWin / avgLoss : 0;
    
    thresholdResults.push({
      threshold,
      patterns: filteredBacktests.length,
      successes: successCount,
      failures: failureCount,
      winRate,
      avgProfitLoss,
      avgWin,
      avgLoss,
      riskRewardRatio
    });
  }
  
  // Print threshold analysis results
  console.log('\nConfidence Threshold Analysis:');
  console.log('-----------------------------');
  console.log('Threshold | Patterns | Win Rate | Avg P/L | Risk/Reward | Avg Win | Avg Loss');
  console.log('----------|----------|----------|---------|------------|---------|----------');
  
  thresholdResults.forEach(result => {
    console.log(
      `${result.threshold.toString().padEnd(10)}| ` +
      `${result.patterns.toString().padEnd(10)}| ` +
      `${(result.winRate * 100).toFixed(2).padEnd(10)}| ` +
      `${result.avgProfitLoss.toFixed(2).padEnd(9)}| ` +
      `${result.riskRewardRatio.toFixed(2).padEnd(12)}| ` +
      `${result.avgWin.toFixed(2).padEnd(9)}| ` +
      `${result.avgLoss.toFixed(2)}`
    );
  });
  
  // Find optimal threshold with good balance of win rate and sample size
  let optimalThreshold = 0;
  let bestScore = 0;
  
  for (const result of thresholdResults) {
    // Score weights both win rate and having enough patterns (to avoid overfitting)
    // Also considers the risk/reward ratio
    const score = result.winRate * 0.5 + (Math.min(1, result.patterns / 100) * 0.3) + (Math.min(3, result.riskRewardRatio) / 3 * 0.2);
    
    if (score > bestScore) {
      bestScore = score;
      optimalThreshold = result.threshold;
    }
  }
  
  console.log(`\nRecommended confidence threshold: ${optimalThreshold}`);
  const optimalResult = thresholdResults.find(r => r.threshold === optimalThreshold);
  if (optimalResult) {
    console.log(`Win Rate: ${(optimalResult.winRate * 100).toFixed(2)}%`);
    console.log(`Risk/Reward Ratio: ${optimalResult.riskRewardRatio.toFixed(2)}`);
    console.log(`Based on ${optimalResult.patterns} pattern samples`);
  }
  
  // Additional analysis: Performance at next higher thresholds
  console.log('\nDiminishing Returns Analysis:');
  let diminishingReturns = false;
  let diminishingThreshold = 0;
  
  for (let i = 1; i < thresholdResults.length; i++) {
    const current = thresholdResults[i];
    const previous = thresholdResults[i-1];
    const winRateImprovement = current.winRate - previous.winRate;
    const patternReduction = 1 - (current.patterns / previous.patterns);
    
    console.log(`Threshold ${current.threshold}: Win rate improved by ${(winRateImprovement * 100).toFixed(2)}%, patterns reduced by ${(patternReduction * 100).toFixed(2)}%`);
    
    // If win rate improvement is less than 2% but pattern reduction is more than 20%
    // We've hit diminishing returns
    if (!diminishingReturns && winRateImprovement < 0.02 && patternReduction > 0.2) {
      diminishingReturns = true;
      diminishingThreshold = current.threshold;
      console.log(`Diminishing returns detected at threshold ${diminishingThreshold}`);
    }
  }
  
  if (diminishingReturns) {
    // Recommend the threshold right before diminishing returns
    const previousThreshold = thresholdResults.find(r => r.threshold === (diminishingThreshold - 5))?.threshold || optimalThreshold;
    console.log(`\nFinal recommended threshold: ${previousThreshold} (balancing accuracy and signal frequency)`);
  } else {
    console.log(`\nFinal recommended threshold: ${optimalThreshold} (no clear diminishing returns detected)`);
  }
  
  return {
    optimalThreshold,
    diminishingThreshold: diminishingReturns ? diminishingThreshold : null,
    thresholdResults
  };
}

// Run the analysis
runConfidenceAnalysis().then(result => {
  console.log('\nAnalysis complete. Ready to update application with new threshold.');
}).catch(err => {
  console.error('Error running confidence threshold analysis:', err);
}); 