import { Candle } from '@/services/types/patternTypes';
import MarketDataService from '@/services/api/marketData/dataService';
import { dayTradingUniverse, swingTradingUniverse } from '@/services/api/marketData/stockUniverses';
import { detectBullFlag } from '@/services/api/marketData/patternDetection/bullFlagDetector';
import { detectBearFlag } from '@/services/api/marketData/patternDetection/bearFlagDetector';
import { detectAscendingTriangle } from '@/services/api/marketData/patternDetection/ascendingTriangleDetector';
import { detectDescendingTriangle } from '@/services/api/marketData/patternDetection/descendingTriangleDetector';
import { detectBreakout, BreakoutData } from '@/services/api/marketData/patternDetection/breakoutDetector';
import { PatternData } from '@/services/types/patternTypes';
import { calculateConfidenceScore } from '@/utils/confidenceScoring';
import { getDateXDaysAgo } from '@/utils/dateUtils';

// Create instances of services
const marketDataService = new MarketDataService();

/**
 * Fetch day trading scanner results
 * @param timeframe Timeframe to scan (e.g., '15m', '30m', '1h')
 * @returns Promise with array of pattern data
 */
export const fetchDayTradingResults = async (timeframe: string): Promise<(PatternData | BreakoutData)[]> => {
  try {
    console.log(`Fetching day trading results for ${timeframe} timeframe`);
    
    // Validate timeframe for day trading
    if (!['1m', '5m', '15m', '30m', '1h'].includes(timeframe)) {
      console.warn(`Invalid timeframe ${timeframe} for day trading, defaulting to 15m`);
      timeframe = '15m';
    }
    
    // Get appropriate date range based on timeframe
    const to = new Date().toISOString().split('T')[0];
    let from;
    
    if (['1m', '5m'].includes(timeframe)) {
      from = getDateXDaysAgo(3); // 3 days for minute timeframes
    } else {
      from = getDateXDaysAgo(10); // 10 days for higher timeframes
    }
    
    // Fetch candles for all symbols in day trading universe
    const candlesBySymbol = await marketDataService.scanMultipleSymbols(
      dayTradingUniverse,
      timeframe,
      120,
      from,
      to
    );
    
    // Detect patterns for each symbol
    const results: (PatternData | BreakoutData)[] = [];
    
    for (const symbol of dayTradingUniverse) {
      const candles = candlesBySymbol[symbol] || [];
      
      if (candles.length < 30) {
        console.warn(`Not enough candles for ${symbol}, skipping pattern detection`);
        continue;
      }
      
      // Get current price
      const currentPrice = await marketDataService.getCurrentPrice(symbol);
      
      // Detect patterns
      const bullFlags = detectBullFlag(symbol, candles, timeframe, currentPrice);
      const bearFlags = detectBearFlag(symbol, candles, timeframe, currentPrice);
      const ascendingTriangles = detectAscendingTriangle(symbol, candles, timeframe, currentPrice);
      const descendingTriangles = detectDescendingTriangle(symbol, candles, timeframe, currentPrice);
      const breakouts = detectBreakout(symbol, candles, timeframe, currentPrice);
      
      // Add all detected patterns to results
      results.push(...bullFlags, ...bearFlags, ...ascendingTriangles, ...descendingTriangles, ...breakouts);
    }
    
    // Sort results by confidence score (descending)
    return results.sort((a, b) => b.confidenceScore - a.confidenceScore);
  } catch (error) {
    console.error('Error fetching day trading results:', error);
    return [];
  }
};

/**
 * Fetch swing trading scanner results
 * @param timeframe Timeframe to scan (e.g., '4h', '1d')
 * @returns Promise with array of pattern data
 */
