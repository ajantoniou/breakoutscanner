/**
 * Pattern types definition
 */

export interface PatternData {
  id: string;
  symbol: string;
  timeframe: string;
  patternType: string;
  direction: 'bullish' | 'bearish';
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  confidenceScore: number;
  createdAt: string;
  status: 'active' | 'completed' | 'failed';
  multiTimeframeConfirmed?: boolean;
  volumeConfirmation?: boolean;
}
