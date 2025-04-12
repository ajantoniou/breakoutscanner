/**
 * Test Suite for Breakout Scanner
 * Contains tests for core functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  fetchHistoricalData,
  calculateEMA,
  calculateRSI,
  calculateATR
} from '../src/services/api/marketData/dataService';
import { 
  detectBullFlag,
  detectBearFlag
} from '../src/services/api/marketData/patternDetection/patternDetectionService';
import { 
  detectBreakout
} from '../src/services/api/marketData/patternDetection/breakoutDetector';
import { 
  backtestSignals,
  simulateTrade
} from '../src/services/backtesting/backtestingFramework';
import { 
  calculatePerformanceMetrics
} from '../src/services/backtesting/performanceAnalysis';

// Mock data
const mockCandles = [
  { timestamp: '2023-01-01', open: 100, high: 105, low: 98, close: 103, volume: 1000 },
  { timestamp: '2023-01-02', open: 103, high: 108, low: 102, close: 107, volume: 1200 },
  { timestamp: '2023-01-03', open: 107, high: 110, low: 105, close: 108, volume: 1500 },
  { timestamp: '2023-01-04', open: 108, high: 112, low: 107, close: 110, volume: 1800 },
  { timestamp: '2023-01-05', open: 110, high: 115, low: 109, close: 114, volume: 2000 },
  { timestamp: '2023-01-06', open: 114, high: 118, low: 113, close: 116, volume: 2200 },
  { timestamp: '2023-01-07', open: 116, high: 120, low: 115, close: 119, volume: 2500 },
  { timestamp: '2023-01-08', open: 119, high: 122, low: 117, close: 121, volume: 2300 },
  { timestamp: '2023-01-09', open: 121, high: 123, low: 119, close: 120, volume: 2100 },
  { timestamp: '2023-01-10', open: 120, high: 121, low: 118, close: 119, volume: 1900 },
  { timestamp: '2023-01-11', open: 119, high: 120, low: 117, close: 118, volume: 1800 },
  { timestamp: '2023-01-12', open: 118, high: 119, low: 116, close: 117, volume: 1700 },
  { timestamp: '2023-01-13', open: 117, high: 120, low: 116, close: 119, volume: 1900 },
  { timestamp: '2023-01-14', open: 119, high: 124, low: 118, close: 123, volume: 2200 },
  { timestamp: '2023-01-15', open: 123, high: 128, low: 122, close: 127, volume: 2500 },
];

// Mock polygon client
vi.mock('../src/services/api/polygon/client/polygonClient', () => ({
  default: {
    getAggregates: vi.fn().mockResolvedValue({
      results: mockCandles
    })
  }
}));

describe('Data Service Tests', () => {
  it('should calculate EMA correctly', () => {
    const prices = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
    const period = 5;
    
    const ema = calculateEMA(prices, period);
    
    expect(ema).toHaveLength(prices.length - period + 1);
    expect(ema[0]).toBeCloseTo(12); // First EMA is SMA
    expect(ema[ema.length - 1]).toBeGreaterThan(ema[0]); // EMA should increase with increasing prices
  });
  
  it('should calculate RSI correctly', () => {
    const prices = [10, 11, 10, 12, 9, 8, 10, 11, 12, 14, 15];
    const period = 5;
    
    const rsi = calculateRSI(prices, period);
    
    expect(rsi).toHaveLength(prices.length - period);
    expect(rsi[0]).toBeGreaterThanOrEqual(0);
    expect(rsi[0]).toBeLessThanOrEqual(100);
    
    // Test extreme cases
    const allUp = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
    const allDown = [20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10];
    
    const rsiAllUp = calculateRSI(allUp, period);
    const rsiAllDown = calculateRSI(allDown, period);
    
    expect(rsiAllUp[rsiAllUp.length - 1]).toBeCloseTo(100);
    expect(rsiAllDown[rsiAllDown.length - 1]).toBeCloseTo(0);
  });
  
  it('should calculate ATR correctly', () => {
    const candles = mockCandles.slice(0, 10);
    const period = 5;
    
    const atr = calculateATR(candles, period);
    
    expect(atr).toHaveLength(candles.length - period + 1);
    expect(atr[0]).toBeGreaterThan(0); // ATR should be positive
  });
  
  it('should fetch historical data', async () => {
    const data = await fetchHistoricalData('AAPL', '1d', 10);
    
    expect(data).toHaveLength(mockCandles.length);
    expect(data[0]).toHaveProperty('timestamp');
    expect(data[0]).toHaveProperty('open');
    expect(data[0]).toHaveProperty('high');
    expect(data[0]).toHaveProperty('low');
    expect(data[0]).toHaveProperty('close');
    expect(data[0]).toHaveProperty('volume');
  });
});

describe('Pattern Detection Tests', () => {
  it('should detect bull flag patterns', () => {
    // Create a bull flag pattern
    // Strong uptrend followed by consolidation
    const candles = [
      { timestamp: '2023-01-01', open: 100, high: 105, low: 98, close: 103, volume: 1000 },
      { timestamp: '2023-01-02', open: 103, high: 110, low: 102, close: 109, volume: 1500 },
      { timestamp: '2023-01-03', open: 109, high: 118, low: 108, close: 117, volume: 2000 },
      { timestamp: '2023-01-04', open: 117, high: 125, low: 116, close: 124, volume: 2500 },
      { timestamp: '2023-01-05', open: 124, high: 130, low: 123, close: 129, volume: 3000 },
      // Consolidation phase
      { timestamp: '2023-01-06', open: 129, high: 131, low: 126, close: 127, volume: 2000 },
      { timestamp: '2023-01-07', open: 127, high: 129, low: 125, close: 126, volume: 1800 },
      { timestamp: '2023-01-08', open: 126, high: 128, low: 124, close: 125, volume: 1600 },
      { timestamp: '2023-01-09', open: 125, high: 127, low: 123, close: 126, volume: 1700 },
      { timestamp: '2023-01-10', open: 126, high: 128, low: 125, close: 127, volume: 1900 },
    ];
    
    const result = detectBullFlag(candles);
    
    expect(result).not.toBeNull();
    if (result) {
      expect(result.patternType).toBe('Bull Flag');
      expect(result.direction).toBe('bullish');
      expect(result.confidenceScore).toBeGreaterThanOrEqual(60);
    }
  });
  
  it('should detect bear flag patterns', () => {
    // Create a bear flag pattern
    // Strong downtrend followed by consolidation
    const candles = [
      { timestamp: '2023-01-01', open: 130, high: 132, low: 128, close: 129, volume: 1000 },
      { timestamp: '2023-01-02', open: 129, high: 130, low: 122, close: 123, volume: 1500 },
      { timestamp: '2023-01-03', open: 123, high: 124, low: 115, close: 116, volume: 2000 },
      { timestamp: '2023-01-04', open: 116, high: 117, low: 108, close: 109, volume: 2500 },
      { timestamp: '2023-01-05', open: 109, high: 110, low: 102, close: 103, volume: 3000 },
      // Consolidation phase
      { timestamp: '2023-01-06', open: 103, high: 106, low: 102, close: 105, volume: 2000 },
      { timestamp: '2023-01-07', open: 105, high: 107, low: 104, close: 106, volume: 1800 },
      { timestamp: '2023-01-08', open: 106, high: 108, low: 105, close: 107, volume: 1600 },
      { timestamp: '2023-01-09', open: 107, high: 109, low: 106, close: 108, volume: 1700 },
      { timestamp: '2023-01-10', open: 108, high: 109, low: 106, close: 107, volume: 1900 },
    ];
    
    const result = detectBearFlag(candles);
    
    expect(result).not.toBeNull();
    if (result) {
      expect(result.patternType).toBe('Bear Flag');
      expect(result.direction).toBe('bearish');
      expect(result.confidenceScore).toBeGreaterThanOrEqual(60);
    }
  });
  
  it('should detect breakouts', () => {
    // Create a breakout scenario
    // Horizontal channel followed by breakout
    const candles = [
      // Channel formation
      { timestamp: '2023-01-01', open: 100, high: 105, low: 98, close: 103, volume: 1000 },
      { timestamp: '2023-01-02', open: 103, high: 106, low: 101, close: 104, volume: 1200 },
      { timestamp: '2023-01-03', open: 104, high: 107, low: 102, close: 105, volume: 1100 },
      { timestamp: '2023-01-04', open: 105, high: 106, low: 101, close: 102, volume: 1000 },
      { timestamp: '2023-01-05', open: 102, high: 105, low: 100, close: 103, volume: 1100 },
      { timestamp: '2023-01-06', open: 103, high: 106, low: 101, close: 104, volume: 1200 },
      { timestamp: '2023-01-07', open: 104, high: 107, low: 102, close: 105, volume: 1300 },
      { timestamp: '2023-01-08', open: 105, high: 106, low: 101, close: 102, volume: 1100 },
      // Breakout
      { timestamp: '2023-01-09', open: 102, high: 108, low: 102, close: 107, volume: 1800 },
      { timestamp: '2023-01-10', open: 107, high: 112, low: 106, close: 111, volume: 2200 },
    ];
    
    const result = detectBreakout(candles, '1d');
    
    expect(result).not.toBeNull();
    if (result) {
      expect(result.breakoutType).toContain('Channel Breakout');
      expect(result.confidenceScore).toBeGreaterThanOrEqual(60);
    }
  });
});

describe('Backtesting Tests', () => {
  it('should simulate trades correctly', () => {
    const signal = {
      id: '1',
      symbol: 'AAPL',
      timeframe: '1d',
      patternType: 'Bull Flag',
      direction: 'bullish',
      entryPrice: 100,
      targetPrice: 120,
      stopLoss: 90,
      confidenceScore: 80,
      createdAt: '2023-01-01',
      status: 'active'
    };
    
    const candles = [
      { timestamp: '2023-01-01', open: 100, high: 102, low: 98, close: 101, volume: 1000 },
      { timestamp: '2023-01-02', open: 101, high: 105, low: 100, close: 104, volume: 1200 },
      { timestamp: '2023-01-03', open: 104, high: 108, low: 103, close: 107, volume: 1500 },
      { timestamp: '2023-01-04', open: 107, high: 112, low: 106, close: 110, volume: 1800 },
      { timestamp: '2023-01-05', open: 110, high: 115, low: 109, close: 114, volume: 2000 },
      { timestamp: '2023-01-06', open: 114, high: 121, low: 113, close: 120, volume: 2200 }, // Target hit
    ];
    
    const result = simulateTrade(signal, candles, 30);
    
    expect(result).not.toBeNull();
    expect(result.successful).toBe(true);
    expect(result.hitTarget).toBe(true);
    expect(result.hitStopLoss).toBe(false);
    expect(result.profitLossPercent).toBeCloseTo(20);
  });
  
  it('should calculate performance metrics correctly', () => {
    const backtestResults = [
      {
        id: '1',
        signalId: '1',
        symbol: 'AAPL',
        timeframe: '1d',
        signalType: 'Bull Flag',
        direction: 'bullish',
        entryPrice: 100,
        targetPrice: 120,
        stopLoss: 90,
        exitPrice: 120,
        entryDate: '2023-01-01',
        exitDate: '2023-01-06',
        daysToExit: 5,
        profitLossPercent: 20,
        maxDrawdownPercent: 2,
        successful: true,
        hitTarget: true,
        hitStopLoss: false,
        timeoutExit: false,
        confidenceScore: 80,
        riskRewardRatio: 2
      },
      {
        id: '2',
        signalId: '2',
        symbol: 'MSFT',
        timeframe: '1d',
        signalType: 'Bull Flag',
        direction: 'bullish',
        entryPrice: 200,
        targetPrice: 220,
        stopLoss: 190,
        exitPrice: 190,
        entryDate: '2023-01-01',
        exitDate: '2023-01-04',
        daysToExit: 3,
        profitLossPercent: -5,
        maxDrawdownPercent: 5,
        successful: false,
        hitTarget: false,
        hitStopLoss: true,
        timeoutExit: false,
        confidenceScore: 70,
        riskRewardRatio: 2
      },
      {
        id: '3',
        signalId: '3',
        symbol: 'GOOGL',
        timeframe: '1d',
        signalType: 'Bear Flag',
        direction: 'bearish',
        entryPrice: 150,
        targetPrice: 130,
        stopLoss: 160,
        exitPrice: 130,
        entryDate: '2023-01-01',
        exitDate: '2023-01-05',
        daysToExit: 4,
        profitLossPercent: 13.33,
        maxDrawdownPercent: 1,
        successful: true,
        hitTarget: true,
        hitStopLoss: false,
        timeoutExit: false,
        confidenceScore: 85,
        riskRewardRatio: 2
      }
    ];
    
    const metrics = calculatePerformanceMetrics(backtestResults);
    
    expect(metrics.totalTrades).toBe(3);
    expect(metrics.winRate).toBeCloseTo(2/3);
    expect(metrics.averageProfitLoss).toBeCloseTo((20 - 5 + 13.33) / 3);
    expect(metrics.profitFactor).toBeGreaterThan(1);
    expect(metrics.maxDrawdown).toBeCloseTo(5);
    expect(metrics.averageHoldingPeriod).toBeCloseTo(4);
  });
});
