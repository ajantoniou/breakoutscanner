import axios from 'axios';
import { PatternData } from '../types/patternTypes';

interface HistoricalBar {
  c: number; // close
  h: number; // high
  l: number; // low
  o: number; // open
  t: number; // timestamp in milliseconds
  v: number; // volume
}

interface BacktestResult {
  patternId: string;
  symbol: string;
  patternType: string;
  entryDate: string;
  entryPrice: number;
  exitDate: string | null;
  exitPrice: number | null;
  stopHit: boolean;
  targetHit: boolean;
  invalidated: boolean;
  pnl: number | null;
  pnlPercent: number | null;
  holdingPeriod: number | null; // in days
}

export class BacktestingService {
  private apiKey: string;
  private baseUrl = 'https://api.polygon.io';
  private requestsThisMinute = 0;
  private lastRequestMinute = 0;
  private readonly MAX_REQUESTS_PER_MINUTE = 5; // Adjust based on your API tier

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Run backtest on a specific pattern using real historical data
   */
  async backtest(pattern: PatternData): Promise<BacktestResult> {
    try {
      // Convert timeframe to milliseconds for data fetch
      const timeframeInMillis = this.timeframeToMilliseconds(pattern.timeframe);
      const patternDate = new Date(pattern.created_at);
      
      // Set end date to 30 days after pattern or today, whichever is earlier
      const today = new Date();
      const endDate = new Date(patternDate);
      endDate.setDate(endDate.getDate() + 30);
      const finalEndDate = endDate > today ? today : endDate;
      
      // Fetch data from pattern date to end date
      const bars = await this.fetchHistoricalData(
        pattern.symbol,
        patternDate,
        finalEndDate,
        timeframeInMillis
      );
      
      if (!bars || bars.length === 0) {
        throw new Error(`No historical data found for ${pattern.symbol}`);
      }
      
      return this.processBacktestResults(pattern, bars);
    } catch (error) {
      console.error(`Backtest failed for pattern ${pattern.id}:`, error);
      throw error;
    }
  }

  /**
   * Batch backtest multiple patterns and return aggregate statistics
   */
  async batchBacktest(patterns: PatternData[]): Promise<{
    results: BacktestResult[];
    winRate: number;
    averagePnl: number;
    averageHoldingPeriod: number;
    profitFactor: number;
  }> {
    const results: BacktestResult[] = [];
    
    for (const pattern of patterns) {
      try {
        const result = await this.backtest(pattern);
        results.push(result);
      } catch (error) {
        console.error(`Skipping pattern ${pattern.id} due to error:`, error);
        // Continue with other patterns
      }
    }
    
    // Calculate aggregate statistics
    const validResults = results.filter(r => r.exitPrice !== null);
    const winningTrades = validResults.filter(r => (r.pnl || 0) > 0);
    const losingTrades = validResults.filter(r => (r.pnl || 0) < 0);
    
    const winRate = validResults.length > 0 
      ? winningTrades.length / validResults.length 
      : 0;
      
    const averagePnl = validResults.length > 0 
      ? validResults.reduce((sum, r) => sum + (r.pnlPercent || 0), 0) / validResults.length 
      : 0;
      
    const averageHoldingPeriod = validResults.length > 0 
      ? validResults.reduce((sum, r) => sum + (r.holdingPeriod || 0), 0) / validResults.length 
      : 0;
      
    const totalWinAmount = winningTrades.reduce((sum, r) => sum + (r.pnl || 0), 0);
    const totalLossAmount = Math.abs(losingTrades.reduce((sum, r) => sum + (r.pnl || 0), 0));
    const profitFactor = totalLossAmount > 0 ? totalWinAmount / totalLossAmount : 0;
    
    return {
      results,
      winRate,
      averagePnl,
      averageHoldingPeriod,
      profitFactor
    };
  }

  /**
   * Generate a backtest report with detailed statistics and visualizations
   */
  generateReport(results: BacktestResult[]) {
    // Implement report generation
    // This would typically create visualizations, tables, etc.
    // For now we'll return basic statistics
    
    const validResults = results.filter(r => r.exitPrice !== null);
    if (validResults.length === 0) return { error: "No valid results to report" };
    
    const byPatternType: Record<string, BacktestResult[]> = {};
    validResults.forEach(result => {
      if (!byPatternType[result.patternType]) {
        byPatternType[result.patternType] = [];
      }
      byPatternType[result.patternType].push(result);
    });
    
    const patternTypeStats = Object.entries(byPatternType).map(([type, results]) => {
      const winningTrades = results.filter(r => (r.pnl || 0) > 0);
      return {
        patternType: type,
        count: results.length,
        winRate: winningTrades.length / results.length,
        avgPnlPercent: results.reduce((sum, r) => sum + (r.pnlPercent || 0), 0) / results.length
      };
    });
    
    return {
      totalTrades: validResults.length,
      overallWinRate: validResults.filter(r => (r.pnl || 0) > 0).length / validResults.length,
      avgHoldingPeriod: validResults.reduce((sum, r) => sum + (r.holdingPeriod || 0), 0) / validResults.length,
      byPatternType: patternTypeStats
    };
  }

