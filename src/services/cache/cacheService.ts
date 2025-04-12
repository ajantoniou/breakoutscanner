
import { PatternData, TimeframeStats } from "../types/patternTypes";
import { BacktestResult } from "../types/backtestTypes";
import { ScannerFilterPreset } from "./cacheTypes";

// Helper function to safely parse JSON with error handling
const safeJsonParse = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`Error parsing ${key} from localStorage:`, error);
    return defaultValue;
  }
};

// Helper function to safely stringify and store JSON
const safeJsonStore = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error storing ${key} in localStorage:`, error);
  }
};

// Pattern caching
export const fetchCachedPatterns = async (timeframe: string): Promise<PatternData[] | null> => {
  const key = `patterns_${timeframe}`;
  return safeJsonParse<PatternData[] | null>(key, null);
};

export const storeCachedPatterns = async (timeframe: string, patterns: PatternData[]): Promise<void> => {
  const key = `patterns_${timeframe}`;
  safeJsonStore(key, patterns);
};

export const clearCachedPatterns = async (timeframe: string): Promise<void> => {
  const key = `patterns_${timeframe}`;
  localStorage.removeItem(key);
};

// Backtest results caching
export const fetchCachedBacktestResults = async (timeframe: string): Promise<BacktestResult[] | null> => {
  const key = `backtest_results_${timeframe}`;
  return safeJsonParse<BacktestResult[] | null>(key, null);
};

export const storeCachedBacktestResults = async (timeframe: string, results: BacktestResult[]): Promise<void> => {
  const key = `backtest_results_${timeframe}`;
  safeJsonStore(key, results);
};

export const clearCachedBacktestResults = async (timeframe: string): Promise<void> => {
  const key = `backtest_results_${timeframe}`;
  localStorage.removeItem(key);
};

// Stats caching
export const fetchCachedStats = async (timeframe: string): Promise<TimeframeStats | null> => {
  const key = `stats_${timeframe}`;
  return safeJsonParse<TimeframeStats | null>(key, null);
};

export const storeCachedStats = async (timeframe: string, stats: TimeframeStats): Promise<void> => {
  const key = `stats_${timeframe}`;
  safeJsonStore(key, stats);
};

export const clearCachedStats = async (timeframe: string): Promise<void> => {
  const key = `stats_${timeframe}`;
  localStorage.removeItem(key);
};

// Filter presets
export const fetchFilterPresets = async (): Promise<ScannerFilterPreset[]> => {
  return safeJsonParse<ScannerFilterPreset[]>('filter_presets', []);
};

export const storeFilterPresets = async (presets: ScannerFilterPreset[]): Promise<void> => {
  safeJsonStore('filter_presets', presets);
};

export const deleteFilterPresets = async (presets: ScannerFilterPreset[]): Promise<void> => {
  safeJsonStore('filter_presets', presets);
};
