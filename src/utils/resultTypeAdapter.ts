
import { BacktestResult as BacktestResultWithDateObj } from '@/services/backtesting/backtestTypes';
import { BacktestResult as BacktestResultWithDateString } from '@/services/types/backtestTypes';
import { ensureDateString, ensureDateObject } from './dateConverter';

/**
 * Adapts a BacktestResult with Date objects to a BacktestResult with string dates
 */
export const convertToStringDates = (result: BacktestResultWithDateObj): BacktestResultWithDateString => {
  return {
    ...result,
    entryDate: ensureDateString(result.entryDate),
    exitDate: ensureDateString(result.exitDate),
    // Ensure maxDrawdown is defined
    maxDrawdown: result.maxDrawdown ?? 0
  };
};

/**
 * Adapts a BacktestResult with string dates to a BacktestResult with Date objects
 */
export const convertToDateObjects = (result: BacktestResultWithDateString): BacktestResultWithDateObj => {
  return {
    ...result,
    entryDate: ensureDateObject(result.entryDate) ?? new Date(),
    exitDate: ensureDateObject(result.exitDate) ?? new Date(),
    maxDrawdown: result.maxDrawdown ?? 0
  };
};

/**
 * Converts an array of BacktestResult objects to ensure they have string dates
 */
export const convertArrayToStringDates = (results: BacktestResultWithDateObj[] | BacktestResultWithDateString[]): BacktestResultWithDateString[] => {
  return results.map(result => {
    if (result.entryDate instanceof Date) {
      return convertToStringDates(result as BacktestResultWithDateObj);
    }
    return result as BacktestResultWithDateString;
  });
};

/**
 * Converts an array of BacktestResult objects to ensure they have Date objects
 */
export const convertArrayToDateObjects = (results: BacktestResultWithDateString[] | BacktestResultWithDateObj[]): BacktestResultWithDateObj[] => {
  return results.map(result => {
    if (typeof result.entryDate === 'string') {
      return convertToDateObjects(result as BacktestResultWithDateString);
    }
    return result as BacktestResultWithDateObj;
  });
};
