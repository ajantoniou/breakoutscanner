/**
 * Comprehensive Backtesting Script
 * Runs backtests on various assets and timeframes
 */

import marketDataService from '../src/services/api/marketData/dataService';
import patternDetectionService from '../src/services/api/marketData/patternDetection/patternDetectionService';
import { Candle, PatternData } from '../src/services/types/patternTypes';
import { DataMetadata } from '../src/services/api/marketData/dataService';
import { backtestSignals, BacktestResult } from '../src/services/backtesting/backtestingFramework';
import { 
  calculatePerformanceMetrics,
  analyzePatternPerformance,
  analyzeTimeframePerformance,
  generatePerformanceSummary,
  TimeframePerformance,
  PerformanceMetrics
} from '../src/services/backtesting/performanceAnalysis';
import { applyOptimizations } from '../src/services/optimization/optimizationService';
import * as fs from 'fs';
import * as path from 'path';

// Define assets to test
const assets = [
  // Large Cap Tech
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 
  // Financial
  'JPM', 'BAC', 'GS', 'MS', 'WFC',
  // Energy
  'XOM', 'CVX', 'COP', 'EOG', 'SLB',
  // Consumer
  'PG', 'KO', 'PEP', 'WMT', 'COST',
  // Healthcare
  'JNJ', 'PFE', 'MRK', 'UNH', 'ABT',
  // Industrial
  'CAT', 'DE', 'BA', 'GE', 'HON',
  // ETFs
  'SPY', 'QQQ', 'IWM', 'DIA', 'XLF'
];

// Define timeframes to test
const timeframes = ['15m', '30m', '1h', '4h', '1d'];

// Define date ranges
const dateRanges = [
  { name: 'Bull Market', start: '2020-04-01', end: '2021-04-01' },
  { name: 'Bear Market', start: '2022-01-01', end: '2022-12-31' },
  { name: 'Sideways Market', start: '2023-01-01', end: '2023-06-30' },
  { name: 'Recent Market', start: '2023-07-01', end: '2023-12-31' }
];

// Create results directory - use relative path
const resultsDir = path.resolve('./backtest-results');
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir);
}

/**
 * Run comprehensive backtests
 */
