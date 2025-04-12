
import { PatternData } from "./patternTypes";

export interface BacktestResult {
  patternId: string;
  symbol: string;
  timeframe: string;
  patternType: string;
  entryPrice: number;
  targetPrice: number;
  stopLoss?: number;
  actualExitPrice: number;
  predictedDirection: "bullish" | "bearish";
  actualDirection: "bullish" | "bearish";
  entryDate: string;
  exitDate: string;
  candlesToBreakout: number;
  successful: boolean;
  profitLoss: number;
  profitLossPercent: number;
  isSimulated?: boolean;
  maxDrawdown?: number;
  rsiAtEntry?: number;
  atrAtEntry?: number;
  macdAtEntry?: number;
  macdSignalAtEntry?: number;
  macdHistogramAtEntry?: number;
  confidenceScore?: number;
  riskRewardRatio?: number;
}

export interface BacktestParameters {
  symbol: string;
  timeframe: string;
  patternType: string;
  entryPrice: number;
  targetPrice: number;
  stopLoss?: number;
  entryDate: string;
  direction: "bullish" | "bearish";
  confidenceScore?: number;
}

export interface ScannerFilterPreset {
  id: string;
  name: string;
  patternTypes: string[];
  channelTypes: string[];
  emaPatterns: string[];
  timeframe: string;
  createdAt: string;
  description?: string;
  minPrice?: number;
  maxPrice?: number;
  minVolume?: number;
  isDefault?: boolean;
}

export interface PerformanceMetrics {
  avgSuccessRate: number;
  avgProfitPercent: number;
  overallAccuracy: number;
  totalPatterns: number;
  successfulPatterns: number;
  timeframeAccuracy: Record<string, number>;
  patternTypeAccuracy?: Record<string, number>;
}

export interface PatternPerformance {
  patternType: string;
  successRate: number;
  averageReturn: number;
  sampleSize: number;
  timeframes: string[];
  
  // Add missing fields to match PatternPerformance in patternTypes.ts
  avgReturn?: number;
  count?: number;
  winRate: number;
  averageHoldingPeriod: number;
  totalTrades: number;
  successfulTrades: number;
}

export interface RealTimeQuote {
  symbol: string;
  price: number;
  previousClose?: number;
  percentChange?: number;
  change?: number;
  volume?: number;
  timestamp: string; // Changed to string for consistency
}

// Update ScannerStatusIndicatorProps to include all required properties
export interface ScannerStatusIndicatorProps {
  isLoading: boolean;
  error?: string | null;
  lastUpdated?: Date | string | null;
  usingCachedData?: boolean;
  onRefresh?: () => void;
  
  // Additional properties used by components
  timeframe?: string;
  patternsCount?: number;
  uniqueSymbolsCount?: number;
  lastRefresh?: Date;
  performanceMetrics?: PerformanceMetrics;
  scannerType?: "daytrader" | "swing" | "standard";
  autoRefreshInterval?: number;
  isRealTimeConnected?: boolean;
  marketOpen?: boolean;
}

// Add ApiKeyConfig interface to fix imports
export interface ApiKeyConfig {
  key: string;
  provider: string;
  isPremium: boolean;
}
