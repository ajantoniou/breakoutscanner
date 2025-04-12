import { HistoricalPrice } from '@/services/backtesting/backtestTypes';
import { PatternData } from '@/services/types/patternTypes';
import { calculateRSI, calculateATR, analyzeVolume, checkEMACrossover } from '@/services/api/marketData/technicalIndicators';

/**
 * Transform Polygon.io data format to our internal format
 */
export const transformPolygonData = (polygonData: any, symbol: string, interval: string): any => {
  // Make sure we have valid data
  if (!polygonData || !polygonData.results || polygonData.results.length === 0) {
    console.warn(`No results found for ${symbol} with interval ${interval}`);
    return {
      'Meta Data': {
        '1. Information': `${interval} Prices for ${symbol}`,
        '2. Symbol': symbol,
        '3. Last Refreshed': new Date().toISOString(),
        '4. Output Size': 'Compact',
        '5. Time Zone': 'US/Eastern',
      },
      'Time Series (Daily)': {} // Return empty time series
    };
  }
  
  // Create a format similar to our expected API format
  const result: any = {
    'Meta Data': {
      '1. Information': `${interval} Prices for ${symbol}`,
      '2. Symbol': symbol,
      '3. Last Refreshed': new Date().toISOString(),
      '4. Output Size': 'Compact',
      '5. Time Zone': 'US/Eastern',
    }
  };
  
  // Create time series key based on interval
  let timeSeriesKey = '';
  if (interval === 'week' || interval === '1w') {
    timeSeriesKey = 'Weekly Time Series';
  } else if (interval === 'month') {
    timeSeriesKey = 'Monthly Time Series';
  } else if (interval === 'hour' || interval === '1h') {
    timeSeriesKey = 'Time Series (60min)';
  } else {
    timeSeriesKey = 'Time Series (Daily)';
  }
  
  result[timeSeriesKey] = {};
  
  // Process results from Polygon.io
  polygonData.results.forEach((bar: any) => {
    // Convert timestamp to date (Polygon uses milliseconds timestamps)
    const date = new Date(bar.t);
    
    // Format date as YYYY-MM-DD for daily/weekly/monthly or YYYY-MM-DD HH:MM:SS for intraday
    let dateKey;
    if (interval === 'hour' || interval === '1h') {
      dateKey = `${date.toISOString().split('T')[0]} ${date.getHours()}:00:00`;
    } else {
      dateKey = date.toISOString().split('T')[0];
    }
    
    // Create OHLCV data in our expected format
    result[timeSeriesKey][dateKey] = {
      '1. open': bar.o.toString(),
      '2. high': bar.h.toString(),
      '3. low': bar.l.toString(),
      '4. close': bar.c.toString(),
      '5. volume': bar.v.toString()
    };
  });
  
  return result;
};

/**
 * Helper function to process API responses for backtesting
 * This function converts the Polygon.io data directly to our HistoricalPrice[] format 
 */
export const processPolygonDataForBacktest = (data: any, symbol: string): HistoricalPrice[] => {
  if (!data || !data.results || !Array.isArray(data.results) || data.results.length === 0) {
    console.error('Invalid or empty Polygon API data format:', data);
    return [];
  }
  
  const historicalPrices: HistoricalPrice[] = [];
  
  // Process Polygon.io results directly
  data.results.forEach((bar: any) => {
    // Validate that all required fields exist and are numbers
    if (typeof bar.o !== 'number' || typeof bar.h !== 'number' || 
        typeof bar.l !== 'number' || typeof bar.c !== 'number' || 
        typeof bar.v !== 'number' || typeof bar.t !== 'number') {
      console.warn('Invalid bar data in Polygon response:', bar);
      return; // Skip this data point
    }
    
    historicalPrices.push({
      date: new Date(bar.t), // Polygon uses millisecond timestamps
      open: bar.o,
      high: bar.h,
      low: bar.l,
      close: bar.c,
      volume: bar.v,
      symbol: symbol
    });
  });
  
  // Sort by date descending (newest first) to match our app's expectations
  return historicalPrices.sort((a, b) => b.date.getTime() - a.date.getTime());
};

/**
 * Identify trend lines from price data
 */
const identifyTrendlines = (prices: HistoricalPrice[]): {
  trendlineSupport: number;
  trendlineResistance: number;
  channelType: 'ascending' | 'descending' | 'horizontal';
} => {
  if (prices.length < 10) {
    return { trendlineSupport: 0, trendlineResistance: 0, channelType: 'horizontal' };
  }
  
  const recentPrices = prices.slice(0, 20); // Use most recent 20 bars
  
  // Find potential support and resistance points
  const lows = recentPrices.map(p => p.low);
  const highs = recentPrices.map(p => p.high);
  
  // Simple linear regression for trendlines
  const points = recentPrices.map((p, i) => ({ x: i, yLow: p.low, yHigh: p.high }));
  
  // Support line calculation (connecting lows)
  let n = points.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  points.forEach(point => {
    sumX += point.x;
    sumY += point.yLow;
    sumXY += point.x * point.yLow;
    sumX2 += point.x * point.x;
  });
  
  // Calculate slope and intercept for support line
  const slopeSupport = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const interceptSupport = (sumY - slopeSupport * sumX) / n;
  
  // Calculate projected support at current point (x=0)
  const trendlineSupport = interceptSupport;
  
  // Resistance line calculation (connecting highs)
  sumX = 0; sumY = 0; sumXY = 0; sumX2 = 0;
  
  points.forEach(point => {
    sumX += point.x;
    sumY += point.yHigh;
    sumXY += point.x * point.yHigh;
    sumX2 += point.x * point.x;
  });
  
  // Calculate slope and intercept for resistance line
  const slopeResistance = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const interceptResistance = (sumY - slopeResistance * sumX) / n;
  
  // Calculate projected resistance at current point (x=0)
  const trendlineResistance = interceptResistance;
  
  // Determine channel type based on slopes
  let channelType: 'ascending' | 'descending' | 'horizontal' = 'horizontal';
  
  const averageSlope = (slopeSupport + slopeResistance) / 2;
  
  if (averageSlope > 0.5) {
    channelType = 'ascending';
  } else if (averageSlope < -0.5) {
    channelType = 'descending';
  }
  
  return {
    trendlineSupport: parseFloat(trendlineSupport.toFixed(2)),
    trendlineResistance: parseFloat(trendlineResistance.toFixed(2)),
    channelType
  };
};

