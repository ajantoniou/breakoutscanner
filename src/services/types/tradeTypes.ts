
// Define trade-related types and interfaces

/**
 * Interface for TradeListItem used in components
 */
export interface TradeListItem {
  id: string;
  symbol: string;
  patternType: string;
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  entryDate: string;
  exitDate: string | null;
  exitPrice: number | null;
  timeframe: string;
  status: "active" | "completed" | "cancelled";
  confidenceScore: number;
  riskRewardRatio: number;
  direction: "bullish" | "bearish";
  profitLoss: number;
  profitLossPercent: number; 
  performance: any;
  exitSignal: string;
  lastUpdated: string;
  breakoutProgress?: number;
  aiSummary?: string;
  stopLossPrice?: number;  
}

/**
 * Interface for trade statistics
 */
export interface TradeStats {
  successRate: number;
  avgReturn: number;
  totalTrades: number;
  successfulTrades: number;
  totalLoss: number;
  totalProfit: number;
  largestWin: number;
  largestLoss: number;
  avgHoldingDays: number;
  count?: number;
  winRate?: number;
  
  // Additional properties needed by components
  activeTrades?: number;
  completedTrades?: number;
  avgHoldingPeriod?: number;
  averageHoldingPeriod?: number;
  averageProfit?: number;
  timeframePerformance?: Record<string, any>;
}

// Alias for backward compatibility
export type TradeStatistics = TradeStats;

/**
 * Trade result interface for strategy backtest results
 */
export interface TradeResult {
  successful: boolean;
  profitLoss: number;
  profitLossPercent: number;
  holdingPeriodDays: number;
  entryPrice: number;
  exitPrice: number;
  timeframe: string;
  symbol: string;
}
