import { patternDetectionService } from '@/services/api/marketData/patternDetectionService';
import { PatternData } from '@/services/types/patternTypes';

// List of symbols to test
const TEST_SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL'];

/**
 * Group patterns by symbol and timeframe for easier analysis
 */
function groupPatterns(patterns: PatternData[]): Record<string, Record<string, PatternData[]>> {
  const grouped: Record<string, Record<string, PatternData[]>> = {};
  
  for (const pattern of patterns) {
    const { symbol, timeframe } = pattern;
    
    if (!grouped[symbol]) {
      grouped[symbol] = {};
    }
    
    if (!grouped[symbol][timeframe]) {
      grouped[symbol][timeframe] = [];
    }
    
    grouped[symbol][timeframe].push(pattern);
  }
  
  return grouped;
}

/**
 * Calculate confirmation statistics for patterns
 */
function analyzeConfirmations(patterns: PatternData[]): {
  total: number;
  confirmed: number;
  avgConfidenceScore: number;
  avgConfidenceScoreConfirmed: number;
  avgConfidenceScoreUnconfirmed: number;
} {
  const total = patterns.length;
  const confirmed = patterns.filter(p => p.multiTimeframeConfirmed).length;
  
  const avgConfidenceScore = patterns.reduce((sum, p) => sum + (p.confidenceScore || 0), 0) / total;
  
  const confirmedPatterns = patterns.filter(p => p.multiTimeframeConfirmed);
  const unconfirmedPatterns = patterns.filter(p => !p.multiTimeframeConfirmed);
  
  const avgConfidenceScoreConfirmed = confirmedPatterns.length > 0 ?
    confirmedPatterns.reduce((sum, p) => sum + (p.confidenceScore || 0), 0) / confirmedPatterns.length : 0;
    
  const avgConfidenceScoreUnconfirmed = unconfirmedPatterns.length > 0 ?
    unconfirmedPatterns.reduce((sum, p) => sum + (p.confidenceScore || 0), 0) / unconfirmedPatterns.length : 0;
  
  return {
    total,
    confirmed,
    avgConfidenceScore,
    avgConfidenceScoreConfirmed,
    avgConfidenceScoreUnconfirmed
  };
}

/**
 * Test multi-timeframe pattern detection
 */
async function testMultiTimeframePatterns() {
  console.log('Testing multi-timeframe pattern detection...');
  console.log(`Analyzing symbols: ${TEST_SYMBOLS.join(', ')}`);
  
  try {
    // Detect patterns using the multi-timeframe approach
    const patterns = await patternDetectionService.detectMultiTimeframeBatchPatterns(TEST_SYMBOLS);
    
    console.log(`\nDetected ${patterns.length} patterns across all timeframes`);
    
    // Group patterns by symbol and timeframe
    const groupedPatterns = groupPatterns(patterns);
    
    // Analyze each symbol
    for (const symbol of TEST_SYMBOLS) {
      if (!groupedPatterns[symbol]) {
        console.log(`\nNo patterns found for ${symbol}`);
        continue;
      }
      
      console.log(`\n=== Patterns for ${symbol} ===`);
      
      // Analyze each timeframe
      for (const timeframe of Object.keys(groupedPatterns[symbol])) {
        const timeframePatterns = groupedPatterns[symbol][timeframe];
        console.log(`\n${timeframe} Timeframe (${timeframePatterns.length} patterns):`);
        
        // Calculate confirmation statistics
        const stats = analyzeConfirmations(timeframePatterns);
        
        console.log(`- Confirmed Patterns: ${stats.confirmed}/${stats.total} (${((stats.confirmed / stats.total) * 100).toFixed(2)}%)`);
        console.log(`- Average Confidence Score: ${stats.avgConfidenceScore.toFixed(2)}`);
        
        if (stats.confirmed > 0) {
          console.log(`- Avg Confidence (Confirmed): ${stats.avgConfidenceScoreConfirmed.toFixed(2)}`);
        }
        
        if (stats.total - stats.confirmed > 0) {
          console.log(`- Avg Confidence (Unconfirmed): ${stats.avgConfidenceScoreUnconfirmed.toFixed(2)}`);
        }
        
        // Show details of confirmed patterns
        const confirmedPatterns = timeframePatterns.filter(p => p.multiTimeframeConfirmed);
        
        if (confirmedPatterns.length > 0) {
          console.log('\nConfirmed Pattern Details:');
          confirmedPatterns.forEach((pattern, index) => {
            console.log(`${index + 1}. ${pattern.patternType} (${pattern.channelType}, ${pattern.direction})`);
            console.log(`   Confidence: ${pattern.confidenceScore}, Confirmed in: ${pattern.confirmingTimeframe}`);
            console.log(`   Notes: ${pattern.notes || 'None'}`);
          });
        }
      }
      
      // Check cross-timeframe relationships
      console.log('\nCross-Timeframe Analysis:');
      const allTimeframes = Object.keys(groupedPatterns[symbol]);
      
      for (let i = 0; i < allTimeframes.length - 1; i++) {
        const lowerTf = allTimeframes[i];
        const higherTf = allTimeframes[i + 1];
        
        const lowerTfPatterns = groupedPatterns[symbol][lowerTf];
        const higherTfPatterns = groupedPatterns[symbol][higherTf];
        
        const confirmedInLower = lowerTfPatterns.filter(p => p.multiTimeframeConfirmed).length;
        const totalInLower = lowerTfPatterns.length;
        
        console.log(`${lowerTf} -> ${higherTf}: ${confirmedInLower}/${totalInLower} patterns confirmed (${((confirmedInLower / totalInLower) * 100).toFixed(2)}%)`);
      }
    }
    
    // Overall statistics
    console.log('\n=== Overall Multi-Timeframe Analysis ===');
    const allStats = analyzeConfirmations(patterns);
    
    console.log(`Total Patterns: ${allStats.total}`);
    console.log(`Confirmed Patterns: ${allStats.confirmed} (${((allStats.confirmed / allStats.total) * 100).toFixed(2)}%)`);
    console.log(`Average Confidence Boost: ${(allStats.avgConfidenceScoreConfirmed - allStats.avgConfidenceScoreUnconfirmed).toFixed(2)} points`);
    
    // Timeframe distribution
    console.log('\nPattern Distribution by Timeframe:');
    const timeframes = ['15m', '30m', '1h'];
    
    for (const timeframe of timeframes) {
      const tfPatterns = patterns.filter(p => p.timeframe === timeframe);
      console.log(`${timeframe}: ${tfPatterns.length} patterns (${((tfPatterns.length / patterns.length) * 100).toFixed(2)}%)`);
    }
    
  } catch (error) {
    console.error('Error testing multi-timeframe patterns:', error);
  }
}

// Run the test
testMultiTimeframePatterns(); 