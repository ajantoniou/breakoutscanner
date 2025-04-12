import { PatternData } from '@/services/types/patternTypes';

/**
 * Generates demo pattern data for testing and UI display
 * @param count Number of patterns to generate
 * @param timeframe Timeframe for the patterns
 * @returns Array of demo pattern data
 */
export const generateDemoPatterns = (count: number = 10, timeframe: string = '1h'): PatternData[] => {
  const patterns: PatternData[] = [];
  const now = new Date();
  
  // Define high-volatility stocks for demo data
  const symbols = [
    'TSLA', 'AAPL', 'NVDA', 'AMD', 'MSFT', 
    'AMZN', 'GOOGL', 'META', 'PYPL', 'NFLX',
    'COIN', 'MARA', 'RIOT', 'SHOP', 'SQ',
    'AFRM', 'SNAP', 'RBLX', 'PLTR', 'DKNG'
  ];
  
  // Define pattern types
  const patternTypes = [
    'Ascending Triangle', 
    'Descending Triangle', 
    'Symmetrical Triangle',
    'Flag',
    'Channel'
  ];
  
  // Define channel types
  const channelTypes = ['ascending', 'descending', 'horizontal'];
  
  // Define directions
  const directions: Array<"bullish" | "bearish"> = ["bullish", "bearish"];
  
  // Generate random patterns
  for (let i = 0; i < count; i++) {
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const patternType = patternTypes[Math.floor(Math.random() * patternTypes.length)];
    const channelType = channelTypes[Math.floor(Math.random() * channelTypes.length)];
    const direction = directions[Math.floor(Math.random() * directions.length)];
    const confidenceScore = Math.floor(65 + Math.random() * 30); // 65-95
    
    // Calculate date values
    const createdAt = new Date(now);
    createdAt.setHours(createdAt.getHours() - Math.floor(Math.random() * 24)); // Random time in last 24 hours
    
    // Generate random price values
    const basePrice = 50 + Math.random() * 150;
    const entryPrice = parseFloat(basePrice.toFixed(2));
    const targetPrice = parseFloat((entryPrice * (1 + (direction === 'bullish' ? 0.05 : -0.05))).toFixed(2));
    const stopLossPrice = parseFloat((entryPrice * (1 - (direction === 'bullish' ? 0.02 : -0.02))).toFixed(2));
    
    // Create random higher timeframe confirmation status
    const multiTimeframeConfirmed = Math.random() > 0.5;
    const confirmingTimeframe = multiTimeframeConfirmed ? 
      timeframe === '15min' ? '1h' : 
      timeframe === '30min' ? '4h' : 
      timeframe === '1h' ? '4h' : 
      timeframe === '4h' ? 'daily' : 'weekly' : null;
    
    // Calculate estimated candles to breakout
    const estimatedCandlesToBreakout = Math.floor(1 + Math.random() * 5);
    
    // Create pattern data
    patterns.push({
      id: `demo-${symbol}-${timeframe}-${i}`,
      symbol,
      timeframe,
      patternType,
      channelType,
      direction,
      entryPrice,
      targetPrice,
      stopLossPrice,
      confidenceScore,
      createdAt: createdAt.toISOString(),
      lastUpdated: now.toISOString(),
      status: Math.random() > 0.2 ? 'active' : 'completed',
      supportLevel: parseFloat((entryPrice * 0.95).toFixed(2)),
      resistanceLevel: parseFloat((entryPrice * 1.05).toFixed(2)),
      volumeConfirmation: Math.random() > 0.3,
      emaPattern: Math.random() > 0.5 ? 'above' : 'below',
      trendlineBreak: Math.random() > 0.3,
      avgVolume: Math.floor(1000000 + Math.random() * 10000000),
      priceAtDetection: entryPrice,
      timestamp: createdAt.toISOString(),
      multiTimeframeConfirmed,
      confirmingTimeframe,
      higherTimeframe: confirmingTimeframe,
      // Add backtestResult
      backtestResult: {
        success: Math.random() > 0.3,
        entryDate: createdAt.toISOString(),
        exitDate: now.toISOString(),
        entryPrice: entryPrice,
        exitPrice: direction === 'bullish' ? 
          parseFloat((entryPrice * (1 + (Math.random() * 0.1))).toFixed(2)) : 
          parseFloat((entryPrice * (1 - (Math.random() * 0.1))).toFixed(2)),
        profitPercent: Math.random() * 5
      }
    });
  }
  
  return patterns;
};

/**
 * Generates a single demo pattern
 * @param symbol Stock symbol
 * @param timeframe Timeframe for the pattern
 * @returns A single demo pattern
 */
export const generateSinglePattern = (symbol: string, timeframe: string = '1h'): PatternData => {
  const patterns = generateDemoPatterns(1, timeframe);
  patterns[0].symbol = symbol;
  return patterns[0];
}; 