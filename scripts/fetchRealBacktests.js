// Import required modules
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Initialize Supabase client - will use environment variables or fallback
const supabaseUrl = process.env.SUPABASE_URL || 'https://evvntmrjphudqfurwoeh.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2dm50bXJqcGh1ZHFmdXJ3b2VoIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODE3NDEyMzYsImV4cCI6MTk5NzMxNzIzNn0.EpHiST7JgFH_V_MGgcIPIRWLMkJXdnTj0Rc-6coxJJo';
const supabase = createClient(supabaseUrl, supabaseKey);

// Date formatting function
function formatDate(date) {
  return new Date(date).toLocaleString();
}

// Function to calculate statistics
function calculateStatistics(results) {
  if (results.length === 0) {
    return {
      totalTrades: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      avgProfitPercent: 0,
      avgLossPercent: 0,
      profitFactor: 0,
      avgCandlesToBreakout: 0
    };
  }

  const wins = results.filter(r => r.hit_target);
  const losses = results.filter(r => r.hit_stop_loss);
  
  const winRate = wins.length / results.length;
  
  const avgProfit = wins.length > 0 
    ? wins.reduce((sum, r) => sum + r.profit_loss_percent, 0) / wins.length 
    : 0;
    
  const avgLoss = losses.length > 0 
    ? Math.abs(losses.reduce((sum, r) => sum + r.profit_loss_percent, 0) / losses.length)
    : 0;
    
  const totalProfit = wins.reduce((sum, r) => sum + r.profit_loss_percent, 0);
  const totalLoss = Math.abs(losses.reduce((sum, r) => sum + r.profit_loss_percent, 0));
  
  const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0;
  
  const avgCandlesToBreakout = results.filter(r => r.candles_to_breakout)
    .reduce((sum, r) => sum + r.candles_to_breakout, 0) / results.length;
  
  return {
    totalTrades: results.length,
    wins: wins.length,
    losses: losses.length,
    winRate,
    avgProfitPercent: avgProfit,
    avgLossPercent: avgLoss,
    profitFactor,
    avgCandlesToBreakout
  };
}

