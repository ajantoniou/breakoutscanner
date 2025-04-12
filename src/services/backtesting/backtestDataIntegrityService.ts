import { Candle } from '@/services/types/patternTypes';
import MarketHoursService from '@/services/api/marketData/marketHoursService';

/**
 * Backtesting data integrity service for ensuring reliable backtesting results
 */
class BacktestDataIntegrityService {
  private marketHoursService: MarketHoursService;
  
  constructor() {
    this.marketHoursService = new MarketHoursService();
  }

  /**
   * Validate candle data for backtesting
   * @param candles Array of candles to validate
   * @param timeframe Timeframe string
   * @returns Validation result with issues and fixed candles if possible
   */
  validateCandleData(
    candles: Candle[],
    timeframe: string
  ): {
    isValid: boolean;
    issues: string[];
    fixedCandles?: Candle[];
    missingPeriods?: { start: number; end: number }[];
    marketHoursOnly?: Candle[];
  } {
    if (!candles || candles.length === 0) {
      return {
        isValid: false,
        issues: ['No candle data provided']
      };
    }

    const issues: string[] = [];
    let fixedCandles = [...candles];
    
    // Check for basic data integrity issues
    const basicIntegrityIssues = this.checkBasicIntegrity(candles);
    issues.push(...basicIntegrityIssues);
    
    // Check for chronological order
    const chronologyIssues = this.checkChronologicalOrder(candles);
    if (chronologyIssues.length > 0) {
      issues.push(...chronologyIssues);
      // Sort candles by timestamp
      fixedCandles.sort((a, b) => a.timestamp - b.timestamp);
    }
    
    // Check for duplicates
    const { hasDuplicates, deduplicated } = this.checkForDuplicates(fixedCandles);
    if (hasDuplicates) {
      issues.push('Duplicate candles detected and removed');
      fixedCandles = deduplicated;
    }
    
    // Check for gaps
    const { hasGaps, gapPeriods } = this.checkForGaps(fixedCandles, timeframe);
    if (hasGaps) {
      issues.push(`Data gaps detected: ${gapPeriods.length} periods with missing data`);
    }
    
    // Check for outliers
    const { hasOutliers, outlierIndices, cleanedCandles } = this.checkForOutliers(fixedCandles);
    if (hasOutliers) {
      issues.push(`Outliers detected at indices: ${outlierIndices.join(', ')}`);
      fixedCandles = cleanedCandles;
    }
    
    // Filter to market hours only if needed
    const marketHoursOnly = this.filterToMarketHoursOnly(fixedCandles);
    
    // Determine if data is valid enough for backtesting
    const isValid = issues.length === 0 || 
      (issues.length > 0 && !issues.some(issue => 
        issue.includes('No candle data') || 
        issue.includes('Invalid candle data') ||
        issue.includes('Data gaps detected') && gapPeriods && gapPeriods.length > 5
      ));
    
    return {
      isValid,
      issues,
      fixedCandles: fixedCandles.length > 0 ? fixedCandles : undefined,
      missingPeriods: gapPeriods,
      marketHoursOnly: marketHoursOnly.length > 0 ? marketHoursOnly : undefined
    };
  }

