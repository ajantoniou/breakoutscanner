
import { supabase } from "@/integrations/supabase/client";
import { PatternData } from "@/services/types/patternTypes";
import { BacktestResult } from "@/services/types/backtestTypes";
import { mapPatternRowToPatternData } from "./mappers/patternMappers";
import { PatternType, ChannelType, EmaPattern, PatternStatus, BacktestData } from "./patternTypes";
import { ensureDateString } from "@/utils/dateConverter";

// Save a pattern to Supabase
export const savePatternToSupabase = async (pattern: PatternData): Promise<PatternData | null> => {
  try {
    // Ensure ema_pattern is one of the allowed enum values
    const validEmaPatterns: EmaPattern[] = ['7over50', '7over100', '50over100', 'allBullish', 'allBearish', 'mixed'];
    const emaPattern = pattern.emaPattern && validEmaPatterns.includes(pattern.emaPattern as EmaPattern) 
      ? pattern.emaPattern as EmaPattern
      : null;
      
    // Ensure channel_type is one of the allowed enum values  
    const validChannelTypes: ChannelType[] = ['horizontal', 'ascending', 'descending'];
    const channelType = pattern.channelType && validChannelTypes.includes(pattern.channelType as ChannelType)
      ? pattern.channelType as ChannelType
      : null;
    
    // Ensure pattern_type is one of the allowed enum values
    const validPatternTypes: PatternType[] = [
      'Bull Flag', 'Bear Flag', 'Ascending Triangle', 'Descending Triangle', 
      'Symmetrical Triangle', 'Cup and Handle', 'Head and Shoulders', 
      'Inverse Head and Shoulders', 'Double Top', 'Double Bottom'
    ];
    
    const patternType = validPatternTypes.includes(pattern.patternType as PatternType)
      ? pattern.patternType as PatternType
      : 'Bull Flag'; // Default to Bull Flag if invalid
    
    // Ensure status is a valid enum value
    const validStatus: PatternStatus[] = ['active', 'completed', 'failed'];
    const status = pattern.status && validStatus.includes(pattern.status as PatternStatus)
      ? pattern.status as PatternStatus
      : 'active';
    
    // Create the pattern data object with properly typed fields
    const patternData = {
      symbol: pattern.symbol,
      timeframe: pattern.timeframe,
      pattern_type: patternType,
      entry_price: pattern.entryPrice,
      target_price: pattern.targetPrice,
      confidence_score: pattern.confidenceScore,
      status: status, 
      direction: pattern.direction || 'bullish',
      channel_type: channelType,
      ema_pattern: emaPattern,
      volume_confirmation: pattern.volumeConfirmation || false,
      created_at: ensureDateString(pattern.createdAt), // Use the utility function
      support_level: pattern.supportLevel,
      resistance_level: pattern.resistanceLevel,
      trendline_break: pattern.trendlineBreak
    };
    
    // Insert the data
    const { data, error } = await supabase
      .from('patterns')
      .insert(patternData)
      .select()
      .single();
    
    if (error) {
      console.error("Error saving pattern to Supabase:", error);
      return null;
    }
    
    return data ? mapPatternRowToPatternData(data) : null;
  } catch (error) {
    console.error("Exception in savePatternToSupabase:", error);
    return null;
  }
};

// Save a backtest result to Supabase
export const saveBacktestToSupabase = async (backtest: BacktestResult): Promise<boolean> => {
  try {
    // Create the backtest data object
    const backtestData: BacktestData = {
      pattern_id: backtest.patternId,
      success: backtest.successful,
      profit_loss_percent: backtest.profitLossPercent,
      days_to_breakout: backtest.candlesToBreakout,
      days_to_target: backtest.candlesToBreakout,
      max_drawdown: backtest.maxDrawdown || 0, // Default value
      created_at: ensureDateString(backtest.exitDate) // Use the utility function
    };
    
    // Insert the data
    const { error } = await supabase
      .from('backtest_results')
      .insert(backtestData);
    
    if (error) {
      console.error("Error saving backtest to Supabase:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Exception in saveBacktestToSupabase:", error);
    return false;
  }
};
