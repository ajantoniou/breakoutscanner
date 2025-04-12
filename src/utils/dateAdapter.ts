
import { ensureDateString, ensureDateObject } from './dateConverter';

/**
 * Converts all date properties in an object to string format
 */
export function convertDatesToStrings<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  const result = { ...obj };
  
  // Convert common date fields
  const dateFields = [
    'createdAt', 'updatedAt', 'lastUpdated', 'entryDate', 
    'exitDate', 'created', 'lastModified', 'timestamp'
  ];
  
  dateFields.forEach(field => {
    if (field in obj && obj[field]) {
      result[field] = ensureDateString(obj[field]);
    }
  });
  
  return result;
}

/**
 * Converts all date properties in an array of objects to string format
 */
export function convertArrayDatesToStrings<T extends Record<string, any>>(arr: T[]): T[] {
  if (!Array.isArray(arr)) {
    return arr;
  }
  
  return arr.map(item => convertDatesToStrings(item));
}

/**
 * Converts all date properties in an object to Date objects
 */
export function convertDatesToObjects<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  const result = { ...obj };
  
  // Convert common date fields
  const dateFields = [
    'createdAt', 'updatedAt', 'lastUpdated', 'entryDate', 
    'exitDate', 'created', 'lastModified', 'timestamp'
  ];
  
  dateFields.forEach(field => {
    if (field in obj && obj[field]) {
      result[field] = ensureDateObject(obj[field]);
    }
  });
  
  return result;
}

/**
 * Converts all date properties in an array of objects to Date objects
 */
export function convertArrayDatesToObjects<T extends Record<string, any>>(arr: T[]): T[] {
  if (!Array.isArray(arr)) {
    return arr;
  }
  
  return arr.map(item => convertDatesToObjects(item));
}
