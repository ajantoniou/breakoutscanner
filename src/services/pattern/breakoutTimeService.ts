import { differenceInHours, differenceInDays, addMinutes } from 'date-fns';
import { PatternData } from '@/services/types/patternTypes';

export interface BreakoutTimeInfo {
  expectedBreakoutTime: Date;
  isExpired: boolean;
  isStale: boolean;
  hoursPast: number;
  daysOld: number;
  timeUntilBreakout: number; // in minutes
}

export interface TimeframeConfig {
  minutes: number;
  expectedCandles: number;
  maxValidityPeriod: number; // in hours
}

const TIMEFRAME_CONFIG: Record<string, TimeframeConfig> = {
  '1m': { minutes: 1, expectedCandles: 15, maxValidityPeriod: 1 },
  '5m': { minutes: 5, expectedCandles: 12, maxValidityPeriod: 2 },
  '15m': { minutes: 15, expectedCandles: 8, maxValidityPeriod: 4 },
  '30m': { minutes: 30, expectedCandles: 6, maxValidityPeriod: 6 },
  '1h': { minutes: 60, expectedCandles: 5, maxValidityPeriod: 12 },
  '4h': { minutes: 240, expectedCandles: 4, maxValidityPeriod: 24 },
  '1d': { minutes: 1440, expectedCandles: 3, maxValidityPeriod: 72 },
  '1w': { minutes: 10080, expectedCandles: 2, maxValidityPeriod: 168 }
};

export class BreakoutTimeService {
  /**
   * Calculate expected breakout time and related information
   */
  static getBreakoutTimeInfo(
    pattern: PatternData,
    avgCandlesToBreakout?: number
  ): BreakoutTimeInfo {
    const now = new Date();
    const createdAt = new Date(pattern.created_at);
    const config = TIMEFRAME_CONFIG[pattern.timeframe] || TIMEFRAME_CONFIG['1h'];
    
    // Use provided avgCandlesToBreakout or default from config
    const candlesToBreakout = avgCandlesToBreakout || config.expectedCandles;
    
    // Calculate expected breakout time
    const expectedBreakoutTime = addMinutes(createdAt, candlesToBreakout * config.minutes);
    
    // Calculate time differences
    const hoursPast = differenceInHours(now, expectedBreakoutTime);
    const daysOld = differenceInDays(now, createdAt);
    const timeUntilBreakout = differenceInHours(expectedBreakoutTime, now) * 60;
    
    // Determine if pattern is expired or stale
    const isExpired = hoursPast > 24;
    const isStale = hoursPast > config.maxValidityPeriod;
    
    return {
      expectedBreakoutTime,
      isExpired,
      isStale,
      hoursPast,
      daysOld,
      timeUntilBreakout
    };
  }
  
  /**
   * Check if a pattern should be archived based on its age and status
   */
  static shouldArchivePattern(pattern: PatternData, breakoutInfo: BreakoutTimeInfo): boolean {
    // Archive if pattern is completed or failed
    if (pattern.status === 'completed' || pattern.status === 'failed') {
      return true;
    }
    
    // Archive if pattern is too old
    if (breakoutInfo.daysOld > 7) {
      return true;
    }
    
    // Archive if pattern is stale and past max validity period
    if (breakoutInfo.isStale && breakoutInfo.hoursPast > TIMEFRAME_CONFIG[pattern.timeframe]?.maxValidityPeriod) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Get human-readable description of breakout timing
   */
  static getBreakoutDescription(breakoutInfo: BreakoutTimeInfo): string {
    if (breakoutInfo.isStale) {
      return 'Pattern has expired';
    }
    
    if (breakoutInfo.hoursPast > 0) {
      return `Breakout was expected ${breakoutInfo.hoursPast} hours ago`;
    }
    
    if (breakoutInfo.timeUntilBreakout < 60) {
      return `Breakout expected in ${Math.round(breakoutInfo.timeUntilBreakout)} minutes`;
    }
    
    return `Breakout expected in ${Math.round(breakoutInfo.timeUntilBreakout / 60)} hours`;
  }
} 