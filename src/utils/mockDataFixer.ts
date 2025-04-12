
import { ensureDateString } from "./dateConverter";

/**
 * Helper function to fix Date types in mock data objects
 * @param obj Object containing Date values
 * @returns Same object with Date values converted to strings
 */
export const fixMockDataDates = <T extends Record<string, any>>(obj: T): T => {
  const result = { ...obj } as T;
  
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    
    // Convert Date objects to ISO strings
    if (value instanceof Date) {
      (result as any)[key] = ensureDateString(value);
    }
    // Recursively fix nested objects
    else if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
      (result as any)[key] = fixMockDataDates(value);
    }
  });
  
  return result;
};

/**
 * Helper function to add missing properties to BacktestResult objects
 * @param obj BacktestResult object
 * @returns Same object with maxDrawdown added if missing
 */
export const fixBacktestResult = (obj: any): any => {
  if (!obj.hasOwnProperty('maxDrawdown')) {
    return {
      ...obj,
      maxDrawdown: 5.0 // Default value
    };
  }
  return obj;
};

/**
 * Function that creates fixed copy of mock data arrays
 * @param array Array of mock data objects
 * @returns Fixed array with Date values as strings and missing properties added
 */
export const fixMockDataArray = <T extends Record<string, any>>(array: T[]): T[] => {
  return array.map(item => {
    const fixedDates = fixMockDataDates(item);
    return fixBacktestResult(fixedDates);
  });
};
