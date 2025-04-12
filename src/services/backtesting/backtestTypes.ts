// Basic types for backtesting

export interface HistoricalPrice {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  symbol?: string;
  isSimulated?: boolean;
  
  // Technical indicators
  rsi?: number;
  atr?: number;
  macd?: number;
  macdSignal?: number;
  macdHistogram?: number;
}

export interface BacktestResult {
  patternId: string;
  symbol: string;
  timeframe: string;
  patternType: string;
  entryPrice: number;
  targetPrice: number;
  stopLoss?: number;
  actualExitPrice: number;
  predictedDirection: 'bullish' | 'bearish';
  actualDirection: 'bullish' | 'bearish';
  entryDate: Date;
  exitDate: Date;
  candlesToBreakout: number;
  successful: boolean;
  profitLoss: number;
  profitLossPercent: number;
  isSimulated?: boolean;
  maxDrawdown: number;
  
  // Technical indicators at entry
  rsiAtEntry?: number;
  atrAtEntry?: number;
  macdAtEntry?: number;
  macdSignalAtEntry?: number;
  macdHistogramAtEntry?: number;
  confidenceScore?: number;
  riskRewardRatio?: number;
}

export interface BacktestSummary {
  totalPatterns: number;
  successfulPatterns: number;
  failedPatterns: number;
  successRate: number;
  avgCandlesToBreakout: number;
  avgProfitLossPercent: number;
  timeframe: string;
  patternType?: string;
  isSimulated: boolean;
  avgRsiAtEntry: number;
  avgAtrPercent: number;
  maxProfit: number;
  maxLoss: number;
  avgConfidenceScore: number;
  avgRiskRewardRatio: number;
  consistencyScore: number;
  maxWinStreak: number;
  maxLossStreak: number;
  avgWin: number;
  avgLoss: number;
  riskRewardRatio: number;
}

export interface ApiKeyConfig {
  key: string;
  provider: string;
  isPremium: boolean;
}
