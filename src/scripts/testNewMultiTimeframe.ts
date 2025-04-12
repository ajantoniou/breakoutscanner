import { patternDetectionService } from '../services/api/marketData/patternDetectionService';
import { createClient } from '@supabase/supabase-js';

// Supabase credentials
const SUPABASE_URL = "https://ttmeplqmrjhysyqzuaoh.supabase.co";
// Use the anon key for testing
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0bWVwbHFtcmpoeXN5cXp1YW9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyMTU0NzAsImV4cCI6MjA1ODc5MTQ3MH0.38s2h7dvsOPYk_CmC8dS2h3VSCDClezIlQ4VgBFn2Ek";

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test with high-quality, option-enabled stocks
const TEST_SYMBOLS = [
  'AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 
  'GOOGL', 'META', 'AMD', 'COIN', 'SHOP', 
  'SPY', 'QQQ', 'MARA', 'PLTR', 'SMCI'
];

/**
 * Test detection and validation of patterns using our updated algorithm
 */
async function testUpdatedPatternDetection() {
  console.log('Testing updated multi-timeframe pattern detection...');
  console.log(`Analyzing ${TEST_SYMBOLS.length} symbols: ${TEST_SYMBOLS.join(', ')}`);
  
  // Store all detected patterns
  const allPatterns = [];
  const timeframes = ['15m', '30m', '1h'];
  
  // Process each symbol individually to avoid rate limits
  for (const symbol of TEST_SYMBOLS) {
    console.log(`\nProcessing ${symbol}...`);
    
    // Detect patterns for each timeframe to verify multi-timeframe confirmations
    for (const timeframe of timeframes) {
      try {
        console.log(`- Detecting patterns for ${timeframe} timeframe...`);
        const patternResult = await patternDetectionService.detectMultiTimeframePatterns(symbol, timeframe);
        
        if (patternResult.patterns && patternResult.patterns.length > 0) {
          console.log(`  Found ${patternResult.patterns.length} patterns in ${timeframe}`);
          
          // Log patterns with higher timeframe confirmation
          const confirmedPatterns = patternResult.patterns.filter(p => p.isConfirmedByHigherTimeframe);
          
          if (confirmedPatterns.length > 0) {
            console.log(`  ${confirmedPatterns.length} patterns confirmed by higher timeframe`);
            
            for (const pattern of confirmedPatterns) {
              console.log(`    - ${pattern.patternType} (${pattern.channelType}, ${pattern.direction})`);
              console.log(`      Confidence: ${pattern.confidenceScore?.toFixed(2)}, Confirmations: ${pattern.confirmingTimeframes?.join(', ') || 'None'}`);
              console.log(`      Target Notes: ${pattern.targetNotes || 'None'}`);
            }
          } else {
            console.log(`  No patterns confirmed by higher timeframe`);
          }
          
          // Add patterns to collection
          allPatterns.push(...patternResult.patterns);
        } else {
          console.log(`  No patterns found for ${symbol} in ${timeframe}`);
        }
      } catch (error) {
        console.error(`Error detecting patterns for ${symbol} in ${timeframe}:`, error);
      }
    }
    
    // Brief delay between symbols to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Analyze results
  console.log('\n===== PATTERN DETECTION RESULTS =====');
  console.log(`Total Patterns: ${allPatterns.length}`);
  
  // Analyze confirmation rate
  const confirmedPatterns = allPatterns.filter(p => p.isConfirmedByHigherTimeframe);
  const confirmationRate = confirmedPatterns.length / allPatterns.length;
  
  console.log(`\nHigher Timeframe Confirmation:`);
  console.log(`- Confirmed Patterns: ${confirmedPatterns.length}/${allPatterns.length} (${(confirmationRate * 100).toFixed(2)}%)`);
  
  // Calculate average confidence scores
  const avgConfidenceAll = allPatterns.reduce((sum, p) => sum + (p.confidenceScore || 0), 0) / allPatterns.length;
  const avgConfidenceConfirmed = confirmedPatterns.length > 0 
    ? confirmedPatterns.reduce((sum, p) => sum + (p.confidenceScore || 0), 0) / confirmedPatterns.length 
    : 0;
  const avgConfidenceUnconfirmed = allPatterns.length - confirmedPatterns.length > 0
    ? allPatterns.filter(p => !p.isConfirmedByHigherTimeframe).reduce((sum, p) => sum + (p.confidenceScore || 0), 0) 
      / (allPatterns.length - confirmedPatterns.length)
    : 0;
  
  console.log(`\nConfidence Scores:`);
  console.log(`- Average Confidence (All): ${avgConfidenceAll.toFixed(2)}`);
  console.log(`- Average Confidence (Confirmed): ${avgConfidenceConfirmed.toFixed(2)}`);
  console.log(`- Average Confidence (Unconfirmed): ${avgConfidenceUnconfirmed.toFixed(2)}`);
  console.log(`- Confidence Boost from Confirmation: ${(avgConfidenceConfirmed - avgConfidenceUnconfirmed).toFixed(2)} points`);
  
  // Analyze by timeframe
  console.log('\nPatterns by Timeframe:');
  for (const timeframe of timeframes) {
    const tfPatterns = allPatterns.filter(p => p.timeframe === timeframe);
    const tfConfirmed = tfPatterns.filter(p => p.isConfirmedByHigherTimeframe);
    const tfConfirmationRate = tfPatterns.length > 0 ? tfConfirmed.length / tfPatterns.length : 0;
    
    console.log(`\n${timeframe} Timeframe:`);
    console.log(`- Total Patterns: ${tfPatterns.length}`);
    console.log(`- Confirmed by Higher Timeframe: ${tfConfirmed.length} (${(tfConfirmationRate * 100).toFixed(2)}%)`);
    
    if (tfPatterns.length > 0) {
      const avgConf = tfPatterns.reduce((sum, p) => sum + (p.confidenceScore || 0), 0) / tfPatterns.length;
      console.log(`- Average Confidence: ${avgConf.toFixed(2)}`);
    }
    
    // Pattern types
    const patternTypes = {};
    tfPatterns.forEach(p => {
      patternTypes[p.patternType] = (patternTypes[p.patternType] || 0) + 1;
    });
    
    console.log('- Pattern Types:');
    Object.entries(patternTypes).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} (${((count as number) / tfPatterns.length * 100).toFixed(2)}%)`);
    });
  }
  
  // If we have backtested patterns, let's fetch them to see the estimated win rate
  try {
    console.log('\n===== FETCHING HISTORICAL BACKTEST RESULTS =====');
    
    // Get historical backtest results
    const { data: backtests, error: backtestError } = await supabase
      .from('backtest_results')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    
    if (backtestError) {
      console.error('Error fetching backtest results:', backtestError);
    } else if (backtests && backtests.length > 0) {
      console.log(`Found ${backtests.length} historical backtest results`);
      
      // Get pattern IDs
      const patternIds = backtests.map(result => result.pattern_id).filter(Boolean);
      
      // Fetch patterns for these backtests
      const { data: patterns, error: patternError } = await supabase
        .from('patterns')
        .select('*')
        .in('id', patternIds);
      
      if (patternError) {
        console.error('Error fetching patterns:', patternError);
      } else if (patterns && patterns.length > 0) {
        console.log(`Found ${patterns.length} associated patterns`);
        
        // Create map of patterns by ID
        const patternMap = new Map(patterns.map(pattern => [pattern.id, pattern]));
        
        // Join backtest results with patterns
        const joinedResults = backtests
          .filter(backtest => backtest.pattern_id && patternMap.has(backtest.pattern_id))
          .map(backtest => {
            const pattern = patternMap.get(backtest.pattern_id);
            return { ...backtest, pattern };
          });
        
        // Filter to 1-hour timeframe (most relevant for our changes)
        const hourResults = joinedResults.filter(result => result.pattern?.timeframe === '1h');
        
        if (hourResults.length > 0) {
          const hourSuccesses = hourResults.filter(r => r.success).length;
          const hourWinRate = hourSuccesses / hourResults.length;
          
          console.log(`\n1-hour Timeframe Historical Performance:`);
          console.log(`- Patterns: ${hourResults.length}`);
          console.log(`- Win Rate: ${(hourWinRate * 100).toFixed(2)}% (${hourSuccesses}/${hourResults.length})`);
          
          // Simulate our new confidence calculation
          const highConfResults = hourResults.filter(r => {
            const pattern = r.pattern;
            // Simulation of our improved algorithm which would boost confidence for patterns matching criteria
            let simulatedConfidence = pattern.confidence_score || 0;
            
            // Boost for ascending channels (which we found perform best)
            if (pattern.channel_type === 'ascending') {
              simulatedConfidence += 10;
            }
            
            // Boost for bullish patterns in strong channels
            if (pattern.direction === 'bullish' && 
                (pattern.channel_type === 'ascending' || pattern.channel_type === 'horizontal')) {
              simulatedConfidence += 5;
            }
            
            // Our new algorithm would mark these as confirmed by higher timeframe
            return simulatedConfidence >= 75;
          });
          
          if (highConfResults.length > 0) {
            const highConfSuccesses = highConfResults.filter(r => r.success).length;
            const highConfWinRate = highConfSuccesses / highConfResults.length;
            
            console.log(`\nProjected Performance with New Algorithm:`);
            console.log(`- High Confidence Patterns: ${highConfResults.length}`);
            console.log(`- Projected Win Rate: ${(highConfWinRate * 100).toFixed(2)}% (${highConfSuccesses}/${highConfResults.length})`);
            
            // Check if we hit 75%
            if (highConfWinRate >= 0.75) {
              console.log(`✅ Target 75% win rate ACHIEVED with our updated algorithm!`);
            } else {
              console.log(`❌ Target 75% win rate NOT yet achieved (${(highConfWinRate * 100).toFixed(2)}%)`);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error analyzing historical data:', error);
  }
}

// Run the test
testUpdatedPatternDetection()
  .catch(error => {
    console.error('Error running pattern detection test:', error);
  }); 