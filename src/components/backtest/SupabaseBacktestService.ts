import { supabase } from '@/core/api/supabase/client';
import { BacktestResult } from '@/services/types/backtestTypes';
import { PatternData } from '@/services/types/patternTypes';

/**
 * Fetch backtest results from Supabase
 * @param limit Optional limit for number of results
 * @param timeframes Optional array of timeframes to filter by
 * @param directions Optional array of directions to filter by
 * @param patternTypes Optional array of pattern types to filter by
 * @returns Array of backtest results
 */
export const getBacktestResultsFromSupabase = async (
  limit?: number,
  timeframes?: string[],
  directions?: string[],
  patternTypes?: string[]
): Promise<BacktestResult[]> => {
  try {
    let query = supabase
      .from('backtest_results')
      .select(`
        *,
        pattern:patterns(*)
      `)
      .order('created_at', { ascending: false });

    // Apply filters if provided
    if (timeframes && timeframes.length > 0) {
      query = query.in('timeframe', timeframes);
    }

    if (directions && directions.length > 0) {
      query = query.in('predicted_direction', directions);
    }

    if (patternTypes && patternTypes.length > 0) {
      query = query.in('pattern_type', patternTypes);
    }

    // Apply limit if provided
    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching backtest results:', error);
      throw new Error(`Error fetching backtest results: ${error.message}`);
    }

    if (!data) {
      return [];
    }

    // Convert snake_case properties to camelCase
    return data.map(item => {
      const result: BacktestResult = {
        patternId: item.pattern_id,
        symbol: item.symbol,
        timeframe: item.timeframe,
        patternType: item.pattern_type,
        predictedDirection: item.predicted_direction,
        entryPrice: item.entry_price,
        targetPrice: item.target_price,
        stopLossPrice: item.stop_loss_price,
        actualExitPrice: item.actual_exit_price,
        profitLossPercent: item.profit_loss_percent,
        successful: item.successful,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        candlesToBreakout: item.candles_to_breakout,
        pattern: item.pattern as PatternData
      };

      return result;
    });
  } catch (error) {
    console.error('Error in getBacktestResultsFromSupabase:', error);
    throw error;
  }
};

/**
 * Calculate statistics for backtest results
 * @param backtestResults Array of backtest results
 * @returns Statistics object
 */
