import { BacktestResult } from '@/services/types/backtestTypes';
import { PatternData } from '@/services/types/patternTypes';

/**
 * Analyze pattern types performance from backtest results
 */
export function analyzePatternPerformance(backtestResults: BacktestResult[]) {
  if (!backtestResults || backtestResults.length === 0) {
    return [];
  }
  
  // Group by pattern type
  const patternTypes = [...new Set(backtestResults.map(r => r.patternType))];
  
  const performance = patternTypes.map(patternType => {
    const resultsForPattern = backtestResults.filter(r => r.patternType === patternType);
    const successfulResults = resultsForPattern.filter(r => r.successful);
    
    return {
      patternType,
      successRate: resultsForPattern.length > 0 ? successfulResults.length / resultsForPattern.length : 0,
      avgProfit: resultsForPattern.length > 0 ? 
        resultsForPattern.reduce((sum, r) => sum + r.profitLossPercent, 0) / resultsForPattern.length : 0,
      sampleSize: resultsForPattern.length,
      avgCandlesToBreakout: resultsForPattern.length > 0 ?
        resultsForPattern.reduce((sum, r) => sum + r.candlesToBreakout, 0) / resultsForPattern.length : 0
    };
  });
  
  // Sort by success rate, then by average profit
  return performance
    .filter(p => p.sampleSize >= 3) // Filter for statistical significance
    .sort((a, b) => 
      b.successRate !== a.successRate ? 
        b.successRate - a.successRate : 
        b.avgProfit - a.avgProfit
    );
}

/**
 * Analyze timeframe performance from backtest results
 */
export function analyzeTimeframePerformance(backtestResults: BacktestResult[]) {
  if (!backtestResults || backtestResults.length === 0) {
    return [];
  }
  
  // Group by timeframe
  const timeframes = [...new Set(backtestResults.map(r => r.timeframe))];
  
  const performance = timeframes.map(timeframe => {
    const resultsForTimeframe = backtestResults.filter(r => r.timeframe === timeframe);
    const successfulResults = resultsForTimeframe.filter(r => r.successful);
    
    return {
      timeframe,
      successRate: resultsForTimeframe.length > 0 ? 
        successfulResults.length / resultsForTimeframe.length : 0,
      avgProfit: resultsForTimeframe.length > 0 ? 
        resultsForTimeframe.reduce((sum, r) => sum + r.profitLossPercent, 0) / resultsForTimeframe.length : 0,
      sampleSize: resultsForTimeframe.length,
      avgCandlesToBreakout: resultsForTimeframe.length > 0 ?
        resultsForTimeframe.reduce((sum, r) => sum + r.candlesToBreakout, 0) / resultsForTimeframe.length : 0
    };
  });
  
  // Sort by success rate, then by average profit
  return performance
    .filter(p => p.sampleSize >= 3) // Filter for statistical significance
    .sort((a, b) => 
      b.successRate !== a.successRate ? 
        b.successRate - a.successRate : 
        b.avgProfit - a.avgProfit
    );
}

/**
 * Analyze stop loss effectiveness from backtest results
 */
export function analyzeStopLosses(backtestResults: BacktestResult[]) {
  if (!backtestResults || backtestResults.length === 0) {
    return {
      tooTight: false,
      tooTightPercent: 0,
      suggestedAdjustment: 0,
      avgDrawdown: 0,
      sampleSize: 0
    };
  }
  
  // Calculate how many trades hit stop loss vs target
  const stoppedOutTrades = backtestResults.filter(r => 
    !r.successful && Math.abs(r.actualExitPrice - (r.stopLoss || 0)) < 0.01
  );
  
  const tooTightPercent = backtestResults.length > 0 ? 
    (stoppedOutTrades.length / backtestResults.length) * 100 : 0;
  
  // Calculate average drawdown
  const avgDrawdown = backtestResults.reduce((sum, r) => sum + (r.maxDrawdown || 0), 0) / backtestResults.length;
  
  return {
    tooTight: tooTightPercent > 30, // If more than 30% of trades are stopped out
    tooTightPercent,
    suggestedAdjustment: tooTightPercent > 50 ? 15 : tooTightPercent > 30 ? 10 : 5,
    avgDrawdown,
    sampleSize: backtestResults.length
  };
}

/**
 * Analyze technical indicators correlation with success
 */
