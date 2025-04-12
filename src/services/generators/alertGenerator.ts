
import { PatternData, AlertData } from '../types/patternTypes';
import { v4 as uuidv4 } from 'uuid';
import { ensureDateString } from '@/utils/dateConverter';

// Define a fixed set of alert types that's compatible with the components
export type AlertType = "entry" | "exit" | "stop" | "warning" | "info";
// Legacy type for backward compatibility
export type LegacyAlertType = "breakout" | "reversal" | "target" | "warning";

// Map between different alert type formats
export const mapAlertType = (type: LegacyAlertType): AlertType => {
  if (type === "breakout") return "entry";
  if (type === "reversal") return "stop";
  if (type === "target") return "exit";
  return "warning";
};

/**
 * Generates alert data based on pattern data
 * @param patterns Array of pattern data to generate alerts from
 * @param count Number of alerts to generate (default: 5)
 * @returns Array of alert data
 */
export const getAlerts = (patterns: PatternData[], count: number = 5): AlertData[] => {
  if (!patterns || patterns.length === 0) {
    return [];
  }

  const alerts: AlertData[] = [];
  const eligiblePatterns = patterns.filter(p => p.status === 'active');
  
  // Generate alerts based on pattern data
  for (let i = 0; i < Math.min(count, eligiblePatterns.length); i++) {
    const pattern = eligiblePatterns[i];
    const alertDate = new Date();
    const legacyType = determineAlertType(pattern);
    
    alerts.push({
      id: uuidv4(),
      patternId: pattern.id,
      symbol: pattern.symbol,
      message: generateAlertMessage(pattern),
      type: mapAlertType(legacyType),
      createdAt: alertDate.toISOString(),
      isRead: false,
      priority: determinePriority(pattern),
      timeframe: pattern.timeframe,
      patternType: pattern.patternType,
      read: false,
      timestamp: alertDate.toISOString()
    });
  }
  
  return alerts;
};

// Determine the priority of the alert
const determinePriority = (pattern: PatternData): "high" | "medium" | "low" => {
  if (pattern.confidenceScore && pattern.confidenceScore > 80) {
    return "high";
  }
  if (pattern.confidenceScore && pattern.confidenceScore > 60) {
    return "medium";
  }
  return "low";
};

/**
 * Determine the type of alert based on pattern data
 */
const determineAlertType = (pattern: PatternData): LegacyAlertType => {
  const patternType = pattern.patternType.toLowerCase();
  
  if (patternType.includes('flag') || patternType.includes('triangle')) {
    return 'breakout';
  }
  
  if (patternType.includes('reversal') || patternType.includes('head')) {
    return 'reversal';
  }
  
  if (pattern.confidenceScore && pattern.confidenceScore > 80) {
    return 'target';
  }
  
  return 'warning';
};

/**
 * Generate an alert message based on pattern data
 */
const generateAlertMessage = (pattern: PatternData): string => {
  const direction = pattern.direction || 'bullish';
  const action = direction === 'bullish' ? 'buy' : 'sell';
  const patternType = pattern.patternType;
  const hasBreakout = pattern.entryPrice !== undefined;
  
  if (hasBreakout) {
    return `${pattern.symbol}: ${direction.toUpperCase()} ${patternType} with entry at $${pattern.entryPrice.toFixed(2)} and target at $${pattern.targetPrice.toFixed(2)}`;
  }
  
  return `${pattern.symbol}: Potential ${direction} ${patternType} pattern detected - watch for confirmation`;
};

/**
 * Get alert statistics for a given timeframe
 * @param alerts Array of alert data
 * @param timeframe Timeframe to filter by
 * @returns Object containing alert statistics
 */
export const getAlertStats = (alerts: AlertData[], timeframe: string = 'all') => {
  const filteredAlerts = timeframe === 'all' 
    ? alerts 
    : alerts.filter(a => a.timeframe === timeframe);
  
  // Count various types
  const entryCount = filteredAlerts.filter(a => a.type === 'entry').length;
  const exitCount = filteredAlerts.filter(a => a.type === 'exit').length;
  const stopCount = filteredAlerts.filter(a => a.type === 'stop').length;
  const warningCount = filteredAlerts.filter(a => a.type === 'warning').length;
  const infoCount = filteredAlerts.filter(a => a.type === 'info').length;
  
  // Count active alerts
  const activeCount = filteredAlerts.filter(a => !a.isRead).length;
  
  // Calculate success rate (if we have completed patterns)
  const total = entryCount + exitCount + stopCount;
  const successRate = total > 0 ? Math.round((exitCount / total) * 100) : 0;
  
  return {
    total: filteredAlerts.length,
    entryCount,
    exitCount,
    stopCount,
    warningCount,
    infoCount,
    activeCount,
    totalCount: filteredAlerts.length,
    successRate
  };
};

/**
 * Filter patterns by timeframe
 * @param patterns Array of pattern data
 * @param timeframe Timeframe to filter by
 * @returns Filtered array of pattern data
 */
export const filterPatternsByTimeframe = (patterns: PatternData[], timeframe: string = 'all'): PatternData[] => {
  if (timeframe === 'all') {
    return patterns;
  }
  
  return patterns.filter(p => p.timeframe === timeframe);
};