  /**
   * Fetch historical bar data from Polygon.io API
   */
  private async fetchHistoricalData(
    symbol: string,
    from: Date,
    to: Date,
    timeframeInMillis: number
  ): Promise<HistoricalBar[]> {
    await this.checkRateLimit();
    
    // Convert timeframe to API format (minute, hour, day)
    let timespan = 'minute';
    let multiplier = 1;
    
    if (timeframeInMillis >= 86400000) { // Daily or greater
      timespan = 'day';
      multiplier = Math.floor(timeframeInMillis / 86400000);
    } else if (timeframeInMillis >= 3600000) { // Hourly
      timespan = 'hour';
      multiplier = Math.floor(timeframeInMillis / 3600000);
    } else { // Minutes
      multiplier = Math.max(1, Math.floor(timeframeInMillis / 60000));
    }
    
    const fromStr = this.formatDateForPolygon(from);
    const toStr = this.formatDateForPolygon(to);
    
    try {
      const url = `${this.baseUrl}/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${fromStr}/${toStr}?apiKey=${this.apiKey}`;
      const response = await axios.get(url);
      
      if (response.data.results && Array.isArray(response.data.results)) {
        return response.data.results;
      }
      
      return [];
    } catch (error) {
      console.error(`Failed to fetch historical data for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Process the historical data and determine backtest results
   */
  private processBacktestResults(
    pattern: PatternData,
    bars: HistoricalBar[]
  ): BacktestResult {
    // Skip the first bar as that's our entry point
    const tradeBars = bars.slice(1);
    const result: BacktestResult = {
      patternId: pattern.id,
      symbol: pattern.symbol,
      patternType: pattern.pattern_type,
      entryDate: pattern.created_at,
      entryPrice: pattern.entry_price,
      exitDate: null,
      exitPrice: null,
      stopHit: false,
      targetHit: false,
      invalidated: false,
      pnl: null,
      pnlPercent: null,
      holdingPeriod: null
    };
    
    // Determine if bullish or bearish for target and stop comparison
    const isBullish = pattern.direction === 'bullish';
    
    for (let i = 0; i < tradeBars.length; i++) {
      const bar = tradeBars[i];
      const barDate = new Date(bar.t);
      
      // Check if stop loss was hit
      if ((isBullish && bar.l <= pattern.stop_loss) || 
          (!isBullish && bar.h >= pattern.stop_loss)) {
        result.exitDate = this.formatDate(barDate);
        result.exitPrice = pattern.stop_loss;
        result.stopHit = true;
        break;
      }
      
      // Check if target was hit
      if ((isBullish && bar.h >= pattern.target_price) || 
          (!isBullish && bar.l <= pattern.target_price)) {
        result.exitDate = this.formatDate(barDate);
        result.exitPrice = pattern.target_price;
        result.targetHit = true;
        break;
      }
      
      // If this is the last bar and we haven't exited yet
      if (i === tradeBars.length - 1) {
        result.exitDate = this.formatDate(barDate);
        result.exitPrice = bar.c;
      }
    }
    
    // Calculate P&L if we have an exit price
    if (result.exitPrice !== null) {
      if (isBullish) {
        result.pnl = result.exitPrice - pattern.entry_price;
      } else {
        result.pnl = pattern.entry_price - result.exitPrice;
      }
      result.pnlPercent = (result.pnl / pattern.entry_price) * 100;
      
      // Calculate holding period in days
      if (result.exitDate) {
        const entryDateObj = new Date(pattern.created_at);
        const exitDateObj = new Date(result.exitDate);
        const diffTime = Math.abs(exitDateObj.getTime() - entryDateObj.getTime());
        result.holdingPeriod = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
    }
    
    return result;
  }

  /**
   * Convert timeframe string to milliseconds
   */
  private timeframeToMilliseconds(timeframe: string): number {
    const timeframeMap: Record<string, number> = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000
    };
    
    return timeframeMap[timeframe] || 60 * 60 * 1000; // Default to 1h
  }

  /**
   * Format date for Polygon API (YYYY-MM-DD)
   */
  private formatDateForPolygon(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Format date as ISO string
   */
  private formatDate(date: Date): string {
    return date.toISOString();
  }

  /**
   * Check and enforce API rate limits
   */
  private async checkRateLimit(): Promise<void> {
    const currentMinute = Math.floor(Date.now() / 60000);
    
    if (currentMinute !== this.lastRequestMinute) {
      // Reset counter for new minute
      this.requestsThisMinute = 0;
      this.lastRequestMinute = currentMinute;
    }
    
    if (this.requestsThisMinute >= this.MAX_REQUESTS_PER_MINUTE) {
      // Wait until the next minute
      const waitTime = (60 - (Date.now() % 60000)) + 100; // Add 100ms buffer
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.requestsThisMinute = 0;
      this.lastRequestMinute = Math.floor(Date.now() / 60000);
    }
    
    this.requestsThisMinute++;
  }
} 