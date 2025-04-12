/**
 * Performance Metrics Analysis
 * Analyzes backtest results to generate performance metrics
 */

import { BacktestResult } from './backtestingFramework';

// Define the performance metrics interface
export interface PerformanceMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  averageProfitLoss: number;
  averageWinningTrade: number;
  averageLosingTrade: number;
  profitFactor: number;
  maxDrawdown: number;
  averageHoldingPeriod: number;
  riskRewardRatio: number;
  expectancy: number;
  sharpeRatio?: number;
  consistencyScore: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  targetHitRate: number;
  stopLossHitRate: number;
  timeoutExitRate: number;
}

// Define the pattern performance interface
export interface PatternPerformance {
  patternType: string;
  totalTrades: number;
  winRate: number;
  averageProfitLoss: number;
  riskRewardRatio: number;
  averageHoldingPeriod: number;
  consistencyScore: number;
}

// Define the timeframe performance interface
export interface TimeframePerformance {
  timeframe: string;
  totalTrades: number;
  winRate: number;
  averageProfitLoss: number;
  riskRewardRatio: number;
  averageHoldingPeriod: number;
}

/**
 * Calculate performance metrics from backtest results
 * @param results Array of backtest results
 * @returns Performance metrics
 */
export const calculatePerformanceMetrics = (results: BacktestResult[]): PerformanceMetrics => {
  if (!results || results.length === 0) {
    throw new Error('No backtest results provided for analysis');
  }

  // Basic metrics
  const totalTrades = results.length;
  const winningTrades = results.filter(r => r.successful).length;
  const losingTrades = totalTrades - winningTrades;
  const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0;
  
  // Profit/loss metrics
  const totalProfitLoss = results.reduce((sum, r) => sum + r.profitLossPercent, 0);
  const averageProfitLoss = totalTrades > 0 ? totalProfitLoss / totalTrades : 0;
  
  const winningResults = results.filter(r => r.successful);
  const losingResults = results.filter(r => !r.successful);
  
  const totalWinningProfitLoss = winningResults.reduce((sum, r) => sum + r.profitLossPercent, 0);
  const totalLosingProfitLoss = losingResults.reduce((sum, r) => sum + r.profitLossPercent, 0);
  
  const averageWinningTrade = winningTrades > 0 ? totalWinningProfitLoss / winningTrades : 0;
  const averageLosingTrade = losingTrades > 0 ? totalLosingProfitLoss / losingTrades : 0;
  
  // Profit factor (absolute ratio of gross profits to gross losses)
  const profitFactor = Math.abs(totalLosingProfitLoss) > 0 
    ? Math.abs(totalWinningProfitLoss) / Math.abs(totalLosingProfitLoss) 
    : totalWinningProfitLoss > 0 ? Infinity : 0;
  
  // Maximum drawdown
  const maxDrawdown = Math.max(...results.map(r => r.maxDrawdownPercent));
  
  // Average holding period
  const totalHoldingPeriod = results.reduce((sum, r) => sum + r.daysToExit, 0);
  const averageHoldingPeriod = totalTrades > 0 ? totalHoldingPeriod / totalTrades : 0;
  
  // Risk/reward ratio
  const totalRiskReward = results.reduce((sum, r) => sum + r.riskRewardRatio, 0);
  const riskRewardRatio = totalTrades > 0 ? totalRiskReward / totalTrades : 0;
  
  // Expectancy (average profit/loss per trade)
  const expectancy = averageProfitLoss;
  
  // Consistency score (0-100)
  // Higher score means more consistent performance
  const profitLossStdDev = calculateStandardDeviation(results.map(r => r.profitLossPercent));
  const consistencyScore = Math.max(0, Math.min(100, 100 - (profitLossStdDev / (Math.abs(averageProfitLoss) + 0.1) * 10)));
  
  // Consecutive wins/losses
  const { maxConsecutiveWins, maxConsecutiveLosses } = calculateConsecutiveWinsLosses(results);
  
  // Exit type rates
  const targetHitRate = results.filter(r => r.hitTarget).length / totalTrades;
  const stopLossHitRate = results.filter(r => r.hitStopLoss).length / totalTrades;
  const timeoutExitRate = results.filter(r => r.timeoutExit).length / totalTrades;
  
  return {
    totalTrades,
    winningTrades,
    losingTrades,
    winRate,
    averageProfitLoss,
    averageWinningTrade,
    averageLosingTrade,
    profitFactor,
    maxDrawdown,
    averageHoldingPeriod,
    riskRewardRatio,
    expectancy,
    consistencyScore,
    maxConsecutiveWins,
    maxConsecutiveLosses,
    targetHitRate,
    stopLossHitRate,
    timeoutExitRate
  };
};