export const fetchSwingTradingResults = async (timeframe: string): Promise<(PatternData | BreakoutData)[]> => {
  try {
    console.log(`Fetching swing trading results for ${timeframe} timeframe`);
    
    // Validate timeframe for swing trading
    if (!['1h', '4h', '1d', '1w'].includes(timeframe)) {
      console.warn(`Invalid timeframe ${timeframe} for swing trading, defaulting to 4h`);
      timeframe = '4h';
    }
    
    // Get appropriate date range based on timeframe
    const to = new Date().toISOString().split('T')[0];
    let from;
    
    if (timeframe === '1h') {
      from = getDateXDaysAgo(14); // 14 days for hourly
    } else if (timeframe === '4h') {
      from = getDateXDaysAgo(30); // 30 days for 4-hour
    } else if (timeframe === '1d') {
      from = getDateXDaysAgo(90); // 90 days for daily
    } else {
      from = getDateXDaysAgo(365); // 365 days for weekly
    }
    
    // Fetch candles for all symbols in swing trading universe
    const candlesBySymbol = await marketDataService.scanMultipleSymbols(
      swingTradingUniverse,
      timeframe,
      120,
      from,
      to
    );
    
    // For multi-timeframe confirmation, also fetch lower timeframe data
    let lowerTimeframe;
    if (timeframe === '4h') lowerTimeframe = '1h';
    else if (timeframe === '1d') lowerTimeframe = '4h';
    else if (timeframe === '1w') lowerTimeframe = '1d';
    
    let lowerTimeframeData = {};
    if (lowerTimeframe) {
      lowerTimeframeData = await marketDataService.scanMultipleSymbols(
        swingTradingUniverse,
        lowerTimeframe,
        120,
        from,
        to
      );
    }
    
    // Detect patterns for each symbol
    const results: (PatternData | BreakoutData)[] = [];
    
    for (const symbol of swingTradingUniverse) {
      const candles = candlesBySymbol[symbol] || [];
      
      if (candles.length < 30) {
        console.warn(`Not enough candles for ${symbol}, skipping pattern detection`);
        continue;
      }
      
      // Get current price
      const currentPrice = await marketDataService.getCurrentPrice(symbol);
      
      // Detect patterns
      const bullFlags = detectBullFlag(symbol, candles, timeframe, currentPrice);
      const bearFlags = detectBearFlag(symbol, candles, timeframe, currentPrice);
      const ascendingTriangles = detectAscendingTriangle(symbol, candles, timeframe, currentPrice);
      const descendingTriangles = detectDescendingTriangle(symbol, candles, timeframe, currentPrice);
      const breakouts = detectBreakout(symbol, candles, timeframe, currentPrice);
      
      // Combine all patterns
      const allPatterns = [...bullFlags, ...bearFlags, ...ascendingTriangles, ...descendingTriangles, ...breakouts];
      
      // Check for multi-timeframe confirmation if lower timeframe data is available
      if (lowerTimeframe && lowerTimeframeData[symbol]?.length > 30) {
        for (const pattern of allPatterns) {
          const lowerCandles = lowerTimeframeData[symbol];
          const isConfirmed = checkMultiTimeframeConfirmation(pattern, lowerCandles, lowerTimeframe);
          
          if (isConfirmed) {
            pattern.multiTimeframeConfirmation = true;
            // Boost confidence score for confirmed patterns
            pattern.confidenceScore = Math.min(99, pattern.confidenceScore + 10);
          }
        }
      }
      
      // Add all detected patterns to results
      results.push(...allPatterns);
    }
    
    // Sort results by confidence score (descending)
    return results.sort((a, b) => b.confidenceScore - a.confidenceScore);
  } catch (error) {
    console.error('Error fetching swing trading results:', error);
    return [];
  }
};

/**
 * Fetch golden scanner results (highest confidence patterns)
 * @param timeframe Timeframe to scan (e.g., '1d')
 * @returns Promise with array of pattern data
 */
export const fetchGoldenScannerResults = async (timeframe: string): Promise<(PatternData | BreakoutData)[]> => {
  try {
    console.log(`Fetching golden scanner results for ${timeframe} timeframe`);
    
    // Get both day trading and swing trading results
    const dayResults = await fetchDayTradingResults('1h');
    const swingResults = await fetchSwingTradingResults(timeframe);
    
    // Combine results and filter for highest confidence (90%+)
    const allResults = [...dayResults, ...swingResults];
    const goldenResults = allResults.filter(pattern => 
      pattern.confidenceScore >= 90 && pattern.multiTimeframeConfirmation
    );
    
    // Sort by confidence score (descending)
    return goldenResults.sort((a, b) => b.confidenceScore - a.confidenceScore);
  } catch (error) {
    console.error('Error fetching golden scanner results:', error);
    return [];
  }
};

/**
 * Run scanner for specific mode and timeframe
 * @param mode Scanner mode ('day', 'swing', 'golden')
 * @param timeframe Timeframe to scan
 * @returns Promise with array of pattern data
 */
export const runScanner = async (
  mode: 'day' | 'swing' | 'golden',
  timeframe: string
): Promise<(PatternData | BreakoutData)[]> => {
  try {
    console.log(`Running ${mode} scanner for ${timeframe} timeframe`);
    
    if (mode === 'day') {
      return fetchDayTradingResults(timeframe);
    } else if (mode === 'swing') {
      return fetchSwingTradingResults(timeframe);
    } else {
      return fetchGoldenScannerResults(timeframe);
    }
  } catch (error) {
    console.error(`Error running ${mode} scanner:`, error);
    return [];
  }
};

