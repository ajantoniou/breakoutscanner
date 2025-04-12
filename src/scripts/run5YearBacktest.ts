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
const TIMEFRAMES = ['15m', '30m', '1h', '4h', '1d', '1w']; // All timeframes for comprehensive testing
const DAY_TRADING_UNIVERSE = [
  'AAPL', 'MSFT', 'AMZN', 'NVDA', 'GOOGL', 'META', 'TSLA', 'AMD', 'NFLX',
  'PYPL', 'DIS', 'BAC', 'JPM', 'GS', 'V', 'COIN', 'SNAP', 'UBER', 'GME', 'AMC',
  'SPY', 'QQQ' // Key indices
];

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
  
  console.log(`Analyzing ${ohlcvData.length} candles for patterns...`);
  let patternCandidatesEvaluated = 0;
  
  // Look for channel patterns in last 20 candles
  for (let i = 100; i < ohlcvData.length - 7; i += 5) { // Step by 5 instead of 1 to check more diverse points
    patternCandidatesEvaluated++;
    
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
      (trendStrength > 0.3 ? 0.2 : 0.1) + // Lowered from 0.5 to be more permissive
      momentumScore * 0.3 // Momentum alignment
    ) / 1.6 * 100; // Normalize to 0-100
    
    // Calculate target price
    const targetPrice = channelType === "ascending" ? 
      maxHigh * 1.05 : 
      (channelType === "descending" ? minLow * 0.95 : ohlcvData[i].c * 1.03);
    
    // Only include patterns with a lower confidence threshold (40 instead of 60)
    if (confidenceScore > 40) {
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
  }
  
  console.log(`Evaluated ${patternCandidatesEvaluated} pattern candidates, found ${patterns.length} valid patterns`);
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

// Save pattern to Supabase
async function savePattern(pattern: ChannelPattern): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('patterns')
      .insert({
        id: pattern.id,
        symbol: pattern.symbol,
        timeframe: pattern.timeframe,
        entry_price: pattern.entry_price,
        target_price: pattern.target_price,
        pattern_type: pattern.pattern_type,
        support_level: pattern.support_level,
        resistance_level: pattern.resistance_level,
        channel_type: pattern.channel_type,
        created_at: pattern.created_at,
        updated_at: pattern.updated_at,
        status: pattern.status,
        confidence_score: pattern.confidence_score,
        volume_confirmation: pattern.volume_confirmation,
        trendline_break: pattern.trendline_break,
        ema_pattern: pattern.ema_pattern
      });
    
    if (error) {
      console.error(`Error saving pattern for ${pattern.symbol}:`, error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`Exception saving pattern for ${pattern.symbol}:`, error);
    return false;
  }
}

// Save backtest result to Supabase
async function saveBacktestResult(backtestResult: {
  success: boolean;
  profit_loss_percent: number;
  days_to_breakout: number;
  pattern_id: string;
}): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('backtest_results')
      .insert({
        pattern_id: backtestResult.pattern_id,
        success: backtestResult.success,
        profit_loss_percent: backtestResult.profit_loss_percent,
        days_to_breakout: backtestResult.days_to_breakout,
        created_at: new Date().toISOString()
      });
    
    if (error) {
      console.error(`Error saving backtest result:`, error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`Exception saving backtest result:`, error);
    return false;
  }
}

// Main function to run quick backtest
async function runQuickBacktest() {
  console.log('Starting quick backtest analysis...');
  
  // Calculate date range (6 months back instead of 3)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 6);
  
  const formattedEndDate = endDate.toISOString().split('T')[0];
  const formattedStartDate = startDate.toISOString().split('T')[0];
  
  console.log(`Date range: ${formattedStartDate} to ${formattedEndDate}`);
  
  // Statistics tracking
  let totalPatterns = 0;
  let totalBacktests = 0;
  let successfulBacktests = 0;
  
  // Process a few symbols and timeframes for a better sample
  const symbols = ['AAPL', 'MSFT', 'AMZN'];
  const timeframes = ['1h', '4h', '1d'];
  
  for (const symbol of symbols) {
    for (const timeframe of timeframes) {
      console.log(`Processing symbol: ${symbol} on ${timeframe} timeframe`);
      
      // Fetch historical data
      const priceData = await fetchHistoricalData(symbol, timeframe, formattedStartDate, formattedEndDate);
      
      if (priceData.length === 0) {
        console.log(`No price data available for ${symbol} on ${timeframe} timeframe`);
        continue;
      }
      
      console.log(`Fetched ${priceData.length} candles for analysis`);
      
      // Process only a few windows to speed things up
      const totalWindows = Math.min(10, Math.floor((priceData.length - 30) / 20));
      
      // Detect patterns (sliding window approach)
      for (let windowIndex = 0; windowIndex < totalWindows; windowIndex++) {
        const i = 100 + (windowIndex * 20);
        
        if (i >= priceData.length - 30) {
          console.log('Reached end of available data');
          break;
        }
        
        const windowData = priceData.slice(0, i);
        const futurePrices = priceData.slice(i, i + 30); // 30 candles forward for backtesting
        
        const patterns = detectChannelPatterns(symbol, timeframe, windowData);
        
        if (patterns.length > 0) {
          console.log(`Found ${patterns.length} patterns at candle ${i}`);
          
          // Process all patterns since we're specifically looking for examples
          const limitedPatterns = patterns.slice(0, 5); // Max 5 per window
          
          // Save each pattern and backtest it
          for (const pattern of limitedPatterns) {
            totalPatterns++;
            
            // Save pattern to Supabase
            const patternSaved = await savePattern(pattern);
            
            if (patternSaved) {
              // Backtest the pattern
              const backtestResult = await backtestPattern(pattern, futurePrices);
              totalBacktests++;
              
              if (backtestResult.success) {
                successfulBacktests++;
              }
              
              // Save backtest result
              await saveBacktestResult(backtestResult);
              
              console.log(`  Pattern ${pattern.id} backtest: ${backtestResult.success ? 'SUCCESS' : 'FAILURE'}, P/L: ${backtestResult.profit_loss_percent.toFixed(2)}%, Days: ${backtestResult.days_to_breakout}`);
            }
          }
        }
        
        // Rate limit API calls to avoid hitting limits
        await setTimeout(100);
      }
    }
  }
  
  // Print summary statistics
  console.log('\nBacktest Summary:');
  console.log(`Total Patterns Detected: ${totalPatterns}`);
  console.log(`Total Backtests Run: ${totalBacktests}`);
  console.log(`Successful Backtests: ${successfulBacktests}`);
  
  if (totalBacktests > 0) {
    console.log(`Success Rate: ${(successfulBacktests / totalBacktests * 100).toFixed(2)}%`);
  } else {
    console.log('No backtests were run');
  }
}

// Run the quick backtest script instead of the 5-year backtest
runQuickBacktest().catch(err => {
  console.error('Error running quick backtest:', err);
});