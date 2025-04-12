import { createClient } from '@supabase/supabase-js';
import { PatternData } from '@/services/types/patternTypes';
import { BreakoutData } from '@/services/api/marketData/patternDetection/breakoutDetector';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ttmeplqmrjhysyqzuaoh.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0bWVwbHFtcmpoeXN5cXp1YW9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyMTU0NzAsImV4cCI6MjA1ODc5MTQ3MH0.38s2h7dvsOPYk_CmC8dS2h3VSCDClezIlQ4VgBFn2Ek';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Supabase service for pattern-related operations
 */
class SupabasePatternService {
  /**
   * Save pattern to Supabase
   * @param pattern Pattern data to save
   * @returns Promise with saved pattern data
   */
  async savePattern(pattern: PatternData | BreakoutData): Promise<PatternData | BreakoutData | null> {
    try {
      // Convert pattern to database format
      const patternData = {
        symbol: pattern.symbol,
        pattern_type: 'patternType' in pattern ? pattern.patternType : pattern.breakoutType,
        direction: pattern.direction,
        timeframe: pattern.timeframe,
        entry_price: pattern.entry,
        target_price: pattern.target,
        stop_loss: pattern.stopLoss,
        risk_reward_ratio: pattern.riskRewardRatio,
        potential_profit: pattern.potentialProfit,
        confidence_score: pattern.confidenceScore,
        multi_timeframe_confirmation: pattern.multiTimeframeConfirmation,
        detected_at: pattern.detectedAt,
        candle_data: JSON.stringify(pattern.candleData),
        verified: false
      };
      
      // Insert pattern into database
      const { data, error } = await supabase
        .from('patterns')
        .insert(patternData)
        .select()
        .single();
      
      if (error) {
        console.error('Error saving pattern:', error);
        return null;
      }
      
      // Convert database format back to pattern
      return {
        ...pattern,
        id: data.id
      };
    } catch (error) {
      console.error('Error saving pattern:', error);
      return null;
    }
  }
  
  /**
   * Get patterns from Supabase
   * @param mode Scanner mode
   * @param timeframe Timeframe to filter by
   * @param limit Maximum number of patterns to return
   * @returns Promise with array of patterns
   */
  async getPatterns(mode: 'day' | 'swing' | 'golden', timeframe: string, limit: number = 100): Promise<(PatternData | BreakoutData)[]> {
    try {
      // Determine timeframes to include based on mode
      let timeframes: string[] = [];
      if (mode === 'day') {
        timeframes = ['15m', '30m', '1h'];
      } else if (mode === 'swing') {
        timeframes = ['1h', '4h', '1d', '1w'];
      } else {
        timeframes = ['15m', '30m', '1h', '4h', '1d', '1w'];
      }
      
      // Only include the specified timeframe if it's in the allowed timeframes for the mode
      if (!timeframes.includes(timeframe)) {
        timeframe = timeframes[0];
      }
      
      // Query patterns from database
      const { data, error } = await supabase
        .from('patterns')
        .select('*')
        .eq('timeframe', timeframe)
        .order('detected_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('Error getting patterns:', error);
        return [];
      }
      
      // Convert database format to pattern format
      return data.map(item => {
        const isBreakout = item.pattern_type.includes('Breakout');
        
        const basePattern = {
          id: item.id,
          symbol: item.symbol,
          direction: item.direction,
          timeframe: item.timeframe,
          entry: item.entry_price,
          target: item.target_price,
          stopLoss: item.stop_loss,
          riskRewardRatio: item.risk_reward_ratio,
          potentialProfit: item.potential_profit,
          confidenceScore: item.confidence_score,
          multiTimeframeConfirmation: item.multi_timeframe_confirmation,
          detectedAt: item.detected_at,
          candleData: JSON.parse(item.candle_data)
        };
        
        if (isBreakout) {
          return {
            ...basePattern,
            breakoutType: item.pattern_type,
            breakoutLevel: item.entry_price * 0.99, // Approximate
            volumeConfirmation: true
          } as BreakoutData;
        } else {
          return {
            ...basePattern,
            patternType: item.pattern_type
          } as PatternData;
        }
      });
    } catch (error) {
      console.error('Error getting patterns:', error);
      return [];
    }
  }
  