/**
 * Calculate standard deviation
 * @param values Array of values
 * @returns Standard deviation
 */
const calculateStandardDeviation = (values: number[]): number => {
  if (!values || values.length === 0) {
    return 0;
  }
  
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const squaredDifferences = values.map(value => Math.pow(value - mean, 2));
  const variance = squaredDifferences.reduce((sum, value) => sum + value, 0) / values.length;
  
  return Math.sqrt(variance);
};

/**
 * Calculate maximum consecutive wins and losses
 * @param results Array of backtest results
 * @returns Object with maxConsecutiveWins and maxConsecutiveLosses
 */
const calculateConsecutiveWinsLosses = (results: BacktestResult[]): { 
  maxConsecutiveWins: number; 
  maxConsecutiveLosses: number; 
} => {
  if (!results || results.length === 0) {
    return { maxConsecutiveWins: 0, maxConsecutiveLosses: 0 };
  }
  
  // Sort results by date
  const sortedResults = [...results].sort((a, b) => {
    return new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime();
  });
  
  let currentWinStreak = 0;
  let currentLossStreak = 0;
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  
  for (const result of sortedResults) {
    if (result.successful) {
      // Reset loss streak
      currentLossStreak = 0;
      // Increment win streak
      currentWinStreak++;
      // Update max win streak
      maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
    } else {
      // Reset win streak
      currentWinStreak = 0;
      // Increment loss streak
      currentLossStreak++;
      // Update max loss streak
      maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
    }
  }
  
  return {
    maxConsecutiveWins: maxWinStreak,
    maxConsecutiveLosses: maxLossStreak
  };
};

/**
 * Analyze performance by pattern type
 * @param results Array of backtest results
 * @returns Array of pattern performance metrics
 */
export const analyzePatternPerformance = (results: BacktestResult[]): PatternPerformance[] => {
  if (!results || results.length === 0) {
    return [];
  }
  
  // Group results by pattern type
  const patternGroups: Record<string, BacktestResult[]> = {};
  
  for (const result of results) {
    const patternType = result.signalType;
    
    if (!patternGroups[patternType]) {
      patternGroups[patternType] = [];
    }
    
    patternGroups[patternType].push(result);
  }
  
  // Calculate performance metrics for each pattern type
  const patternPerformance: PatternPerformance[] = [];
  
  for (const patternType in patternGroups) {
    const patternResults = patternGroups[patternType];
    const totalTrades = patternResults.length;
    const winningTrades = patternResults.filter(r => r.successful).length;
    const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0;
    
    const totalProfitLoss = patternResults.reduce((sum, r) => sum + r.profitLossPercent, 0);
    const averageProfitLoss = totalTrades > 0 ? totalProfitLoss / totalTrades : 0;
    
    const totalRiskReward = patternResults.reduce((sum, r) => sum + r.riskRewardRatio, 0);
    const riskRewardRatio = totalTrades > 0 ? totalRiskReward / totalTrades : 0;
    
    const totalHoldingPeriod = patternResults.reduce((sum, r) => sum + r.daysToExit, 0);
    const averageHoldingPeriod = totalTrades > 0 ? totalHoldingPeriod / totalTrades : 0;
    
    const profitLossStdDev = calculateStandardDeviation(patternResults.map(r => r.profitLossPercent));
    const consistencyScore = Math.max(0, Math.min(100, 100 - (profitLossStdDev / (Math.abs(averageProfitLoss) + 0.1) * 10)));
    
    patternPerformance.push({
      patternType,
      totalTrades,
      winRate,
      averageProfitLoss,
      riskRewardRatio,
      averageHoldingPeriod,
      consistencyScore
    });
  }
  
  // Sort by win rate (highest first)
  return patternPerformance.sort((a, b) => b.winRate - a.winRate);
};

/**
 * Analyze performance by timeframe
 * @param results Array of backtest results
 * @returns Array of timeframe performance metrics
 */