export function analyzeTechnicalIndicators(backtestResults: BacktestResult[]) {
  if (!backtestResults || backtestResults.length === 0) {
    return {
      rsiCorrelation: 0,
      highRsiSuccess: 0,
      lowRsiSuccess: 0,
      neutralRsiSuccess: 0,
      atrCorrelation: 0,
      significantIndicators: []
    };
  }
  
  // Only use results with RSI values
  const resultsWithRsi = backtestResults.filter(r => r.rsiAtEntry !== undefined);
  
  if (resultsWithRsi.length === 0) {
    return {
      rsiCorrelation: 0,
      highRsiSuccess: 0,
      lowRsiSuccess: 0,
      neutralRsiSuccess: 0,
      atrCorrelation: 0,
      significantIndicators: []
    };
  }
  
  // Group by RSI ranges
  const highRsi = resultsWithRsi.filter(r => (r.rsiAtEntry || 0) > 70);
  const lowRsi = resultsWithRsi.filter(r => (r.rsiAtEntry || 0) < 30);
  const neutralRsi = resultsWithRsi.filter(r => (r.rsiAtEntry || 0) >= 30 && (r.rsiAtEntry || 0) <= 70);
  
  const highRsiSuccess = highRsi.length > 0 ? 
    highRsi.filter(r => r.successful).length / highRsi.length : 0;
  
  const lowRsiSuccess = lowRsi.length > 0 ? 
    lowRsi.filter(r => r.successful).length / lowRsi.length : 0;
  
  const neutralRsiSuccess = neutralRsi.length > 0 ? 
    neutralRsi.filter(r => r.successful).length / neutralRsi.length : 0;
  
  // Simple correlation calculation
  const rsiValues = resultsWithRsi.map(r => r.rsiAtEntry || 50);
  const successValues = resultsWithRsi.map(r => r.successful ? 1 : 0);
  
  const rsiCorrelation = calculateCorrelation(rsiValues, successValues);
  
  // Check for ATR correlation if available
  const resultsWithAtr = backtestResults.filter(r => r.atrAtEntry !== undefined);
  let atrCorrelation = 0;
  
  if (resultsWithAtr.length > 0) {
    const atrValues = resultsWithAtr.map(r => r.atrAtEntry || 0);
    const atrSuccessValues = resultsWithAtr.map(r => r.successful ? 1 : 0);
    atrCorrelation = calculateCorrelation(atrValues, atrSuccessValues);
  }
  
  // Find significant indicators
  const significantIndicators = [];
  
  if (Math.abs(rsiCorrelation) > 0.2) {
    significantIndicators.push({
      name: 'RSI',
      correlation: rsiCorrelation,
      recommendation: rsiCorrelation > 0 ? 
        'Higher RSI values correlate with success' : 
        'Lower RSI values correlate with success'
    });
  }
  
  if (Math.abs(atrCorrelation) > 0.2) {
    significantIndicators.push({
      name: 'ATR',
      correlation: atrCorrelation,
      recommendation: atrCorrelation > 0 ? 
        'Higher volatility (ATR) correlates with success' : 
        'Lower volatility (ATR) correlates with success'
    });
  }
  
  return {
    rsiCorrelation,
    highRsiSuccess,
    lowRsiSuccess,
    neutralRsiSuccess,
    atrCorrelation,
    significantIndicators
  };
}

/**
 * Analyze direction effectiveness (bullish vs bearish)
 */
export function analyzeDirections(backtestResults: BacktestResult[]) {
  if (!backtestResults || backtestResults.length === 0) {
    return {
      bullishCount: 0,
      bearishCount: 0,
      bullishSuccessRate: 0,
      bearishSuccessRate: 0,
      bullishAvgProfit: 0,
      bearishAvgProfit: 0,
      strongerDirection: null
    };
  }
  
  const bullishResults = backtestResults.filter(r => r.predictedDirection === 'bullish');
  const bearishResults = backtestResults.filter(r => r.predictedDirection === 'bearish');
  
  const bullishSuccessful = bullishResults.filter(r => r.successful);
  const bearishSuccessful = bearishResults.filter(r => r.successful);
  
  const bullishSuccessRate = bullishResults.length > 0 ? 
    bullishSuccessful.length / bullishResults.length : 0;
  
  const bearishSuccessRate = bearishResults.length > 0 ? 
    bearishSuccessful.length / bearishResults.length : 0;
  
  const bullishAvgProfit = bullishResults.length > 0 ? 
    bullishResults.reduce((sum, r) => sum + r.profitLossPercent, 0) / bullishResults.length : 0;
  
  const bearishAvgProfit = bearishResults.length > 0 ? 
    bearishResults.reduce((sum, r) => sum + r.profitLossPercent, 0) / bearishResults.length : 0;
  
  let strongerDirection = null;
  
  // Determine which direction performs better
  if (bullishResults.length >= 3 && bearishResults.length >= 3) {
    if (bullishSuccessRate > bearishSuccessRate + 0.1) {
      strongerDirection = 'bullish';
    } else if (bearishSuccessRate > bullishSuccessRate + 0.1) {
      strongerDirection = 'bearish';
    }
  }
  
  return {
    bullishCount: bullishResults.length,
    bearishCount: bearishResults.length,
    bullishSuccessRate,
    bearishSuccessRate,
    bullishAvgProfit,
    bearishAvgProfit,
    strongerDirection
  };
}

/**
 * Helper function to calculate correlation between two arrays
 */
export function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) {
    return 0;
  }
  
  const n = x.length;
  
  // Calculate means
  const xMean = x.reduce((a, b) => a + b, 0) / n;
  const yMean = y.reduce((a, b) => a + b, 0) / n;
  
  // Calculate covariance and variances
  let covariance = 0;
  let xVariance = 0;
  let yVariance = 0;
  
  for (let i = 0; i < n; i++) {
    const xDiff = x[i] - xMean;
    const yDiff = y[i] - yMean;
    covariance += xDiff * yDiff;
    xVariance += xDiff * xDiff;
    yVariance += yDiff * yDiff;
  }
  
  covariance /= n;
  xVariance /= n;
  yVariance /= n;
  
  // Calculate correlation
  if (xVariance === 0 || yVariance === 0) {
    return 0;
  }
  
  return covariance / (Math.sqrt(xVariance) * Math.sqrt(yVariance));
} 