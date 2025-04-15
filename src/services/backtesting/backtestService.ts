import { PatternData } from '@/services/types/patternTypes';
import { BacktestResult } from '@/services/types/backtestTypes';
import MarketDataService from '@/services/api/marketData/dataService';
import { ensureDateString } from '@/utils/dateUtils';
import { ensureBacktestDirection } from '@/utils/typeSafetyHelpers';
import { processPolygonDataForBacktest } from '@/services/api/marketData/polygon/dataTransformer';
import { stockUniverses } from '@/services/api/marketData/stockUniverses';
import { backtestPatternsWithPolygon } from './polygonBacktestService';
import { supabaseClient } from '../supabase/supabaseClient';
import { 
  BacktestFilter, 
  BacktestStatistics,
  BacktestAnalyticsResponse,
  BacktestPatternPerformance,
  BacktestTimeframePerformance,
  BacktestSymbolPerformance,
  BacktestHistoricalPerformance,
  BacktestPerformanceTrend
} from '../types/backtestTypes';

// Create an instance of MarketDataService
const marketDataService = new MarketDataService();

/**
 * Run backtest on patterns using real historical data with fallback mechanisms
 */
export const runBacktest = async (
  patterns: PatternData[],
  historicalYears: number = 1,
  apiKey?: string
): Promise<BacktestResult[]> => {
  try {
    console.log(`Running backtest for ${patterns.length} patterns using Polygon.io...`);
    
    // First attempt with Polygon (preferred data source)
    const polygonResults = await backtestPatternsWithPolygon(
      patterns, 
      false, 
      apiKey ? true : false
    );
    
    if (polygonResults && polygonResults.length > 0) {
      console.log(`Successfully backtested ${polygonResults.length} patterns with Polygon data`);
      return polygonResults;
    }
    
    // Fallback to legacy implementation
    console.warn("Polygon backtest failed or returned no results, falling back to legacy implementation");
    return runLegacyBacktest(patterns, historicalYears, apiKey);
  } catch (error) {
    console.error("Error running Polygon backtest:", error);
    console.warn("Falling back to legacy implementation");
    return runLegacyBacktest(patterns, historicalYears, apiKey);
  }
};

/**
 * Legacy backtest implementation (fallback method)
 */
const runLegacyBacktest = async (
  patterns: PatternData[],
  historicalYears: number = 1,
  apiKey?: string
): Promise<BacktestResult[]> => {
  const results: BacktestResult[] = [];
  
  for (const pattern of patterns) {
    try {
      // Calculate the end date (when the pattern was created)
      const patternCreationDate = new Date(pattern.createdAt);
      
      // Determine if this is a swing trading test (based on symbol and/or timeframe)
      const isSwingTest = stockUniverses.swingTradingUniverse.includes(pattern.symbol) || 
                         ['4h', '1d', 'daily', 'weekly'].includes(pattern.timeframe);
      
      // For swing tests, limit to 6 months to speed up testing
      const yearsToFetch = isSwingTest ? 0.5 : historicalYears;
      
      // Calculate start date based on historical years parameter
      const startDate = new Date(patternCreationDate);
      startDate.setFullYear(startDate.getFullYear() - Math.floor(yearsToFetch));
      
      // For partial years, adjust months accordingly
      const fractionalYearMonths = Math.round((yearsToFetch % 1) * 12);
      startDate.setMonth(startDate.getMonth() - fractionalYearMonths);
      
      // Use marketDataService to fetch candles
      const response = await marketDataService.fetchCandles(
        pattern.symbol,
        pattern.timeframe,
        1000, // Get enough data points for a good backtest
        ensureDateString(startDate),
        ensureDateString(patternCreationDate),
        true // Force refresh to get the most accurate data
      );
      
      if (!response.candles || response.candles.length === 0) {
        console.warn(`No historical data found for ${pattern.symbol}`);
        continue;
      }
      
      // Process the data for backtesting
      const processedData = response.candles.map(candle => ({
        date: new Date(candle.timestamp).toISOString(),
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
        rsi: candle.rsi14,
        atr: candle.atr14
      }));
      
      // Find entry point index (closest to pattern creation date)
      const entryPointIndex = findClosestDateIndex(
        processedData,
        patternCreationDate
      );
      
      if (entryPointIndex === -1) {
        console.warn(`Could not find entry point for ${pattern.symbol}`);
        continue;
      }
      
      // Run the actual backtest using entry price and target
      const result = performBacktest(
        pattern,
        processedData,
        entryPointIndex
      );
      
      // Add data source information
      result.dataSource = 'legacy';
      
      results.push(result);
    } catch (error) {
      console.error(`Error backtesting pattern ${pattern.id}:`, error);
    }
  }
  
  return results;
};

