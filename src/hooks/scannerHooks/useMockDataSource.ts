
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PatternData } from "@/services/types/patternTypes";
import { toast } from "sonner";

// Define the BacktestResult type inline since it's missing from patternTypes
interface BacktestResult {
  id: string;
  patternId: string;
  successful: boolean;
  profitLossPercent: number;
  maxDrawdown: number;
  daysToTarget?: number;
  daysToBreakout?: number;
  createdAt: Date;
}

export const useMockDataSource = () => {
  const [mockPatterns, setMockPatterns] = useState<PatternData[]>([]);
  const [mockBacktestResults, setMockBacktestResults] = useState<BacktestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load cached data from Supabase
  const loadMockData = async () => {
    setIsLoading(true);
    
    try {
      // Try to get cached patterns from Supabase with price filter
      const { data: cachedPatterns, error: patternsError } = await supabase
        .from('cached_patterns')
        .select('*')
        .gt('entry_price', 5) // Only stocks >$5
        .order('created_at', { ascending: false })
        .limit(500);
        
      if (patternsError) {
        console.error("Error loading cached patterns:", patternsError);
        toast.error("Failed to load cached patterns");
        return false;
      }
      
      // Try to get cached backtest results from Supabase
      const { data: backtestResults, error: backtestError } = await supabase
        .from('backtest_results')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);
        
      if (backtestError) {
        console.error("Error loading cached backtest results:", backtestError);
        toast.error("Failed to load cached backtest results");
        return false;
      }
      
      // Process the data to match our expected format
      const processedPatterns: PatternData[] = cachedPatterns?.map(pattern => ({
        id: pattern.id,
        symbol: pattern.symbol,
        patternType: pattern.pattern_type,
        channelType: pattern.channel_type as "horizontal" | "ascending" | "descending" | undefined,
        emaPattern: pattern.ema_pattern || undefined,
        timeframe: pattern.timeframe,
        entryPrice: Number(pattern.entry_price),
        targetPrice: Number(pattern.target_price),
        confidenceScore: Number(pattern.confidence_score),
        createdAt: new Date(pattern.created_at),
        updatedAt: new Date(pattern.updated_at),
        status: pattern.status as "active" | "completed" | "failed", 
        supportLevel: pattern.support_level ? Number(pattern.support_level) : undefined,
        resistanceLevel: pattern.resistance_level ? Number(pattern.resistance_level) : undefined,
        trendlineBreak: pattern.trendline_break || false,
        volumeConfirmation: pattern.volume_confirmation || false,
        // Fix here: the column name in the database is not intra_channel_pattern
        // It appears there might not be this column in the cached_patterns table
        // So we'll set a default or undefined value
        intraChannelPattern: undefined, // We'll set this as undefined since the column doesn't exist
        currentPrice: Number(pattern.entry_price),
        horizontalSupport: pattern.support_level ? Number(pattern.support_level) : Number(pattern.entry_price) * 0.95,
        horizontalResistance: pattern.resistance_level ? Number(pattern.resistance_level) : Number(pattern.entry_price) * 1.05,
        trendlineSupport: pattern.support_level ? Number(pattern.support_level) * 0.98 : Number(pattern.entry_price) * 0.93,
        trendlineResistance: pattern.resistance_level ? Number(pattern.resistance_level) * 1.02 : Number(pattern.entry_price) * 1.07,
        direction: Number(pattern.target_price) > Number(pattern.entry_price) ? 'bullish' : 'bearish',
        priceTarget: Number(pattern.target_price),
        rsi: 50,
        atr: Number(pattern.entry_price) * 0.02,
        ema7: Number(pattern.entry_price) * 1.01,
        ema50: Number(pattern.entry_price) * 0.99,
        ema100: Number(pattern.entry_price) * 0.97,
        emaCrossovers: [],
        emaSupport: [],
        volumeTrend: { increasing: false, percent: 0 },
        predictedBreakoutCandles: 5
      })) || [];
      
      const processedBacktestResults: BacktestResult[] = backtestResults?.map(result => ({
        id: result.id,
        patternId: result.pattern_id,
        successful: result.success,
        profitLossPercent: result.profit_loss_percent ? Number(result.profit_loss_percent) : 0,
        maxDrawdown: result.max_drawdown ? Number(result.max_drawdown) : 0,
        daysToTarget: result.days_to_target || 0,
        daysToBreakout: result.days_to_breakout || 0,
        createdAt: new Date(result.created_at)
      })) || [];
      
      setMockPatterns(processedPatterns);
      setMockBacktestResults(processedBacktestResults || []);
      
      toast.success(`Loaded ${processedPatterns.length} cached patterns`, {
        description: `Filtered for stocks >$5 price`
      });
      
      return processedPatterns.length > 0;
    } catch (error) {
      console.error("Error in loadMockData:", error);
      toast.error("Failed to load cached data");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    mockPatterns,
    mockBacktestResults,
    loadMockData,
    isLoading
  };
};
