// Import required modules
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Initialize Supabase client with correct URL and key from .env
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://ttmeplqmrjhysyqzuaoh.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0bWVwbHFtcmpoeXN5cXp1YW9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyMTU0NzAsImV4cCI6MjA1ODc5MTQ3MH0.38s2h7dvsOPYk_CmC8dS2h3VSCDClezIlQ4VgBFn2Ek';

console.log(`Using Supabase URL: ${supabaseUrl}`);
console.log(`Using Supabase key starting with: ${supabaseKey.substring(0, 10)}...`);

// Create Supabase client with node-fetch
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  },
  global: {
    fetch: fetch
  }
});

// Date formatting function
function formatDate(date) {
  return new Date(date).toLocaleString();
}

// Function to calculate statistics based on the actual database schema
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
      avgDaysToBreakout: 0
    };
  }

  const wins = results.filter(r => r.success === true);
  const losses = results.filter(r => r.success === false);
  
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
  
  const avgDaysToBreakout = results.filter(r => r.days_to_breakout != null)
    .reduce((sum, r) => sum + r.days_to_breakout, 0) / 
    results.filter(r => r.days_to_breakout != null).length || 0;
  
  return {
    totalTrades: results.length,
    wins: wins.length,
    losses: losses.length,
    winRate,
    avgProfitPercent: avgProfit,
    avgLossPercent: avgLoss,
    profitFactor,
    avgDaysToBreakout
  };
}

