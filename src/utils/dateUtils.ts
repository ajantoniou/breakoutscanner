/**
 * Date utility functions
 */

/**
 * Get a date string X days ago in YYYY-MM-DD format
 * @param days Number of days ago
 * @returns Date string in YYYY-MM-DD format
 */
export const getDateXDaysAgo = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
};

/**
 * Format date to locale string
 * @param date Date to format
 * @returns Formatted date string
 */
export const formatDate = (date: Date): string => {
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
};

/**
 * Calculate expected breakout time based on detection time, timeframe, and average candles to breakout
 * @param detectionTime Detection timestamp
 * @param timeframe Timeframe string (e.g., '1m', '5m', '1h', '1d')
 * @param avgCandlesToBreakout Average number of candles to breakout
 * @returns Expected breakout date
 */
export const calculateExpectedBreakoutTime = (
  detectionTime: string | number,
  timeframe: string,
  avgCandlesToBreakout: number
): Date => {
  const detectedAt = new Date(detectionTime);
  let timeframeInMinutes = 0;
  
  // Convert timeframe to minutes
  switch (timeframe) {
    case '1m':
      timeframeInMinutes = 1;
      break;
    case '5m':
      timeframeInMinutes = 5;
      break;
    case '15m':
      timeframeInMinutes = 15;
      break;
    case '30m':
      timeframeInMinutes = 30;
      break;
    case '1h':
      timeframeInMinutes = 60;
      break;
    case '4h':
      timeframeInMinutes = 240;
      break;
    case '1d':
      timeframeInMinutes = 1440;
      break;
    case '1w':
      timeframeInMinutes = 10080;
      break;
    default:
      timeframeInMinutes = 60;
  }
  
  // Calculate expected breakout time
  return new Date(detectedAt.getTime() + (avgCandlesToBreakout * timeframeInMinutes * 60 * 1000));
};

/**
 * Check if a date is a trading day (Monday-Friday, excluding holidays)
 * @param date Date to check
 * @returns Boolean indicating if date is a trading day
 */
export const isTradingDay = (date: Date): boolean => {
  const day = date.getDay();
  
  // Check if weekend (0 = Sunday, 6 = Saturday)
  if (day === 0 || day === 6) {
    return false;
  }
  
  // In a real implementation, would also check for holidays
  return true;
};

/**
 * Get next trading day
 * @param date Starting date
 * @returns Next trading day
 */
export const getNextTradingDay = (date: Date): Date => {
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  
  // Keep incrementing until we find a trading day
  while (!isTradingDay(nextDay)) {
    nextDay.setDate(nextDay.getDate() + 1);
  }
  
  return nextDay;
};
