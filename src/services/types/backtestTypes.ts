import { PatternData } from "./patternTypes";

export interface BacktestResult {
  id: string;
  pattern_id: string;
  symbol: string;
  pattern_type: string;
  direction: 'bullish' | 'bearish';
  timeframe: string;
  entry_date: string;
  entry_price: number;
  exit_date: string | null;
  exit_price: number | null;
  profit_loss_percent: number | null;
  r_multiple: number | null;
  confidence_score: number;
  result: 'win' | 'loss' | 'pending' | null;
  created_at: string;
  updated_at: string;
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

export interface StatisticsGroup {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  profitFactor: number;
  avgProfitPercent: number;
  avgLossPercent: number;
  avgCandlesToBreakout: number;
}

export interface SubStatistics {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  avgProfitPercent: number;
  avgLossPercent: number;
  profitFactor: number;
  avgCandlesToBreakout: number;
}

export interface BacktestStatisticsDetails {
  totalTrades: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  avgProfitPercent: number;
  avgLossPercent: number;
  profitFactor: number;
  avgCandlesToBreakout: number;
}

export interface BacktestStatistics {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  expectancy: number;
  sharpeRatio?: number;
  maxDrawdown: number;
  averageDaysInTrade: number;
  averageRMultiple: number;
  consecutiveWins: number;
  consecutiveLosses: number;
}

export interface BacktestHistoricalPerformance {
  date: string;
  equity: number;
  drawdown: number;
  trades: number;
  winRate: number;
}

export interface BacktestAnalyticsData {
  // Performance metrics
  winRate: number;
  profitFactor: number;
  averageRMultiple: number;
  expectancy: number;
  
  // Trade statistics
  totalTrades: number;
  totalWins: number;
  totalLosses: number;
  pendingTrades: number;
  
  // Profit/Loss metrics
  totalProfitLossPercent: number;
  averageWinPercent: number;
  averageLossPercent: number;
  winLossRatio: number;
  
  // Pattern analysis
  bestPattern: string | null;
  bestPatternWinRate: number | null;
  bestTimeframe: string | null;
  averageDaysHeld: number | null;
}

export interface BacktestFilter {
  symbol?: string | null;
  pattern_type?: string | null;
  direction?: 'bullish' | 'bearish' | null;
  timeframe?: string | null;
  confidence_min?: number | null;
  confidence_max?: number | null;
  result?: 'win' | 'loss' | 'pending' | null;
  date_from?: string | null;
  date_to?: string | null;
}

export interface BacktestPagination {
  page: number;
  rowsPerPage: number;
  totalResults: number;
}

export interface BacktestPatternPerformance {
  pattern_type: string;
  total_trades: number;
  win_count: number;
  loss_count: number;
  win_rate: number;
  avg_profit: number;
  avg_loss: number;
  profit_factor: number;
  expectancy: number;
}

export interface BacktestTimeframePerformance {
  timeframe: string;
  total_trades: number;
  win_count: number;
  loss_count: number;
  win_rate: number;
  avg_profit: number;
  avg_days_held: number;
  profit_factor: number;
}

export interface BacktestSymbolPerformance {
  symbol: string;
  total_trades: number;
  win_count: number;
  loss_count: number;
  win_rate: number;
  avg_profit: number;
  profit_factor: number;
  best_pattern: string;
}

export interface BacktestPerformanceTrend {
  month: string;
  trades: number;
  win_rate: number;
  profit_factor: number;
  avg_profit: number;
}

export interface BacktestAnalyticsResponse {
  results: BacktestResult[];
  statistics: BacktestStatistics;
  historicalPerformance: BacktestHistoricalPerformance[];
  patternPerformance: BacktestPatternPerformance[];
  timeframePerformance: BacktestTimeframePerformance[];
  symbolPerformance: BacktestSymbolPerformance[];
  performanceTrend: BacktestPerformanceTrend[];
}

export interface SupabaseBacktestResult {
  id: string;
  pattern_id: string;
  symbol: string;
  pattern_type: string;
  timeframe: string;
  direction: 'bullish' | 'bearish';
  entry_price: number;
  target_price: number;
  stop_loss: number;
  outcome: 'win' | 'loss' | 'open';
  profit_percent: number;
  candles_to_breakout: number;
  backtest_date: string;
  confidence_score: number;
}