async function runComprehensiveBacktests() {
  console.log('Starting comprehensive backtesting...');
  
  // Store all results
  const allBacktestResults: BacktestResult[] = [];
  const allPatterns: PatternData[] = [];
  
  // Create summary file
  const summaryFile = path.join(resultsDir, 'backtest-summary.txt');
  fs.writeFileSync(summaryFile, 'Breakout Scanner Comprehensive Backtest Results\n\n');
  
  // Loop through date ranges
  for (const dateRange of dateRanges) {
    console.log(`Testing date range: ${dateRange.name} (${dateRange.start} to ${dateRange.end})`);
    fs.appendFileSync(summaryFile, `\n\n=== ${dateRange.name} (${dateRange.start} to ${dateRange.end}) ===\n\n`);
    
    // Create date range directory
    const dateRangeDir = path.join(resultsDir, dateRange.name.replace(/\s+/g, '-').toLowerCase());
    if (!fs.existsSync(dateRangeDir)) {
      fs.mkdirSync(dateRangeDir);
    }
    
    // Loop through assets
    for (const asset of assets) {
      console.log(`Testing asset: ${asset}`);
      
      // Create asset directory
      const assetDir = path.join(dateRangeDir, asset);
      if (!fs.existsSync(assetDir)) {
        fs.mkdirSync(assetDir);
      }
      
      // Loop through timeframes
      for (const timeframe of timeframes) {
        console.log(`Testing timeframe: ${timeframe}`);
        
        try {
          // Fetch historical data
          const { candles: data, metadata } = await marketDataService.fetchCandles(asset, timeframe, 500, dateRange.start, dateRange.end);
          
          if (!data || data.length < 50) {
            console.log(`Insufficient data for ${asset} on ${timeframe} timeframe`);
            continue;
          }
          
          // Detect patterns
          const { patterns: detectedPatterns, metadata: detectionMetadata } = await patternDetectionService.detectPatterns(asset, data, timeframe, metadata);
          
          // Add detected patterns to overall list
          allPatterns.push(...detectedPatterns);
          
          const patternsToBacktest = detectedPatterns;
          
          if (patternsToBacktest.length === 0) {
            console.log(`No patterns detected for ${asset} on ${timeframe} timeframe`);
            continue;
          }
          
          // Backtest patterns
          const backtestResults = await backtestSignals(patternsToBacktest, 30);
          allBacktestResults.push(...backtestResults);
          
          // Calculate performance metrics
          const metrics: PerformanceMetrics = calculatePerformanceMetrics(backtestResults);
          
          // Analyze pattern performance
          const patternPerformance = analyzePatternPerformance(backtestResults);
          
          // Save results
          const resultsFile = path.join(assetDir, `${timeframe}-results.json`);
          fs.writeFileSync(resultsFile, JSON.stringify({
            asset,
            timeframe,
            dateRange,
            patternsDetected: patternsToBacktest.length,
            backtestResults,
            metrics,
            patternPerformance
          }, null, 2));
          
          // Append to summary
          fs.appendFileSync(summaryFile, `${asset} (${timeframe}):\n`);
          fs.appendFileSync(summaryFile, `  Patterns detected: ${patternsToBacktest.length}\n`);
          fs.appendFileSync(summaryFile, `  Win rate: ${(metrics.winRate * 100).toFixed(2)}%\n`);
          fs.appendFileSync(summaryFile, `  Average profit/loss: ${metrics.averageProfitLoss.toFixed(2)}%\n`);
          fs.appendFileSync(summaryFile, `  Profit Factor: ${metrics.profitFactor.toFixed(2)}\n\n`);
          
          console.log(`Completed backtest for ${asset} on ${timeframe} timeframe`);
        } catch (error) {
          console.error(`Error backtesting ${asset} on ${timeframe} timeframe:`, error);
        }
      }
    }
    
    // Analyze timeframe performance for this date range
    const dateRangeResults = allBacktestResults.filter(result => {
      const resultDate = new Date(result.entryDate);
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      return resultDate >= startDate && resultDate <= endDate;
    });
    
    const timeframePerformance: TimeframePerformance[] = analyzeTimeframePerformance(dateRangeResults);
    
    // Save timeframe performance
    const timeframeFile = path.join(dateRangeDir, 'timeframe-performance.json');
    fs.writeFileSync(timeframeFile, JSON.stringify(timeframePerformance, null, 2));
    
    // Append to summary
    fs.appendFileSync(summaryFile, `\nTimeframe Performance for ${dateRange.name}:\n`);
    timeframePerformance.forEach((tfMetrics) => {
      fs.appendFileSync(summaryFile, `  ${tfMetrics.timeframe}:\n`);
      fs.appendFileSync(summaryFile, `    Win rate: ${(tfMetrics.winRate * 100).toFixed(2)}%\n`);
      fs.appendFileSync(summaryFile, `    Average profit/loss: ${tfMetrics.averageProfitLoss.toFixed(2)}%\n`);
      fs.appendFileSync(summaryFile, `    Risk/Reward Ratio: ${tfMetrics.riskRewardRatio.toFixed(2)}\n\n`);
    });
  }
  
  // Generate overall performance summary
  const overallSummary = generatePerformanceSummary(allBacktestResults);
  const overallSummaryFile = path.join(resultsDir, 'overall-summary.txt');
  fs.writeFileSync(overallSummaryFile, overallSummary);
  
  // Apply optimizations
  try {
    const optimizationResults = applyOptimizations(allPatterns, allBacktestResults);
    const optimizationFile = path.join(resultsDir, 'optimization-results.json');
    fs.writeFileSync(optimizationFile, JSON.stringify(optimizationResults, null, 2));
  } catch (optError) {
    console.error("Error during optimization step:", optError);
  }
  
  console.log('Comprehensive backtesting completed!');
  console.log(`Results saved to ${resultsDir}`);
}

// Run the backtests
runComprehensiveBacktests().catch(error => {
  console.error('Error running comprehensive backtests:', error);
});
