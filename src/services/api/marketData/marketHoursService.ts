import { Candle } from '@/services/types/patternTypes';

/**
 * Market hours service for handling market status and trading hours
 */
class MarketHoursService {
  // US Market hours in Eastern Time
  private readonly REGULAR_MARKET_HOURS = {
    start: 9 * 60 + 30, // 9:30 AM in minutes
    end: 16 * 60        // 4:00 PM in minutes
  };
  
  private readonly PRE_MARKET_HOURS = {
    start: 4 * 60,      // 4:00 AM in minutes
    end: 9 * 60 + 30    // 9:30 AM in minutes
  };
  
  private readonly AFTER_HOURS = {
    start: 16 * 60,     // 4:00 PM in minutes
    end: 20 * 60        // 8:00 PM in minutes
  };
  
  // US Market holidays for 2025 (update annually)
  private readonly MARKET_HOLIDAYS_2025 = [
    '2025-01-01', // New Year's Day
    '2025-01-20', // Martin Luther King Jr. Day
    '2025-02-17', // Presidents' Day
    '2025-04-18', // Good Friday
    '2025-05-26', // Memorial Day
    '2025-06-19', // Juneteenth
    '2025-07-04', // Independence Day
    '2025-09-01', // Labor Day
    '2025-11-27', // Thanksgiving Day
    '2025-12-25'  // Christmas Day
  ];
  
  // Early close days (1:00 PM ET close)
  private readonly EARLY_CLOSE_DAYS_2025 = [
    '2025-07-03', // Day before Independence Day
    '2025-11-28', // Day after Thanksgiving
    '2025-12-24'  // Christmas Eve
  ];
  
  constructor() {
    // Bind methods to maintain 'this' context
    this.getCurrentMarketStatus = this.getCurrentMarketStatus.bind(this);
    this.isMarketOpen = this.isMarketOpen.bind(this);
    this.isPreMarket = this.isPreMarket.bind(this);
    this.isAfterHours = this.isAfterHours.bind(this);
    this.isMarketHoliday = this.isMarketHoliday.bind(this);
    this.isEarlyCloseDay = this.isEarlyCloseDay.bind(this);
    this.getNextMarketOpenTime = this.getNextMarketOpenTime.bind(this);
    this.getMarketCloseTime = this.getMarketCloseTime.bind(this);
    this.getTimeToMarketOpen = this.getTimeToMarketOpen.bind(this);
    this.getTimeToMarketClose = this.getTimeToMarketClose.bind(this);
    this.adjustDataFreshnessExpectation = this.adjustDataFreshnessExpectation.bind(this);
    this.getExpectedDataDelay = this.getExpectedDataDelay.bind(this);
    this.getMarketHoursForDate = this.getMarketHoursForDate.bind(this);
  }

  /**
   * Get current market status
   * @param date Optional date to check (defaults to current time)
   * @returns Market status string
   */
  getCurrentMarketStatus(date: Date = new Date()): 'open' | 'closed' | 'pre-market' | 'after-hours' {
    // Check if it's a weekend
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return 'closed';
    }
    
    // Check if it's a holiday
    if (this.isMarketHoliday(date)) {
      return 'closed';
    }
    
    // Convert current time to minutes since midnight in Eastern Time
    const currentMinutes = this.getMinutesSinceMidnightET(date);
    
    // Check if it's during regular market hours
    if (this.isMarketOpen(date)) {
      return 'open';
    }
    
    // Check if it's pre-market
    if (this.isPreMarket(date)) {
      return 'pre-market';
    }
    
    // Check if it's after-hours
    if (this.isAfterHours(date)) {
      return 'after-hours';
    }
    