  /**
   * Check basic data integrity
   * @param candles Array of candles to check
   * @returns Array of issue messages
   */
  private checkBasicIntegrity(candles: Candle[]): string[] {
    const issues: string[] = [];
    
    // Check for null or undefined values
    const hasNullValues = candles.some(candle => 
      candle.open === null || candle.open === undefined ||
      candle.high === null || candle.high === undefined ||
      candle.low === null || candle.low === undefined ||
      candle.close === null || candle.close === undefined ||
      candle.timestamp === null || candle.timestamp === undefined
    );
    
    if (hasNullValues) {
      issues.push('Candles contain null or undefined values');
    }
    
    // Check for invalid OHLC relationships
    const hasInvalidOHLC = candles.some(candle => 
      candle.high < candle.low ||
      candle.high < candle.open ||
      candle.high < candle.close ||
      candle.low > candle.open ||
      candle.low > candle.close
    );
    
    if (hasInvalidOHLC) {
      issues.push('Candles contain invalid OHLC relationships (e.g., high < low)');
    }
    
    // Check for negative values
    const hasNegativeValues = candles.some(candle => 
      candle.open < 0 ||
      candle.high < 0 ||
      candle.low < 0 ||
      candle.close < 0 ||
      candle.volume < 0
    );
    
    if (hasNegativeValues) {
      issues.push('Candles contain negative values');
    }
    
    // Check for zero values in price (volume can be zero)
    const hasZeroPrices = candles.some(candle => 
      candle.open === 0 ||
      candle.high === 0 ||
      candle.low === 0 ||
      candle.close === 0
    );
    
    if (hasZeroPrices) {
      issues.push('Candles contain zero prices');
    }
    
    // Check for future timestamps
    const now = Date.now();
    const hasFutureTimestamps = candles.some(candle => candle.timestamp > now);
    
    if (hasFutureTimestamps) {
      issues.push('Candles contain future timestamps');
    }
    
    return issues;
  }

  /**
   * Check chronological order of candles
   * @param candles Array of candles to check
   * @returns Array of issue messages
   */
  private checkChronologicalOrder(candles: Candle[]): string[] {
    const issues: string[] = [];
    
    // Check if candles are in chronological order
    let isChronological = true;
    
    for (let i = 1; i < candles.length; i++) {
      if (candles[i].timestamp <= candles[i - 1].timestamp) {
        isChronological = false;
        break;
      }
    }
    
    if (!isChronological) {
      issues.push('Candles are not in chronological order');
    }
    
    return issues;
  }

  /**
   * Check for duplicate candles
   * @param candles Array of candles to check
   * @returns Object with duplicate check results
   */
  private checkForDuplicates(candles: Candle[]): {
    hasDuplicates: boolean;
    duplicateIndices: number[];
    deduplicated: Candle[];
  } {
    const timestampSet = new Set<number>();
    const duplicateIndices: number[] = [];
    const deduplicated: Candle[] = [];
    
    candles.forEach((candle, index) => {
      if (timestampSet.has(candle.timestamp)) {
        duplicateIndices.push(index);
      } else {
        timestampSet.add(candle.timestamp);
        deduplicated.push(candle);
      }
    });
    
    return {
      hasDuplicates: duplicateIndices.length > 0,
      duplicateIndices,
      deduplicated
    };
  }

