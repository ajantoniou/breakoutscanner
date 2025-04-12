import { describe, it, expect } from 'vitest';
import { generateBacktestSummary } from '../services/backtesting/backtestSummary';
import { BacktestResult } from '../services/backtesting/backtestTypes';

describe('generateBacktestSummary', () => {
  it('should calculate correct summary for backtest results', () => {
    // Mock data
    const results: BacktestResult[] = [
      {
        patternId: 'pattern1',
        symbol: 'AAPL',
        timeframe: '1h',
        patternType: 'channel',
        entryPrice: 100,
        targetPrice: 110,
        stopLoss: 90,
        actualExitPrice: 110,
        predictedDirection: 'bullish',
        actualDirection: 'bullish',
        entryDate: new Date('2023-01-01T00:00:00Z'),
        exitDate: new Date('2023-01-02T00:00:00Z'),
        candlesToBreakout: 3,
        successful: true,
        profitLoss: 10,
        profitLossPercent: 10,
        maxDrawdown: 2,
        confidenceScore: 0.8,
      },
      {
        patternId: 'pattern2',
        symbol: 'MSFT',
        timeframe: '1h',
        patternType: 'channel',
        entryPrice: 200,
        targetPrice: 220,
        stopLoss: 180,
        actualExitPrice: 180,
        predictedDirection: 'bullish',
        actualDirection: 'bearish',
        entryDate: new Date('2023-01-01T00:00:00Z'),
        exitDate: new Date('2023-01-02T00:00:00Z'),
        candlesToBreakout: 5,
        successful: false,
        profitLoss: -20,
        profitLossPercent: -10,
        maxDrawdown: 10,
        confidenceScore: 0.6,
      },
      {
        patternId: 'pattern3',
        symbol: 'GOOG',
        timeframe: '1h',
        patternType: 'channel',
        entryPrice: 300,
        targetPrice: 330,
        stopLoss: 270,
        actualExitPrice: 330,
        predictedDirection: 'bullish',
        actualDirection: 'bullish',
        entryDate: new Date('2023-01-01T00:00:00Z'),
        exitDate: new Date('2023-01-02T00:00:00Z'),
        candlesToBreakout: 2,
        successful: true,
        profitLoss: 30,
        profitLossPercent: 10,
        maxDrawdown: 5,
        confidenceScore: 0.9,
      }
    ];

    const summary = generateBacktestSummary(results, '1h');

    // Check calculated values
    expect(summary.totalPatterns).toBe(3);
    expect(summary.successfulPatterns).toBe(2);
    expect(summary.successRate).toBeCloseTo(66.67);
    expect(summary.avgProfitLossPercent).toBeCloseTo(3.33, 1);
    expect(summary.avgWin).toBeCloseTo(10, 1);
    expect(summary.avgLoss).toBeCloseTo(-10, 1);
    expect(summary.avgCandlesToBreakout).toBeCloseTo(3.33, 1);
  });

  it('should return empty summary for empty results', () => {
    const summary = generateBacktestSummary([], '1h');
    
    expect(summary.totalPatterns).toBe(0);
    expect(summary.successfulPatterns).toBe(0);
    expect(summary.successRate).toBe(0);
    expect(summary.avgProfitLossPercent).toBe(0);
    expect(summary.avgWin).toBe(0);
    expect(summary.avgLoss).toBe(0);
    expect(summary.avgCandlesToBreakout).toBe(0);
  });
}); 