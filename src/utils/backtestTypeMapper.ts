
import { BacktestResult as TypesBacktestResult } from "@/services/types/backtestTypes";
import { BacktestResult as BacktestingBacktestResult } from "@/services/backtesting/backtestTypes";
import { ensureDateString } from "./dateConverter";
import { adaptBacktestResult } from "./backtestAdapter";

/**
 * Converts an array of BacktestResult objects with Date objects to ones with string dates
 */
export function convertArrayToStringDates(
  results: BacktestingBacktestResult[]
): TypesBacktestResult[] {
  return results.map(result => ({
    ...result,
    entryDate: ensureDateString(result.entryDate),
    exitDate: ensureDateString(result.exitDate)
  }) as unknown as TypesBacktestResult);
}

/**
 * Converts an array of BacktestResult objects with string dates to ones with Date objects
 */
export function convertArrayToDateObjects(
  results: TypesBacktestResult[]
): BacktestingBacktestResult[] {
  return results.map(result => ({
    ...result,
    entryDate: typeof result.entryDate === 'string' ? new Date(result.entryDate) : result.entryDate,
    exitDate: typeof result.exitDate === 'string' ? new Date(result.exitDate) : result.exitDate
  }) as unknown as BacktestingBacktestResult);
}

/**
 * Convert TypesBacktestResult to BacktestingBacktestResult
 */
export function convertToBacktestingResult(
  result: TypesBacktestResult
): BacktestingBacktestResult {
  return {
    ...result,
    entryDate: typeof result.entryDate === 'string' ? new Date(result.entryDate) : result.entryDate,
    exitDate: typeof result.exitDate === 'string' ? new Date(result.exitDate) : result.exitDate
  } as unknown as BacktestingBacktestResult;
}

/**
 * Convert BacktestingBacktestResult to TypesBacktestResult
 */
export function convertToTypesResult(
  result: BacktestingBacktestResult
): TypesBacktestResult {
  return adaptBacktestResult(result);
}
