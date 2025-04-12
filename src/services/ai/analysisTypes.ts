
/**
 * Interface for pattern entry analysis results
 */
export interface EntryAnalysis {
  keyLevels: {
    entry: number;
    target: number;
    stopLoss: number;
  };
  nextLevels: {
    support: number[];
    resistance: number[];
  };
  strengths: string[];
  weaknesses?: string[];
  riskRewardRatio: number;
  successProbability: number;
  timeEstimate?: {
    min: number;
    max: number;
    unit: 'days' | 'weeks' | 'months';
  };
  entrySignals?: string[];
  riskAssessment?: string;
  suggestedEntry?: number;
  confidenceScore?: number;
}

/**
 * Interface for pattern exit analysis results
 */
export interface ExitAnalysis {
  recommendation: 'exit' | 'hold' | 'scale';
  reasonSummary: string;
  targetPrice: number;
  stopLoss: number;
  targetRationale?: string;
  stopLossRationale?: string;
  riskRewardRatio: number;
  confidence: number;
  strengths: string[];
  weaknesses: string[];
  exitConditions: string[];
  technicalIndicators?: {
    rsi?: number;
    macd?: { value: number; signal: number; histogram: number };
    ema?: { ema7: number; ema21: number; ema50: number };
  };
  exitSignals?: string[];
  marketSentiment?: string;
  suggestedExit?: number;
}

/**
 * Interface for aggregated pattern analysis
 */
export interface PatternAnalysis {
  entry: EntryAnalysis;
  exit?: ExitAnalysis;
  id: string;
  pattern: string;
  symbol: string;
  timeframe: string;
  dateGenerated: string;
  version: string;
}

/**
 * Interface for market analysis results
 */
export interface MarketAnalysis {
  sentiment: 'bullish' | 'bearish' | 'neutral';
  keyLevels: { support: number[]; resistance: number[] };
  keyEvents: string[];
  sectorPerformance: Record<string, number>;
  volatilityIndex: number;
  recommendations: string[];
}
