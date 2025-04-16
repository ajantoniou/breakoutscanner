import { supabase } from "../../integrations/supabase/client";
import { 
  BacktestResult, 
  BacktestStatistics, 
  StatisticsGroup,
  HistoricalPerformance,
  BacktestStatisticsDetails,
  BacktestFilter
} from '../types/backtestTypes';

/**
 * Fetches backtest results from Supabase with optional filters
 */
export async function fetchBacktestResults(filters?: BacktestFilter): Promise<BacktestResult[]> {
  let query = supabase
    .from('backtest_results')
    .select('*');
  
  if (filters) {
    if (filters.patternType) {
      query = query.eq('pattern_type', filters.patternType);
    }
    if (filters.timeframe) {
      query = query.eq('timeframe', filters.timeframe);
    }
    if (filters.direction) {
      query = query.eq('direction', filters.direction);
    }
    if (filters.confidenceScoreMin) {
      query = query.gte('confidence_score', filters.confidenceScoreMin);
    }
    if (filters.confidenceScoreMax) {
      query = query.lte('confidence_score', filters.confidenceScoreMax);
    }
    if (filters.dateStart) {
      query = query.gte('created_at', filters.dateStart);
    }
    if (filters.dateEnd) {
      query = query.lte('created_at', filters.dateEnd);
    }
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Error fetching backtest results: ${error.message}`);
  }

  return data.map(item => ({
    id: item.id,
    patternId: item.pattern_id,
    symbol: item.symbol,
    patternType: item.pattern_type,
    direction: item.direction,
    timeframe: item.timeframe,
    entryPrice: item.entry_price,
    targetPrice: item.target_price,
    stopLossPrice: item.stop_loss_price,
    confidenceScore: item.confidence_score,
    createdAt: item.created_at,
    hasBreakout: item.has_breakout,
    breakoutTime: item.breakout_time,
    breakoutPrice: item.breakout_price,
    candlesToBreakout: item.candles_to_breakout,
    hitTarget: item.hit_target,
    hitStopLoss: item.hit_stop_loss,
    finalPrice: item.final_price,
    profitLossPercent: item.profit_loss_percent,
    riskRewardRatio: item.risk_reward_ratio
  }));
}

/**
 * Calculates statistics for a group of backtest results
 */
const calculateStatistics = (results: BacktestResult[]): StatisticsGroup => {
  if (results.length === 0) {
    return {
      totalTrades: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      avgProfitPercent: 0,
      avgLossPercent: 0,
      profitFactor: 0,
      avgCandlesToBreakout: 0
    };
  }

  const wins = results.filter(r => r.successful);
  const losses = results.filter(r => !r.successful);
  
  const winRate = wins.length / results.length;
  
  const avgProfit = wins.length > 0 
    ? wins.reduce((sum, r) => sum + r.profitLossPercent, 0) / wins.length 
    : 0;
    
  const avgLoss = losses.length > 0 
    ? Math.abs(losses.reduce((sum, r) => sum + r.profitLossPercent, 0) / losses.length)
    : 0;
    
  const totalProfit = wins.reduce((sum, r) => sum + r.profitLossAmount, 0);
  const totalLoss = Math.abs(losses.reduce((sum, r) => sum + r.profitLossAmount, 0));
  
  const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0;
  
  const avgCandlesToBreakout = results.reduce((sum, r) => sum + r.candlesToBreakout, 0) / results.length;
  
  return {
    totalTrades: results.length,
    wins: wins.length,
    losses: losses.length,
    winRate,
    avgProfitPercent: avgProfit,
    avgLossPercent: avgLoss,
    profitFactor,
    avgCandlesToBreakout
  };
};

/**
 * Computes comprehensive statistics from backtest results
 */
export function calculateBacktestStatistics(results: BacktestResult[]): BacktestStatistics {
  // Helper function to calculate statistics for a group of results
  const calculateStats = (items: BacktestResult[]): BacktestStatisticsDetails => {
    if (items.length === 0) {
      return {
        totalTrades: 0,
        winCount: 0,
        lossCount: 0,
        winRate: 0,
        avgProfitPercent: 0,
        avgLossPercent: 0,
        profitFactor: 0,
        avgCandlesToBreakout: 0
      };
    }

    const winningTrades = items.filter(item => item.hitTarget);
    const losingTrades = items.filter(item => item.hitStopLoss);
    const winCount = winningTrades.length;
    const lossCount = losingTrades.length;
    const totalTrades = items.length;
    const winRate = totalTrades > 0 ? winCount / totalTrades : 0;

    const winningProfit = winningTrades.reduce((sum, item) => sum + (item.profitLossPercent || 0), 0);
    const losingLoss = losingTrades.reduce((sum, item) => sum + (item.profitLossPercent || 0), 0);
    
    const avgProfitPercent = winCount > 0 ? winningProfit / winCount : 0;
    const avgLossPercent = lossCount > 0 ? losingLoss / lossCount : 0;
    
    const profitFactor = Math.abs(losingLoss) > 0 ? Math.abs(winningProfit / losingLoss) : winningProfit > 0 ? 999 : 0;
    
    const tradesWithBreakout = items.filter(item => item.candlesToBreakout !== null);
    const avgCandlesToBreakout = tradesWithBreakout.length > 0 
      ? tradesWithBreakout.reduce((sum, item) => sum + (item.candlesToBreakout || 0), 0) / tradesWithBreakout.length 
      : 0;

    return {
      totalTrades,
      winCount,
      lossCount,
      winRate,
      avgProfitPercent,
      avgLossPercent,
      profitFactor,
      avgCandlesToBreakout
    };
  };

  // Calculate overall statistics
  const overall = calculateStats(results);

  // Group by pattern type
  const byPatternType: Record<string, BacktestStatisticsDetails> = {};
  const patternTypes = [...new Set(results.map(r => r.patternType))];
  patternTypes.forEach(type => {
    byPatternType[type] = calculateStats(results.filter(r => r.patternType === type));
  });

  // Group by timeframe
  const byTimeframe: Record<string, BacktestStatisticsDetails> = {};
  const timeframes = [...new Set(results.map(r => r.timeframe))];
  timeframes.forEach(timeframe => {
    byTimeframe[timeframe] = calculateStats(results.filter(r => r.timeframe === timeframe));
  });

  // Group by direction
  const byDirection: Record<string, BacktestStatisticsDetails> = {};
  const directions = [...new Set(results.map(r => r.direction))];
  directions.forEach(direction => {
    byDirection[direction] = calculateStats(results.filter(r => r.direction === direction));
  });

  // Group by confidence score range
  const byConfidenceRange: Record<string, BacktestStatisticsDetails> = {};
  const ranges = ['0-25', '26-50', '51-75', '76-100'];
  ranges.forEach(range => {
    const [min, max] = range.split('-').map(Number);
    byConfidenceRange[range] = calculateStats(
      results.filter(r => r.confidenceScore >= min && r.confidenceScore <= max)
    );
  });

  return {
    overall,
    byPatternType,
    byTimeframe,
    byDirection,
    byConfidenceRange
  };
}

/**
 * Fetches historical performance data
 */
export async function fetchHistoricalPerformance(): Promise<HistoricalPerformance[]> {
  const { data, error } = await supabase
    .from('backtest_historical_performance')
    .select('*')
    .order('date', { ascending: true });

  if (error) {
    throw new Error(`Error fetching historical performance: ${error.message}`);
  }

  return data.map(item => ({
    date: item.date,
    totalTrades: item.total_trades,
    winRate: item.win_rate,
    profitFactor: item.profit_factor,
    avgCandlesToBreakout: item.avg_candles_to_breakout
  }));
} 