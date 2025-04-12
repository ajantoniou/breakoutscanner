import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Use the Polygon API key from the screenshot
const POLYGON_API_KEY = 'onEimwzRMEYR2FhgLVBZnAmyz9EC8KfI';

// Use the Supabase service role key instead of the anon key
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ttmeplqmrjhysyqzuaoh.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0bWVwbHFtcmpoeXN5cXp1YW9oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzIxNTQ3MCwiZXhwIjoyMDU4NzkxNDcwfQ.IEts22TIOhglV_S7pRWpyD6zYUiO8d4Wc_SICgAqHBA';
const supabase = createClient(supabaseUrl, supabaseKey);

interface TimeframeStats {
  timeframe: string;
  total: number;
  wins: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  avgCandlesToBreakout: number;
  medianCandlesToBreakout: number;
  riskRewardRatio: number;
  avgConfidenceScore: number;
  channelTypes: Record<string, number>;
  mostCommonChannelType: string;
}

interface BacktestResult {
  id: string;
  created_at: string;
  symbol: string;
  timeframe: string;
  entry_price: number;
  exit_price: number;
  profit_loss_percent: number;
  success: boolean;
  candles_to_breakout: number;
  entry_date: string;
  exit_date: string;
  pattern_id: string;
  pattern_type: string;
  channel_type: string;
  support_level: number;
  resistance_level: number;
  volume_confirmation: boolean;
  confidence_score: number;
  ema_pattern: string;
  trendline_break: boolean;
}

function getNextTimeframe(timeframe: string): string | null {
  // Limited to only our available timeframes due to 15-min data delay
  const timeframes = ['15m', '30m', '1h'];
  const index = timeframes.indexOf(timeframe);
  
  if (index === -1 || index === timeframes.length - 1) {
    return null;
  }
  
  return timeframes[index + 1];
}

function isLowerTimeframe(tf1: string, tf2: string): boolean {
  // Only comparing our available timeframes due to 15-min data delay
  const timeframes = ['15m', '30m', '1h'];
  const index1 = timeframes.indexOf(tf1);
  const index2 = timeframes.indexOf(tf2);
  
  if (index1 === -1 || index2 === -1) {
    return false;
  }
  
  return index1 < index2;
}

/**
 * Check if a breakout pattern is confirmed by a higher timeframe
 * 
 * @param results All backtest results
 * @param result The specific result to check for confirmation
 * @returns Object containing confirmation details
 */
function checkMultiTimeframeConfirmation(
  results: BacktestResult[],
  result: BacktestResult
): { isConfirmed: boolean; confirmingTimeframe: string | null; confidenceBoost: number } {
  // Skip if already at highest timeframe
  if (result.timeframe === '1h') {
    return { isConfirmed: false, confirmingTimeframe: null, confidenceBoost: 0 };
  }
  
  const nextTimeframe = getNextTimeframe(result.timeframe);
  if (!nextTimeframe) {
    return { isConfirmed: false, confirmingTimeframe: null, confidenceBoost: 0 };
  }
  
  // Look for patterns in the higher timeframe with the same symbol
  // that were created around the same time (within 24 hours)
  const resultCreationDate = new Date(result.entry_date);
  const higherTimeframeResults = results.filter(r => 
    r.symbol === result.symbol && 
    r.timeframe === nextTimeframe &&
    r.pattern_type === result.pattern_type &&
    Math.abs(new Date(r.entry_date).getTime() - resultCreationDate.getTime()) < 24 * 60 * 60 * 1000
  );
  
  if (higherTimeframeResults.length === 0) {
    return { isConfirmed: false, confirmingTimeframe: null, confidenceBoost: 0 };
  }
  
  // Consider confirmed if at least one higher timeframe result is successful
  const successfulHigherTfResults = higherTimeframeResults.filter(r => r.success);
  const isConfirmed = successfulHigherTfResults.length > 0;
  
  // Calculate confidence boost based on higher timeframe success rate
  const confidenceBoost = isConfirmed ? 
    (successfulHigherTfResults.length / higherTimeframeResults.length) * 20 : 0;
  
  return { 
    isConfirmed, 
    confirmingTimeframe: isConfirmed ? nextTimeframe : null,
    confidenceBoost
  };
}

