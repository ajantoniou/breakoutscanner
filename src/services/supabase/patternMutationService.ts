import { supabase } from "@/integrations/supabase/client";
import { PatternData } from "@/services/types/patternTypes";
import { BacktestResult } from "@/services/types/backtestTypes";
import { mapPatternRowToPatternData } from "./mappers/patternMappers";
import { PatternType, ChannelType, EmaPattern, PatternStatus } from "./patternTypes"; 
import { ensureDateString } from "@/utils/dateConverter";

// Interface for data being inserted into backtest_results
interface BacktestData {
  pattern_id: string;
  success: boolean;
  profit_loss_percent: number | null;
  days_to_breakout: number | null;
  days_to_target: number | null;
  max_drawdown: number | null;
  created_at: string;
  // Add the new columns
  symbol?: string | null; 
  pattern_type?: string | null;
  timeframe?: string | null;
}

// Save a pattern to Supabase
export const savePatternToSupabase = async (pattern: PatternData): Promise<PatternData | null> => {
  try {
    // Ensure ema_pattern is one of the allowed enum values
    const validEmaPatterns: EmaPattern[] = ['7over50', '7over100', '50over100', 'allBullish', 'allBearish', 'mixed', 'none'];
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
      
    // Create the pattern data object with DB column names (snake_case)
    // Reading values from the input 'pattern' object (camelCase)
    const patternData = {
      symbol: pattern.symbol,
      timeframe: pattern.timeframe,
      pattern_type: patternType, // Use validated patternType
      entry_price: pattern.entryPrice,
      target_price: pattern.targetPrice,
      confidence_score: pattern.confidenceScore,
      status: status, // Use validated status
      channel_type: channelType, // Use validated channelType
      ema_pattern: emaPattern, // Use validated emaPattern
      support_level: pattern.supportLevel,
      resistance_level: pattern.resistanceLevel,
      trendline_break: pattern.trendlineBreak,
      volume_confirmation: pattern.volumeConfirmation || false,
      stop_loss: pattern.stopLoss,
      risk_reward_ratio: pattern.riskRewardRatio,
      // Ensure createdAt exists on PatternData type or use a default
      created_at: pattern.createdAt ? ensureDateString(pattern.createdAt) : new Date().toISOString(),
    };
      
    // Insert the data into cached_patterns (assuming this is the correct table)
    const { data, error } = await supabase
      .from('cached_patterns') 
      .insert(patternData)
      .select()
      .single();
      
    if (error) {
      // Handle potential duplicate key error gracefully if pattern ID is not unique
      if (error.code === '23505') { 
        console.warn(`Pattern with symbol ${pattern.symbol} and type ${patternType} might already exist.`);
        // Optionally, fetch the existing pattern ID here if needed
        return null; 
      } else {
        console.error("Error saving pattern to Supabase:", error);
        return null;
      }
    }
      
    // Map the returned row back to PatternData type if needed
    return data ? mapPatternRowToPatternData(data) : null;
  } catch (error) {
    console.error("Exception in savePatternToSupabase:", error);
    return null;
  }
};

// Save a backtest result to Supabase
export const saveBacktestToSupabase = async (backtest: BacktestResult): Promise<boolean> => {
  try {
    // Create the backtest data object including new fields
    const backtestData: BacktestData = {
      pattern_id: backtest.patternId,
      success: backtest.successful,
      profit_loss_percent: backtest.profitLossPercent,
      days_to_breakout: backtest.candlesToBreakout,
      days_to_target: backtest.daysToTarget, 
      max_drawdown: backtest.maxDrawdown || 0,
      created_at: ensureDateString(backtest.exitDate), 
      // Add the new columns
      symbol: backtest.symbol, 
      pattern_type: backtest.patternType,
      timeframe: backtest.timeframe 
    };
    
    // Validate required fields before inserting
    if (!backtestData.pattern_id || !backtestData.symbol || !backtestData.pattern_type || !backtestData.timeframe) {
      console.error("Error saving backtest: Missing required fields (patternId, symbol, patternType, timeframe)", backtestData);
      if (!backtest.symbol || !backtest.patternType || !backtest.timeframe) {
         console.error("Input BacktestResult object is also missing symbol, patternType, or timeframe");
      }
      return false;
    }
    
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
