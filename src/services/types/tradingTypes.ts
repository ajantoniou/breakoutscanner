
// Define the TradeResult interface
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