/**
 * Helper function to create default pattern data from market data
 */
export const createDefaultPatternData = (symbol: string, historicalPrices: HistoricalPrice[]): PatternData => {
  if (!historicalPrices || historicalPrices.length === 0) {
    console.warn(`No historical prices for ${symbol}, creating empty pattern`);
    return {
      id: `${symbol}-default-${Date.now()}`,
      symbol,
      timeframe: 'daily',
      patternType: 'Unknown',
      entryPrice: 0,
      targetPrice: 0,
      confidenceScore: 0,
      createdAt: new Date().toISOString(),
      status: 'active',
      direction: 'neutral'
    };
  }

  // Use the most recent price data
  const latestPrice = historicalPrices[0];
  const previousPrice = historicalPrices[1] || latestPrice;
  
  // Calculate simple support and resistance from recent prices
  const prices = historicalPrices.slice(0, 20);
  const highPrice = Math.max(...prices.map(p => p.high));
  const lowPrice = Math.min(...prices.map(p => p.low));
  
  // Calculate RSI
  const closePrices = prices.map(p => p.close);
  const rsi = calculateRSI(prices, 14);
  
  // Calculate ATR
  const atr = calculateATR(prices);
  
  // Determine a simple directional bias
  const direction = latestPrice.close > previousPrice.close ? 'bullish' : 'bearish';
  
  // Identify trend lines and channel type
  const { trendlineSupport, trendlineResistance, channelType } = identifyTrendlines(prices);
  
  // Check for EMA crossovers
  const emaCrossoverResult = checkEMACrossover(prices);
  
  // Analyze volume trend
  const volumeTrend = analyzeVolume(prices);
  
  // Calculate a more meaningful confidence score based on indicators
  let confidenceScore = 65; // Start with base score
  
  // Adjust based on RSI
  if ((direction === 'bullish' && rsi < 30) || (direction === 'bearish' && rsi > 70)) {
    confidenceScore += 10; // Oversold for bullish, overbought for bearish
  }
  
  // Adjust based on channel type
  if ((direction === 'bullish' && channelType === 'ascending') || 
      (direction === 'bearish' && channelType === 'descending')) {
    confidenceScore += 10;
  }
  
  // Adjust based on volume
  if ((direction === 'bullish' && volumeTrend.increasing) || 
      (direction === 'bearish' && !volumeTrend.increasing)) {
    confidenceScore += 5;
  }
  
  // Adjust based on EMA crossovers
  if (emaCrossoverResult.crossovers.length > 0) {
    confidenceScore += 5;
  }
  
  // Cap confidence score
  confidenceScore = Math.min(95, Math.max(30, confidenceScore));
  
  // Create a basic pattern with real market data
  return {
    id: `${symbol}-default-${Date.now()}`,
    symbol,
    timeframe: 'daily',
    patternType: direction === 'bullish' ? 'Potential Uptrend' : 'Potential Downtrend',
    createdAt: new Date().toISOString(),
    entryPrice: latestPrice.close,
    targetPrice: direction === 'bullish' ? latestPrice.close * 1.05 : latestPrice.close * 0.95,
    currentPrice: latestPrice.close,
    priceTarget: direction === 'bullish' ? highPrice : lowPrice,
    confidenceScore: confidenceScore, 
    status: 'active',
    direction: direction,
    supportLevel: lowPrice,
    resistanceLevel: highPrice,
    horizontalSupport: lowPrice,
    horizontalResistance: highPrice,
    trendlineSupport: trendlineSupport,
    trendlineResistance: trendlineResistance,
    rsi: rsi,
    atr: atr,
    emaPattern: channelType === 'ascending' ? 'allBullish' : 
                channelType === 'descending' ? 'allBearish' : 'mixed',
    emaCrossovers: emaCrossoverResult.crossovers,
    volumeConfirmation: volumeTrend.increasing,
    volumeTrend: volumeTrend,
    channelType: channelType,
    trendlineBreak: false
  };
};

/**
 * Helper function to process API responses for backtesting (for Alpha Vantage format)
 */
export const processApiDataForBacktest = (apiData: any, timeframe: string): HistoricalPrice[] => {
  if (!apiData || !apiData[`Time Series (${timeframe})`]) {
    console.error('Invalid API data format:', apiData);
    return [];
  }
  
  const timeSeriesData = apiData[`Time Series (${timeframe})`];
  const historicalPrices: HistoricalPrice[] = [];
  
  Object.entries(timeSeriesData).forEach(([date, values]: [string, any]) => {
    historicalPrices.push({
      date: new Date(date),
      open: parseFloat(values['1. open']),
      high: parseFloat(values['2. high']),
      low: parseFloat(values['3. low']),
      close: parseFloat(values['4. close']),
      volume: parseInt(values['5. volume'], 10)
    });
  });
  
  // Sort by date ascending (oldest first)
  return historicalPrices.sort((a, b) => a.date.getTime() - b.date.getTime());
};
