import { yahooApiService } from './yahooApiService';
import { realTimeDataService } from '../marketData/realTimeDataService';
import { stockUniverses } from '../marketData/stockUniverses';

/**
 * Service to provide stock recommendations with accurate pricing from Yahoo Finance
 */
class YahooStockRecommendationService {
  /**
   * Get high-confidence stock recommendations for a specific timeframe
   * @param timeframe Timeframe to analyze ('1h', '4h', '1d')
   * @param minConfidence Minimum confidence score (0-100)
   * @param direction Optional direction filter ('bullish', 'bearish', or undefined for both)
   * @returns Promise with stock recommendations
   */
  async getHighConfidenceStocks(
    timeframe: '1h' | '4h' | '1d',
    minConfidence: number = 80,
    direction?: 'bullish' | 'bearish'
  ): Promise<any[]> {
    try {
      // Determine which stock universe to use based on timeframe
      let symbols: string[] = [];
      
      if (timeframe === '1h') {
        // Day trading universe
        symbols = stockUniverses.dayTradingUniverse;
      } else {
        // Swing trading universe
        symbols = stockUniverses.swingTradingUniverse;
      }
      
      // Get real-time prices for all symbols
      const prices = await realTimeDataService.getCurrentPrices(symbols);
      
      // Get pattern detection results (mock for now, will be replaced with actual pattern detection)
      const patterns = await this.mockPatternDetection(symbols, timeframe, prices);
      
      // Filter by confidence and direction
      const recommendations = patterns.filter(pattern => {
        const meetsConfidence = pattern.confidenceScore >= minConfidence;
        const meetsDirection = !direction || pattern.direction.toLowerCase() === direction.toLowerCase();
        return meetsConfidence && meetsDirection;
      });
      
      // Sort by confidence score (highest first)
      recommendations.sort((a, b) => b.confidenceScore - a.confidenceScore);
      
      return recommendations;
    } catch (error) {
      console.error(`Error getting high-confidence stocks for ${timeframe}:`, error);
      return [];
    }
  }
  
  /**
   * Mock pattern detection for testing
   * This will be replaced with actual pattern detection in the future
   * @param symbols Array of stock symbols
   * @param timeframe Timeframe to analyze
   * @param prices Current prices for symbols
   * @returns Promise with mock pattern detection results
   */
  private async mockPatternDetection(
    symbols: string[],
    timeframe: string,
    prices: Record<string, number>
  ): Promise<any[]> {
    // Get batch quotes for additional data
    const quotes = await yahooApiService.getBatchQuotes(symbols);
    
    const patterns: any[] = [];
    
    // Generate mock patterns based on real prices
    for (const symbol of symbols) {
      // Skip symbols with no price data
      if (!prices[symbol] || prices[symbol] === 0) continue;
      
      // Use real price data
      const currentPrice = prices[symbol];
      const quote = quotes[symbol] || {};
      const previousClose = quote.previousClose || currentPrice * 0.99; // Fallback if no previous close
      
      // Randomly determine if this stock has a pattern (about 20% chance)
      if (Math.random() > 0.8) {
        // Determine pattern type and direction
        const patternTypes = ['Bull Flag', 'Bear Flag', 'Ascending Triangle', 'Descending Triangle', 'Channel Breakout'];
        const patternType = patternTypes[Math.floor(Math.random() * patternTypes.length)];
        
        // Determine direction based on pattern type
        let direction = 'Bullish';
        if (patternType === 'Bear Flag' || patternType === 'Descending Triangle') {
          direction = 'Bearish';
        }
        
        // Calculate realistic target and stop loss based on current price and pattern type
        let targetMultiplier = direction === 'Bullish' ? 1.05 : 0.95; // 5% move
        let stopLossMultiplier = direction === 'Bullish' ? 0.98 : 1.02; // 2% stop loss
        
        // Adjust for timeframe
        if (timeframe === '4h') {
          targetMultiplier = direction === 'Bullish' ? 1.08 : 0.92; // 8% move
          stopLossMultiplier = direction === 'Bullish' ? 0.97 : 1.03; // 3% stop loss
        } else if (timeframe === '1d') {
          targetMultiplier = direction === 'Bullish' ? 1.12 : 0.88; // 12% move
          stopLossMultiplier = direction === 'Bullish' ? 0.95 : 1.05; // 5% stop loss
        }
        
        const targetPrice = currentPrice * targetMultiplier;
        const stopLossPrice = currentPrice * stopLossMultiplier;
        
        // Calculate potential profit percentage
        const potentialProfit = direction === 'Bullish' 
          ? ((targetPrice - currentPrice) / currentPrice) * 100
          : ((currentPrice - targetPrice) / currentPrice) * 100;
        
        // Generate random but realistic confidence score
        const confidenceScore = Math.floor(Math.random() * 20) + 80; // 80-99
        
        // Calculate average candles to breakout based on timeframe
        let avgCandlesToBreakout = 0;
        if (timeframe === '1h') {
          avgCandlesToBreakout = Math.floor(Math.random() * 3) + 2; // 2-4 candles
        } else if (timeframe === '4h') {
          avgCandlesToBreakout = Math.floor(Math.random() * 2) + 2; // 2-3 candles
        } else if (timeframe === '1d') {
          avgCandlesToBreakout = Math.floor(Math.random() * 2) + 1; // 1-2 candles
        }
        
        patterns.push({
          symbol,
          patternType,
          direction,
          currentPrice,
          targetPrice,
          stopLossPrice,
          potentialProfit,
          confidenceScore,
          timeframe,
          avgCandlesToBreakout,
          expectedBreakout: this.calculateExpectedBreakout(timeframe, avgCandlesToBreakout)
        });
      }
    }
    
    return patterns;
  }
  
  /**
   * Calculate expected breakout time based on timeframe and average candles to breakout
   * @param timeframe Timeframe to analyze
   * @param avgCandlesToBreakout Average number of candles to breakout
   * @returns Expected breakout description
   */
  private calculateExpectedBreakout(timeframe: string, avgCandlesToBreakout: number): string {
    if (timeframe === '1h') {
      return `Within ${avgCandlesToBreakout} hours`;
    } else if (timeframe === '4h') {
      return `Within ${avgCandlesToBreakout * 4} hours (${Math.ceil(avgCandlesToBreakout * 4 / 24)} trading days)`;
    } else if (timeframe === '1d') {
      return `Within ${avgCandlesToBreakout} trading days`;
    }
    
    return `Unknown`;
  }
  
  /**
   * Get recommendations for all timeframes
   * @param minConfidence Minimum confidence score (0-100)
   * @param direction Optional direction filter ('bullish', 'bearish', or undefined for both)
   * @returns Promise with recommendations for all timeframes
   */
  async getAllTimeframeRecommendations(
    minConfidence: number = 80,
    direction?: 'bullish' | 'bearish'
  ): Promise<Record<string, any[]>> {
    try {
      const timeframes: ('1h' | '4h' | '1d')[] = ['1h', '4h', '1d'];
      
      const results: Record<string, any[]> = {};
      
      // Get recommendations for each timeframe
      for (const timeframe of timeframes) {
        results[timeframe] = await this.getHighConfidenceStocks(timeframe, minConfidence, direction);
      }
      
      return results;
    } catch (error) {
      console.error('Error getting all timeframe recommendations:', error);
      return { '1h': [], '4h': [], '1d': [] };
    }
  }
}

// Export singleton instance
export const yahooStockRecommendationService = new YahooStockRecommendationService();

// Export types
export type { YahooStockRecommendationService };
