
import { PatternData } from "@/services/types/patternTypes";
import { BacktestResult } from "@/services/types/backtestTypes";
import { ensureDateString } from "@/utils/dateConverter";

// Map a pattern row from Supabase to a PatternData object
export const mapPatternRowToPatternData = (row: any): PatternData => {
  return {
    id: row.id,
    symbol: row.symbol,
    patternType: row.pattern_type,
    direction: row.direction || 'bullish',
    timeframe: row.timeframe,
    createdAt: ensureDateString(row.created_at), // Convert to string
    updatedAt: ensureDateString(row.updated_at), // Convert to string
    entryPrice: row.entry_price,
    targetPrice: row.target_price,
    stopLoss: row.stop_loss,
    confidenceScore: row.confidence_score,
    status: row.status,
    supportLevel: row.support_level,
    resistanceLevel: row.resistance_level,
    channelType: row.channel_type,
    emaPattern: row.ema_pattern,
    trendlineBreak: row.trendline_break,
    volumeConfirmation: row.volume_confirmation,
    // Add defaults for any missing required properties
    currentPrice: row.current_price,
    success: row.success || false,
    priceChangePercent: row.price_change_percent || 0,
    priceChange: row.price_change || 0
  };
};

// Map a backtest result row from Supabase to a BacktestResult object
export const mapBacktestRowToBacktestResult = (row: any, pattern: PatternData): BacktestResult => {
  const predictedDirection = pattern.targetPrice > pattern.entryPrice ? 'bullish' : 'bearish';
  const profitLossPercent = row.profit_loss_percent || 0;
  
  // Calculate actual exit price based on profit/loss percentage
  const actualExitPrice = pattern.entryPrice * (1 + (profitLossPercent / 100));
  
  return {
    patternId: row.pattern_id || pattern.id,
    symbol: pattern.symbol,
    timeframe: pattern.timeframe,
    patternType: pattern.patternType,
    entryPrice: pattern.entryPrice,
    targetPrice: pattern.targetPrice,
    stopLoss: pattern.stopLoss,
    actualExitPrice: actualExitPrice,
    predictedDirection: predictedDirection,
    actualDirection: row.success ? predictedDirection : (predictedDirection === 'bullish' ? 'bearish' : 'bullish'),
    entryDate: ensureDateString(pattern.createdAt), // Use our date conversion utility
    exitDate: ensureDateString(row.created_at), // Use our date conversion utility
    candlesToBreakout: row.days_to_breakout || 0,
    successful: row.success,
    profitLoss: pattern.entryPrice * (profitLossPercent / 100),
    profitLossPercent: profitLossPercent,
    maxDrawdown: row.max_drawdown || 0
  };
};