/**
 * Check for multi-timeframe confirmation
 * @param pattern Pattern to check
 * @param lowerTimeframeCandles Lower timeframe candles
 * @param lowerTimeframe Lower timeframe string
 * @returns Boolean indicating if pattern is confirmed
 */
const checkMultiTimeframeConfirmation = (
  pattern: PatternData | BreakoutData,
  lowerTimeframeCandles: Candle[],
  lowerTimeframe: string
): boolean => {
  try {
    // For bullish patterns, check if lower timeframe shows bullish momentum
    if (pattern.direction === 'bullish') {
      // Check if recent candles show bullish momentum (higher lows, higher highs)
      const recentCandles = lowerTimeframeCandles.slice(-10);
      
      // Check if EMA7 is above EMA20
      const lastCandle = recentCandles[recentCandles.length - 1];
      if (lastCandle.ema7 > lastCandle.ema20) {
        // Check if RSI is above 50
        if (lastCandle.rsi14 > 50) {
          return true;
        }
      }
    } 
    // For bearish patterns, check if lower timeframe shows bearish momentum
    else if (pattern.direction === 'bearish') {
      // Check if recent candles show bearish momentum (lower highs, lower lows)
      const recentCandles = lowerTimeframeCandles.slice(-10);
      
      // Check if EMA7 is below EMA20
      const lastCandle = recentCandles[recentCandles.length - 1];
      if (lastCandle.ema7 < lastCandle.ema20) {
        // Check if RSI is below 50
        if (lastCandle.rsi14 < 50) {
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking multi-timeframe confirmation:', error);
    return false;
  }
};

/**
 * Get backtest statistics
 * @returns Promise with backtest statistics
 */
export const getBacktestStats = async () => {
  try {
    // In a real implementation, this would fetch from Supabase
    // For now, return realistic mock data
    return {
      avgCandlesToBreakout: {
        '1m': 5.2,
        '5m': 4.8,
        '15m': 3.9,
        '30m': 3.5,
        '1h': 3.1,
        '4h': 2.8,
        '1d': 2.5,
        '1w': 1.8
      },
      winRateByTimeframe: {
        '1m': 62.4,
        '5m': 64.8,
        '15m': 68.7,
        '30m': 70.2,
        '1h': 72.5,
        '4h': 74.3,
        '1d': 76.8,
        '1w': 79.5
      },
      profitFactorByTimeframe: {
        '1m': 1.85,
        '5m': 1.97,
        '15m': 2.34,
        '30m': 2.56,
        '1h': 2.78,
        '4h': 2.95,
        '1d': 3.12,
        '1w': 3.45
      }
    };
  } catch (error) {
    console.error('Error getting backtest stats:', error);
    return {
      avgCandlesToBreakout: {},
      winRateByTimeframe: {},
      profitFactorByTimeframe: {}
    };
  }
};

/**
 * Run backtest
 * @returns Promise with boolean indicating success
 */
export const runBacktest = async (): Promise<boolean> => {
  try {
    // In a real implementation, this would run a comprehensive backtest
    // and store results in Supabase
    
    // Check if backtest was run recently (within last month)
    const lastBacktestDate = localStorage.getItem('lastBacktestDate');
    if (lastBacktestDate) {
      const lastDate = new Date(lastBacktestDate);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 30) {
        console.log('Backtest was run recently, skipping');
        return false;
      }
    }
    
    // Set last backtest date
    localStorage.setItem('lastBacktestDate', new Date().toISOString());
    
    return true;
  } catch (error) {
    console.error('Error running backtest:', error);
    return false;
  }
};

/**
 * Test API connection
 * @returns Promise with boolean indicating success
 */
export const testApiConnection = async (): Promise<boolean> => {
  try {
    return await marketDataService.testConnection();
  } catch (error) {
    console.error('Error testing API connection:', error);
    return false;
  }
};

/**
 * Fetch backtest results
 * @returns Promise with backtest results
 */
export const fetchBacktestResults = async () => {
  try {
    // In a real implementation, this would fetch from Supabase
    // For now, return realistic mock data
    return [
      {
        id: '1',
        patternType: 'Bull Flag',
        symbol: 'AAPL',
        timeframe: '1d',
        entryDate: '2024-03-15',
        exitDate: '2024-03-22',
        entryPrice: 172.45,
        exitPrice: 183.79,
        profit: 6.58,
        success: true,
        holdingPeriod: 7,
        confidenceScore: 87
      },
      {
        id: '2',
        patternType: 'Ascending Triangle',
        symbol: 'MSFT',
        timeframe: '4h',
        entryDate: '2024-03-18',
        exitDate: '2024-03-21',
        entryPrice: 415.23,
        exitPrice: 432.65,
        profit: 4.19,
        success: true,
        holdingPeriod: 3,
        confidenceScore: 92
      },
      {
        id: '3',
        patternType: 'Bear Flag',
        symbol: 'META',
        timeframe: '1d',
        entryDate: '2024-02-28',
        exitDate: '2024-03-07',
        entryPrice: 485.12,
        exitPrice: 465.34,
        profit: 4.08,
        success: true,
        holdingPeriod: 8,
        confidenceScore: 84
      },
      {
        id: '4',
        patternType: 'Descending Triangle',
        symbol: 'NFLX',
        timeframe: '1d',
        entryDate: '2024-03-05',
        exitDate: '2024-03-12',
        entryPrice: 598.75,
        exitPrice: 575.40,
        profit: 3.90,
        success: true,
        holdingPeriod: 7,
        confidenceScore: 81
      },
      {
        id: '5',
        patternType: 'Bull Flag',
        symbol: 'NVDA',
        timeframe: '4h',
        entryDate: '2024-03-20',
        exitDate: '2024-03-22',
        entryPrice: 925.15,
        exitPrice: 942.89,
        profit: 1.92,
        success: true,
        holdingPeriod: 2,
        confidenceScore: 89
      }
    ];
  } catch (error) {
    console.error('Error fetching backtest results:', error);
    return [];
  }
};

/**
 * Fetch performance metrics
 * @returns Promise with performance metrics
 */
export const fetchPerformanceMetrics = async () => {
  try {
    // In a real implementation, this would fetch from Supabase
    // For now, return realistic mock data
    return {
      overallWinRate: 76.8,
      profitFactor: 3.12,
      averageHoldingPeriod: 5.4,
      patternPerformance: {
        'Bull Flag': {
          winRate: 82.5,
          profitFactor: 3.45,
          averageProfit: 5.8,
          count: 124
        },
        'Bear Flag': {
          winRate: 74.3,
          profitFactor: 2.87,
          averageProfit: 4.9,
          count: 98
        },
        'Ascending Triangle': {
          winRate: 79.1,
          profitFactor: 3.21,
          averageProfit: 5.3,
          count: 86
        },
        'Descending Triangle': {
          winRate: 71.2,
          profitFactor: 2.65,
          averageProfit: 4.7,
          count: 73
        }
      },
      timeframePerformance: {
        '15m': {
          winRate: 68.7,
          profitFactor: 2.34,
          averageProfit: 3.2,
          count: 215
        },
        '1h': {
          winRate: 72.5,
          profitFactor: 2.78,
          averageProfit: 4.1,
          count: 187
        },
        '4h': {
          winRate: 74.3,
          profitFactor: 2.95,
          averageProfit: 4.8,
          count: 142
        },
        '1d': {
          winRate: 76.8,
          profitFactor: 3.12,
          averageProfit: 5.4,
          count: 98
        }
      }
    };
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    return {
      overallWinRate: 0,
      profitFactor: 0,
      averageHoldingPeriod: 0,
      patternPerformance: {},
      timeframePerformance: {}
    };
  }
};

/**
 * Generate performance summary
 * @returns Promise with performance summary
 */
export const generatePerformanceSummary = async () => {
  try {
    // In a real implementation, this would analyze backtest data and generate insights
    // For now, return realistic mock data
    const metrics = await fetchPerformanceMetrics();
    
    return {
      summary: `The backtesting results show an overall win rate of ${metrics.overallWinRate}% with a profit factor of ${metrics.profitFactor}. Bull Flag patterns performed best with a ${metrics.patternPerformance['Bull Flag'].winRate}% win rate and ${metrics.patternPerformance['Bull Flag'].averageProfit}% average profit. Daily timeframes showed the highest reliability with a ${metrics.timeframePerformance['1d'].winRate}% win rate.`,
      recommendations: [
        "Focus on Bull Flag and Ascending Triangle patterns for highest probability trades",
        "Daily timeframe provides the best balance of reliability and opportunity frequency",
        "Consider using 4-hour timeframe for more frequent trading opportunities with still-strong performance",
        "Implement multi-timeframe confirmation to boost win rate by approximately 10%"
      ],
      improvementAreas: [
        "Descending Triangle pattern detection could be refined to improve the 71.2% win rate",
        "15-minute timeframe performance could be improved with additional filters",
        "Consider adding volume profile analysis to pattern detection"
      ]
    };
  } catch (error) {
    console.error('Error generating performance summary:', error);
    return {
      summary: "Unable to generate performance summary due to an error.",
      recommendations: [],
      improvementAreas: []
    };
  }
};
