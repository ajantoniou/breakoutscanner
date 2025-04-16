export interface PatternFilter {
  symbol?: string;
  pattern_type?: string;
  timeframe?: string;
  direction?: 'bullish' | 'bearish';
  confidence_score_min?: number;
  confidence_score_max?: number;
  risk_reward_min?: number;
  is_active?: boolean;
  is_ai_generated?: boolean;
}

export interface FilterPreset {
  id: string;
  name: string;
  filters: PatternFilter;
  created_at: string;
  updated_at: string;
} 