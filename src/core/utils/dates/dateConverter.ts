
/**
 * Utility functions to handle date conversions between string and Date objects
 * This helps with inconsistent date formats across the application
 */

/**
 * Converts a Date object to a string
 * @param date The date to convert
 * @returns The date as a string in ISO format
 */
export const dateToString = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  if (typeof date === 'string') return date;
  return date.toISOString();
};

/**
 * Ensures a date value is a string
 * @param date The date to convert
 * @returns The date as a string
 */
export const ensureDateString = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  if (typeof date === 'string') return date;
  return date.toISOString();
};

/**
 * Ensures a date value is a Date object
 * @param date The date to convert
 * @returns The date as a Date object
 */
export const ensureDateObject = (date: Date | string | null | undefined): Date | null => {
  if (!date) return null;
  if (date instanceof Date) return date;
  try {
    return new Date(date);
  } catch (e) {
    console.error('Invalid date format:', date);
    return null;
  }
};

/**
 * Converts a date string to a formatted date string
 * @param dateStr The date string to format
 * @param format The format to use (default: 'short')
 * @returns The formatted date string
 */
export const formatDateString = (
  dateStr: string | Date | null | undefined,
  format: 'short' | 'long' | 'time' | 'datetime' = 'short'
): string => {
  if (!dateStr) return '';
  
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  
  try {
    switch (format) {
      case 'short':
        return date.toLocaleDateString();
      case 'long':
        return date.toLocaleDateString(undefined, { 
          weekday: 'long',
          year: 'numeric', 
          month: 'long', 
          day: 'numeric'
        });
      case 'time':
        return date.toLocaleTimeString();
      case 'datetime':
        return date.toLocaleString();
      default:
        return date.toLocaleDateString();
    }
  } catch (e) {
    console.error('Error formatting date:', dateStr);
    return String(dateStr);
  }
};

/**
 * Simple date formatter for backwards compatibility
 * @param date Date to format
 * @param includeTime Whether to include time
 * @returns Formatted date string
 */
export const formatDate = (
  date: Date | string | null | undefined,
  includeTime: boolean = false
): string => {
  return formatDateString(date, includeTime ? 'datetime' : 'short');
};

/**
 * Map direction types between different systems
 * @param direction A direction value
 * @returns Standardized direction value
 */
export const mapDirection = (direction: string | undefined): "bullish" | "bearish" => {
  if (direction === "up" || direction === "bullish") return "bullish";
  if (direction === "down" || direction === "bearish") return "bearish";
  // Default to bullish for unclear or sideways patterns
  return "bullish";
};

/**
 * Map pattern direction more flexibly
 * Accepts more input types for backward compatibility
 */
export const mapPatternDirection = (direction: string | "up" | "down" | "sideways" | "bullish" | "bearish" | "neutral" | undefined): "bullish" | "bearish" => {
  if (!direction) return "bullish";
  if (direction === "up" || direction === "bullish") return "bullish";
  if (direction === "down" || direction === "bearish") return "bearish";
  // Default to bullish for others
  return "bullish";
};