    // Otherwise, market is closed
    return 'closed';
  }

  /**
   * Check if market is open
   * @param date Optional date to check (defaults to current time)
   * @returns Boolean indicating if market is open
   */
  isMarketOpen(date: Date = new Date()): boolean {
    // Check if it's a weekend
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false;
    }
    
    // Check if it's a holiday
    if (this.isMarketHoliday(date)) {
      return false;
    }
    
    // Get market hours for this date (accounts for early close days)
    const marketHours = this.getMarketHoursForDate(date);
    
    // Convert current time to minutes since midnight in Eastern Time
    const currentMinutes = this.getMinutesSinceMidnightET(date);
    
    // Check if it's during regular market hours
    return currentMinutes >= marketHours.start && currentMinutes < marketHours.end;
  }

  /**
   * Check if it's pre-market hours
   * @param date Optional date to check (defaults to current time)
   * @returns Boolean indicating if it's pre-market
   */
  isPreMarket(date: Date = new Date()): boolean {
    // Check if it's a weekend
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false;
    }
    
    // Check if it's a holiday
    if (this.isMarketHoliday(date)) {
      return false;
    }
    
    // Get market hours for this date
    const marketHours = this.getMarketHoursForDate(date);
    
    // Convert current time to minutes since midnight in Eastern Time
    const currentMinutes = this.getMinutesSinceMidnightET(date);
    
    // Check if it's during pre-market hours
    return currentMinutes >= this.PRE_MARKET_HOURS.start && currentMinutes < marketHours.start;
  }

  /**
   * Check if it's after-hours
   * @param date Optional date to check (defaults to current time)
   * @returns Boolean indicating if it's after-hours
   */
  isAfterHours(date: Date = new Date()): boolean {
    // Check if it's a weekend
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false;
    }
    
    // Check if it's a holiday
    if (this.isMarketHoliday(date)) {
      return false;
    }
    
    // Get market hours for this date
    const marketHours = this.getMarketHoursForDate(date);
    
    // Convert current time to minutes since midnight in Eastern Time
    const currentMinutes = this.getMinutesSinceMidnightET(date);
    
    // Check if it's during after-hours
    return currentMinutes >= marketHours.end && currentMinutes < this.AFTER_HOURS.end;
  }

  /**
   * Check if date is a market holiday
   * @param date Date to check
   * @returns Boolean indicating if it's a market holiday
   */
  isMarketHoliday(date: Date): boolean {
    const dateString = this.formatDateYYYYMMDD(date);
    return this.MARKET_HOLIDAYS_2025.includes(dateString);
  }

  /**
   * Check if date is an early close day
   * @param date Date to check
   * @returns Boolean indicating if it's an early close day
   */
  isEarlyCloseDay(date: Date): boolean {
    const dateString = this.formatDateYYYYMMDD(date);
    return this.EARLY_CLOSE_DAYS_2025.includes(dateString);
  }

  /**
   * Format date as YYYY-MM-DD
   * @param date Date to format
   * @returns Formatted date string
   */
  private formatDateYYYYMMDD(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Get minutes since midnight in Eastern Time
   * @param date Date to convert
   * @returns Minutes since midnight in Eastern Time
   */
  private getMinutesSinceMidnightET(date: Date): number {
    // Convert to Eastern Time
    // Note: This is a simplified approach. In a production environment,
    // you would use a library like date-fns-tz or moment-timezone
    // to handle timezone conversions properly.
    const etOffset = -4; // EDT offset from UTC in hours
    
    // Get UTC hours and minutes
    const utcHours = date.getUTCHours();
    const utcMinutes = date.getUTCMinutes();
    
    // Convert to ET
    let etHours = utcHours + etOffset;
    
    // Handle day boundary crossings
    if (etHours < 0) {
      etHours += 24;
    } else if (etHours >= 24) {
      etHours -= 24;
    }
    
    // Calculate minutes since midnight
    return etHours * 60 + utcMinutes;
  }

  /**
   * Get market hours for a specific date
   * @param date Date to check
   * @returns Market hours object with start and end times
   */
  getMarketHoursForDate(date: Date): { start: number; end: number } {
    // Check if it's an early close day
    if (this.isEarlyCloseDay(date)) {
      return {
        start: this.REGULAR_MARKET_HOURS.start,
        end: 13 * 60 // 1:00 PM ET
      };
    }
    
    // Regular market hours
    return this.REGULAR_MARKET_HOURS;
  }

  /**
   * Get next market open time
   * @param date Optional date to start from (defaults to current time)
   * @returns Date object representing next market open time
   */
  getNextMarketOpenTime(date: Date = new Date()): Date {
    const result = new Date(date);
    
    // If market is already open, return current date with market open time
    if (this.isMarketOpen(date)) {
      const marketHours = this.getMarketHoursForDate(date);
      
      // Set time to market open
      result.setUTCHours(0, 0, 0, 0); // Reset to midnight UTC
      
      // Add market open minutes (adjusted for timezone)
      const etOffset = -4; // EDT offset from UTC in hours
      const utcMinutes = marketHours.start - (etOffset * 60);
      
      result.setUTCMinutes(utcMinutes);
      return result;
    }
    
    // If it's before market open today, return today's market open time
    if (this.isPreMarket(date)) {
      const marketHours = this.getMarketHoursForDate(date);
      
      // Set time to market open
      result.setUTCHours(0, 0, 0, 0); // Reset to midnight UTC
      
      // Add market open minutes (adjusted for timezone)
      const etOffset = -4; // EDT offset from UTC in hours
      const utcMinutes = marketHours.start - (etOffset * 60);
      
      result.setUTCMinutes(utcMinutes);
      return result;
    }
    
    // Otherwise, find the next market open day
    let nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    
    // Keep incrementing until we find a market open day
    while (
      nextDay.getDay() === 0 || // Sunday
      nextDay.getDay() === 6 || // Saturday
      this.isMarketHoliday(nextDay)
    ) {
      nextDay.setDate(nextDay.getDate() + 1);
    }
    
    // Set time to market open
    const marketHours = this.getMarketHoursForDate(nextDay);
    
    nextDay.setUTCHours(0, 0, 0, 0); // Reset to midnight UTC
    
    // Add market open minutes (adjusted for timezone)
    const etOffset = -4; // EDT offset from UTC in hours
    const utcMinutes = marketHours.start - (etOffset * 60);
    
    nextDay.setUTCMinutes(utcMinutes);
    return nextDay;
  }

  /**
   * Get market close time for a specific date
   * @param date Date to check
   * @returns Date object representing market close time
   */
  getMarketCloseTime(date: Date = new Date()): Date {
    const result = new Date(date);
    const marketHours = this.getMarketHoursForDate(date);
    
    // Set time to market close
    result.setUTCHours(0, 0, 0, 0); // Reset to midnight UTC
    
    // Add market close minutes (adjusted for timezone)
    const etOffset = -4; // EDT offset from UTC in hours
    const utcMinutes = marketHours.end - (etOffset * 60);
    
    result.setUTCMinutes(utcMinutes);
    return result;
  }

  /**
   * Get time until next market open
   * @param date Optional date to start from (defaults to current time)
   * @returns Time until market open in milliseconds
   */
  getTimeToMarketOpen(date: Date = new Date()): number {
    const nextOpenTime = this.getNextMarketOpenTime(date);
    return nextOpenTime.getTime() - date.getTime();
  }

  /**
   * Get time until market close
   * @param date Optional date to check (defaults to current time)
   * @returns Time until market close in milliseconds, or 0 if market is closed
   */
  getTimeToMarketClose(date: Date = new Date()): number {
    // If market is not open, return 0
    if (!this.isMarketOpen(date)) {
      return 0;
    }
    
    const closeTime = this.getMarketCloseTime(date);
    return closeTime.getTime() - date.getTime();
  }

  /**
   * Adjust data freshness expectation based on market status
   * @param timeframe Data timeframe
   * @param date Optional date to check (defaults to current time)
   * @returns Maximum acceptable data age in milliseconds
   */
  adjustDataFreshnessExpectation(timeframe: string, date: Date = new Date()): number {
    const marketStatus = this.getCurrentMarketStatus(date);
    
    // Base freshness expectations by timeframe (in milliseconds)
    const baseFreshness: Record<string, number> = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000
    };
    
    // Default to 1 minute if timeframe not recognized
    const baseExpectation = baseFreshness[timeframe] || 60 * 1000;
    
    // Adjust based on market status
    switch (marketStatus) {
      case 'open':
        return baseExpectation;
      
      case 'pre-market':
      case 'after-hours':
        // Less strict during extended hours
        return baseExpectation * 2;
      
      case 'closed':
        // Much less strict when market is closed
        return baseExpectation * 10;
      
      default:
        return baseExpectation;
    }
  }

  /**
   * Get expected data delay based on market status and data source
   * @param dataSource Data source string
   * @param date Optional date to check (defaults to current time)
   * @returns Expected delay in milliseconds
   */
  getExpectedDataDelay(dataSource: string, date: Date = new Date()): number {
    const marketStatus = this.getCurrentMarketStatus(date);
    
    // Base delay expectations by source (in milliseconds)
    const baseDelays: Record<string, number> = {
      'polygon_rest': 15 * 1000, // 15 seconds
      'polygon_websocket': 500,  // 500 milliseconds
      'yahoo_finance': 5 * 1000, // 5 seconds
      'cached': 0,               // No additional delay for cached data
      'websocket_trade': 500,    // 500 milliseconds
      'websocket_quote': 500,    // 500 milliseconds
      'websocket_aggregate': 1000 // 1 second
    };
    
    // Default to 15 seconds if source not recognized
    const baseDelay = baseDelays[dataSource] || 15 * 1000;
    
    // Adjust based on market status
    switch (marketStatus) {
      case 'open':
        return baseDelay;
      
      case 'pre-market':
      case 'after-hours':
        // Higher delay during extended hours
        return baseDelay * 2;
      
      case 'closed':
        // Much higher delay when market is closed
        return baseDelay * 5;
      
      default:
        return baseDelay;
    }
  }

  /**
   * Format a time duration in a human-readable format
   * @param milliseconds Duration in milliseconds
   * @returns Formatted duration string
   */
  formatDuration(milliseconds: number): string {
    if (milliseconds < 0) {
      return 'Already passed';
    }
    
    if (milliseconds < 1000) {
      return `${milliseconds}ms`;
    }
    
    const seconds = Math.floor(milliseconds / 1000);
    
    if (seconds < 60) {
      return `${seconds}s`;
    }
    
    const minutes = Math.floor(seconds / 60);
    
    if (minutes < 60) {
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours < 24) {
      return `${hours}h ${remainingMinutes}m`;
    }
    
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    
    return `${days}d ${remainingHours}h`;
  }

  /**
   * Get formatted market status information
   * @param date Optional date to check (defaults to current time)
   * @returns Object with market status information
   */
  getMarketStatusInfo(date: Date = new Date()): {
    status: string;
    nextOpenTime: Date | null;
    timeToOpen: string | null;
    closeTime: Date | null;
    timeToClose: string | null;
    isHoliday: boolean;
    holidayName?: string;
    isEarlyClose: boolean;
  } {
    const status = this.getCurrentMarketStatus(date);
    const isHoliday = this.isMarketHoliday(date);
    const isEarlyClose = this.isEarlyCloseDay(date);
    
    let nextOpenTime: Date | null = null;
    let timeToOpen: string | null = null;
    let closeTime: Date | null = null;
    let timeToClose: string | null = null;
    
    if (status !== 'open') {
      nextOpenTime = this.getNextMarketOpenTime(date);
      timeToOpen = this.formatDuration(this.getTimeToMarketOpen(date));
    }
    
    if (status === 'open') {
      closeTime = this.getMarketCloseTime(date);
      timeToClose = this.formatDuration(this.getTimeToMarketClose(date));
    }
    
    // Get holiday name if applicable
    let holidayName: string | undefined;
    
    if (isHoliday) {
      const dateString = this.formatDateYYYYMMDD(date);
      const holidayIndex = this.MARKET_HOLIDAYS_2025.indexOf(dateString);
      
      if (holidayIndex >= 0) {
        // Map index to holiday name
        const holidayNames = [
          'New Year\'s Day',
          'Martin Luther King Jr. Day',
          'Presidents\' Day',
          'Good Friday',
          'Memorial Day',
          'Juneteenth',
          'Independence Day',
          'Labor Day',
          'Thanksgiving Day',
          'Christmas Day'
        ];
        
        holidayName = holidayNames[holidayIndex];
      }
    }
    
    return {
      status,
      nextOpenTime,
      timeToOpen,
      closeTime,
      timeToClose,
      isHoliday,
      holidayName,
      isEarlyClose
    };
  }

  /**
   * Determine if candles are from market hours or extended hours
   * @param candles Array of candles
   * @returns Object with categorized candles
   */
  categorizeCandles(candles: Candle[]): {
    marketHours: Candle[];
    preMarket: Candle[];
    afterHours: Candle[];
    weekend: Candle[];
  } {
    const marketHours: Candle[] = [];
    const preMarket: Candle[] = [];
    const afterHours: Candle[] = [];
    const weekend: Candle[] = [];
    
    candles.forEach(candle => {
      const candleDate = new Date(candle.timestamp);
      const status = this.getCurrentMarketStatus(candleDate);
      
      switch (status) {
        case 'open':
          marketHours.push(candle);
          break;
        
        case 'pre-market':
          preMarket.push(candle);
          break;
        
        case 'after-hours':
          afterHours.push(candle);
          break;
        
        case 'closed':
          // Check if it's a weekend
          const dayOfWeek = candleDate.getDay();
          if (dayOfWeek === 0 || dayOfWeek === 6) {
            weekend.push(candle);
          } else {
            // It's a weekday but market is closed (holiday or outside hours)
            afterHours.push(candle);
          }
          break;
      }
    });
    
    return {
      marketHours,
      preMarket,
      afterHours,
      weekend
    };
  }
}

export default MarketHoursService;
