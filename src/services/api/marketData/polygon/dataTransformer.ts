import { HistoricalPrice } from '@/services/backtesting/backtestTypes';
import { PatternData } from '@/services/types/patternTypes';
import { calculateRSI, calculateATR, analyzeVolume, checkEMACrossover } from '@/services/api/marketData/technicalIndicators';

/**
 * Transform Polygon.io data format to our internal format
 * Enhanced with better metadata and support for all timeframes
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
        '6. Market Status': 'Closed',
        '7. Data Source': 'Polygon.io'
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
      '6. Market Status': 'Closed', // Default to closed
      '7. Data Source': 'Polygon.io',
      '8. Total Results': polygonData.results.length,
      '9. Data Range': 'N/A'
    }
  };
  
  // Determine the correct time series key based on interval
  let timeSeriesKey = '';
  
  // Parse minute-based timeframes
  if (interval.includes('min')) {
    const minutes = parseInt(interval.replace('min', '')) || 1;
    timeSeriesKey = `Time Series (${minutes}min)`;
  } 
  // Parse hour-based timeframes
  else if (interval.includes('hour') || interval.includes('h')) {
    // Handle both formats: 1h, 4h, 1hour, etc.
    const hours = parseInt(interval.replace('hour', '').replace('h', '')) || 1;
    timeSeriesKey = `Time Series (${hours * 60}min)`;
  } 
  // Handle daily, weekly, monthly timeframes
  else if (interval === 'day' || interval === '1d' || interval === 'daily') {
    timeSeriesKey = 'Time Series (Daily)';
  } else if (interval === 'week' || interval === '1w' || interval === 'weekly') {
    timeSeriesKey = 'Weekly Time Series';
  } else if (interval === 'month' || interval === 'monthly') {
    timeSeriesKey = 'Monthly Time Series';
  } else {
    // Default to daily if timeframe isn't recognized
    console.warn(`Unknown interval format: "${interval}", defaulting to daily timeframe`);
    timeSeriesKey = 'Time Series (Daily)';
  }
  
  result[timeSeriesKey] = {};
  
  // Find date range for metadata
  if (polygonData.results.length > 0) {
    const timestampsSorted = [...polygonData.results].map(bar => bar.t).sort();
    const oldestTimestamp = new Date(timestampsSorted[0]);
    const newestTimestamp = new Date(timestampsSorted[timestampsSorted.length - 1]);
    
    result['Meta Data']['9. Data Range'] = `${oldestTimestamp.toISOString()} to ${newestTimestamp.toISOString()}`;
    
    // Set the last refreshed time to the most recent result
    result['Meta Data']['3. Last Refreshed'] = newestTimestamp.toISOString();
    
    // Determine market status (a simple heuristic)
    const now = new Date();
    const hoursSinceLastData = (now.getTime() - newestTimestamp.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceLastData < 24) {
      result['Meta Data']['6. Market Status'] = 'Open';
    }
  }
  
  // Process results from Polygon.io
  polygonData.results.forEach((bar: any) => {
    // Validate bar data
    if (!bar || typeof bar.o !== 'number' || typeof bar.h !== 'number' ||
        typeof bar.l !== 'number' || typeof bar.c !== 'number' || 
        typeof bar.v !== 'number' || typeof bar.t !== 'number') {
      return; // Skip invalid bars
    }
    
    // Convert timestamp to date (Polygon uses milliseconds timestamps)
    const date = new Date(bar.t);
    
    // Format date key based on interval
    let dateKey;
    if (interval.includes('min')) {
      // For minute data, format with minutes
      dateKey = `${date.toISOString().split('T')[0]} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}:00`;
    } else if (interval.includes('hour') || interval.includes('h')) {
      // For hourly data, format with zero minutes
      dateKey = `${date.toISOString().split('T')[0]} ${date.getHours()}:00:00`;
    } else {
      // For daily/weekly/monthly data, use date only
      dateKey = date.toISOString().split('T')[0];
    }
    
    // Create OHLCV data in our expected format
    result[timeSeriesKey][dateKey] = {
      '1. open': bar.o.toString(),
      '2. high': bar.h.toString(),
      '3. low': bar.l.toString(),
      '4. close': bar.c.toString(),
      '5. volume': bar.v.toString(),
      '6. timestamp': bar.t,
      '7. vwap': bar.vw?.toString() || 'N/A', // Include VWAP if available
      '8. trades': bar.n?.toString() || 'N/A'  // Include number of trades if available
    };
  });
  
  return result;
};

/**
 * Enhanced helper function to process API responses for backtesting
 * This function converts the Polygon.io data directly to our HistoricalPrice[] format 
 * with improved validation, error handling, and technical indicator calculations
 */
