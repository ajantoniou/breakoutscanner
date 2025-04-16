/**
 * Pattern types definition
 */

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  ema7?: number;
  ema20?: number;
  ema50?: number;
  ema100?: number;
  ema200?: number;
  rsi14?: number;
  atr14?: number;
}

export interface PatternData {
  id: string;
  symbol: string;
  timeframe: string;
  pattern_type: string;
  direction: 'bullish' | 'bearish';
  entry_price: number;
  target_price: number;
  stop_loss: number;
  risk_reward_ratio: number;
  confidence_score: number;
  created_at: string;
  updated_at?: string;
  detected_at?: string;
  status: 'active' | 'completed' | 'failed';
  target_percent?: number;
  actual_percent?: number;
  is_ai_generated?: boolean;
  support_level?: number;
  resistance_level?: number;
  channel_type?: 'horizontal' | 'ascending' | 'descending';
  ema_pattern?: string;
  trendline_break?: boolean;
  volume_confirmation?: boolean;
  predicted_breakout_candles?: number;
  current_price?: number;
  success?: boolean;
  price_change_percent?: number;
  price_change?: number;
  ema_crossovers?: any[];
  rsi?: number;
  atr?: number;
  trendline_support?: number;
  trendline_resistance?: number;
  horizontal_support?: number;
  horizontal_resistance?: number;
  multi_timeframe_confirmed?: boolean;
}

export enum PatternDirection {
  BULLISH = 'bullish',
  BEARISH = 'bearish'
}

export enum PatternTimeframe {
  ONE_MINUTE = '1m',
  FIVE_MINUTES = '5m',
  FIFTEEN_MINUTES = '15m',
  THIRTY_MINUTES = '30m',
  ONE_HOUR = '1h',
  FOUR_HOURS = '4h',
  DAILY = 'D'
}

export enum PatternType {
  BULL_FLAG = 'Bull Flag',
  BEAR_FLAG = 'Bear Flag',
  CUP_AND_HANDLE = 'Cup and Handle',
  HEAD_AND_SHOULDERS = 'Head and Shoulders',
  DOUBLE_BOTTOM = 'Double Bottom',
  DOUBLE_TOP = 'Double Top'
}
