
// Define trading-related types and interfaces
export interface TradingStrategy {
  id: string;
  name: string;
  description: string;
  confidence: number;
  timeframes: string[];
  entryConditions: string[];
  exitConditions: string[];
  riskManagement: {
    stopLossPercent: number;
    takeProfitPercent: number;
    maxPositionSize: number;
    trailingStop: boolean;
    maxLossPerTrade: number;
  };
  indicators: string[];
  patternTypes: string[];
  created: string;
  lastModified: string;
  entryRules: any[];
  exitRules: any[];
  version: string;
  
  // Optional properties
  channelType?: string;
  direction?: string;
  stopLoss?: number;
  takeProfit?: number;
  timeStop?: number;
  filters?: {
    channelTypes: string[];
    patternTypes: string[];
    timeframes: string[];
    minConfidenceScore: number;
  };
  setups?: any[];
  tags?: string[];
  author?: string;
  isActive?: boolean;
  isSystem?: boolean;
  isBacktested?: boolean;
  backtestPerformance?: number;
  confidenceScore?: number;
}

export interface GeneratedStrategy extends TradingStrategy {
  score?: number;
}

export interface TradeSetup {
  id: string;
  name: string;
  description: string;
  patternType: string;
  timeframe: string;
  entryConditions: string[];
  exitConditions: string[];
  riskManagement: {
    stopLossPercent: number;
    takeProfitPercent: number;
  };
  created: string;
  lastModified: string;
}