/**
 * Find the index of the closest date in historical data
 */
const findClosestDateIndex = (historicalData: any[], targetDate: Date): number => {
  if (!historicalData || historicalData.length === 0) return -1;
  
  const targetTime = targetDate.getTime();
  
  let closestIndex = 0;
  let closestDiff = Math.abs(new Date(historicalData[0].date).getTime() - targetTime);
  
  for (let i = 1; i < historicalData.length; i++) {
    const currentTime = new Date(historicalData[i].date).getTime();
    const diff = Math.abs(currentTime - targetTime);
    
    if (diff < closestDiff) {
      closestDiff = diff;
      closestIndex = i;
    }
  }
  
  return closestIndex;
};

/**
 * Perform actual backtest logic with real price data
 */
const performBacktest = (
  pattern: PatternData,
  historicalData: any[],
  entryPointIndex: number
): BacktestResult => {
  // Extract pattern information
  const entryPrice = pattern.entryPrice;
  const targetPrice = pattern.targetPrice;
  const stopLoss = pattern.stopLoss || (pattern.entryPrice * 0.95); // Default 5% stop loss
  const direction = pattern.direction;
  
  // Setup tracking variables
  let exitIndex = -1;
  let exitPrice = entryPrice;
  let successful = false;
  let maxDrawdown = 0;
  let currentDrawdown = 0;
  let candlesToBreakout = 0;
  
  // Loop through data starting from entry point
  for (let i = entryPointIndex + 1; i < historicalData.length; i++) {
    const bar = historicalData[i];
    
    // Calculate current drawdown
    if (direction === "bullish") {
      currentDrawdown = (entryPrice - Math.min(bar.low, entryPrice)) / entryPrice * 100;
    } else {
      currentDrawdown = (Math.max(bar.high, entryPrice) - entryPrice) / entryPrice * 100;
    }
    
    // Update max drawdown
    maxDrawdown = Math.max(maxDrawdown, currentDrawdown);
    
    // Check for target hit
    if (direction === "bullish" && bar.high >= targetPrice) {
      exitIndex = i;
      exitPrice = targetPrice;
      successful = true;
      break;
    } else if (direction === "bearish" && bar.low <= targetPrice) {
      exitIndex = i;
      exitPrice = targetPrice;
      successful = true;
      break;
    }
    
    // Check for stop loss hit
    if (direction === "bullish" && bar.low <= stopLoss) {
      exitIndex = i;
      exitPrice = stopLoss;
      break;
    } else if (direction === "bearish" && bar.high >= stopLoss) {
      exitIndex = i;
      exitPrice = stopLoss;
      break;
    }
    
    // If we've gone through 30 bars and no exit, force exit at current close
    if (i - entryPointIndex >= 30) {
      exitIndex = i;
      exitPrice = bar.close;
      successful = direction === "bullish" ? 
        bar.close > entryPrice : 
        bar.close < entryPrice;
      break;
    }
  }
  
  // If we never hit target or stop, exit at the last bar
  if (exitIndex === -1 && historicalData.length > entryPointIndex) {
    exitIndex = historicalData.length - 1;
    exitPrice = historicalData[exitIndex].close;
    successful = direction === "bullish" ? 
      exitPrice > entryPrice : 
      exitPrice < entryPrice;
  }
  
  // Calculate profit/loss
  const profitLoss = direction === "bullish" ? 
    exitPrice - entryPrice : 
    entryPrice - exitPrice;
  
  const profitLossPercent = (profitLoss / entryPrice) * 100;
  
  // Calculate candles to breakout
  candlesToBreakout = exitIndex - entryPointIndex;
  
  const entryDate = historicalData[entryPointIndex]?.date || pattern.createdAt;
  const exitDate = exitIndex !== -1 ? 
    historicalData[exitIndex]?.date : 
    new Date().toISOString();
  
  // Ensure direction is valid for BacktestResult
  const predictedDir = direction as "bullish" | "bearish";
  const oppositeDir = predictedDir === "bullish" ? "bearish" : "bullish";
  
  return {
    patternId: pattern.id,
    symbol: pattern.symbol,
    patternType: pattern.patternType,
    timeframe: pattern.timeframe,
    entryPrice: entryPrice,
    targetPrice: targetPrice,
    stopLoss: stopLoss,
    entryDate: ensureDateString(entryDate),
    exitDate: ensureDateString(exitDate),
    actualExitPrice: exitPrice,
    profitLossPercent: profitLossPercent,
    candlesToBreakout: candlesToBreakout,
    successful: successful,
    predictedDirection: predictedDir,
    actualDirection: successful ? predictedDir : oppositeDir,
    profitLoss: profitLoss,
    maxDrawdown: maxDrawdown,
    // Add technical indicators if available
    rsiAtEntry: historicalData[entryPointIndex]?.rsi,
    atrAtEntry: historicalData[entryPointIndex]?.atr,
    confidenceScore: pattern.confidenceScore || 0
  };
};

