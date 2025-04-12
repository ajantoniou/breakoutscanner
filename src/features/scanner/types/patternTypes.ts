
// Define valid pattern types according to the database enum
export type PatternType = "Bull Flag" | "Bear Flag" | "Ascending Triangle" | "Descending Triangle" | 
  "Symmetrical Triangle" | "Cup and Handle" | "Head and Shoulders" | "Inverse Head and Shoulders" | 
  "Double Top" | "Double Bottom";

export interface PatternData {
  id: string;
  symbol: string;
  patternType: string;
  direction?: "bullish" | "bearish" | "neutral";
  timeframe: string;
  createdAt: string; // ISO date string
  updatedAt?: string; // ISO date string
  lastUpdated?: string; // ISO date string
  entryPrice: number;
  targetPrice: number;
  stopLoss?: number;
  confidenceScore?: number;
  status: "active" | "completed" | "failed";
  targetPercent?: number;
  actualPercent?: number;
  isAiGenerated?: boolean;
  supportLevel?: number;
  resistanceLevel?: number;
  channelType?: "horizontal" | "ascending" | "descending";
  emaPattern?: string;
  trendlineBreak?: boolean;
  volumeConfirmation?: boolean;
  predictedBreakoutCandles?: number; // Add this property
  currentPrice?: number;
  success?: boolean;
  priceChangePercent?: number;
  priceChange?: number;
  emaCrossovers?: any[];
  
  // Additional properties needed by components
  rsi?: number;
  atr?: number;
  trendlineSupport?: number;
  trendlineResistance?: number;
  horizontalSupport?: number;
  horizontalResistance?: number;
}

export interface AlertData {
  id: string;
  patternId: string;
  symbol: string;
  message: string;
  type: "entry" | "exit" | "stop" | "warning" | "info";
  createdAt: string;
  isRead: boolean;
  priority: "high" | "medium" | "low";
  targetPrice?: number;
  currentPrice?: number;
  timeframe?: string;
  patternType?: string;
  
  // Add properties used in components
  pattern?: PatternData;
  read?: boolean; // Alias for isRead for backward compatibility
  timestamp?: string; // Add missing timestamp property
}

export interface TimeframeStats {
  timeframe: string;
  accuracyRate: number;
  avgDaysToBreakout: number;
  successRate: number;
  totalPatterns: number;
  avgProfit: number; // Important to include
  successfulPatterns?: number;
}

export interface PatternPerformance {
  patternType: string;
  successRate: number;
  averageReturn: number;
  sampleSize: number;
  timeframes: string[];
  // Add these fields to match different PatternPerformance interfaces
  avgReturn?: number;
  count?: number;
  winRate: number;
  averageHoldingPeriod: number;
  totalTrades: number;
  successfulTrades: number;
}
