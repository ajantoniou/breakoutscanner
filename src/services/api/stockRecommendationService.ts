import { PatternData } from '@/services/types/patternTypes';
import { patternDetectionManager } from './marketData/patternDetectionManager';
import { realTimeDataService } from './marketData/realTimeDataService';
import { stockUniverses } from './marketData/stockUniverses';

/**
 * Comprehensive Stock Recommendation Service
 * Provides accurate stock recommendations based on pattern detection and real-time data
 */
class StockRecommendationService {
  /**
   * Get high-confidence stock recommendations for day trading
   * @param minConfidence Minimum confidence score (0-100)
   * @param direction Optional direction filter ('bullish', 'bearish', or undefined for both)
   * @returns Promise with day trading recommendations
   */
  async getDayTradingRecommendations(
    minConfidence: number = 80,
    direction?: 'bullish' | 'bearish'
  ): Promise<PatternData[]> {
    try {
      console.log(`Getting day trading recommendations (min confidence: ${minConfidence}, direction: ${direction || 'all'})`);
      
      // Use day trading universe
      const symbols = stockUniverses.dayTradingUniverse;
      
      // Use appropriate timeframes for day trading
      const timeframes = ['15m', '30m', '1h'];
      
      // Scan symbols for patterns
      const patternsBySymbol = await patternDetectionManager.scanMultipleSymbols(symbols, timeframes);
      
      // Flatten patterns from all symbols
      let allPatterns: PatternData[] = [];
      for (const symbol in patternsBySymbol) {
        allPatterns = allPatterns.concat(patternsBySymbol[symbol]);
      }
      
      // Filter by confidence and direction
      const recommendations = allPatterns.filter(pattern => {
        const meetsConfidence = pattern.confidenceScore >= minConfidence;
        const meetsDirection = !direction || pattern.direction.toLowerCase() === direction.toLowerCase();
        return meetsConfidence && meetsDirection;
      });
      
      // Sort by confidence score (highest first)
      recommendations.sort((a, b) => b.confidenceScore - a.confidenceScore);
      
      return recommendations;
    } catch (error) {
      console.error('Error getting day trading recommendations:', error);
      return [];
    }
  }
  
  /**
   * Get high-confidence stock recommendations for swing trading
   * @param minConfidence Minimum confidence score (0-100)
   * @param direction Optional direction filter ('bullish', 'bearish', or undefined for both)
   * @returns Promise with swing trading recommendations
   */
  async getSwingTradingRecommendations(
    minConfidence: number = 80,
    direction?: 'bullish' | 'bearish'
  ): Promise<PatternData[]> {
    try {
      console.log(`Getting swing trading recommendations (min confidence: ${minConfidence}, direction: ${direction || 'all'})`);
      
      // Use swing trading universe
      const symbols = stockUniverses.swingTradingUniverse;
      
      // Use appropriate timeframes for swing trading
      const timeframes = ['1h', '4h', '1d', '1w'];
      
      // Scan symbols for patterns
      const patternsBySymbol = await patternDetectionManager.scanMultipleSymbols(symbols, timeframes);
      
      // Flatten patterns from all symbols
      let allPatterns: PatternData[] = [];
      for (const symbol in patternsBySymbol) {
        allPatterns = allPatterns.concat(patternsBySymbol[symbol]);
      }
      
      // Filter by confidence and direction
      const recommendations = allPatterns.filter(pattern => {
        const meetsConfidence = pattern.confidenceScore >= minConfidence;
        const meetsDirection = !direction || pattern.direction.toLowerCase() === direction.toLowerCase();
        const isSwingTimeframe = ['4h', '1d', '1w'].includes(pattern.timeframe);
        const hasSufficientProfit = pattern.potentialProfit >= 5.0; // Ensure at least 5% profit potential
        return meetsConfidence && meetsDirection && isSwingTimeframe && hasSufficientProfit;
      });
      
      // Sort by confidence score (highest first)
      recommendations.sort((a, b) => b.confidenceScore - a.confidenceScore);
      
      return recommendations;
    } catch (error) {
      console.error('Error getting swing trading recommendations:', error);
      return [];
    }
  }
  