export const calculateBacktestStatistics = (backtestResults: BacktestResult[]): Record<string, any> => {
  if (!backtestResults || backtestResults.length === 0) {
    return {};
  }

  // Overall stats
  const totalTrades = backtestResults.length;
  const wins = backtestResults.filter(r => r.successful).length;
  const winRate = (wins / totalTrades) * 100;
  
  const totalProfitPercent = backtestResults.reduce((sum, r) => sum + (r.profitLossPercent || 0), 0);
  const averageProfitLoss = totalProfitPercent / totalTrades;
  
  const totalProfits = backtestResults
    .filter(r => r.profitLossPercent > 0)
    .reduce((sum, r) => sum + r.profitLossPercent, 0);
    
  const totalLosses = Math.abs(
    backtestResults
      .filter(r => r.profitLossPercent < 0)
      .reduce((sum, r) => sum + r.profitLossPercent, 0)
  );
  
  const profitFactor = totalLosses === 0 ? totalProfits : totalProfits / totalLosses;

  // Group by timeframe
  const timeframeMap = new Map<string, BacktestResult[]>();
  
  backtestResults.forEach(result => {
    const timeframe = result.timeframe || 'Unknown';
    if (!timeframeMap.has(timeframe)) {
      timeframeMap.set(timeframe, []);
    }
    timeframeMap.get(timeframe)!.push(result);
  });
  
  const byTimeframe: Record<string, any> = {};
  
  timeframeMap.forEach((results, timeframe) => {
    const tfTotalTrades = results.length;
    const tfWins = results.filter(r => r.successful).length;
    const tfWinRate = (tfWins / tfTotalTrades) * 100;
    
    const tfTotalProfits = results
      .filter(r => r.profitLossPercent > 0)
      .reduce((sum, r) => sum + r.profitLossPercent, 0);
      
    const tfTotalLosses = Math.abs(
      results
        .filter(r => r.profitLossPercent < 0)
        .reduce((sum, r) => sum + r.profitLossPercent, 0)
    );
    
    const tfProfitFactor = tfTotalLosses === 0 ? tfTotalProfits : tfTotalProfits / tfTotalLosses;
    
    byTimeframe[timeframe] = {
      totalTrades: tfTotalTrades,
      wins: tfWins,
      winRate: tfWinRate,
      profitFactor: tfProfitFactor
    };
  });

  // Group by pattern type
  const patternMap = new Map<string, BacktestResult[]>();
  
  backtestResults.forEach(result => {
    const patternType = result.patternType || 'Unknown';
    if (!patternMap.has(patternType)) {
      patternMap.set(patternType, []);
    }
    patternMap.get(patternType)!.push(result);
  });
  
  const byPatternType: Record<string, any> = {};
  
  patternMap.forEach((results, patternType) => {
    const ptTotalTrades = results.length;
    const ptWins = results.filter(r => r.successful).length;
    const ptWinRate = (ptWins / ptTotalTrades) * 100;
    
    const ptTotalProfits = results
      .filter(r => r.profitLossPercent > 0)
      .reduce((sum, r) => sum + r.profitLossPercent, 0);
      
    const ptTotalLosses = Math.abs(
      results
        .filter(r => r.profitLossPercent < 0)
        .reduce((sum, r) => sum + r.profitLossPercent, 0)
    );
    
    const ptProfitFactor = ptTotalLosses === 0 ? ptTotalProfits : ptTotalProfits / ptTotalLosses;
    
    byPatternType[patternType] = {
      totalTrades: ptTotalTrades,
      wins: ptWins,
      winRate: ptWinRate,
      profitFactor: ptProfitFactor
    };
  });

  // Group by direction
  const directionMap = new Map<string, BacktestResult[]>();
  
  backtestResults.forEach(result => {
    const direction = result.predictedDirection || 'Unknown';
    if (!directionMap.has(direction)) {
      directionMap.set(direction, []);
    }
    directionMap.get(direction)!.push(result);
  });
  
  const byDirection: Record<string, any> = {};
  
  directionMap.forEach((results, direction) => {
    const dirTotalTrades = results.length;
    const dirWins = results.filter(r => r.successful).length;
    const dirWinRate = (dirWins / dirTotalTrades) * 100;
    
    const dirTotalProfits = results
      .filter(r => r.profitLossPercent > 0)
      .reduce((sum, r) => sum + r.profitLossPercent, 0);
      
    const dirTotalLosses = Math.abs(
      results
        .filter(r => r.profitLossPercent < 0)
        .reduce((sum, r) => sum + r.profitLossPercent, 0)
    );
    
    const dirProfitFactor = dirTotalLosses === 0 ? dirTotalProfits : dirTotalProfits / dirTotalLosses;
    
    byDirection[direction] = {
      totalTrades: dirTotalTrades,
      wins: dirWins,
      winRate: dirWinRate,
      profitFactor: dirProfitFactor
    };
  });

  return {
    overall: {
      totalTrades,
      wins,
      winRate,
      averageProfitLoss,
      profitFactor
    },
    byTimeframe,
    byPatternType,
    byDirection
  };
};

/**
 * Get historical backtest performance data
 * Shows how the backtest accuracy has changed over time
 * @returns Historical performance data
 */
export const getHistoricalPerformanceData = async (): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('backtest_performance_history')
      .select('*')
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching historical performance data:', error);
      throw new Error(`Error fetching historical performance data: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error in getHistoricalPerformanceData:', error);
    throw error;
  }
}; 