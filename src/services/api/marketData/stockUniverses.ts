/**
 * Stock universes for different trading strategies
 */

/**
 * Day Trading Universe - 20 high-volume stocks with 0 DTE options capability and key indices
 * These stocks are suitable for day trading due to their liquidity and volatility
 */
const dayTradingUniverse = [
  'SPY',  // S&P 500 ETF
  'QQQ',  // Nasdaq 100 ETF
  'IWM',  // Russell 2000 ETF
  'DIA',  // Dow Jones Industrial Average ETF
  'AAPL', // Apple
  'MSFT', // Microsoft
  'AMZN', // Amazon
  'GOOGL', // Alphabet (Google)
  'META', // Meta (Facebook)
  'TSLA', // Tesla
  'NVDA', // NVIDIA
  'AMD',  // Advanced Micro Devices
  'NFLX', // Netflix
  'BA',   // Boeing
  'JPM',  // JPMorgan Chase
  'GS',   // Goldman Sachs
  'XOM',  // Exxon Mobil
  'COIN', // Coinbase
  'GME',  // GameStop
  'AMC'   // AMC Entertainment
];

/**
 * Swing Trading Universe - 100 high-options-volume stocks with strong volatility profiles
 * These stocks are suitable for swing trading due to their trend behavior and volatility
 */
const swingTradingUniverse = [
  // Technology
  'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'META', 'TSLA', 'NVDA', 'AMD', 'NFLX', 'INTC',
  'CSCO', 'ORCL', 'IBM', 'ADBE', 'CRM', 'PYPL', 'SQ', 'SHOP', 'TWLO', 'ZM',
  'SNOW', 'NET', 'CRWD', 'OKTA', 'DDOG', 'PLTR', 'RBLX', 'U', 'SNAP', 'PINS',
  
  // Financials
  'JPM', 'BAC', 'WFC', 'C', 'GS', 'MS', 'AXP', 'V', 'MA', 'SCHW',
  
  // Healthcare
  'JNJ', 'PFE', 'MRK', 'ABBV', 'BMY', 'LLY', 'AMGN', 'GILD', 'MRNA', 'BNTX',
  
  // Consumer
  'AMZN', 'WMT', 'HD', 'MCD', 'NKE', 'SBUX', 'TGT', 'COST', 'LOW', 'DIS',
  
  // Energy
  'XOM', 'CVX', 'COP', 'EOG', 'SLB',
  
  // Industrials
  'BA', 'CAT', 'DE', 'MMM', 'HON',
  
  // Crypto-related
  'COIN', 'MARA', 'RIOT', 'MSTR', 'SI',
  
  // Meme stocks
  'GME', 'AMC', 'BB', 'BBBY', 'KOSS',
  
  // ETFs
  'SPY', 'QQQ', 'IWM', 'DIA', 'XLF', 'XLE', 'XLK', 'XLV', 'XLI', 'XLP',
  
  // Additional volatile stocks
  'ROKU', 'PTON', 'BYND', 'ZG', 'DASH', 'ABNB', 'CVNA', 'UPST', 'AFRM', 'LCID'
];

/**
 * Golden Scanner Universe - Combination of day and swing trading universes
 * These are the stocks that will be scanned for the highest confidence setups
 */
const goldenScannerUniverse = [...new Set([...dayTradingUniverse, ...swingTradingUniverse])];

/**
 * Get allowed timeframes for a specific scanner mode
 * @param mode Scanner mode ('day', 'swing', 'golden')
 * @returns Array of allowed timeframe strings
 */
const getAllowedTimeframes = (mode: 'day' | 'swing' | 'golden'): string[] => {
  switch (mode) {
    case 'day':
      return ['1m', '5m', '15m', '30m', '1h'];
    case 'swing':
      return ['1h', '4h', '1d', '1w'];
    case 'golden':
      return ['1h', '4h', '1d', '1w'];
    default:
      return ['15m', '1h', '4h', '1d'];
  }
};

// Export as a namespace for stockRecommendationService.ts
export const stockUniverses = {
  dayTradingUniverse,
  swingTradingUniverse,
  goldenScannerUniverse,
  getAllowedTimeframes
};

// Also export individual items to support existing imports
export { dayTradingUniverse, swingTradingUniverse, goldenScannerUniverse, getAllowedTimeframes };