// Main function to fetch and display backtest results
async function fetchAndDisplayBacktests() {
  console.log('\n=== Fetching Real Backtest Results ===\n');
  
  try {
    // Check connection to Supabase
    console.log("Testing connection to Supabase...");
    const { data: connectionTest, error: connectionError } = await supabase.from('backtest_results').select('count(*)', { count: 'exact', head: true });
    
    if (connectionError) {
      console.error('Connection to Supabase failed:', connectionError);
      return;
    }
    
    console.log("Connection to Supabase successful");
    
    // First, fetch patterns to get additional information
    console.log("Fetching pattern data...");
    const { data: patterns, error: patternError } = await supabase
      .from('detected_patterns')
      .select('*')
      .limit(1000);
      
    if (patternError) {
      console.error('Error fetching patterns:', patternError);
    }
    
    if (!patterns || patterns.length === 0) {
      console.log("No patterns found. Trying cached_patterns table...");
      
      const { data: cachedPatterns, error: cachedPatternError } = await supabase
        .from('cached_patterns')
        .select('*')
        .limit(1000);
        
      if (cachedPatternError) {
        console.error('Error fetching cached patterns:', cachedPatternError);
      }
      
      if (cachedPatterns && cachedPatterns.length > 0) {
        patterns = cachedPatterns;
        console.log(`Using ${cachedPatterns.length} patterns from cached_patterns table`);
      }
    }
    
    const patternMap = {};
    if (patterns && patterns.length > 0) {
      patterns.forEach(pattern => {
        patternMap[pattern.id] = pattern;
      });
      console.log(`Fetched ${patterns.length} patterns for reference`);
    } else {
      console.log("Warning: No patterns found in either table. Proceeding with limited data.");
    }
    
    // Fetch most recent backtest results
    console.log("Fetching backtest results...");
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
    
    // Add pattern information to backtest results
    const enhancedResults = backtestResults.map(result => {
      const pattern = result.pattern_id ? patternMap[result.pattern_id] : {};
      return {
        ...result,
        symbol: pattern?.symbol || result.symbol || 'Unknown',
        pattern_type: pattern?.pattern_type || result.pattern_type || 'Unknown',
        timeframe: pattern?.timeframe || result.timeframe || 'Unknown',
        direction: result.direction || pattern?.direction || 'Unknown',
        confidence_score: pattern?.confidence_score || result.confidence_score || 0,
        entry_price: pattern?.entry_price || result.entry_price || 0,
        target_price: pattern?.target_price || result.target_price || 0,
        stop_loss_price: pattern?.stop_loss || result.stop_loss_price || 0
      };
    });
    
    // Calculate overall statistics
    const overallStats = calculateStatistics(enhancedResults);
    
    console.log('=== Overall Performance ===');
    console.log(`Total Backtests: ${overallStats.totalTrades}`);
    console.log(`Win Rate: ${(overallStats.winRate * 100).toFixed(2)}% (${overallStats.wins}/${overallStats.totalTrades})`);
    console.log(`Average Days to Breakout: ${overallStats.avgDaysToBreakout.toFixed(2)}`);
    console.log(`Average Win: ${overallStats.avgProfitPercent.toFixed(2)}%`);
    console.log(`Average Loss: ${overallStats.avgLossPercent.toFixed(2)}%`);
    console.log(`Profit Factor: ${overallStats.profitFactor.toFixed(2)}`);
    console.log('\n');
    
    // Group by pattern type
    const patternTypes = [...new Set(enhancedResults
      .filter(r => r.pattern_type)
      .map(r => r.pattern_type))];
      
    console.log('=== Performance by Pattern Type ===');
    
    if (patternTypes.length === 0) {
      console.log('No pattern type information available');
    } else {
      patternTypes.forEach(patternType => {
        const patternResults = enhancedResults.filter(r => r.pattern_type === patternType);
        const patternStats = calculateStatistics(patternResults);
        
        console.log(`\n${patternType}:`);
        console.log(`  Total: ${patternStats.totalTrades}`);
        console.log(`  Win Rate: ${(patternStats.winRate * 100).toFixed(2)}% (${patternStats.wins}/${patternStats.totalTrades})`);
        console.log(`  Average Win: ${patternStats.avgProfitPercent.toFixed(2)}%`);
        console.log(`  Average Loss: ${patternStats.avgLossPercent.toFixed(2)}%`);
        console.log(`  Profit Factor: ${patternStats.profitFactor.toFixed(2)}`);
      });
    }
    
    // Group by timeframe
    const timeframes = [...new Set(enhancedResults
      .filter(r => r.timeframe)
      .map(r => r.timeframe))];
      
    console.log('\n=== Performance by Timeframe ===');
    
    if (timeframes.length === 0) {
      console.log('No timeframe information available');
    } else {
      timeframes.forEach(timeframe => {
        const timeframeResults = enhancedResults.filter(r => r.timeframe === timeframe);
        const timeframeStats = calculateStatistics(timeframeResults);
        
        console.log(`\n${timeframe}:`);
        console.log(`  Total: ${timeframeStats.totalTrades}`);
        console.log(`  Win Rate: ${(timeframeStats.winRate * 100).toFixed(2)}% (${timeframeStats.wins}/${timeframeStats.totalTrades})`);
        console.log(`  Average Win: ${timeframeStats.avgProfitPercent.toFixed(2)}%`);
        console.log(`  Average Loss: ${timeframeStats.avgLossPercent.toFixed(2)}%`);
        console.log(`  Profit Factor: ${timeframeStats.profitFactor.toFixed(2)}`);
      });
    }
    
    // Get most profitable setups
    console.log('\n=== Most Profitable Patterns ===');
    const profitablePatterns = [...enhancedResults]
      .filter(r => r.success === true && r.symbol)
      .sort((a, b) => b.profit_loss_percent - a.profit_loss_percent)
      .slice(0, 10);
    
    if (profitablePatterns.length === 0) {
      console.log('No profitable patterns found');
    } else {
      profitablePatterns.forEach((pattern, index) => {
        console.log(`\n${index + 1}. ${pattern.symbol || 'Unknown'} - ${pattern.pattern_type || 'Unknown'} (${pattern.timeframe || 'Unknown'})`);
        console.log(`   Direction: ${pattern.direction || 'Unknown'}`);
        console.log(`   Profit: ${pattern.profit_loss_percent.toFixed(2)}%`);
        console.log(`   Date: ${formatDate(pattern.created_at)}`);
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
        stats: calculateStatistics(enhancedResults.filter(r => r.pattern_type === type))
      })),
      byTimeframe: timeframes.map(timeframe => ({
        timeframe,
        stats: calculateStatistics(enhancedResults.filter(r => r.timeframe === timeframe))
      })),
      mostProfitable: profitablePatterns,
      rawData: enhancedResults.slice(0, 20) // Only include first 20 records to keep file size reasonable
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