  /**
   * Check for gaps in candle data
   * @param candles Array of candles to check
   * @param timeframe Timeframe string
   * @returns Object with gap check results
   */
  private checkForGaps(
    candles: Candle[],
    timeframe: string
  ): {
    hasGaps: boolean;
    gapPeriods: { start: number; end: number }[];
  } {
    if (candles.length < 2) {
      return { hasGaps: false, gapPeriods: [] };
    }
    
    // Get expected interval in milliseconds
    const intervalMs = this.getTimeframeIntervalMs(timeframe);
    
    // Allow for a small tolerance (5% of interval)
    const tolerance = intervalMs * 0.05;
    
    const gapPeriods: { start: number; end: number }[] = [];
    
    // Check for gaps between consecutive candles
    for (let i = 1; i < candles.length; i++) {
      const expectedTimestamp = candles[i - 1].timestamp + intervalMs;
      const actualTimestamp = candles[i].timestamp;
      
      // If the difference is more than one interval plus tolerance, it's a gap
      if (actualTimestamp - expectedTimestamp > tolerance) {
        gapPeriods.push({
          start: candles[i - 1].timestamp,
          end: actualTimestamp
        });
      }
    }
    
    // Filter out gaps during non-market hours for daily and higher timeframes
    if (['1d', '1w', '1mo'].includes(timeframe)) {
      const filteredGapPeriods = gapPeriods.filter(gap => {
        const startDate = new Date(gap.start);
        const endDate = new Date(gap.end);
        
        // Check if gap spans only weekends or holidays
        let currentDate = new Date(startDate);
        while (currentDate < endDate) {
          // If we find a market open day in the gap, keep this gap
          if (this.marketHoursService.isMarketOpen(currentDate)) {
            return true;
          }
          // Move to next day
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        // If we didn't find any market open days, this gap is just weekends/holidays
        return false;
      });
      
      return {
        hasGaps: filteredGapPeriods.length > 0,
        gapPeriods: filteredGapPeriods
      };
    }
    
    return {
      hasGaps: gapPeriods.length > 0,
      gapPeriods
    };
  }

  /**
   * Get interval in milliseconds for a timeframe
   * @param timeframe Timeframe string
   * @returns Interval in milliseconds
   */
  private getTimeframeIntervalMs(timeframe: string): number {
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    const week = 7 * day;
    
    switch (timeframe) {
      case '1m': return minute;
      case '5m': return 5 * minute;
      case '15m': return 15 * minute;
      case '30m': return 30 * minute;
      case '1h': return hour;
      case '4h': return 4 * hour;
      case '1d': return day;
      case '1w': return week;
      default: return minute; // Default to 1 minute
    }
  }

  /**
   * Check for outliers in candle data
   * @param candles Array of candles to check
   * @returns Object with outlier check results
   */
  private checkForOutliers(candles: Candle[]): {
    hasOutliers: boolean;
    outlierIndices: number[];
    cleanedCandles: Candle[];
  } {
    if (candles.length < 10) {
      return {
        hasOutliers: false,
        outlierIndices: [],
        cleanedCandles: [...candles]
      };
    }
    
    // Calculate median and MAD (Median Absolute Deviation) for prices
    const closes = candles.map(c => c.close);
    const median = this.calculateMedian(closes);
    const deviations = closes.map(c => Math.abs(c - median));
    const mad = this.calculateMedian(deviations);
    
    // Threshold for outlier detection (3 is a common value)
    const threshold = 10; // Higher threshold to only catch extreme outliers
    
    const outlierIndices: number[] = [];
    
    // Detect outliers
    candles.forEach((candle, index) => {
      const zScore = 0.6745 * Math.abs(candle.close - median) / mad;
      if (zScore > threshold) {
        outlierIndices.push(index);
      }
    });
    
    // Create cleaned candles array
    const cleanedCandles = candles.filter((_, index) => !outlierIndices.includes(index));
    
    return {
      hasOutliers: outlierIndices.length > 0,
      outlierIndices,
      cleanedCandles
    };
  }

  /**
   * Calculate median of an array
   * @param values Array of numbers
   * @returns Median value
   */
  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return (sorted[middle - 1] + sorted[middle]) / 2;
    } else {
      return sorted[middle];
    }
  }

  /**
   * Filter candles to include only market hours
   * @param candles Array of candles to filter
   * @returns Filtered candles
   */
  private filterToMarketHoursOnly(candles: Candle[]): Candle[] {
    return candles.filter(candle => {
      const candleDate = new Date(candle.timestamp);
      return this.marketHoursService.isMarketOpen(candleDate);
    });
  }

  /**
   * Interpolate missing candles in gaps
   * @param candles Array of candles
   * @param timeframe Timeframe string
   * @returns Candles with interpolated values
   */
  interpolateMissingCandles(
    candles: Candle[],
    timeframe: string
  ): Candle[] {
    if (candles.length < 2) {
      return [...candles];
    }
    
    // Validate and sort candles
    const validationResult = this.validateCandleData(candles, timeframe);
    if (!validationResult.isValid || !validationResult.fixedCandles) {
      return [...candles];
    }
    
    const sortedCandles = [...validationResult.fixedCandles].sort((a, b) => a.timestamp - b.timestamp);
    
    // Get expected interval
    const intervalMs = this.getTimeframeIntervalMs(timeframe);
    
    // Create result array
    const result: Candle[] = [sortedCandles[0]];
    
    // Interpolate missing candles
    for (let i = 1; i < sortedCandles.length; i++) {
      const prevCandle = sortedCandles[i - 1];
      const currentCandle = sortedCandles[i];
      
      const timeDiff = currentCandle.timestamp - prevCandle.timestamp;
      const numMissingCandles = Math.floor(timeDiff / intervalMs) - 1;
      
      if (numMissingCandles > 0 && numMissingCandles < 10) { // Limit to reasonable gaps
        // Linear interpolation
        for (let j = 1; j <= numMissingCandles; j++) {
          const ratio = j / (numMissingCandles + 1);
          const timestamp = prevCandle.timestamp + j * intervalMs;
          
          // Skip weekends and holidays for daily and higher timeframes
          if (['1d', '1w', '1mo'].includes(timeframe)) {
            const candleDate = new Date(timestamp);
            if (!this.marketHoursService.isMarketOpen(candleDate)) {
              continue;
            }
          }
          
          // Interpolate OHLC values
          const open = prevCandle.close;
          const close = prevCandle.close + ratio * (currentCandle.open - prevCandle.close);
          const high = Math.max(open, close);
          const low = Math.min(open, close);
          
          // Interpolate volume (simple average)
          const volume = (prevCandle.volume + currentCandle.volume) / 2;
          
          result.push({
            timestamp,
            open,
            high,
            low,
            close,
            volume,
            // Flag as interpolated
            interpolated: true
          });
        }
      }
      
      result.push(currentCandle);
    }
    
    return result;
  }

  /**
   * Validate backtesting parameters
   * @param params Backtesting parameters
   * @returns Validation result
   */
  validateBacktestParameters(params: any): {
    isValid: boolean;
    issues: string[];
    fixedParams?: any;
  } {
    const issues: string[] = [];
    const fixedParams = { ...params };
    
    // Check required parameters
    if (!params.startDate) {
      issues.push('Missing start date');
    }
    
    if (!params.endDate) {
      issues.push('Missing end date');
      // Default to current date
      fixedParams.endDate = new Date().toISOString();
    }
    
    // Check date range
    if (params.startDate && params.endDate) {
      const start = new Date(params.startDate);
      const end = new Date(params.endDate);
      
      if (isNaN(start.getTime())) {
        issues.push('Invalid start date format');
      }
      
      if (isNaN(end.getTime())) {
        issues.push('Invalid end date format');
      }
      
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        if (start > end) {
          issues.push('Start date is after end date');
          // Swap dates
          fixedParams.startDate = params.endDate;
          fixedParams.endDate = params.startDate;
        }
        
        // Check if range is too large
        const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
        if (daysDiff > 365 * 5) {
          issues.push('Date range exceeds 5 years, which may cause performance issues');
        }
      }
    }
    
    // Check timeframe
    if (!params.timeframe) {
      issues.push('Missing timeframe');
      // Default to daily
      fixedParams.timeframe = '1d';
    } else if (!['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'].includes(params.timeframe)) {
      issues.push('Invalid timeframe');
      // Default to daily
      fixedParams.timeframe = '1d';
    }
    
    // Check symbols
    if (!params.symbols || !Array.isArray(params.symbols) || params.symbols.length === 0) {
      issues.push('Missing or invalid symbols');
    } else if (params.symbols.length > 100) {
      issues.push('Too many symbols (max 100)');
      // Limit to first 100
      fixedParams.symbols = params.symbols.slice(0, 100);
    }
    
    // Check pattern types
    if (params.patternTypes && (!Array.isArray(params.patternTypes) || params.patternTypes.length === 0)) {
      issues.push('Invalid pattern types');
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      fixedParams
    };
  }

  /**
   * Calculate data completeness percentage
   * @param candles Array of candles
   * @param timeframe Timeframe string
   * @param startDate Start date
   * @param endDate End date
   * @returns Completeness percentage
   */
  calculateDataCompleteness(
    candles: Candle[],
    timeframe: string,
    startDate: Date,
    endDate: Date
  ): number {
    if (candles.length === 0) {
      return 0;
    }
    
    // Get expected interval
    const intervalMs = this.getTimeframeIntervalMs(timeframe);
    
    // Calculate expected number of candles
    let expectedCandles = 0;
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      // For daily and higher timeframes, only count market days
      if (['1d', '1w', '1mo'].includes(timeframe)) {
        if (this.marketHoursService.isMarketOpen(currentDate)) {
          expectedCandles++;
        }
      } else {
        // For intraday timeframes, count all intervals
        expectedCandles++;
      }
      
      // Move to next interval
      currentDate = new Date(currentDate.getTime() + intervalMs);
    }
    
    if (expectedCandles === 0) {
      return 0;
    }
    
    // Calculate completeness
    return Math.min(100, (candles.length / expectedCandles) * 100);
  }

  /**
   * Generate data quality report
   * @param candles Array of candles
   * @param timeframe Timeframe string
   * @returns Data quality report
   */
  generateDataQualityReport(
    candles: Candle[],
    timeframe: string
  ): {
    totalCandles: number;
    validCandles: number;
    invalidCandles: number;
    gapCount: number;
    outlierCount: number;
    marketHoursPercentage: number;
    completenessPercentage: number;
    qualityScore: number;
    recommendations: string[];
  } {
    // Validate candle data
    const validationResult = this.validateCandleData(candles, timeframe);
    
    // Calculate market hours percentage
    const marketHoursOnly = validationResult.marketHoursOnly || [];
    const marketHoursPercentage = candles.length > 0 
      ? (marketHoursOnly.length / candles.length) * 100 
      : 0;
    
    // Calculate completeness
    const startDate = candles.length > 0 
      ? new Date(candles[0].timestamp) 
      : new Date();
    const endDate = candles.length > 0 
      ? new Date(candles[candles.length - 1].timestamp) 
      : new Date();
    
    const completenessPercentage = this.calculateDataCompleteness(
      candles,
      timeframe,
      startDate,
      endDate
    );
    
    // Count issues
    const gapCount = validationResult.missingPeriods?.length || 0;
    const outlierCount = validationResult.issues.filter(issue => 
      issue.includes('Outliers detected')
    ).length;
    
    // Calculate valid and invalid candles
    const validCandles = validationResult.fixedCandles?.length || 0;
    const invalidCandles = candles.length - validCandles;
    
    // Calculate quality score (0-100)
    const qualityScore = Math.max(0, Math.min(100, 
      completenessPercentage * 0.4 + 
      (100 - (gapCount * 5)) * 0.3 + 
      (100 - (outlierCount * 10)) * 0.2 + 
      marketHoursPercentage * 0.1
    ));
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (completenessPercentage < 80) {
      recommendations.push('Consider using a different data source with better coverage');
    }
    
    if (gapCount > 5) {
      recommendations.push('Use interpolation to fill data gaps');
    }
    
    if (outlierCount > 0) {
      recommendations.push('Filter out outliers for more reliable backtesting');
    }
    
    if (marketHoursPercentage < 90 && ['1m', '5m', '15m', '30m', '1h'].includes(timeframe)) {
      recommendations.push('Filter to market hours only for intraday timeframes');
    }
    
    if (qualityScore < 50) {
      recommendations.push('Data quality is poor, backtesting results may be unreliable');
    }
    
    return {
      totalCandles: candles.length,
      validCandles,
      invalidCandles,
      gapCount,
      outlierCount,
      marketHoursPercentage,
      completenessPercentage,
      qualityScore,
      recommendations
    };
  }
}

export default BacktestDataIntegrityService;
