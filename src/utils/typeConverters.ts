
import { PatternData } from "@/services/types/patternTypes";
import { BacktestResult as BacktestResultWithDateString } from '@/services/types/backtestTypes';
import { BacktestResult as BacktestResultWithDateObj } from '@/services/backtesting/backtestTypes';
import { ensureDateString, ensureDateObject } from './dateConverter';
import { v4 as uuidv4 } from 'uuid';

/**
 * Adapter for BacktestResult conversions
 */
export const backTestAdapter = {
  // Convert a BacktestResult with Date objects to one with string dates
  convert: (result: BacktestResultWithDateObj): BacktestResultWithDateString => {
    return {
      ...result,
      entryDate: ensureDateString(result.entryDate),
      exitDate: ensureDateString(result.exitDate),
      maxDrawdown: result.maxDrawdown ?? 0,
      predictedDirection: result.predictedDirection || 'bullish',
      actualDirection: result.actualDirection || 'bullish'
    };
  },
  
  // Convert an array of BacktestResult with Date objects to ones with string dates
  convertArray: (results: BacktestResultWithDateObj[]): BacktestResultWithDateString[] => {
    return results.map(backTestAdapter.convert);
  }
};

/**
 * Adapter for PatternData conversions
 */
export const patternAdapter = {
  // Ensure all required fields are present
  ensureRequiredFields: (pattern: Partial<PatternData>): PatternData => {
    return {
      id: pattern.id || uuidv4(),
      symbol: pattern.symbol || '',
      patternType: pattern.patternType || '',
      timeframe: pattern.timeframe || 'daily',
      entryPrice: pattern.entryPrice || 0,
      targetPrice: pattern.targetPrice || 0,
      confidenceScore: pattern.confidenceScore || 50,
      status: pattern.status || 'active',
      createdAt: pattern.createdAt || new Date().toISOString(),
      ...pattern
    } as PatternData;
  }
};

// Add additional helpers for compatibility
export function ensureDateFieldsAsStrings<T extends Record<string, any>>(obj: T): T {
  const result = { ...obj };
  Object.keys(obj).forEach(key => {
    if (obj[key] instanceof Date) {
      (result as any)[key] = ensureDateString(obj[key]);
    }
  });
  return result;
}

export function ensureDateFieldsAsObjects<T extends Record<string, any>>(obj: T): T {
  const result = { ...obj };
  Object.keys(obj).forEach(key => {
    if (typeof obj[key] === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(obj[key])) {
      (result as any)[key] = ensureDateObject(obj[key]);
    }
  });
  return result;
}

export function normalizeDirection(direction: string | undefined): 'bullish' | 'bearish' {
  if (!direction) return 'bullish';
  
  const dir = direction.toLowerCase();
  if (dir === 'up' || dir === 'bullish' || dir === 'long' || dir === 'ascending') {
    return 'bullish';
  }
  return 'bearish';
}