  /**
   * Get highest-confidence stock recommendations across all timeframes (Golden Scanner)
   * @param minConfidence Minimum confidence score (0-100)
   * @param direction Optional direction filter ('bullish', 'bearish', or undefined for both)
   * @returns Promise with golden recommendations
   */
  async getGoldenRecommendations(
    minConfidence: number = 90,
    direction?: 'bullish' | 'bearish'
  ): Promise<PatternData[]> {
    try {
      console.log(`Getting golden recommendations (min confidence: ${minConfidence}, direction: ${direction || 'all'})`);
      
      // Combine day and swing trading universes for golden scanner
      const symbols = [...new Set([...stockUniverses.dayTradingUniverse, ...stockUniverses.swingTradingUniverse])];
      
      // Use all timeframes
      const timeframes = ['15m', '30m', '1h', '4h', '1d'];
      
      // Scan symbols for patterns
      const patternsBySymbol = await patternDetectionManager.scanMultipleSymbols(symbols, timeframes);
      
      // Flatten patterns from all symbols
      let allPatterns: PatternData[] = [];
      for (const symbol in patternsBySymbol) {
        allPatterns = allPatterns.concat(patternsBySymbol[symbol]);
      }
      
      // Filter by confidence, direction, and multi-timeframe confirmation
      const recommendations = allPatterns.filter(pattern => {
        const meetsConfidence = pattern.confidenceScore >= minConfidence;
        const meetsDirection = !direction || pattern.direction.toLowerCase() === direction.toLowerCase();
        const hasMultiTimeframeConfirmation = pattern.multiTimeframeConfirmation;
        const hasSufficientProfit = pattern.potentialProfit >= 5.0; // Ensure at least 5% profit potential
        return meetsConfidence && meetsDirection && hasMultiTimeframeConfirmation && hasSufficientProfit;
      });
      
      // Sort by confidence score (highest first)
      recommendations.sort((a, b) => b.confidenceScore - a.confidenceScore);
      
      return recommendations;
    } catch (error) {
      console.error('Error getting golden recommendations:', error);
      return [];
    }
  }
  
  /**
   * Get recommendations for all scanner modes
   * @param minConfidence Minimum confidence score (0-100)
   * @param direction Optional direction filter ('bullish', 'bearish', or undefined for both)
   * @returns Promise with recommendations for all scanner modes
   */
  async getAllRecommendations(
    minConfidence: number = 80,
    direction?: 'bullish' | 'bearish'
  ): Promise<Record<string, PatternData[]>> {
    try {
      // Get recommendations for each scanner mode
      const [dayTrading, swingTrading, golden] = await Promise.all([
        this.getDayTradingRecommendations(minConfidence, direction),
        this.getSwingTradingRecommendations(minConfidence, direction),
        this.getGoldenRecommendations(Math.max(minConfidence, 90), direction)
      ]);
      
      return {
        dayTrading,
        swingTrading,
        golden
      };
    } catch (error) {
      console.error('Error getting all recommendations:', error);
      return {
        dayTrading: [],
        swingTrading: [],
        golden: []
      };
    }
  }
  
  /**
   * Get detailed information for a specific stock
   * @param symbol Stock symbol
   * @returns Promise with detailed stock information
   */
  async getStockDetails(symbol: string): Promise<any> {
    try {
      // Get current price
      const currentPrice = await realTimeDataService.getCurrentPrice(symbol);
      
      // Scan for patterns across all timeframes
      const timeframes = ['15m', '30m', '1h', '4h', '1d', '1w'];
      const patterns = await patternDetectionManager.scanSymbol(symbol, timeframes);
      
      // Group patterns by timeframe
      const patternsByTimeframe: Record<string, PatternData[]> = {};
      for (const timeframe of timeframes) {
        patternsByTimeframe[timeframe] = patterns.filter(p => p.timeframe === timeframe);
      }
      
      return {
        symbol,
        currentPrice,
        patterns,
        patternsByTimeframe
      };
    } catch (error) {
      console.error(`Error getting details for ${symbol}:`, error);
      return {
        symbol,
        currentPrice: 0,
        patterns: [],
        patternsByTimeframe: {}
      };
    }
  }
  
  /**
   * Get backtest statistics for a specific pattern type
   * @param patternType Pattern type to get statistics for
   * @returns Promise with backtest statistics
   */
  async getBacktestStats(patternType: string): Promise<any> {
    try {
      // Mock backtest statistics (would be replaced with actual backtest data)
      const backtestStats = {
        patternType,
        overallWinRate: 76.8,
        profitFactor: 3.12,
        averageCandlesToBreakout: {
          '15m': 5.2,
          '30m': 4.3,
          '1h': 3.9,
          '4h': 3.2,
          '1d': 2.5,
          '1w': 1.8
        },
        winRateByTimeframe: {
          '15m': 65.4,
          '30m': 68.7,
          '1h': 72.3,
          '4h': 74.5,
          '1d': 76.8,
          '1w': 79.5
        }
      };
      
      return backtestStats;
    } catch (error) {
      console.error(`Error getting backtest stats for ${patternType}:`, error);
      return {
        patternType,
        overallWinRate: 0,
        profitFactor: 0,
        averageCandlesToBreakout: {},
        winRateByTimeframe: {}
      };
    }
  }
}

// Export singleton instance
export const stockRecommendationService = new StockRecommendationService();

// Export types
export type { StockRecommendationService };
