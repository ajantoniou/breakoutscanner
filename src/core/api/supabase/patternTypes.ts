
// Define valid pattern types according to the database enum
export type PatternType = "Bull Flag" | "Bear Flag" | "Ascending Triangle" | "Descending Triangle" | 
  "Symmetrical Triangle" | "Cup and Handle" | "Head and Shoulders" | "Inverse Head and Shoulders" | 
  "Double Top" | "Double Bottom";

export type ChannelType = "horizontal" | "ascending" | "descending";
export type EmaPattern = "7over50" | "7over100" | "50over100" | "allBullish" | "allBearish" | "mixed";
export type PatternStatus = "active" | "completed" | "failed";

// Interface for backtest data to be sent to Supabase
export interface BacktestData {
  pattern_id: string;
  success: boolean;
  profit_loss_percent: number;
  days_to_breakout: number;
  days_to_target: number;
  max_drawdown: number;
  created_at: string;
}