export const analyzeTimeframePerformance = (results: BacktestResult[]): TimeframePerformance[] => {
  if (!results || results.length === 0) {
    return [];
  }
  
  // Group results by timeframe
  const timeframeGroups: Record<string, BacktestResult[]> = {};
  
  for (const result of results) {
    const timeframe = result.timeframe;
    
    if (!timeframeGroups[timeframe]) {
      timeframeGroups[timeframe] = [];
    }
    
    timeframeGroups[timeframe].push(result);
  }
  
  // Calculate performance metrics for each timeframe
  const timeframePerformance: TimeframePerformance[] = [];
  
  for (const timeframe in timeframeGroups) {
    const timeframeResults = timeframeGroups[timeframe];
    const totalTrades = timeframeResults.length;
    const winningTrades = timeframeResults.filter(r => r.successful).length;
    const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0;
    
    const totalProfitLoss = timeframeResults.reduce((sum, r) => sum + r.profitLossPercent, 0);
    const averageProfitLoss = totalTrades > 0 ? totalProfitLoss / totalTrades : 0;
    
    const totalRiskReward = timeframeResults.reduce((sum, r) => sum + r.riskRewardRatio, 0);
    const riskRewardRatio = totalTrades > 0 ? totalRiskReward / totalTrades : 0;
    
    const totalHoldingPeriod = timeframeResults.reduce((sum, r) => sum + r.daysToExit, 0);
    const averageHoldingPeriod = totalTrades > 0 ? totalHoldingPeriod / totalTrades : 0;
    
    timeframePerformance.push({
      timeframe,
      totalTrades,
      winRate,
      averageProfitLoss,
      riskRewardRatio,
      averageHoldingPeriod
    });
  }
  
  // Sort by win rate (highest first)
  return timeframePerformance.sort((a, b) => b.winRate - a.winRate);
};

/**
 * Generate performance summary report
 * @param results Array of backtest results
 * @returns Performance summary report as string
 */
export const generatePerformanceSummary = (results: BacktestResult[]): string => {
  if (!results || results.length === 0) {
    return 'No backtest results available for analysis.';
  }
  
  // Calculate overall performance metrics
  const metrics = calculatePerformanceMetrics(results);
  
  // Analyze performance by pattern type
  const patternPerformance = analyzePatternPerformance(results);
  
  // Analyze performance by timeframe
  const timeframePerformance = analyzeTimeframePerformance(results);
  
  // Generate summary report
  let summary = '# Breakout Scanner Performance Summary\n\n';
  
  // Overall metrics
  summary += '## Overall Performance\n\n';
  summary += `- Total Trades: ${metrics.totalTrades}\n`;
  summary += `- Win Rate: ${(metrics.winRate * 100).toFixed(2)}%\n`;
  summary += `- Average Profit/Loss: ${metrics.averageProfitLoss.toFixed(2)}%\n`;
  summary += `- Profit Factor: ${metrics.profitFactor.toFixed(2)}\n`;
  summary += `- Risk/Reward Ratio: ${metrics.riskRewardRatio.toFixed(2)}\n`;
  summary += `- Consistency Score: ${metrics.consistencyScore.toFixed(2)}\n`;
  summary += `- Max Consecutive Wins: ${metrics.maxConsecutiveWins}\n`;
  summary += `- Max Consecutive Losses: ${metrics.maxConsecutiveLosses}\n`;
  summary += `- Average Holding Period: ${metrics.averageHoldingPeriod.toFixed(2)} days\n\n`;
  
  // Pattern performance
  summary += '## Pattern Performance\n\n';
  summary += '| Pattern Type | Trades | Win Rate | Avg P/L | R/R Ratio | Avg Hold | Consistency |\n';
  summary += '|-------------|--------|----------|---------|-----------|----------|-------------|\n';
  
  for (const pattern of patternPerformance) {
    summary += `| ${pattern.patternType} | ${pattern.totalTrades} | ${(pattern.winRate * 100).toFixed(2)}% | ${pattern.averageProfitLoss.toFixed(2)}% | ${pattern.riskRewardRatio.toFixed(2)} | ${pattern.averageHoldingPeriod.toFixed(2)} | ${pattern.consistencyScore.toFixed(2)} |\n`;
  }
  
  summary += '\n';
  
  // Timeframe performance
  summary += '## Timeframe Performance\n\n';
  summary += '| Timeframe | Trades | Win Rate | Avg P/L | R/R Ratio | Avg Hold |\n';
  summary += '|-----------|--------|----------|---------|-----------|----------|\n';
  
  for (const timeframe of timeframePerformance) {
    summary += `| ${timeframe.timeframe} | ${timeframe.totalTrades} | ${(timeframe.winRate * 100).toFixed(2)}% | ${timeframe.averageProfitLoss.toFixed(2)}% | ${timeframe.riskRewardRatio.toFixed(2)} | ${timeframe.averageHoldingPeriod.toFixed(2)} |\n`;
  }
  
  return summary;
};

export default {
  calculatePerformanceMetrics,
  analyzePatternPerformance,
  analyzeTimeframePerformance,
  generatePerformanceSummary
};
