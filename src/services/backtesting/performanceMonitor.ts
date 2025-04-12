
import { PatternData } from '../types/patternTypes';
import { BacktestResult } from './backtestTypes';

export interface PerformanceMetrics {
  overallAccuracy: number;
  totalPatterns: number;
  successfulPatterns: number;
  timeframeAccuracy: Record<string, number>;
  patternTypeAccuracy: Record<string, number>;
  lastMonitoringDate: Date;
}

// Check if performance monitoring is due (weekly check)
export const isPerformanceMonitoringDue = (lastMonitoringDate: Date): boolean => {
  const now = new Date();
  const lastCheck = new Date(lastMonitoringDate);
  
  // Calculate the difference in days
  const diffTime = Math.abs(now.getTime() - lastCheck.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Check if it's been more than 7 days (weekly monitoring)
  return diffDays >= 7;
};

// Calculate performance metrics from patterns and backtest results
export const calculatePerformanceMetrics = (
  patterns: PatternData[],
  backtestResults: BacktestResult[]
): PerformanceMetrics => {
  // Initialize metrics
  const timeframeAccuracy: Record<string, number> = {};
  const patternTypeAccuracy: Record<string, number> = {};
  const patternCounts: Record<string, number> = {};
  const patternSuccesses: Record<string, number> = {};
  const timeframeCounts: Record<string, number> = {};
  const timeframeSuccesses: Record<string, number> = {};
  
  // Count total patterns and successful patterns by type and timeframe
  backtestResults.forEach(result => {
    // Count by pattern type
    patternCounts[result.patternType] = (patternCounts[result.patternType] || 0) + 1;
    if (result.successful) {
      patternSuccesses[result.patternType] = (patternSuccesses[result.patternType] || 0) + 1;
    }
    
    // Count by timeframe
    timeframeCounts[result.timeframe] = (timeframeCounts[result.timeframe] || 0) + 1;
    if (result.successful) {
      timeframeSuccesses[result.timeframe] = (timeframeSuccesses[result.timeframe] || 0) + 1;
    }
  });
  
  // Calculate accuracy by pattern type
  Object.keys(patternCounts).forEach(patternType => {
    patternTypeAccuracy[patternType] = (patternSuccesses[patternType] || 0) / patternCounts[patternType] * 100;
  });
  
  // Calculate accuracy by timeframe
  Object.keys(timeframeCounts).forEach(timeframe => {
    timeframeAccuracy[timeframe] = (timeframeSuccesses[timeframe] || 0) / timeframeCounts[timeframe] * 100;
  });
  
  // Calculate overall accuracy
  const totalPatterns = backtestResults.length;
  const successfulPatterns = backtestResults.filter(r => r.successful).length;
  const overallAccuracy = totalPatterns > 0 ? (successfulPatterns / totalPatterns) * 100 : 0;
  
  return {
    overallAccuracy,
    totalPatterns,
    successfulPatterns,
    timeframeAccuracy,
    patternTypeAccuracy,
    lastMonitoringDate: new Date()
  };
};

// Save performance metrics to localStorage
export const savePerformanceMetrics = (metrics: PerformanceMetrics): void => {
  try {
    localStorage.setItem('performance_metrics', JSON.stringify(metrics));
  } catch (error) {
    console.error('Failed to save performance metrics:', error);
  }
};

// Load performance metrics from localStorage
export const loadPerformanceMetrics = (): PerformanceMetrics | null => {
  try {
    const savedMetrics = localStorage.getItem('performance_metrics');
    if (savedMetrics) {
      const parsed = JSON.parse(savedMetrics);
      // Ensure the date is parsed correctly
      return {
        ...parsed,
        lastMonitoringDate: new Date(parsed.lastMonitoringDate)
      };
    }
  } catch (error) {
    console.error('Failed to load performance metrics:', error);
  }
  return null;
};

// Get the monitoring age in days
export const getMonitoringAgeInDays = (metrics: PerformanceMetrics): number => {
  const now = new Date();
  const lastCheck = new Date(metrics.lastMonitoringDate);
  
  // Calculate the difference in days
  const diffTime = Math.abs(now.getTime() - lastCheck.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};
