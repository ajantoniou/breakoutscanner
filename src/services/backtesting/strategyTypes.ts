// Define the basic Rule interface to fix type errors
export interface Rule {
  id: string;
  type: string;
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  condition: string;
  value: string | number | boolean;
  enabled: boolean;
}

export interface TradingStrategy {
  id: string;
  name: string;
  description: string;
  timeframes: string[];
  entryRules: Rule[];
  exitRules: Rule[];
  riskManagement: {
    stopLossPercent: number;
    takeProfitPercent: number;
    maxPositionSize: number;
    trailingStop: boolean;
    maxLossPerTrade: number;
    maxDurationDays: number;
  };
  created: string;
  lastModified: string;
  version: string;
  confidence: number;
  entryConditions: string[];
  exitConditions: string[];
  indicators: string[];
  patternTypes: string[];
  filters: {
    channelTypes: string[];
    patternTypes: string[];
    timeframes: string[];
    minConfidenceScore: number;
  };
  channelType: string | string[];
  direction: string;
  stopLoss: number;
  takeProfit: number;
  timeStop: number;
  setups: any[];
  isActive: boolean;
  tags: string[];
  isSystem: boolean;
}

export interface StrategyBacktestResult {
  strategyId: string;
  strategyName: string;
  startDate: Date | string;
  endDate: Date | string;
  startingCapital: number;
  endingCapital: number;
  netProfit: number;
  netProfitPercent: number;
  winRate: number;
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;
  riskRewardRatio: number;
  maxDrawdown: number;
  averageHoldingPeriod: number;
  expectancy?: number;
  averageLoss?: number;
  winningTrades?: number;
  losingTrades?: number;
  expectancyScore?: number;
  profitability?: number;
  // Adding missing properties
  profitFactor?: number;
  averageWin?: number;
  maxConsecutiveWins?: number;
  maxConsecutiveLosses?: number;
  sharpeRatio?: number;
  timeframe?: string;
  initialCapital?: number;
  finalCapital?: number;
  averageGain?: number;
  tradeResults?: TradeResult[];
  totalReturn?: number;
  annualizedReturn?: number;
  largestWin?: number; // Add missing property for strategyMetrics.ts
  largestLoss?: number; // Add missing property for strategyMetrics.ts
}

// Add the TradeResult interface with the required properties
export interface TradeResult {
  setupId: string;
  symbol: string;
  direction: 'long' | 'short';
  entryDate: string | Date;
  exitDate: string | Date;
  entryPrice: number;
  exitPrice: number;
  profitLoss: number;
  profitLossPercent: number;
  exitReason: string;
  barsInTrade: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  timeStopDate?: string | Date;
  maxDrawdown?: number;
  maxRunup?: number;
  timeframe?: string; // Add missing timeframe property
  durationInBars?: number; // Add missing property for strategyMetrics.ts
}