/**
 * Backtesting API that uses multiple data sources with fallback mechanisms
 */
export const backtestPatterns = async (
  patterns: PatternData[],
  includeDetails: boolean = false,
  apiKey?: string,
  isPremium?: boolean
): Promise<BacktestResult[]> => {
  return runBacktest(patterns, isPremium ? 2 : 1, apiKey);
};

/**
 * Fetch backtest results from Supabase with optional filtering
 */
export const fetchBacktestResults = async (
  filters: BacktestFilter = {},
  page = 0,
  limit = 50
): Promise<{ results: BacktestResult[]; total: number }> => {
  let query = supabaseClient
    .from('backtest_results')
    .select('*', { count: 'exact' });

  // Apply filters
  if (filters.symbol) {
    query = query.ilike('symbol', `%${filters.symbol}%`);
  }
  if (filters.patternType) {
    query = query.eq('pattern_type', filters.patternType);
  }
  if (filters.direction) {
    query = query.eq('direction', filters.direction);
  }
  if (filters.timeframe) {
    query = query.eq('timeframe', filters.timeframe);
  }
  if (filters.minConfidence !== undefined) {
    query = query.gte('confidence_score', filters.minConfidence);
  }
  if (filters.maxConfidence !== undefined) {
    query = query.lte('confidence_score', filters.maxConfidence);
  }
  if (filters.dateStart) {
    query = query.gte('entry_date', new Date(filters.dateStart).toISOString());
  }
  if (filters.dateEnd) {
    query = query.lte('entry_date', new Date(filters.dateEnd).toISOString());
  }
  if (filters.result) {
    query = query.eq('result', filters.result);
  }
  if (filters.minProfitPercentage !== undefined) {
    query = query.gte('profit_percentage', filters.minProfitPercentage);
  }
  if (filters.maxProfitPercentage !== undefined) {
    query = query.lte('profit_percentage', filters.maxProfitPercentage);
  }

  // Pagination
  const { data, error, count } = await query
    .order('entry_date', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  if (error) {
    console.error('Error fetching backtest results:', error);
    throw error;
  }

  return {
    results: data as BacktestResult[],
    total: count || 0
  };
};

/**
 * Fetch backtest statistics
 */
export const fetchBacktestStatistics = async (
  filters: BacktestFilter = {}
): Promise<BacktestStatistics> => {
  // First get filtered results to calculate statistics
  const { results } = await fetchBacktestResults(filters, 0, 1000);
  
  if (results.length === 0) {
    return {
      totalTrades: 0,
      winRate: 0,
      profitFactor: 0,
      averageWin: 0,
      averageLoss: 0,
      largestWin: 0,
      largestLoss: 0,
      expectancy: 0,
      maxDrawdown: 0,
      averageDaysInTrade: 0,
      averageRMultiple: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0
    };
  }

  // Calculate statistics
  const wins = results.filter(r => r.result === 'win');
  const losses = results.filter(r => r.result === 'loss');
  
  const winRate = wins.length / results.length;
  
  const totalProfit = wins.reduce((sum, trade) => sum + trade.profit_percentage, 0);
  const totalLoss = Math.abs(losses.reduce((sum, trade) => sum + trade.profit_percentage, 0));
  
  const profitFactor = totalLoss === 0 ? totalProfit : totalProfit / totalLoss;
  
  const averageWin = wins.length > 0 ? totalProfit / wins.length : 0;
  const averageLoss = losses.length > 0 ? totalLoss / losses.length : 0;
  
  const largestWin = wins.length > 0 ? Math.max(...wins.map(w => w.profit_percentage)) : 0;
  const largestLoss = losses.length > 0 ? Math.min(...losses.map(l => l.profit_percentage)) : 0;
  
  const expectancy = (winRate * averageWin) - ((1 - winRate) * averageLoss);

  // Calculate max drawdown using equity curve
  const equityCurve = calculateEquityCurve(results);
  const maxDrawdown = calculateMaxDrawdown(equityCurve);

  // Calculate average days in trade
  const completedTrades = results.filter(r => r.result !== 'pending' && r.exit_date);
  const totalDays = completedTrades.reduce((sum, trade) => {
    const entryDate = new Date(trade.entry_date);
    const exitDate = new Date(trade.exit_date as string);
    const days = Math.floor((exitDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
    return sum + days;
  }, 0);
  const averageDaysInTrade = completedTrades.length > 0 ? totalDays / completedTrades.length : 0;

  // Calculate average R multiple
  const averageRMultiple = results.reduce((sum, trade) => sum + trade.r_multiple, 0) / results.length;

  // Calculate consecutive wins/losses
  let maxConsecutiveWins = 0;
  let maxConsecutiveLosses = 0;
  let currentConsecutiveWins = 0;
  let currentConsecutiveLosses = 0;

  // Sort by entry date
  const sortedResults = [...results].sort((a, b) => 
    new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime()
  );

  for (const trade of sortedResults) {
    if (trade.result === 'win') {
      currentConsecutiveWins++;
      currentConsecutiveLosses = 0;
      if (currentConsecutiveWins > maxConsecutiveWins) {
        maxConsecutiveWins = currentConsecutiveWins;
      }
    } else if (trade.result === 'loss') {
      currentConsecutiveLosses++;
      currentConsecutiveWins = 0;
      if (currentConsecutiveLosses > maxConsecutiveLosses) {
        maxConsecutiveLosses = currentConsecutiveLosses;
      }
    }
  }

  return {
    totalTrades: results.length,
    winRate,
    profitFactor,
    averageWin,
    averageLoss,
    largestWin,
    largestLoss,
    expectancy,
    maxDrawdown,
    averageDaysInTrade,
    averageRMultiple,
    consecutiveWins: maxConsecutiveWins,
    consecutiveLosses: maxConsecutiveLosses
  };
};

/**
 * Fetch comprehensive backtest analytics
 */
export const fetchBacktestAnalytics = async (
  filters: BacktestFilter = {}
): Promise<BacktestAnalyticsResponse> => {
  const { results } = await fetchBacktestResults(filters, 0, 1000);
  const statistics = await fetchBacktestStatistics(filters);
  
  // Calculate historical performance (equity curve)
  const historicalPerformance = calculateHistoricalPerformance(results);
  
  // Calculate pattern performance
  const patternPerformance = calculatePatternPerformance(results);
  
  // Calculate timeframe performance
  const timeframePerformance = calculateTimeframePerformance(results);
  
  // Calculate symbol performance
  const symbolPerformance = calculateSymbolPerformance(results);
  
  // Calculate performance trend by month
  const performanceTrend = calculatePerformanceTrend(results);
  
  return {
    results,
    statistics,
    historicalPerformance,
    patternPerformance,
    timeframePerformance,
    symbolPerformance,
    performanceTrend
  };
};

/**
 * Helper function to calculate equity curve from trades
 */
const calculateEquityCurve = (results: BacktestResult[]): { date: string; equity: number }[] => {
  // Sort by entry date
  const sortedResults = [...results].sort((a, b) => 
    new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime()
  );
  
  let equity = 100; // Start with 100 units
  const equityCurve: { date: string; equity: number }[] = [];
  
  // Add initial point
  if (sortedResults.length > 0) {
    equityCurve.push({
      date: sortedResults[0].entry_date,
      equity
    });
  }
  
  // Add equity point for each trade
  for (const trade of sortedResults) {
    // Skip pending trades
    if (trade.result === 'pending') continue;
    
    // Update equity based on profit/loss
    equity = equity * (1 + trade.profit_percentage / 100);
    
    // Add point to equity curve
    equityCurve.push({
      date: trade.exit_date || trade.entry_date,
      equity
    });
  }
  
  return equityCurve;
};

/**
 * Calculate maximum drawdown from equity curve
 */
const calculateMaxDrawdown = (equityCurve: { date: string; equity: number }[]): number => {
  let maxDrawdown = 0;
  let peak = 0;
  
  for (let i = 0; i < equityCurve.length; i++) {
    if (equityCurve[i].equity > peak) {
      peak = equityCurve[i].equity;
    }
    
    const drawdown = (peak - equityCurve[i].equity) / peak;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }
  
  return maxDrawdown;
};

/**
 * Calculate historical performance including equity curve and drawdown
 */
const calculateHistoricalPerformance = (results: BacktestResult[]): BacktestHistoricalPerformance[] => {
  // Sort by entry date
  const sortedResults = [...results].sort((a, b) => 
    new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime()
  );
  
  if (sortedResults.length === 0) return [];
  
  // Group trades by month
  const tradesByMonth: Record<string, BacktestResult[]> = {};
  
  for (const trade of sortedResults) {
    const date = new Date(trade.entry_date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!tradesByMonth[monthKey]) {
      tradesByMonth[monthKey] = [];
    }
    
    tradesByMonth[monthKey].push(trade);
  }
  
  // Calculate performance for each month
  const performance: BacktestHistoricalPerformance[] = [];
  let cumulativeEquity = 100; // Starting with 100 units
  let highWaterMark = cumulativeEquity;
  
  for (const [month, trades] of Object.entries(tradesByMonth)) {
    const completedTrades = trades.filter(t => t.result !== 'pending');
    const wins = completedTrades.filter(t => t.result === 'win');
    
    // Calculate month's P&L
    let monthProfit = 0;
    for (const trade of completedTrades) {
      monthProfit += trade.profit_percentage;
    }
    
    // Update equity
    cumulativeEquity = cumulativeEquity * (1 + monthProfit / 100);
    
    // Update high water mark and calculate drawdown
    highWaterMark = Math.max(highWaterMark, cumulativeEquity);
    const drawdown = (highWaterMark - cumulativeEquity) / highWaterMark;
    
    performance.push({
      date: month,
      equity: cumulativeEquity,
      drawdown,
      trades: completedTrades.length,
      winRate: completedTrades.length > 0 ? wins.length / completedTrades.length : 0
    });
  }
  
  return performance;
};

/**
 * Calculate performance metrics by pattern type
 */
const calculatePatternPerformance = (results: BacktestResult[]): BacktestPatternPerformance[] => {
  // Group trades by pattern type
  const tradesByPattern: Record<string, BacktestResult[]> = {};
  
  for (const trade of results) {
    if (!tradesByPattern[trade.pattern_type]) {
      tradesByPattern[trade.pattern_type] = [];
    }
    
    tradesByPattern[trade.pattern_type].push(trade);
  }
  
  // Calculate performance for each pattern type
  const performance: BacktestPatternPerformance[] = [];
  
  for (const [pattern, trades] of Object.entries(tradesByPattern)) {
    const completedTrades = trades.filter(t => t.result !== 'pending');
    const wins = completedTrades.filter(t => t.result === 'win');
    const losses = completedTrades.filter(t => t.result === 'loss');
    
    const winRate = completedTrades.length > 0 ? wins.length / completedTrades.length : 0;
    
    const totalProfit = wins.reduce((sum, trade) => sum + trade.profit_percentage, 0);
    const totalLoss = Math.abs(losses.reduce((sum, trade) => sum + trade.profit_percentage, 0));
    
    const profitFactor = totalLoss === 0 ? totalProfit : totalProfit / totalLoss;
    
    const avgProfit = wins.length > 0 ? totalProfit / wins.length : 0;
    const avgLoss = losses.length > 0 ? totalLoss / losses.length : 0;
    
    const expectancy = (winRate * avgProfit) - ((1 - winRate) * avgLoss);
    
    performance.push({
      pattern_type: pattern,
      total_trades: completedTrades.length,
      win_count: wins.length,
      loss_count: losses.length,
      win_rate: winRate,
      avg_profit: avgProfit,
      avg_loss: avgLoss,
      profit_factor: profitFactor,
      expectancy
    });
  }
  
  // Sort by expectancy descending
  return performance.sort((a, b) => b.expectancy - a.expectancy);
};

/**
 * Calculate performance metrics by timeframe
 */
const calculateTimeframePerformance = (results: BacktestResult[]): BacktestTimeframePerformance[] => {
  // Group trades by timeframe
  const tradesByTimeframe: Record<string, BacktestResult[]> = {};
  
  for (const trade of results) {
    if (!tradesByTimeframe[trade.timeframe]) {
      tradesByTimeframe[trade.timeframe] = [];
    }
    
    tradesByTimeframe[trade.timeframe].push(trade);
  }
  
  // Calculate performance for each timeframe
  const performance: BacktestTimeframePerformance[] = [];
  
  for (const [timeframe, trades] of Object.entries(tradesByTimeframe)) {
    const completedTrades = trades.filter(t => t.result !== 'pending');
    const wins = completedTrades.filter(t => t.result === 'win');
    const losses = completedTrades.filter(t => t.result === 'loss');
    
    const winRate = completedTrades.length > 0 ? wins.length / completedTrades.length : 0;
    
    const totalProfit = wins.reduce((sum, trade) => sum + trade.profit_percentage, 0);
    const totalLoss = Math.abs(losses.reduce((sum, trade) => sum + trade.profit_percentage, 0));
    
    const profitFactor = totalLoss === 0 ? totalProfit : totalProfit / totalLoss;
    
    const avgProfit = completedTrades.length > 0 ? 
      completedTrades.reduce((sum, t) => sum + t.profit_percentage, 0) / completedTrades.length : 0;
    
    // Calculate average days held
    const tradesWithDates = completedTrades.filter(t => t.exit_date);
    let totalDays = 0;
    
    for (const trade of tradesWithDates) {
      const entryDate = new Date(trade.entry_date);
      const exitDate = new Date(trade.exit_date as string);
      const days = Math.floor((exitDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
      totalDays += days;
    }
    
    const avgDaysHeld = tradesWithDates.length > 0 ? totalDays / tradesWithDates.length : 0;
    
    performance.push({
      timeframe,
      total_trades: completedTrades.length,
      win_count: wins.length,
      loss_count: losses.length,
      win_rate: winRate,
      avg_profit: avgProfit,
      avg_days_held: avgDaysHeld,
      profit_factor: profitFactor
    });
  }
  
  // Sort by win rate descending
  return performance.sort((a, b) => b.win_rate - a.win_rate);
};

/**
 * Calculate performance metrics by symbol
 */
const calculateSymbolPerformance = (results: BacktestResult[]): BacktestSymbolPerformance[] => {
  // Group trades by symbol
  const tradesBySymbol: Record<string, BacktestResult[]> = {};
  
  for (const trade of results) {
    if (!tradesBySymbol[trade.symbol]) {
      tradesBySymbol[trade.symbol] = [];
    }
    
    tradesBySymbol[trade.symbol].push(trade);
  }
  
  // Calculate performance for each symbol
  const performance: BacktestSymbolPerformance[] = [];
  
  for (const [symbol, trades] of Object.entries(tradesBySymbol)) {
    const completedTrades = trades.filter(t => t.result !== 'pending');
    const wins = completedTrades.filter(t => t.result === 'win');
    const losses = completedTrades.filter(t => t.result === 'loss');
    
    const winRate = completedTrades.length > 0 ? wins.length / completedTrades.length : 0;
    
    const totalProfit = wins.reduce((sum, trade) => sum + trade.profit_percentage, 0);
    const totalLoss = Math.abs(losses.reduce((sum, trade) => sum + trade.profit_percentage, 0));
    
    const profitFactor = totalLoss === 0 ? totalProfit : totalProfit / totalLoss;
    
    const avgProfit = completedTrades.length > 0 ? 
      completedTrades.reduce((sum, t) => sum + t.profit_percentage, 0) / completedTrades.length : 0;
    
    // Find best performing pattern for this symbol
    const patternPerformance: Record<string, { wins: number; trades: number }> = {};
    
    for (const trade of completedTrades) {
      if (!patternPerformance[trade.pattern_type]) {
        patternPerformance[trade.pattern_type] = { wins: 0, trades: 0 };
      }
      
      patternPerformance[trade.pattern_type].trades++;
      if (trade.result === 'win') {
        patternPerformance[trade.pattern_type].wins++;
      }
    }
    
    let bestPattern = '';
    let bestWinRate = 0;
    let minTrades = 3; // Minimum trades to consider a pattern
    
    for (const [pattern, stats] of Object.entries(patternPerformance)) {
      if (stats.trades >= minTrades) {
        const patternWinRate = stats.wins / stats.trades;
        if (patternWinRate > bestWinRate) {
          bestWinRate = patternWinRate;
          bestPattern = pattern;
        }
      }
    }
    
    performance.push({
      symbol,
      total_trades: completedTrades.length,
      win_count: wins.length,
      loss_count: losses.length,
      win_rate: winRate,
      avg_profit: avgProfit,
      profit_factor: profitFactor,
      best_pattern: bestPattern
    });
  }
  
  // Sort by profit factor descending
  return performance.sort((a, b) => b.profit_factor - a.profit_factor);
};

/**
 * Calculate performance trend by month
 */
const calculatePerformanceTrend = (results: BacktestResult[]): BacktestPerformanceTrend[] => {
  // Group trades by month
  const tradesByMonth: Record<string, BacktestResult[]> = {};
  
  for (const trade of results) {
    const date = new Date(trade.entry_date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!tradesByMonth[monthKey]) {
      tradesByMonth[monthKey] = [];
    }
    
    tradesByMonth[monthKey].push(trade);
  }
  
  // Calculate performance for each month
  const trend: BacktestPerformanceTrend[] = [];
  
  for (const [month, trades] of Object.entries(tradesByMonth)) {
    const completedTrades = trades.filter(t => t.result !== 'pending');
    const wins = completedTrades.filter(t => t.result === 'win');
    
    const winRate = completedTrades.length > 0 ? wins.length / completedTrades.length : 0;
    
    const totalProfit = wins.reduce((sum, trade) => sum + trade.profit_percentage, 0);
    const totalLoss = Math.abs(completedTrades
      .filter(t => t.result === 'loss')
      .reduce((sum, trade) => sum + trade.profit_percentage, 0));
    
    const profitFactor = totalLoss === 0 ? totalProfit : totalProfit / totalLoss;
    
    const avgProfit = completedTrades.length > 0 ? 
      completedTrades.reduce((sum, t) => sum + t.profit_percentage, 0) / completedTrades.length : 0;
    
    trend.push({
      month,
      trades: completedTrades.length,
      win_rate: winRate,
      profit_factor: profitFactor,
      avg_profit: avgProfit
    });
  }
  
  // Sort by month ascending
  return trend.sort((a, b) => a.month.localeCompare(b.month));
};
