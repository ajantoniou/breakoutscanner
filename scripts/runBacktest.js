// Import the necessary modules
const path = require('path');

// Determine if we should use ESM syntax for TypeScript files
console.log("Checking for TypeScript support...");
let useComprehensiveBacktest = false;

try {
  // Try to import the comprehensive backtesting script
  require('./comprehensive-backtest');
  useComprehensiveBacktest = true;
  console.log("Using comprehensive backtest script");
} catch (err) {
  console.log("Falling back to basic backtest");
  // The script will continue with the basic backtest
}

// Get path to the project root
const projectRoot = path.resolve(__dirname, '..');

// If we're using the comprehensive backtest
if (useComprehensiveBacktest) {
  // We need to run the TypeScript file directly
  console.log("To run the comprehensive backtest, use the following command:");
  console.log(`cd ${projectRoot} && npm run backtest`);
  console.log("Or use the shell script:");
  console.log(`sh ${projectRoot}/scripts/run-backtest.sh`);
  process.exit(0);
}

// Otherwise continue with basic backtest
try {
  // Import the PatternBacktester - adjust path based on project structure
  const { default: PatternBacktester } = require('../src/services/backtesting/patternBacktester');

  // Get the singleton instance
  const backtester = PatternBacktester.getInstance();

  // Initialize the backtester
  async function runBacktest() {
    console.log("Initializing backtester...");
    await backtester.initialize();
    
    // Get and display the performance metrics
    const metrics = backtester.getPerformanceMetrics();
    
    console.log("\n=== BACKTEST RESULTS ===\n");
    
    console.log("Overall Performance:");
    console.log(`Total Patterns: ${metrics.totalPatterns}`);
    console.log(`Completed Patterns: ${metrics.completedPatterns}`);
    console.log(`Successful Patterns: ${metrics.successfulPatterns}`);
    console.log(`Failed Patterns: ${metrics.failedPatterns}`);
    console.log(`Pending Patterns: ${metrics.pendingPatterns}`);
    console.log(`Win Rate: ${metrics.winRate.toFixed(2)}%`);
    console.log(`Average Profit: ${metrics.averageProfit.toFixed(2)}%`);
    console.log(`Average Loss: ${metrics.averageLoss.toFixed(2)}%`);
    console.log(`Max Profit: ${metrics.maxProfit.toFixed(2)}%`);
    console.log(`Max Loss: ${metrics.maxLoss.toFixed(2)}%`);
    console.log(`Risk/Reward Ratio: ${metrics.riskRewardRatio.toFixed(2)}`);
    console.log(`Profit Factor: ${metrics.profitFactor.toFixed(2)}`);
    
    console.log("\nPerformance by Pattern Type:");
    Object.entries(metrics.byPatternType).forEach(([type, data]) => {
      console.log(`\n${type}:`);
      console.log(`  Total: ${data.total}`);
      console.log(`  Completed: ${data.completed}`);
      console.log(`  Success: ${data.success}`);
      console.log(`  Failure: ${data.failure}`);
      console.log(`  Win Rate: ${data.winRate.toFixed(2)}%`);
      console.log(`  Average Profit: ${data.averageProfit.toFixed(2)}%`);
      console.log(`  Average Loss: ${data.averageLoss.toFixed(2)}%`);
      console.log(`  Risk/Reward Ratio: ${data.riskRewardRatio.toFixed(2)}`);
    });
    
    // Export the full data for further analysis
    const exportData = backtester.exportPerformanceData();
    console.log("\nExported full data including individual pattern performance.");
    
    console.log("\nBacktest complete. Results are based on real market data.");
  }

  // Run the backtest
  runBacktest().catch(err => {
    console.error("Error running backtest:", err);
  });
} catch (err) {
  console.error("Could not import PatternBacktester. Error:", err);
  console.log("\nInstead, you can use the built-in backtest script:");
  console.log(`cd ${projectRoot} && npm run backtest`);
} 