export const processPolygonDataForBacktest = (data: any, symbol: string): HistoricalPrice[] => {
  // Validate input data structure
  if (!data || typeof data !== 'object') {
    console.error('Invalid Polygon API data format: data is null or not an object', data);
    return [];
  }

  // Check for error response from Polygon
  if (data.status === 'ERROR' || data.error) {
    console.error(`Polygon API error for ${symbol}:`, data.error || 'Unknown error');
    return [];
  }

  // Validate results array
  if (!data.results || !Array.isArray(data.results) || data.results.length === 0) {
    console.warn(`Empty or invalid results for ${symbol}. Response:`, 
      data.results ? `Empty array (${data.results.length} items)` : 'No results property');
    return [];
  }
  
  const historicalPrices: HistoricalPrice[] = [];
  
  // Process Polygon.io results directly with validation
  data.results.forEach((bar: any, index: number) => {
    // Skip if bar is null or not an object
    if (!bar || typeof bar !== 'object') {
      console.warn(`Invalid bar data at index ${index} for ${symbol}: not an object`);
      return; // Skip this data point
    }
    
    // Validate that all required fields exist and are valid numbers
    const requiredFields = ['o', 'h', 'l', 'c', 'v', 't'];
    const missingFields = requiredFields.filter(field => bar[field] === undefined || bar[field] === null);
    
    if (missingFields.length > 0) {
      console.warn(`Missing required fields in bar data for ${symbol}: ${missingFields.join(', ')}`);
      return; // Skip this data point
    }
    
    // Validate that price and volume fields are numbers
    const numericFields = ['o', 'h', 'l', 'c', 'v'];
    const invalidFields = numericFields.filter(field => typeof bar[field] !== 'number' || isNaN(bar[field]));
    
    if (invalidFields.length > 0) {
      console.warn(`Non-numeric fields in bar data for ${symbol}: ${invalidFields.join(', ')}`);
      return; // Skip this data point
    }
    
    // Validate timestamp
    if (typeof bar.t !== 'number' || bar.t <= 0) {
      console.warn(`Invalid timestamp in bar data for ${symbol}: ${bar.t}`);
      return; // Skip this data point
    }

    // Skip if high price is not greater than or equal to low price
    if (bar.h < bar.l) {
      console.warn(`Invalid OHLC data for ${symbol} at ${new Date(bar.t).toISOString()}: high (${bar.h}) < low (${bar.l})`);
      return; // Skip this data point
    }
    
    // Create the price data object with all required fields
    const priceData: HistoricalPrice = {
      date: new Date(bar.t), // Polygon uses millisecond timestamps
      open: bar.o,
      high: bar.h,
      low: bar.l,
      close: bar.c,
      volume: bar.v,
      symbol: symbol
    };
    
    historicalPrices.push(priceData);
  });
  
  // Check if we have any valid price data after validation
  if (historicalPrices.length === 0) {
    console.warn(`No valid price data found for ${symbol} after validation`);
    return [];
  }
  
  // Sort by date descending (newest first) to match our app's expectations
  const sortedPrices = historicalPrices.sort((a, b) => b.date.getTime() - a.date.getTime());
  
  // Calculate technical indicators for enhanced data
  try {
    // We need at least 14 candles for accurate indicators
    if (sortedPrices.length >= 14) {
      // Calculate RSI (14-period)
      const rsiValues = calculateRSI(sortedPrices, 14);
      
      // Calculate ATR (14-period)
      const atrValues = calculateATR(sortedPrices, 14);
      
      // Add indicators to each price object
      sortedPrices.forEach((price, i) => {
        if (i < sortedPrices.length - 14) { // Skip the last 14 candles as they don't have complete data
          price.rsi = typeof rsiValues === 'number' ? rsiValues : 50; // Default to neutral if calculation failed
          price.atr = typeof atrValues === 'number' ? atrValues : 0;
        }
      });
      
      // Get EMA crossovers if we have enough data
      if (sortedPrices.length >= 50) {
        const emaCrossoverResult = checkEMACrossover(sortedPrices);
        
        // Add crossover information to the most recent candle
        if (emaCrossoverResult && emaCrossoverResult.crossovers) {
          (sortedPrices[0] as any).emaCrossovers = emaCrossoverResult.crossovers;
        }
      }
    } else {
      console.warn(`Not enough data points for ${symbol} to calculate indicators: ${sortedPrices.length} (need at least 14)`);
    }
  } catch (error) {
    console.error(`Error calculating technical indicators for ${symbol}:`, error);
    // Continue without indicators rather than failing completely
  }
  
  // Log some stats about the processed data
  console.log(`Processed ${sortedPrices.length} valid price bars for ${symbol} from ${sortedPrices[sortedPrices.length-1]?.date.toISOString()} to ${sortedPrices[0]?.date.toISOString()}`);
  
  return sortedPrices;
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

/**
 * Transform real-time Polygon.io data to our internal format with enhanced metadata
 * Supports both agg bars (candles) and tick-by-tick data
 */
export const transformRealTimeData = (polygonData: any, symbol: string, dataType: 'agg' | 'trade' | 'quote' = 'agg'): any => {
  // Validate input
  if (!polygonData) {
    console.warn(`No real-time data received for ${symbol} with data type ${dataType}`);
    return {
      symbol,
      timestamp: new Date().toISOString(),
      dataType,
      isValid: false,
      message: 'No data received'
    };
  }
  
  // Handle different data types
  switch (dataType) {
    case 'agg': // Aggregate/candle data
      return transformAggData(polygonData, symbol);
    case 'trade': // Individual trade data
      return transformTradeData(polygonData, symbol);
    case 'quote': // Quote data
      return transformQuoteData(polygonData, symbol);
    default:
      console.warn(`Unknown data type: ${dataType}, defaulting to agg`);
      return transformAggData(polygonData, symbol);
  }
};

/**
 * Transform aggregate (candle) data from Polygon.io websocket or REST endpoints
 */
const transformAggData = (polygonData: any, symbol: string): any => {
  // Different endpoints have different data structures - handle both websocket and REST
  // First, detect the format based on available fields
  const isWebSocketFormat = 'ev' in polygonData && 'sym' in polygonData;
  const isRestFormat = 'ticker' in polygonData || 'results' in polygonData;
  
  if (isWebSocketFormat) {
    // Handle websocket format (real-time streaming data)
    const result = {
      symbol: polygonData.sym || symbol,
      timestamp: new Date(polygonData.t || polygonData.ts || Date.now()).toISOString(),
      dataType: 'agg',
      isValid: true,
      interval: getIntervalFromSeconds(polygonData.s || 60), // Default to 1min if not provided
      priceData: {
        open: polygonData.o || 0,
        high: polygonData.h || 0,
        low: polygonData.l || 0,
        close: polygonData.c || 0,
        volume: polygonData.v || 0,
        vwap: polygonData.vw || null,
        trades: polygonData.n || null,
      },
      meta: {
        source: 'Polygon.io WebSocket',
        eventType: polygonData.ev || 'A', // Default to aggregate
        startTimestamp: polygonData.s ? new Date(polygonData.s).toISOString() : null,
        endTimestamp: polygonData.e ? new Date(polygonData.e).toISOString() : null,
        isMarketHours: isMarketHours(new Date(polygonData.t || Date.now())),
        tickDirection: getTickDirection(polygonData)
      }
    };
    return result;
  } else if (isRestFormat) {
    // Handle REST API format (snapshot or historical data)
    // Check if we have a single result or an array
    if (polygonData.results && Array.isArray(polygonData.results)) {
      // Handle array of results (multiple candles)
      const results = polygonData.results.map((item: any) => ({
        symbol: polygonData.ticker || symbol,
        timestamp: new Date(item.t || Date.now()).toISOString(),
        dataType: 'agg',
        isValid: true,
        interval: getIntervalFromMilliseconds(item.tspan || 60000), // Default to 1min if not provided
        priceData: {
          open: item.o || 0,
          high: item.h || 0,
          low: item.l || 0,
          close: item.c || 0,
          volume: item.v || 0,
          vwap: item.vw || null,
          trades: item.n || null,
        },
        meta: {
          source: 'Polygon.io REST API',
          isMarketHours: isMarketHours(new Date(item.t || Date.now())),
          adjusted: Boolean(item.a),
          tickDirection: getTickDirection(item)
        }
      }));
      
      // Include the full result set with metadata
      return {
        symbol: polygonData.ticker || symbol,
        count: results.length,
        dataType: 'agg',
        isValid: true,
        results,
        meta: {
          resultsCount: polygonData.resultsCount || results.length,
          status: polygonData.status || 'OK',
          requestId: polygonData.request_id || null,
          source: 'Polygon.io REST API',
          nextUrl: polygonData.next_url || null
        }
      };
    } else {
      // Single result (one candle)
      const result = {
        symbol: polygonData.ticker || symbol,
        timestamp: new Date(polygonData.t || Date.now()).toISOString(),
        dataType: 'agg',
        isValid: true,
        interval: getIntervalFromMilliseconds(polygonData.tspan || 60000),
        priceData: {
          open: polygonData.o || polygonData.open || 0,
          high: polygonData.h || polygonData.high || 0,
          low: polygonData.l || polygonData.low || 0,
          close: polygonData.c || polygonData.close || 0,
          volume: polygonData.v || polygonData.volume || 0,
          vwap: polygonData.vw || null,
          trades: polygonData.n || null,
        },
        meta: {
          source: 'Polygon.io REST API',
          isMarketHours: isMarketHours(new Date(polygonData.t || Date.now())),
          adjusted: Boolean(polygonData.a),
          tickDirection: getTickDirection(polygonData)
        }
      };
      return result;
    }
  } else {
    // Unknown format - do our best to extract data
    console.warn(`Unknown data format for symbol ${symbol}:`, polygonData);
    return {
      symbol,
      timestamp: new Date().toISOString(),
      dataType: 'agg',
      isValid: false,
      message: 'Unknown data format',
      rawData: polygonData
    };
  }
};

/**
 * Transform trade data from Polygon.io
 */
const transformTradeData = (polygonData: any, symbol: string): any => {
  // Different formats based on source (websocket vs REST)
  const isWebSocketFormat = 'ev' in polygonData && ('sym' in polygonData || 'T' in polygonData);
  const isRestFormat = 'ticker' in polygonData || 'results' in polygonData;
  
  if (isWebSocketFormat) {
    // Handle websocket format
    return {
      symbol: polygonData.sym || symbol,
      timestamp: new Date(polygonData.t || Date.now()).toISOString(),
      dataType: 'trade',
      isValid: true,
      tradeData: {
        price: polygonData.p || 0,
        size: polygonData.s || 0,
        exchange: polygonData.x || null,
        id: polygonData.i || null,
        tape: polygonData.z || null
      },
      meta: {
        source: 'Polygon.io WebSocket',
        eventType: polygonData.ev || 'T',
        conditions: polygonData.c || [],
        isMarketHours: isMarketHours(new Date(polygonData.t || Date.now())),
        tickDirection: polygonData.p !== undefined && polygonData.p !== null ? 
          getTradeTickDirection(polygonData.p, symbol) : null
      }
    };
  } else if (isRestFormat) {
    // Handle REST format
    if (polygonData.results && Array.isArray(polygonData.results)) {
      // Multiple trades
      const results = polygonData.results.map((item: any) => ({
        symbol: polygonData.ticker || symbol,
        timestamp: new Date(item.t || Date.now()).toISOString(),
        dataType: 'trade',
        isValid: true,
        tradeData: {
          price: item.p || 0,
          size: item.s || 0,
          exchange: item.x || null,
          id: item.i || null,
          tape: item.z || null
        },
        meta: {
          source: 'Polygon.io REST API',
          conditions: item.c || [],
          isMarketHours: isMarketHours(new Date(item.t || Date.now())),
          tickDirection: item.p !== undefined && item.p !== null ? 
            getTradeTickDirection(item.p, symbol) : null
        }
      }));
      
      return {
        symbol: polygonData.ticker || symbol,
        count: results.length,
        dataType: 'trade',
        isValid: true,
        results,
        meta: {
          resultsCount: polygonData.resultsCount || results.length,
          status: polygonData.status || 'OK',
          requestId: polygonData.request_id || null,
          source: 'Polygon.io REST API'
        }
      };
    } else {
      // Single trade
      return {
        symbol: polygonData.ticker || symbol,
        timestamp: new Date(polygonData.t || Date.now()).toISOString(),
        dataType: 'trade',
        isValid: true,
        tradeData: {
          price: polygonData.p || 0,
          size: polygonData.s || 0,
          exchange: polygonData.x || null,
          id: polygonData.i || null, 
          tape: polygonData.z || null
        },
        meta: {
          source: 'Polygon.io REST API',
          conditions: polygonData.c || [],
          isMarketHours: isMarketHours(new Date(polygonData.t || Date.now())),
          tickDirection: polygonData.p !== undefined && polygonData.p !== null ? 
            getTradeTickDirection(polygonData.p, symbol) : null
        }
      };
    }
  } else {
    // Unknown format
    console.warn(`Unknown trade data format for symbol ${symbol}:`, polygonData);
    return {
      symbol,
      timestamp: new Date().toISOString(),
      dataType: 'trade',
      isValid: false,
      message: 'Unknown data format',
      rawData: polygonData
    };
  }
};

/**
 * Transform quote data from Polygon.io
 */
const transformQuoteData = (polygonData: any, symbol: string): any => {
  // Different formats based on source (websocket vs REST)
  const isWebSocketFormat = 'ev' in polygonData && ('sym' in polygonData || 'Q' in polygonData);
  const isRestFormat = 'ticker' in polygonData || 'results' in polygonData;
  
  if (isWebSocketFormat) {
    // Handle websocket format
    return {
      symbol: polygonData.sym || symbol,
      timestamp: new Date(polygonData.t || Date.now()).toISOString(),
      dataType: 'quote',
      isValid: true,
      quoteData: {
        bidPrice: polygonData.bp || 0,
        bidSize: polygonData.bs || 0,
        bidExchange: polygonData.bx || null,
        askPrice: polygonData.ap || 0,
        askSize: polygonData.as || 0,
        askExchange: polygonData.ax || null,
        spread: polygonData.ap && polygonData.bp ? polygonData.ap - polygonData.bp : null,
        spreadPercent: polygonData.ap && polygonData.bp && polygonData.bp !== 0 ? 
          ((polygonData.ap - polygonData.bp) / polygonData.bp) * 100 : null
      },
      meta: {
        source: 'Polygon.io WebSocket',
        eventType: polygonData.ev || 'Q',
        conditions: polygonData.c || [],
        isMarketHours: isMarketHours(new Date(polygonData.t || Date.now())),
        midPrice: polygonData.ap && polygonData.bp ? (polygonData.ap + polygonData.bp) / 2 : null
      }
    };
  } else if (isRestFormat) {
    // Handle REST format
    if (polygonData.results && Array.isArray(polygonData.results)) {
      // Multiple quotes
      const results = polygonData.results.map((item: any) => ({
        symbol: polygonData.ticker || symbol,
        timestamp: new Date(item.t || Date.now()).toISOString(),
        dataType: 'quote',
        isValid: true,
        quoteData: {
          bidPrice: item.bp || item.p || 0,
          bidSize: item.bs || item.s || 0,
          bidExchange: item.bx || item.x || null,
          askPrice: item.ap || 0,
          askSize: item.as || 0,
          askExchange: item.ax || null,
          spread: item.ap && item.bp ? item.ap - item.bp : null,
          spreadPercent: item.ap && item.bp && item.bp !== 0 ? 
            ((item.ap - item.bp) / item.bp) * 100 : null
        },
        meta: {
          source: 'Polygon.io REST API',
          conditions: item.c || [],
          isMarketHours: isMarketHours(new Date(item.t || Date.now())),
          midPrice: item.ap && item.bp ? (item.ap + item.bp) / 2 : null
        }
      }));
      
      return {
        symbol: polygonData.ticker || symbol,
        count: results.length,
        dataType: 'quote',
        isValid: true,
        results,
        meta: {
          resultsCount: polygonData.resultsCount || results.length,
          status: polygonData.status || 'OK',
          requestId: polygonData.request_id || null,
          source: 'Polygon.io REST API'
        }
      };
    } else {
      // Single quote
      return {
        symbol: polygonData.ticker || symbol,
        timestamp: new Date(polygonData.t || Date.now()).toISOString(),
        dataType: 'quote',
        isValid: true,
        quoteData: {
          bidPrice: polygonData.bp || 0,
          bidSize: polygonData.bs || 0,
          bidExchange: polygonData.bx || null,
          askPrice: polygonData.ap || 0,
          askSize: polygonData.as || 0,
          askExchange: polygonData.ax || null,
          spread: polygonData.ap && polygonData.bp ? polygonData.ap - polygonData.bp : null,
          spreadPercent: polygonData.ap && polygonData.bp && polygonData.bp !== 0 ? 
            ((polygonData.ap - polygonData.bp) / polygonData.bp) * 100 : null
        },
        meta: {
          source: 'Polygon.io REST API',
          conditions: polygonData.c || [],
          isMarketHours: isMarketHours(new Date(polygonData.t || Date.now())),
          midPrice: polygonData.ap && polygonData.bp ? (polygonData.ap + polygonData.bp) / 2 : null
        }
      };
    }
  } else {
    // Unknown format
    console.warn(`Unknown quote data format for symbol ${symbol}:`, polygonData);
    return {
      symbol,
      timestamp: new Date().toISOString(),
      dataType: 'quote',
      isValid: false,
      message: 'Unknown data format',
      rawData: polygonData
    };
  }
};

// Helper functions for real-time data transformation

/**
 * Check if timestamp is during US market hours 
 * (9:30 AM - 4:00 PM ET, Monday-Friday)
 */
const isMarketHours = (timestamp: Date): boolean => {
  const day = timestamp.getDay();
  const hours = timestamp.getUTCHours();
  const minutes = timestamp.getUTCMinutes();
  
  // Convert to ET (UTC-4 during DST, UTC-5 otherwise)
  // Simplified approach - doesn't handle DST transitions perfectly
  const isDST = isDaylightSavingsTime(timestamp);
  const etHours = (hours - (isDST ? 4 : 5) + 24) % 24;
  
  // Check if within trading hours (9:30 AM - 4:00 PM ET, Monday-Friday)
  return day >= 1 && day <= 5 && // Monday-Friday
    ((etHours === 9 && minutes >= 30) || // After 9:30 AM ET
     (etHours > 9 && etHours < 16) || // Between 10 AM and 4 PM ET
     (etHours === 16 && minutes === 0)); // At 4:00 PM ET exactly
};

/**
 * Simplified check for Daylight Savings Time in US
 */
const isDaylightSavingsTime = (date: Date): boolean => {
  // Simple heuristic: DST is roughly from March to November in the US
  const month = date.getMonth();
  return month > 2 && month < 11;
};

/**
 * Get tick direction from comparison of current close vs previous values
 */
const getTickDirection = (data: any): 'up' | 'down' | 'flat' | null => {
  if (!data || data.c === undefined || data.c === null) return null;
  
  // If we have an open price in the same bar, compare close to open
  if (data.o !== undefined && data.o !== null) {
    if (data.c > data.o) return 'up';
    if (data.c < data.o) return 'down';
    return 'flat';
  }
  
  // Otherwise, we don't have enough data to determine
  return null;
};

/**
 * Get trade tick direction based on price history (this would need to compare with recent trades)
 */
const getTradeTickDirection = (price: number, symbol: string): 'up' | 'down' | 'flat' | null => {
  // In a real implementation, we would maintain a cache of recent trades per symbol
  // For now, return null to indicate we don't have enough data
  return null;
};

/**
 * Convert Polygon timespan in seconds to our interval format
 */
const getIntervalFromSeconds = (seconds: number): string => {
  if (!seconds || seconds <= 0) return '1min';
  
  if (seconds < 60) return `${seconds}sec`;
  if (seconds === 60) return '1min';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
  if (seconds === 3600) return '1hour';
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}hour`;
  if (seconds === 86400) return '1day';
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}day`;
  if (seconds === 604800) return '1week';
  
  return `${Math.floor(seconds / 604800)}week`;
};

/**
 * Convert Polygon timespan in milliseconds to our interval format
 */
const getIntervalFromMilliseconds = (ms: number): string => {
  if (!ms || ms <= 0) return '1min';
  return getIntervalFromSeconds(Math.floor(ms / 1000));
};