// Main function to fetch and display backtest results
async function fetchAndDisplayBacktests() {
  console.log('\n=== Fetching Real Backtest Results ===\n');
  
  try {
    // Fetch most recent backtest results
    const { data: backtestResults, error } = await supabase
      .from('backtest_results')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (error) {
      console.error('Error fetching backtest results:', error);
      return;
    }
    
    if (!backtestResults || backtestResults.length === 0) {
      console.log('No backtest results found in the database.');
      return;
    }
    
    console.log(`Fetched ${backtestResults.length} backtest results\n`);
    
    // Calculate overall statistics
    const overallStats = calculateStatistics(backtestResults);
    
    console.log('=== Overall Performance ===');
    console.log(`Total Backtests: ${overallStats.totalTrades}`);
    console.log(`Win Rate: ${(overallStats.winRate * 100).toFixed(2)}% (${overallStats.wins}/${overallStats.totalTrades})`);
    console.log(`Average Candles to Breakout: ${overallStats.avgCandlesToBreakout.toFixed(2)}`);
    console.log(`Average Win: ${overallStats.avgProfitPercent.toFixed(2)}%`);
    console.log(`Average Loss: ${overallStats.avgLossPercent.toFixed(2)}%`);
    console.log(`Risk/Reward Ratio: ${overallStats.profitFactor.toFixed(2)}`);
    console.log('\n');
    
    // Group by pattern type
    const patternTypes = [...new Set(backtestResults.map(r => r.pattern_type))];
    console.log('=== Performance by Pattern Type ===');
    
    patternTypes.forEach(patternType => {
      const patternResults = backtestResults.filter(r => r.pattern_type === patternType);
      const patternStats = calculateStatistics(patternResults);
      
      console.log(`\n${patternType}:`);
      console.log(`  Total: ${patternStats.totalTrades}`);
      console.log(`  Win Rate: ${(patternStats.winRate * 100).toFixed(2)}% (${patternStats.wins}/${patternStats.totalTrades})`);
      console.log(`  Average Win: ${patternStats.avgProfitPercent.toFixed(2)}%`);
      console.log(`  Average Loss: ${patternStats.avgLossPercent.toFixed(2)}%`);
      console.log(`  Risk/Reward Ratio: ${patternStats.profitFactor.toFixed(2)}`);
    });
    
    // Group by timeframe
    const timeframes = [...new Set(backtestResults.map(r => r.timeframe))];
    console.log('\n=== Performance by Timeframe ===');
    
    timeframes.forEach(timeframe => {
      const timeframeResults = backtestResults.filter(r => r.timeframe === timeframe);
      const timeframeStats = calculateStatistics(timeframeResults);
      
      console.log(`\n${timeframe}:`);
      console.log(`  Total: ${timeframeStats.totalTrades}`);
      console.log(`  Win Rate: ${(timeframeStats.winRate * 100).toFixed(2)}% (${timeframeStats.wins}/${timeframeStats.totalTrades})`);
      console.log(`  Average Win: ${timeframeStats.avgProfitPercent.toFixed(2)}%`);
      console.log(`  Average Loss: ${timeframeStats.avgLossPercent.toFixed(2)}%`);
      console.log(`  Risk/Reward Ratio: ${timeframeStats.profitFactor.toFixed(2)}`);
    });
    
    // Get most profitable setups
    console.log('\n=== Most Profitable Patterns ===');
    const profitablePatterns = [...backtestResults]
      .filter(r => r.hit_target)
      .sort((a, b) => b.profit_loss_percent - a.profit_loss_percent)
      .slice(0, 10);
    
    profitablePatterns.forEach((pattern, index) => {
      console.log(`\n${index + 1}. ${pattern.symbol} - ${pattern.pattern_type} (${pattern.timeframe})`);
      console.log(`   Direction: ${pattern.direction}`);
      console.log(`   Profit: ${pattern.profit_loss_percent.toFixed(2)}%`);
      console.log(`   Confidence Score: ${pattern.confidence_score}`);
      console.log(`   Date: ${formatDate(pattern.created_at)}`);
    });
    
    // Upcoming trading opportunities - patterns with high confidence that haven't broken out yet
    console.log('\n=== Top Trading Opportunities for Tomorrow ===');
    const tradingOpportunities = [...backtestResults]
      .filter(r => !r.has_breakout && r.confidence_score > 70)
      .sort((a, b) => b.confidence_score - a.confidence_score)
      .slice(0, 10);
    
    if (tradingOpportunities.length === 0) {
      console.log('No high-confidence patterns found for tomorrow.');
    } else {
      tradingOpportunities.forEach((pattern, index) => {
        console.log(`\n${index + 1}. ${pattern.symbol} - ${pattern.pattern_type} (${pattern.timeframe})`);
        console.log(`   Direction: ${pattern.direction}`);
        console.log(`   Entry Price: $${pattern.entry_price.toFixed(2)}`);
        console.log(`   Target Price: $${pattern.target_price.toFixed(2)}`);
        console.log(`   Stop Loss: $${pattern.stop_loss_price.toFixed(2)}`);
        console.log(`   Potential Gain: ${((pattern.target_price - pattern.entry_price) / pattern.entry_price * 100).toFixed(2)}%`);
        console.log(`   Confidence Score: ${pattern.confidence_score}`);
        console.log(`   Date Identified: ${formatDate(pattern.created_at)}`);
      });
    }
    
    // Export the results to a file
    const outputDir = path.join(__dirname, '../backtest-exports');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = path.join(outputDir, `backtest-results-${timestamp}.json`);
    
    fs.writeFileSync(outputFile, JSON.stringify({
      overall: overallStats,
      byPatternType: patternTypes.map(type => ({
        patternType: type,
        stats: calculateStatistics(backtestResults.filter(r => r.pattern_type === type))
      })),
      byTimeframe: timeframes.map(timeframe => ({
        timeframe,
        stats: calculateStatistics(backtestResults.filter(r => r.timeframe === timeframe))
      })),
      topOpportunities: tradingOpportunities,
      mostProfitable: profitablePatterns,
      rawData: backtestResults.slice(0, 20) // Only include first 20 records to keep file size reasonable
    }, null, 2));
    
    console.log(`\nDetailed results exported to: ${outputFile}`);
    
  } catch (error) {
    console.error('Error processing backtest results:', error);
  }
}

// Run the main function
fetchAndDisplayBacktests().catch(err => {
  console.error('Unhandled error:', err);
}); 