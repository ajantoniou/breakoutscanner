/**
 * Utilities for handling date conversions and formatting
 * Ensures consistent handling of dates across the application
 */

/**
 * Ensures a date value is a properly formatted ISO string
 * @param dateValue Date value as string, Date object, or null/undefined
 * @returns ISO string representation or undefined if input is invalid
 */
export const ensureDateString = (dateValue?: string | Date | null): string | undefined => {
  if (!dateValue) return undefined;
  
  try {
    if (typeof dateValue === 'string') {
      // If it's already a string, validate it's a proper date
      const parsedDate = new Date(dateValue);
      if (isNaN(parsedDate.getTime())) {
        console.warn(`Invalid date string: ${dateValue}`);
        return undefined;
      }
      return dateValue;
    }
    
    // Convert Date object to ISO string
    return dateValue.toISOString();
  } catch (error) {
    console.warn(`Error converting date: ${error}`);
    return undefined;
  }
};

/**
 * Ensures a date value is a Date object
 * @param dateValue Date value as string, Date object, or null/undefined
 * @returns Date object or undefined if input is invalid
 */
export const ensureDateObject = (dateValue?: string | Date | null): Date | undefined => {
  if (!dateValue) return undefined;
  
  try {
    if (typeof dateValue === 'string') {
      const parsedDate = new Date(dateValue);
      if (isNaN(parsedDate.getTime())) {
        console.warn(`Invalid date string: ${dateValue}`);
        return undefined;
      }
      return parsedDate;
    }
    
    return dateValue;
  } catch (error) {
    console.warn(`Error converting date: ${error}`);
    return undefined;
  }
};

/**
 * Format a date for display
 * @param dateValue Date value as string, Date object, or null/undefined
 * @param withTime Include time in formatted output
 * @returns Formatted date string for display or empty string if input is invalid
 */
export const formatDate = (dateValue?: string | Date | null, withTime: boolean = false): string => {
  const date = ensureDateObject(dateValue);
  if (!date) return '';
  
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {})
  };
  
  return new Intl.DateTimeFormat('en-US', options).format(date);
};

/**
 * Calculate time difference between two dates in days
 * @param startDate Start date as string, Date object, or null/undefined
 * @param endDate End date as string, Date object, or null/undefined (defaults to now)
 * @returns Number of days between dates or undefined if input is invalid
 */
export const daysBetween = (
  startDate?: string | Date | null, 
  endDate?: string | Date | null
): number | undefined => {
  const start = ensureDateObject(startDate);
  const end = ensureDateObject(endDate) || new Date();
  
  if (!start) return undefined;
  
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

/**
 * Maps a pattern direction to descriptive text and color
 * @param direction The direction of the pattern ("bullish" or "bearish")
 * @returns Object with text and color properties
 */
export const mapDirection = (direction: 'bullish' | 'bearish' | string): { 
  text: string; 
  color: string; 
  iconColor: string;
  bgColor: string;
} => {
  if (direction === 'bullish') {
    return { 
      text: 'Bullish', 
      color: 'text-green-600', 
      iconColor: 'bg-green-600', 
      bgColor: 'bg-green-50 dark:bg-green-900/20' 
    };
  } else if (direction === 'bearish') {
    return { 
      text: 'Bearish', 
      color: 'text-red-600', 
      iconColor: 'bg-red-600', 
      bgColor: 'bg-red-50 dark:bg-red-900/20' 
    };
  }
  
  // Default for unknown values
  return { 
    text: 'Unknown', 
    color: 'text-gray-600', 
    iconColor: 'bg-gray-600',
    bgColor: 'bg-gray-50 dark:bg-gray-900/20'
  };
};

/**
 * Ensures direction is formatted correctly for backtesting
 */
export function ensureBacktestDirection(direction: string | undefined): "bullish" | "bearish" {
  if (!direction) return "bullish"; // Default to bullish
  
  const dir = direction.toLowerCase().trim();
  
  if (dir === "bullish" || dir === "up" || dir === "long") {
    return "bullish";
  }
  
  if (dir === "bearish" || dir === "down" || dir === "short") {
    return "bearish";
  }
  
  return "bullish"; // Default
}

/**
 * Maps direction strings to standardized format
 */
export function mapDirectionBinary(direction: string): "bullish" | "bearish" {
  if (direction === "up" || direction === "bullish") {
    return "bullish";
  }
  return "bearish";
}
