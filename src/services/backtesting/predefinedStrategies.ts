
import { TradingStrategy } from './strategyTypes';

/**
 * Predefined strategies for the application
 */
export const predefinedStrategies: TradingStrategy[] = [
  // Bull Flag Strategy
  {
    id: 'bull-flag-strategy',
    name: 'Bull Flag Strategy',
    description: 'Identifies bull flag patterns during uptrends for potential breakout opportunities.',
    entryRules: [
      { id: '1', type: 'pattern', value: 'Bull Flag', enabled: true, name: 'Bull Flag Pattern' },
      { id: '2', type: 'volume', value: 'increasing', enabled: true, name: 'Volume Confirmation' },
      { id: '3', type: 'ema', value: 'price > EMA50', enabled: true, name: 'Above 50 EMA' }
    ],
    exitRules: [
      { id: '1', type: 'price', value: 'target', enabled: true, name: 'Price Target Reached' },
      { id: '2', type: 'stop', value: 'trailing', enabled: true, name: 'Trailing Stop Hit' }
    ],
    riskManagement: {
      stopLossPercent: 2.5,
      takeProfitPercent: 7.5,
      maxPositionSize: 5,
      trailingStop: true,
      maxLossPerTrade: 2.0
    },
    timeframes: ['daily', '4h'],
    version: '1.0',
    tags: ['trend-following', 'breakout', 'bull-flag'],
    author: 'System',
    isActive: true,
    isSystem: true
  },
  
  // Double Bottom Strategy
  {
    id: 'double-bottom-strategy',
    name: 'Double Bottom Strategy',
    description: 'Identifies double bottom patterns as reversal signals in downtrends.',
    entryRules: [
      { id: '1', type: 'pattern', value: 'Double Bottom', enabled: true, name: 'Double Bottom Pattern' },
      { id: '2', type: 'volume', value: 'increasing', enabled: true, name: 'Volume Confirmation' },
      { id: '3', type: 'rsi', value: 'rsi > 40', enabled: true, name: 'RSI Recovery' }
    ],
    exitRules: [
      { id: '1', type: 'price', value: 'target', enabled: true, name: 'Price Target Reached' },
      { id: '2', type: 'time', value: '20', enabled: true, name: '20-Day Exit' }
    ],
    riskManagement: {
      stopLossPercent: 3.0,
      takeProfitPercent: 10.0,
      maxPositionSize: 5,
      trailingStop: true,
      maxLossPerTrade: 2.5
    },
    timeframes: ['daily', 'weekly'],
    version: '1.0',
    tags: ['reversal', 'bottom', 'double-bottom'],
    author: 'System',
    isActive: true,
    isSystem: true
  },
  
  // Trendline Breakout Strategy
  {
    id: 'trendline-breakout-strategy',
    name: 'Trendline Breakout Strategy',
    description: 'Identifies breakouts from established trendlines with volume confirmation.',
    entryRules: [
      { id: '1', type: 'trendline', value: 'break', enabled: true, name: 'Trendline Break' },
      { id: '2', type: 'volume', value: '1.5x avg', enabled: true, name: 'High Volume' },
      { id: '3', type: 'candle', value: 'close > open', enabled: true, name: 'Bullish Close' }
    ],
    exitRules: [
      { id: '1', type: 'fibonacci', value: '1.618', enabled: true, name: 'Fibonacci Target' },
      { id: '2', type: 'stop', value: 'fixed', enabled: true, name: 'Fixed Stop' }
    ],
    riskManagement: {
      stopLossPercent: 4.0,
      takeProfitPercent: 12.0,
      maxPositionSize: 5,
      trailingStop: false,
      maxLossPerTrade: 3.0
    },
    timeframes: ['daily', '4h', '1h'],
    version: '1.0',
    tags: ['breakout', 'trendline', 'momentum'],
    author: 'System',
    isActive: true,
    isSystem: true
  },
  
  // MACD Crossover Strategy
  {
    id: 'macd-crossover-strategy',
    name: 'MACD Crossover Strategy',
    description: 'Uses MACD crossovers to identify trend changes and momentum shifts.',
    entryRules: [
      { id: '1', type: 'macd', value: 'signal cross', enabled: true, name: 'MACD Signal Crossover' },
      { id: '2', type: 'price', value: 'above 20 SMA', enabled: true, name: 'Price Above 20 SMA' },
      { id: '3', type: 'volume', value: 'above avg', enabled: true, name: 'Above Average Volume' }
    ],
    exitRules: [
      { id: '1', type: 'macd', value: 'opposing cross', enabled: true, name: 'Opposing MACD Cross' },
      { id: '2', type: 'trailing', value: '2 ATR', enabled: true, name: 'ATR-Based Trailing Stop' }
    ],
    riskManagement: {
      stopLossPercent: 3.5,
      takeProfitPercent: 9.0,
      maxPositionSize: 5,
      trailingStop: true,
      maxLossPerTrade: 2.5
    },
    timeframes: ['daily', '4h', '1h'],
    version: '1.0',
    tags: ['indicator', 'macd', 'crossover'],
    author: 'System',
    isActive: true,
    isSystem: true
  },
  
  // Engulfing Candle Strategy
  {
    id: 'engulfing-candle-strategy',
    name: 'Engulfing Candle Strategy',
    description: 'Identifies bullish and bearish engulfing candle patterns for trend reversals.',
    entryRules: [
      { id: '1', type: 'candle', value: 'engulfing', enabled: true, name: 'Engulfing Candle' },
      { id: '2', type: 'atr', value: 'high volatility', enabled: true, name: 'High ATR' },
      { id: '3', type: 'support', value: 'near level', enabled: true, name: 'Near Support/Resistance' }
    ],
    exitRules: [
      { id: '1', type: 'price', value: 'target', enabled: true, name: 'Price Target' },
      { id: '2', type: 'time', value: '15', enabled: true, name: '15-Day Exit' }
    ],
    riskManagement: {
      stopLossPercent: 2.0,
      takeProfitPercent: 6.0,
      maxPositionSize: 5,
      trailingStop: true,
      maxLossPerTrade: 1.5
    },
    timeframes: ['daily', '4h'],
    version: '1.0',
    tags: ['candlestick', 'reversal', 'engulfing'],
    author: 'System',
    isActive: true,
    isSystem: true
  }
];
