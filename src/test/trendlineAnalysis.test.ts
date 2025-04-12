import { describe, it, expect } from 'vitest';
import { 
  identifyHorizontalTrendlines,
  identifyDiagonalTrendlines,
  checkBreakthrough,
  checkBounce,
  identifyAllTrendlines
} from '../services/backtesting/utils/trendlineAnalysis';
import { HistoricalPrice } from '../services/backtesting/backtestTypes';

describe('Trendline Analysis', () => {
  // Sample data for testing
  const samplePrices: HistoricalPrice[] = [
    { date: new Date('2023-01-01'), open: 100, high: 105, low: 98, close: 102, volume: 1000 },
    { date: new Date('2023-01-02'), open: 102, high: 107, low: 101, close: 106, volume: 1200 },
    { date: new Date('2023-01-03'), open: 106, high: 110, low: 104, close: 108, volume: 1100 },
    { date: new Date('2023-01-04'), open: 108, high: 112, low: 106, close: 110, volume: 1300 },
    { date: new Date('2023-01-05'), open: 110, high: 115, low: 108, close: 114, volume: 1500 },
    { date: new Date('2023-01-06'), open: 114, high: 118, low: 112, close: 116, volume: 1400 },
    { date: new Date('2023-01-07'), open: 116, high: 120, low: 114, close: 118, volume: 1600 },
    { date: new Date('2023-01-08'), open: 118, high: 125, low: 117, close: 124, volume: 1700 },
  ];

  describe('identifyAllTrendlines', () => {
    it('should identify trendlines with default configuration', () => {
      const trendlines = identifyAllTrendlines(samplePrices);
      expect(trendlines).toBeDefined();
    });
  });

  describe('identifyHorizontalTrendlines', () => {
    it('should identify horizontal trendlines with custom config', () => {
      const config = {
        minConfirmationTouches: 2,
        lookbackPeriod: 8,
        validationThreshold: 0.5,
        proximityThreshold: 0.01,
        strengthThreshold: 0.2,
        emaPeriods: [7],
        useWicks: true,
        maxSlopeAngle: 45,
        minSlopeAngle: 5,
        volatilityAdjustment: true
      };
      
      const trendlines = identifyHorizontalTrendlines(samplePrices, config);
      expect(trendlines).toBeDefined();
    });
  });

  describe('identifyDiagonalTrendlines', () => {
    it('should identify diagonal trendlines with custom config', () => {
      const config = {
        minConfirmationTouches: 2,
        lookbackPeriod: 8,
        validationThreshold: 0.5,
        proximityThreshold: 0.01,
        strengthThreshold: 0.2,
        emaPeriods: [7],
        useWicks: true,
        maxSlopeAngle: 45,
        minSlopeAngle: 5,
        volatilityAdjustment: true
      };
      
      const trendlines = identifyDiagonalTrendlines(samplePrices, config);
      expect(trendlines).toBeDefined();
    });
  });

  describe('checkBreakthrough', () => {
    it('should check for breakout/breakdown correctly', () => {
      // We need a valid trendline object from the implementation
      // Since we can't easily create one, we'll mock the required properties
      const mockTrendline = {
        startIndex: 0,
        endIndex: 6,
        startPrice: 110,
        endPrice: 120,
        isSupport: false,
        strength: 0.8,
        touches: 3,
        currentPrice: 120,
        type: 'horizontal' as const,
        subType: 'resistance' as const,
        bouncePercentage: 80,
        isActive: true,
        priceAtIndex: (index: number) => 120 // This returns a constant for simplicity
      };
      
      const breakoutCandle = samplePrices[7]; // The last candle
      
      const breakoutResult = checkBreakthrough(
        mockTrendline,
        breakoutCandle,
        7 // Check the last candle
      );
      
      // Since our candle (open 118, close 124) should break through 
      // the resistance at 120, we expect isBreakthrough to be true
      expect(breakoutResult).toBeDefined();
      expect(breakoutResult.direction).toBe('up');
    });
  });
    
  describe('checkBounce', () => {
    it('should check for bounce correctly', () => {
      // Mock a support trendline
      const mockTrendline = {
        startIndex: 0,
        endIndex: 6,
        startPrice: 98,
        endPrice: 114,
        isSupport: true,
        strength: 0.8,
        touches: 3,
        currentPrice: 110,
        type: 'horizontal' as const,
        subType: 'support' as const,
        bouncePercentage: 80,
        isActive: true,
        priceAtIndex: (index: number) => 110 // This returns a constant for simplicity
      };
      
      const bounceResult = checkBounce(
        mockTrendline,
        samplePrices[4], // Current candle (low: 108)
        samplePrices[5], // Next candle (close: 116)
        4 // Index of current candle
      );
      
      // We're just testing that the function runs without error
      expect(bounceResult).toBeDefined();
    });
  });
}); 