function getMostCommon<T>(arr: T[]): T | null {
  if (arr.length === 0) return null;
  
  const counts = arr.reduce((acc, val) => {
    acc[String(val)] = (acc[String(val)] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  let mostCommon: T | null = null;
  let maxCount = 0;
  
  for (const [val, count] of Object.entries(counts)) {
    if (count > maxCount) {
      mostCommon = val as unknown as T;
      maxCount = count;
    }
  }
  
  return mostCommon;
}

async function fetchBacktestResults(): Promise<BacktestResult[]> {
  console.log('Fetching backtest results...');
  
  // Get backtest results first (smaller table)
  const { data: backtests, error: backtestError } = await supabase
    .from('backtest_results')
    .select('*')
    .not('pattern_id', 'is', null);
  
  if (backtestError) {
    console.error('Error fetching backtest results:', backtestError);
    return [];
  }
  
  if (!backtests || backtests.length === 0) {
    console.log('No backtest results found');
    return [];
  }
  
  console.log(`Found ${backtests.length} backtest results`);
  
  // Get all pattern IDs from the backtest results
  const patternIds = backtests.map(result => result.pattern_id).filter(Boolean);
  
  // Fetch patterns that have backtest results
  const { data: patterns, error: patternError } = await supabase
    .from('patterns')
    .select('*')
    .in('id', patternIds)
    .in('timeframe', ['15m', '30m', '1h']);
  
  if (patternError) {
    console.error('Error fetching patterns:', patternError);
    return [];
  }
  
  if (!patterns || patterns.length === 0) {
    console.log('No patterns found for the backtest results');
    return [];
  }
  
  console.log(`Found ${patterns.length} patterns for the backtest results`);
  
  // Create a map of patterns by ID for quick lookup
  const patternMap = new Map(patterns.map(pattern => [pattern.id, pattern]));
  
  // Join the backtest results with their corresponding patterns
  const results = backtests
    .filter(backtest => backtest.pattern_id && patternMap.has(backtest.pattern_id))
    .map(backtest => {
      const pattern = patternMap.get(backtest.pattern_id);
      
      return {
        id: backtest.id,
        created_at: backtest.created_at,
        pattern_id: backtest.pattern_id,
        profit_loss_percent: backtest.profit_loss_percent || 0,
        success: backtest.success,
        candles_to_breakout: backtest.days_to_breakout || 0, // Using days_to_breakout from DB
        symbol: pattern.symbol,
        timeframe: pattern.timeframe,
        entry_price: pattern.entry_price,
        exit_price: (pattern.entry_price * (1 + (backtest.profit_loss_percent || 0) / 100)),
        entry_date: pattern.created_at,
        exit_date: backtest.created_at,
        pattern_type: pattern.pattern_type,
        channel_type: pattern.channel_type,
        support_level: pattern.support_level,
        resistance_level: pattern.resistance_level,
        volume_confirmation: pattern.volume_confirmation,
        confidence_score: pattern.confidence_score,
        ema_pattern: pattern.ema_pattern,
        trendline_break: pattern.trendline_break
      };
    });
    
  return results;
}

async function runBacktests() {
  console.log('Starting multi-timeframe breakout analysis...');
  console.log('Focusing only on 15m, 30m, and 1h timeframes due to 15-minute data delay...');
  
  // Fetch all backtest results with their associated patterns
  const results = await fetchBacktestResults();
  
  if (results.length === 0) {
    console.log('No valid backtest results found for analysis');
    return;
  }
  
  console.log(`Analyzing ${results.length} backtest results...`);
  
  // Filter results by timeframe
  const validResults = results.filter(result => ['15m', '30m', '1h'].includes(result.timeframe));
  
  if (validResults.length === 0) {
    console.log('No valid results for the specified timeframes');
    return;
  }
  
  const totalResults = validResults.length;
  const wins = validResults.filter((result) => result.success).length;
  const totalCandlesToBreakout = validResults.reduce((sum, result) => sum + result.candles_to_breakout, 0);
  
  const winResults = validResults.filter((result) => result.success);
  const lossResults = validResults.filter((result) => !result.success);
  
  const avgWin = winResults.length > 0
    ? winResults.reduce((sum, result) => sum + result.profit_loss_percent, 0) / winResults.length
    : 0;
  
  const avgLoss = lossResults.length > 0
    ? Math.abs(lossResults.reduce((sum, result) => sum + result.profit_loss_percent, 0) / lossResults.length)
    : 0;

  // Group by timeframe
  const timeframeStats: Record<string, TimeframeStats> = {};
  
  // Group results by timeframe
  validResults.forEach(result => {
    const timeframe = result.timeframe;
    // Only process our available timeframes
    if (!['15m', '30m', '1h'].includes(timeframe)) return;
    
    if (!timeframeStats[timeframe]) {
      timeframeStats[timeframe] = {
        timeframe,
        total: 0,
        wins: 0,
        winRate: 0,
        avgWin: 0,
        avgLoss: 0,
        avgCandlesToBreakout: 0,
        medianCandlesToBreakout: 0,
        riskRewardRatio: 0,
        avgConfidenceScore: 0,
        channelTypes: {},
        mostCommonChannelType: 'unknown'
      };
    }
    
    timeframeStats[timeframe].total++;
    
    if (result.success) {
      timeframeStats[timeframe].wins++;
    }
    
    timeframeStats[timeframe].avgCandlesToBreakout += result.candles_to_breakout;
    timeframeStats[timeframe].avgConfidenceScore += result.confidence_score || 0;
    
    if (result.channel_type) {
      const channelType = result.channel_type;
      timeframeStats[timeframe].channelTypes[channelType] = (timeframeStats[timeframe].channelTypes[channelType] || 0) + 1;
    }
  });
  
  // Calculate averages and finalize statistics
  Object.keys(timeframeStats).forEach(timeframe => {
    const stats = timeframeStats[timeframe];
    const tfResults = validResults.filter(r => r.timeframe === timeframe);
    
    // Win rate
    stats.winRate = stats.total > 0 ? stats.wins / stats.total : 0;
    
    // Average candles to breakout
    stats.avgCandlesToBreakout = stats.total > 0 ? stats.avgCandlesToBreakout / stats.total : 0;
    
    // Average confidence score
    stats.avgConfidenceScore = stats.total > 0 ? stats.avgConfidenceScore / stats.total : 0;
    
    // Win/Loss averages
    const tfWinResults = tfResults.filter(r => r.success);
    const tfLossResults = tfResults.filter(r => !r.success);
    
    stats.avgWin = tfWinResults.length > 0
      ? tfWinResults.reduce((sum, r) => sum + r.profit_loss_percent, 0) / tfWinResults.length
      : 0;
    
    stats.avgLoss = tfLossResults.length > 0
      ? Math.abs(tfLossResults.reduce((sum, r) => sum + r.profit_loss_percent, 0) / tfLossResults.length)
      : 0;
    
    // Risk/Reward ratio
    stats.riskRewardRatio = stats.avgLoss > 0 ? stats.avgWin / stats.avgLoss : 0;
    
    // Get median candles to breakout
    const sortedCandlesToBreakout = [...tfResults]
      .sort((a, b) => a.candles_to_breakout - b.candles_to_breakout);
    
    stats.medianCandlesToBreakout = sortedCandlesToBreakout.length > 0
      ? sortedCandlesToBreakout[Math.floor(sortedCandlesToBreakout.length / 2)].candles_to_breakout
      : 0;
    
    // Most common channel type
    const channelTypesList = tfResults
      .filter(r => r.channel_type)
      .map(r => r.channel_type);
    
    stats.mostCommonChannelType = getMostCommon(channelTypesList) || 'unknown';
  });

  // Print overall results
  console.log('\n===== OVERALL PERFORMANCE =====');
  console.log(`Total Backtests: ${totalResults}`);
  console.log(`Win Rate: ${((wins / totalResults) * 100).toFixed(2)}% (${wins}/${totalResults})`);
  console.log(`Average Candles to Breakout: ${(totalCandlesToBreakout / totalResults).toFixed(2)}`);
  console.log(`Average Win: ${avgWin.toFixed(2)}%`);
  console.log(`Average Loss: ${avgLoss.toFixed(2)}%`);
  console.log(`Risk/Reward Ratio: ${(avgWin / avgLoss).toFixed(2)}`);

  // Time-based performance analysis
  console.log('\n===== TIME-BASED PERFORMANCE ANALYSIS =====');
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  
  // Last week results
  const lastWeekResults = validResults.filter(result => new Date(result.created_at) >= oneWeekAgo);
  const lastWeekWins = lastWeekResults.filter(result => result.success).length;
  const lastWeekWinRate = lastWeekResults.length > 0 ? lastWeekWins / lastWeekResults.length : 0;
  
  // Last month results
  const lastMonthResults = validResults.filter(result => new Date(result.created_at) >= oneMonthAgo);
  const lastMonthWins = lastMonthResults.filter(result => result.success).length;
  const lastMonthWinRate = lastMonthResults.length > 0 ? lastMonthWins / lastMonthResults.length : 0;
  
  // Last 3 months results
  const last3MonthsResults = validResults.filter(result => new Date(result.created_at) >= threeMonthsAgo);
  const last3MonthsWins = last3MonthsResults.filter(result => result.success).length;
  const last3MonthsWinRate = last3MonthsResults.length > 0 ? last3MonthsWins / last3MonthsResults.length : 0;
  
  console.log('\nLast Week:');
  console.log(`Total Signals: ${lastWeekResults.length}`);
  console.log(`Win Rate: ${(lastWeekWinRate * 100).toFixed(2)}% (${lastWeekWins}/${lastWeekResults.length})`);
  
  if (lastWeekResults.length > 0) {
    const lastWeekAvgProfit = lastWeekResults.reduce((sum, result) => sum + (result.success ? result.profit_loss_percent : 0), 0) / lastWeekResults.length;
    console.log(`Average Profit: ${lastWeekAvgProfit.toFixed(2)}%`);
  }
  
  console.log('\nLast Month:');
  console.log(`Total Signals: ${lastMonthResults.length}`);
  console.log(`Win Rate: ${(lastMonthWinRate * 100).toFixed(2)}% (${lastMonthWins}/${lastMonthResults.length})`);
  
  if (lastMonthResults.length > 0) {
    const lastMonthAvgProfit = lastMonthResults.reduce((sum, result) => sum + (result.success ? result.profit_loss_percent : 0), 0) / lastMonthResults.length;
    console.log(`Average Profit: ${lastMonthAvgProfit.toFixed(2)}%`);
  }
  
  console.log('\nLast 3 Months:');
  console.log(`Total Signals: ${last3MonthsResults.length}`);
  console.log(`Win Rate: ${(last3MonthsWinRate * 100).toFixed(2)}% (${last3MonthsWins}/${last3MonthsResults.length})`);
  
  if (last3MonthsResults.length > 0) {
    const last3MonthsAvgProfit = last3MonthsResults.reduce((sum, result) => sum + (result.success ? result.profit_loss_percent : 0), 0) / last3MonthsResults.length;
    console.log(`Average Profit: ${last3MonthsAvgProfit.toFixed(2)}%`);
  }
  
  // Print timeframe statistics
  console.log('\n===== PERFORMANCE BY TIMEFRAME =====');
  Object.values(timeframeStats)
    .filter(stats => ['15m', '30m', '1h'].includes(stats.timeframe)) // Only show our available timeframes
    .forEach((stats) => {
      console.log(`\n--- ${stats.timeframe} Timeframe ---`);
      console.log(`Total Patterns: ${stats.total}`);
      console.log(`Win Rate: ${(stats.winRate * 100).toFixed(2)}% (${stats.wins}/${stats.total})`);
      console.log(`Average Win: ${stats.avgWin.toFixed(2)}%`);
      console.log(`Average Loss: ${stats.avgLoss.toFixed(2)}%`);
      console.log(`Risk/Reward Ratio: ${stats.riskRewardRatio.toFixed(2)}`);
      console.log(`Average Candles to Breakout: ${stats.avgCandlesToBreakout.toFixed(2)}`);
      console.log(`Median Candles to Breakout: ${stats.medianCandlesToBreakout}`);
      console.log(`Average Confidence Score: ${stats.avgConfidenceScore.toFixed(2)}`);
      
      console.log('Channel Types:');
      Object.entries(stats.channelTypes)
        .sort((a, b) => b[1] - a[1])
        .forEach(([type, count]) => {
          const percentage = ((count / stats.total) * 100).toFixed(2);
          console.log(`  - ${type}: ${count} (${percentage}%)`);
        });
    });

  // Multi-timeframe prediction analysis
  console.log('\n===== MULTI-TIMEFRAME BREAKOUT ANALYSIS =====');
  
  // Apply our multi-timeframe confirmation analysis
  const resultsWithConfirmation = validResults.map(result => {
    const confirmation = checkMultiTimeframeConfirmation(validResults, result);
    return {
      ...result,
      isMultiTimeframeConfirmed: confirmation.isConfirmed,
      confirmingTimeframe: confirmation.confirmingTimeframe,
      confidenceBoost: confirmation.confidenceBoost
    };
  });
  
  // Analyze performance of patterns with multi-timeframe confirmation
  const confirmedResults = resultsWithConfirmation.filter(r => r.isMultiTimeframeConfirmed);
  const nonConfirmedResults = resultsWithConfirmation.filter(r => !r.isMultiTimeframeConfirmed);
  
  // Calculate performance metrics for confirmed patterns
  const confirmedTotal = confirmedResults.length;
  const confirmedWins = confirmedResults.filter(r => r.success).length;
  const confirmedWinRate = confirmedTotal > 0 ? confirmedWins / confirmedTotal : 0;
  
  const confirmedWinResults = confirmedResults.filter(r => r.success);
  const confirmedLossResults = confirmedResults.filter(r => !r.success);
  
  const confirmedAvgWin = confirmedWinResults.length > 0
    ? confirmedWinResults.reduce((sum, r) => sum + r.profit_loss_percent, 0) / confirmedWinResults.length
    : 0;
    
  const confirmedAvgLoss = confirmedLossResults.length > 0
    ? Math.abs(confirmedLossResults.reduce((sum, r) => sum + r.profit_loss_percent, 0) / confirmedLossResults.length)
    : 0;
  
  const confirmedRiskReward = confirmedAvgLoss > 0 ? confirmedAvgWin / confirmedAvgLoss : 0;
  
  // Calculate performance metrics for non-confirmed patterns
  const nonConfirmedTotal = nonConfirmedResults.length;
  const nonConfirmedWins = nonConfirmedResults.filter(r => r.success).length;
  const nonConfirmedWinRate = nonConfirmedTotal > 0 ? nonConfirmedWins / nonConfirmedTotal : 0;
  
  const nonConfirmedWinResults = nonConfirmedResults.filter(r => r.success);
  const nonConfirmedLossResults = nonConfirmedResults.filter(r => !r.success);
  
  const nonConfirmedAvgWin = nonConfirmedWinResults.length > 0
    ? nonConfirmedWinResults.reduce((sum, r) => sum + r.profit_loss_percent, 0) / nonConfirmedWinResults.length
    : 0;
    
  const nonConfirmedAvgLoss = nonConfirmedLossResults.length > 0
    ? Math.abs(nonConfirmedLossResults.reduce((sum, r) => sum + r.profit_loss_percent, 0) / nonConfirmedLossResults.length)
    : 0;
  
  const nonConfirmedRiskReward = nonConfirmedAvgLoss > 0 ? nonConfirmedAvgWin / nonConfirmedAvgLoss : 0;
  
  // Print comparison results
  console.log('\nMulti-Timeframe Confirmation Analysis:');
  console.log(`\nPatterns with Higher Timeframe Confirmation (${confirmedTotal}):`);
  console.log(`Win Rate: ${(confirmedWinRate * 100).toFixed(2)}% (${confirmedWins}/${confirmedTotal})`);
  console.log(`Average Win: ${confirmedAvgWin.toFixed(2)}%`);
  console.log(`Average Loss: ${confirmedAvgLoss.toFixed(2)}%`);
  console.log(`Risk/Reward Ratio: ${confirmedRiskReward.toFixed(2)}`);
  
  console.log(`\nPatterns without Higher Timeframe Confirmation (${nonConfirmedTotal}):`);
  console.log(`Win Rate: ${(nonConfirmedWinRate * 100).toFixed(2)}% (${nonConfirmedWins}/${nonConfirmedTotal})`);
  console.log(`Average Win: ${nonConfirmedAvgWin.toFixed(2)}%`);
  console.log(`Average Loss: ${nonConfirmedAvgLoss.toFixed(2)}%`);
  console.log(`Risk/Reward Ratio: ${nonConfirmedRiskReward.toFixed(2)}`);
  
  // Performance improvement from confirmation
  const winRateImprovement = confirmedWinRate - nonConfirmedWinRate;
  const riskRewardImprovement = confirmedRiskReward - nonConfirmedRiskReward;
  
  console.log(`\nPerformance Improvement with Confirmation:`);
  console.log(`Win Rate Improvement: ${(winRateImprovement * 100).toFixed(2)}%`);
  console.log(`Risk/Reward Improvement: ${riskRewardImprovement.toFixed(2)}`);
  
  // Find pairs where the same symbol had breakouts in different timeframes
  const symbolBreakouts: Record<string, Record<string, BacktestResult[]>> = {};
  
  validResults.forEach(result => {
    const symbol = result.symbol;
    const timeframe = result.timeframe;
    
    if (!symbolBreakouts[symbol]) {
      symbolBreakouts[symbol] = {};
    }
    
    if (!symbolBreakouts[symbol][timeframe]) {
      symbolBreakouts[symbol][timeframe] = [];
    }
    
    symbolBreakouts[symbol][timeframe].push(result);
  });
  
  // Analyze predictive power of lower timeframes
  let totalPredictions = 0;
  let correctPredictions = 0;
  
  for (const symbol in symbolBreakouts) {
    for (const timeframe in symbolBreakouts[symbol]) {
      const nextTimeframe = getNextTimeframe(timeframe);
      if (!nextTimeframe) continue;
      
      if (!symbolBreakouts[symbol][nextTimeframe]) continue;
      
      const lowerTfResults = symbolBreakouts[symbol][timeframe];
      const higherTfResults = symbolBreakouts[symbol][nextTimeframe];
      
      lowerTfResults.forEach(lowerResult => {
        higherTfResults.forEach(higherResult => {
          const lowerDate = new Date(lowerResult.created_at);
          const higherDate = new Date(higherResult.created_at);
          
          // Check if lower timeframe breakout happened within 1 day before higher timeframe
          const daysDiff = (higherDate.getTime() - lowerDate.getTime()) / (1000 * 60 * 60 * 24);
          
          if (daysDiff > 0 && daysDiff <= 1) {
            totalPredictions++;
            
            // If both succeeded or both failed, count as correct prediction
            if (lowerResult.success === higherResult.success) {
              correctPredictions++;
            }
          }
        });
      });
    }
  }
  
  // Print multi-timeframe prediction results
  console.log(`\nPredictive Power of Lower Timeframes:`);
  console.log(`Total Predictions: ${totalPredictions}`);
  console.log(`Correct Predictions: ${correctPredictions}`);
  console.log(`Accuracy: ${totalPredictions > 0 ? ((correctPredictions / totalPredictions) * 100).toFixed(2) : 0}%`);
  
  // Best performing timeframe combinations
  console.log('\n===== BEST PERFORMING TIMEFRAME COMBINATIONS =====');
  const combinations: Record<string, { total: number; wins: number; winRate: number }> = {};
  
  for (const symbol in symbolBreakouts) {
    for (const timeframe in symbolBreakouts[symbol]) {
      const nextTimeframe = getNextTimeframe(timeframe);
      if (!nextTimeframe) continue;
      
      if (!symbolBreakouts[symbol][nextTimeframe]) continue;
      
      const key = `${timeframe}→${nextTimeframe}`;
      if (!combinations[key]) {
        combinations[key] = { total: 0, wins: 0, winRate: 0 };
      }
      
      combinations[key].total++;
      
      // If both timeframes have successful results, count as a win
      if (
        symbolBreakouts[symbol][timeframe].some(r => r.success) && 
        symbolBreakouts[symbol][nextTimeframe].some(r => r.success)
      ) {
        combinations[key].wins++;
      }
    }
  }
  
  // Calculate win rates
  for (const key in combinations) {
    combinations[key].winRate = combinations[key].total > 0 
      ? combinations[key].wins / combinations[key].total 
      : 0;
  }
  
  // Print best combinations
  console.log('Timeframe Combinations Performance:');
  Object.entries(combinations)
    .sort((a, b) => b[1].winRate - a[1].winRate)
    .forEach(([combo, stats]) => {
      console.log(`${combo}: ${(stats.winRate * 100).toFixed(2)}% (${stats.wins}/${stats.total})`);
    });

  // Generate trading recommendations based on the analysis
  console.log('\n===== TRADING STRATEGY RECOMMENDATIONS =====');

  // 1. Find best performing pattern types
  const patternPerformance: Record<string, { total: number; wins: number; winRate: number; avgProfit: number }> = {};
  
  // Calculate performance by pattern type
  validResults.forEach(result => {
    const patternType = result.pattern_type;
    
    if (!patternPerformance[patternType]) {
      patternPerformance[patternType] = { total: 0, wins: 0, winRate: 0, avgProfit: 0 };
    }
    
    patternPerformance[patternType].total++;
    if (result.success) {
      patternPerformance[patternType].wins++;
      patternPerformance[patternType].avgProfit += result.profit_loss_percent;
    }
  });
  
  // Calculate win rates and average profits
  Object.values(patternPerformance).forEach(perf => {
    perf.winRate = perf.total > 0 ? perf.wins / perf.total : 0;
    perf.avgProfit = perf.wins > 0 ? perf.avgProfit / perf.wins : 0;
  });
  
  // Sort by win rate to get best performers
  const bestPatterns = Object.entries(patternPerformance)
    .filter(([_, perf]) => perf.total >= 5) // Only consider patterns with at least 5 occurrences
    .sort((a, b) => b[1].winRate - a[1].winRate);
  
  // 2. Find best performing timeframes
  const timeframePerformanceArr = Object.values(timeframeStats)
    .sort((a, b) => b.winRate - a.winRate);
  
  // 3. Find best channel types
  const channelTypePerformance: Record<string, { total: number; wins: number; winRate: number }> = {};
  
  // Calculate performance by channel type
  validResults.forEach(result => {
    const channelType = result.channel_type;
    if (!channelType) return;
    
    if (!channelTypePerformance[channelType]) {
      channelTypePerformance[channelType] = { total: 0, wins: 0, winRate: 0 };
    }
    
    channelTypePerformance[channelType].total++;
    if (result.success) {
      channelTypePerformance[channelType].wins++;
    }
  });
  
  // Calculate win rates
  Object.values(channelTypePerformance).forEach(perf => {
    perf.winRate = perf.total > 0 ? perf.wins / perf.total : 0;
  });
  
  // Sort by win rate to get best performers
  const bestChannelTypes = Object.entries(channelTypePerformance)
    .filter(([_, perf]) => perf.total >= 5) // Only consider channel types with at least 5 occurrences
    .sort((a, b) => b[1].winRate - a[1].winRate);
  
  // Display top recommendations
  console.log('\nBest Performing Pattern Types:');
  bestPatterns.slice(0, 3).forEach(([pattern, perf], index) => {
    console.log(`${index + 1}. ${pattern}: ${(perf.winRate * 100).toFixed(2)}% win rate (${perf.wins}/${perf.total}), ${perf.avgProfit.toFixed(2)}% avg profit`);
  });
  
  console.log('\nBest Performing Timeframes:');
  timeframePerformanceArr.slice(0, 3).forEach((stats, index) => {
    console.log(`${index + 1}. ${stats.timeframe}: ${(stats.winRate * 100).toFixed(2)}% win rate (${stats.wins}/${stats.total}), ${stats.riskRewardRatio.toFixed(2)} R/R ratio`);
  });
  
  console.log('\nBest Performing Channel Types:');
  bestChannelTypes.slice(0, 3).forEach(([channel, perf], index) => {
    console.log(`${index + 1}. ${channel}: ${(perf.winRate * 100).toFixed(2)}% win rate (${perf.wins}/${perf.total})`);
  });
  
  // Multi-timeframe confirmation recommendation
  console.log('\nMulti-Timeframe Confirmation Analysis:');
  if (confirmedTotal >= 5 && confirmedWinRate > nonConfirmedWinRate) {
    console.log('✅ Higher timeframe confirmation shows improved results');
    console.log(`Win rate improvement: +${(winRateImprovement * 100).toFixed(2)}%`);
    console.log(`Risk/reward improvement: +${riskRewardImprovement.toFixed(2)}`);
    
    // Best timeframe combination for confirmation
    const bestCombination = Object.entries(combinations)
      .filter(([_, stats]) => stats.total >= 3) // Need at least 3 samples
      .sort((a, b) => b[1].winRate - a[1].winRate)[0];
    
    if (bestCombination) {
      console.log(`Best timeframe combination: ${bestCombination[0]} with ${(bestCombination[1].winRate * 100).toFixed(2)}% win rate`);
    }
  } else {
    console.log('ℹ️ Insufficient data for multi-timeframe confirmation analysis');
    console.log('Analysis shows either not enough samples or undetermined improvement from higher timeframe confirmation.');
  }
  
  // Trade Management System
  console.log('\n📊 CONFIDENCE SCORE & EXIT ALERT SYSTEM:');
  
  // Average breakout time for exit planning
  const avgBreakout = Math.round(Object.values(timeframeStats).reduce((sum, stats) => sum + stats.avgCandlesToBreakout, 0) / Object.values(timeframeStats).length);
  
  console.log(`1. Pattern confidence score determines trade selection`);
  console.log(`   - Confidence score combines technical indicators, timeframe alignment, and pattern strength`);
  console.log(`   - Higher scores indicate higher probability setups (>75% considered high confidence)`);
  console.log(`   - Pattern type, channel type, and timeframe are factors in confidence calculation`);
  
  console.log(`2. Exit Alert System monitors open positions and alerts via SMS/email when:`);
  console.log(`   - Price approaches target price (adaptive based on volatility)`);
  console.log(`   - Higher timeframe trendline breaks occur against position`);
  console.log(`   - Momentum shift detected via technical indicators`);
  console.log(`   - Maximum holding period reached (${Math.round(avgBreakout * 2)} candles typical limit)`);
  
  console.log(`3. Exit criteria vary by pattern strength:`);
  console.log(`   - Target range typically 5-15% for breakouts (based on volatility)`);
  console.log(`   - Dynamic exit points updated as price action evolves`);
  console.log(`   - Trailing stops adjust automatically with trend strength`);
  console.log(`   - Partial profit taking at predetermined levels`);
  
  console.log(`4. Position Management Approach:`);
  console.log(`   - Entry flags generated based on confidence score`);
  console.log(`   - Exit alerts triggered based on price action, not fixed targets`);
  console.log(`   - Alert system notifies when a position should be closed or adjusted`);
  console.log(`   - Captures larger moves by letting winners run with trailing protection`);
}

runBacktests()
  .catch(error => {
    console.error('Error running backtests:', error);
  });