  /**
   * Get backtest results from Supabase
   * @returns Promise with backtest statistics
   */
  async getBacktestStats(): Promise<{
    avgCandlesToBreakout: Record<string, number>;
    winRateByTimeframe: Record<string, number>;
    profitFactorByTimeframe: Record<string, number>;
  }> {
    try {
      // Query backtest results from database
      const { data, error } = await supabase
        .from('backtest_results')
        .select('*');
      
      if (error) {
        console.error('Error getting backtest results:', error);
        return {
          avgCandlesToBreakout: {},
          winRateByTimeframe: {},
          profitFactorByTimeframe: {}
        };
      }
      
      // Process backtest results to calculate statistics
      const timeframes = ['15m', '30m', '1h', '4h', '1d', '1w'];
      const stats = {
        avgCandlesToBreakout: {},
        winRateByTimeframe: {},
        profitFactorByTimeframe: {}
      };
      
      // If no data, return default values
      if (!data || data.length === 0) {
        timeframes.forEach(tf => {
          stats.avgCandlesToBreakout[tf] = 0;
          stats.winRateByTimeframe[tf] = 0;
          stats.profitFactorByTimeframe[tf] = 0;
        });
        return stats;
      }
      
      // Group results by timeframe
      const resultsByTimeframe: Record<string, any[]> = {};
      timeframes.forEach(tf => {
        resultsByTimeframe[tf] = data.filter(r => r.timeframe === tf);
      });
      
      // Calculate statistics for each timeframe
      timeframes.forEach(tf => {
        const results = resultsByTimeframe[tf];
        
        if (results.length === 0) {
          stats.avgCandlesToBreakout[tf] = 0;
          stats.winRateByTimeframe[tf] = 0;
          stats.profitFactorByTimeframe[tf] = 0;
          return;
        }
        
        // Calculate average candles to breakout
        const totalCandles = results.reduce((sum, r) => sum + (r.candles_to_breakout || 0), 0);
        stats.avgCandlesToBreakout[tf] = totalCandles / results.length;
        
        // Calculate win rate
        const wins = results.filter(r => r.is_win).length;
        stats.winRateByTimeframe[tf] = (wins / results.length) * 100;
        
        // Calculate profit factor
        const grossProfit = results.filter(r => r.is_win).reduce((sum, r) => sum + (r.profit_percentage || 0), 0);
        const grossLoss = results.filter(r => !r.is_win).reduce((sum, r) => sum + Math.abs(r.loss_percentage || 0), 0);
        stats.profitFactorByTimeframe[tf] = grossLoss === 0 ? grossProfit : grossProfit / grossLoss;
      });
      
      return stats;
    } catch (error) {
      console.error('Error getting backtest stats:', error);
      return {
        avgCandlesToBreakout: {},
        winRateByTimeframe: {},
        profitFactorByTimeframe: {}
      };
    }
  }
  
  /**
   * Save backtest result to Supabase
   * @param patternId Pattern ID
   * @param result Backtest result data
   * @returns Promise with saved backtest result
   */
  async saveBacktestResult(patternId: string, result: any): Promise<any> {
    try {
      // Insert backtest result into database
      const { data, error } = await supabase
        .from('backtest_results')
        .insert({
          pattern_id: patternId,
          is_win: result.isWin,
          profit_percentage: result.profitPercentage,
          loss_percentage: result.lossPercentage,
          candles_to_breakout: result.candlesToBreakout,
          timeframe: result.timeframe,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error saving backtest result:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error saving backtest result:', error);
      return null;
    }
  }
}

export default new SupabasePatternService();
