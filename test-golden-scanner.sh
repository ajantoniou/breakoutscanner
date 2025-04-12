#!/bin/bash

# Golden Scanner Test Script
# This script tests the Golden Scanner with real market data

echo "🔍 Starting Golden Scanner test with real data..."

# Navigate to project directory
cd "$(dirname "$0")"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js and try again."
    exit 1
fi

# Create test directory if it doesn't exist
mkdir -p test-results

# Run Golden Scanner test
echo "📊 Testing Golden Scanner with real market data..."
node -e "
const goldenScannerService = require('./dist/services/api/marketData/goldenScannerService').default;
const fs = require('fs');

async function testGoldenScanner() {
  // Test symbols - focus on liquid stocks with good volatility
  const symbols = [
    'AAPL', 'MSFT', 'TSLA', 'AMZN', 'GOOGL', 'META', 'NVDA', 'AMD', 
    'NFLX', 'DIS', 'BA', 'JPM', 'V', 'WMT', 'PG', 'JNJ', 'UNH', 'HD',
    'INTC', 'CSCO', 'VZ', 'T', 'PFE', 'MRK', 'KO', 'PEP', 'ADBE', 'CRM',
    'PYPL', 'QCOM', 'AVGO', 'TXN', 'COST', 'SBUX', 'NKE', 'MCD'
  ];
  
  console.log(\`Testing Golden Scanner with \${symbols.length} symbols...\`);
  
  try {
    // Get high-confidence predictions
    const result = await goldenScannerService.getHighConfidencePredictions(symbols, true);
    
    // Add current prices to predictions
    const predictionsWithPrices = await goldenScannerService.addCurrentPrices(result.predictions);
    
    // Save results to file
    fs.writeFileSync('./test-results/golden-scanner-results.json', JSON.stringify({
      predictions: predictionsWithPrices,
      metadata: result.metadata
    }, null, 2));
    
    // Log summary
    console.log(\`✅ Golden Scanner test completed\`);
    console.log(\`   Symbols scanned: \${result.metadata.symbolsScanned}\`);
    console.log(\`   Patterns found: \${result.metadata.patternsFound}\`);
    console.log(\`   High-confidence patterns: \${result.metadata.highConfidenceCount}\`);
    
    // Log data freshness summary
    const freshness = result.metadata.dataFreshnessSummary;
    console.log(\`   Data freshness: \${freshness.realTimeCount} real-time, \${freshness.delayedCount} delayed, \${freshness.cachedCount} cached, \${freshness.errorCount} errors\`);
    
    // Log top predictions
    if (predictionsWithPrices.length > 0) {
      console.log(\`\nTop high-confidence predictions:\`);
      predictionsWithPrices.slice(0, 5).forEach((prediction, index) => {
        console.log(\`\n#\${index + 1}: \${prediction.symbol} - \${prediction.patternType} (\${prediction.timeframe})\`);
        console.log(\`   Direction: \${prediction.direction}\`);
        console.log(\`   Confidence: \${prediction.confidenceScore}%\`);
        console.log(\`   Current price: \${prediction.currentPrice ? '$' + prediction.currentPrice.toFixed(2) : 'N/A'}\`);
        console.log(\`   Entry: $\${prediction.entry.toFixed(2)}\`);
        console.log(\`   Target: $\${prediction.target.toFixed(2)}\`);
        console.log(\`   Stop loss: $\${prediction.stopLoss.toFixed(2)}\`);
        console.log(\`   Potential profit: \${prediction.potentialProfit.toFixed(2)}%\`);
        console.log(\`   Data freshness: \${prediction.dataFreshness}\`);
        
        if (prediction.expectedBreakoutTime) {
          const breakoutTime = new Date(prediction.expectedBreakoutTime);
          console.log(\`   Expected breakout: \${breakoutTime.toLocaleString()} (\${prediction.expectedCandlesToBreakout} candles)\`);
        }
      });
    } else {
      console.log(\`\nNo high-confidence predictions found at this time.\`);
    }
    
    return predictionsWithPrices;
  } catch (error) {
    console.error(\`❌ Error testing Golden Scanner: \${error.message}\`);
    fs.writeFileSync('./test-results/golden-scanner-error.json', JSON.stringify({
      error: error.message,
      stack: error.stack
    }, null, 2));
    return [];
  }
}

testGoldenScanner().catch(console.error);
" || echo "❌ Golden Scanner test failed."

echo "✅ Golden Scanner test completed. Check the test-results directory for detailed results."
