import { BacktestResult, BacktestSummary } from './backtestTypes';

/**
 * Creates an empty summary with all values set to 0
 */
const createEmptySummary = (timeframe: string, patternType?: string, isSimulated = false): BacktestSummary => ({
  timeframe,
  patternType,
  totalPatterns: 0,
  successfulPatterns: 0,
  failedPatterns: 0,
  successRate: 0,
  avgProfitLossPercent: 0,
  avgCandlesToBreakout: 0,
  avgRsiAtEntry: 0,
  avgAtrPercent: 0,
  isSimulated,
  maxProfit: 0,
  maxLoss: 0,
  avgConfidenceScore: 0,
  avgRiskRewardRatio: 0,
  consistencyScore: 0,
  maxWinStreak: 0,
  maxLossStreak: 0,
  avgWin: 0,
  avgLoss: 0,
  riskRewardRatio: 0
});

/**
 * Generates a summary of backtest results
 */
export const generateBacktestSummary = (
  results: BacktestResult[],
  timeframe: string,
  patternType?: string
): BacktestSummary => {
  // Check if results exist
  if (!results || results.length === 0) {
    return createEmptySummary(timeframe, patternType);
  }
  
  // Filter results by timeframe if not 'all'
  const filteredResults = timeframe === 'all' 
    ? results 
    : results.filter(result => result.timeframe === timeframe);
  
  // Further filter by pattern type if provided
  const finalResults = patternType && patternType !== 'all'
    ? filteredResults.filter(result => result.patternType === patternType)
    : filteredResults;
    
  // Return empty summary if no results after filtering
  if (finalResults.length === 0) {
    return createEmptySummary(timeframe, patternType);
  }

  // Calculate basic metrics
  const totalPatterns = finalResults.length;
  const successfulPatterns = finalResults.filter(r => r.successful).length;
  const failedPatterns = totalPatterns - successfulPatterns;
  const successRate = totalPatterns > 0 ? (successfulPatterns / totalPatterns) * 100 : 0;

  // Calculate profit/loss metrics
  const profitLossValues = finalResults.map(r => r.profitLossPercent || 0);
  const avgProfitLossPercent = profitLossValues.reduce((sum, val) => sum + val, 0) / totalPatterns;

  // Calculate separate average for wins and losses
  const winningResults = finalResults.filter(r => r.successful);
  const losingResults = finalResults.filter(r => !r.successful);
  
  const avgWin = winningResults.length > 0
    ? winningResults.reduce((sum, r) => sum + (r.profitLossPercent || 0), 0) / winningResults.length
    : 0;
    
  const avgLoss = losingResults.length > 0
    ? losingResults.reduce((sum, r) => sum + (r.profitLossPercent || 0), 0) / losingResults.length
    : 0;
    
  // Calculate risk/reward ratio
  const riskRewardRatio = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0;

  // Calculate max profit and loss
  const maxProfit = Math.max(...profitLossValues, 0);
  const maxLoss = Math.min(...profitLossValues, 0);

  // Calculate average candles to breakout
  const candlesToBreakout = finalResults.map(r => r.candlesToBreakout || 0);
  const avgCandlesToBreakout = candlesToBreakout.reduce((sum, val) => sum + val, 0) / totalPatterns;

  // Calculate RSI and ATR metrics
  const rsiValues = finalResults.map(r => r.rsiAtEntry || 0).filter(v => v > 0);
  const avgRsiAtEntry = rsiValues.length > 0 
    ? rsiValues.reduce((sum, val) => sum + val, 0) / rsiValues.length 
    : 0;
    
  // Calculate ATR as percentage of entry price
  const atrValues = finalResults.map(r => {
    if (r.atrAtEntry && r.atrAtEntry > 0 && r.entryPrice > 0) {
      // Convert ATR to percentage of entry price
      return (r.atrAtEntry / r.entryPrice) * 100;
    }
    return 0;
  }).filter(v => v > 0);
  
  const avgAtrPercent = atrValues.length > 0 
    ? atrValues.reduce((sum, val) => sum + val, 0) / atrValues.length 
    : 0;
  
  // Calculate confidence score metrics
  const confidenceScores = finalResults.map(r => r.confidenceScore || 0).filter(v => v > 0);
  const avgConfidenceScore = confidenceScores.length > 0
    ? confidenceScores.reduce((sum, val) => sum + val, 0) / confidenceScores.length
    : 0;
  
  // Calculate win/loss streaks
  let currentWinStreak = 0;
  let maxWinStreak = 0;
  let currentLossStreak = 0;
  let maxLossStreak = 0;
  
  // Sort by entry time to calculate streaks chronologically
  const sortedResults = [...finalResults].sort((a, b) => {
    return new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime();
  });
  
  sortedResults.forEach(result => {
    if (result.successful) {
      currentWinStreak++;
      currentLossStreak = 0;
      
      if (currentWinStreak > maxWinStreak) {
        maxWinStreak = currentWinStreak;
      }
    } else {
      currentLossStreak++;
      currentWinStreak = 0;
      
      if (currentLossStreak > maxLossStreak) {
        maxLossStreak = currentLossStreak;
      }
    }
  });
  
  // Calculate consistency score (0-100)
  // Higher consistency score means results are more predictable
  // Based on standard deviation of profit/loss values
  const meanProfitLoss = avgProfitLossPercent;
  const varianceSum = profitLossValues.reduce((sum, val) => {
    const diff = val - meanProfitLoss;
    return sum + (diff * diff);
  }, 0);
  
  const stdDeviation = Math.sqrt(varianceSum / totalPatterns);
  // Higher std deviation means less consistency
  // Calculate score where lower std deviation gives higher score
  // Cap stdDeviation at 20 (20% deviation)
  const maxStdDev = 20;
  const cappedStdDev = Math.min(stdDeviation, maxStdDev);
  const consistencyScore = 100 * (1 - (cappedStdDev / maxStdDev));
  
  // Calculate average risk/reward ratio per trade based on available risk/reward fields
  const riskRewardValues = finalResults
    .filter(result => result.riskRewardRatio !== undefined && result.riskRewardRatio > 0)
    .map(result => result.riskRewardRatio || 0);
    
  const avgRiskRewardRatio = riskRewardValues.length > 0
    ? riskRewardValues.reduce((sum, val) => sum + val, 0) / riskRewardValues.length
    : 0;
    
  // Check if any results are simulated
  const isSimulated = finalResults.some(result => result.isSimulated === true);

  return {
    timeframe,
    patternType,
    totalPatterns,
    successfulPatterns,
    failedPatterns,
    successRate,
    avgProfitLossPercent,
    avgCandlesToBreakout,
    avgRsiAtEntry,
    avgAtrPercent,
    isSimulated,
    maxProfit,
    maxLoss,
    avgConfidenceScore,
    avgRiskRewardRatio,
    consistencyScore,
    maxWinStreak,
    maxLossStreak,
    avgWin,
    avgLoss,
    riskRewardRatio
  };
};
