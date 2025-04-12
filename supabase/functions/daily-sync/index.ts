import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.3'

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseKey)

// Define the symbols we want to track for each type of scanning
const DAY_TRADING_SYMBOLS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'AMD', 'INTC', 'MU',
  'SPY', 'QQQ', 'DIA', 'IWM', 'XLF', 'XLE', 'XLK', 'XLV', 'XLI', 'XLU'
];

const SWING_TRADING_SYMBOLS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'AMD', 'JPM', 'V',
  'SPY', 'QQQ', 'DIA', 'IWM', 'XLF', 'XLE', 'XLK', 'XLV', 'XLI', 'XLU',
  'GLD', 'SLV', 'USO', 'UNG', 'ROKU', 'SHOP', 'SNAP', 'UBER', 'LYFT', 'ABNB'
];

// Update the timeframes for each type of scanning
const DAY_TRADING_TIMEFRAMES = ['1min', '5min', '15min', '30min', '1hour'];
const SWING_TRADING_TIMEFRAMES = ['4hour', 'daily', 'weekly'];

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the current date
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Format dates for API calls
    const fromDate = yesterday.toISOString().split('T')[0];
    const toDate = today.toISOString().split('T')[0];

    // Process day trading patterns
    for (const timeframe of DAY_TRADING_TIMEFRAMES) {
      console.log(`Processing day trading patterns for ${timeframe} timeframe...`);
      
      // Fetch patterns for each symbol
      for (const symbol of DAY_TRADING_SYMBOLS) {
        const { data: patterns, error: patternError } = await supabase
          .from('patterns')
          .select('*')
          .eq('symbol', symbol)
          .eq('timeframe', timeframe)
          .gte('created_at', fromDate)
          .lte('created_at', toDate);

        if (patternError) {
          console.error(`Error fetching patterns for ${symbol}:`, patternError);
          continue;
        }

        if (!patterns || patterns.length === 0) {
          console.log(`No patterns found for ${symbol} in ${timeframe} timeframe`);
          continue;
        }

        // Run backtests for each pattern
        for (const pattern of patterns) {
          // Get historical data for backtesting
          const { data: historicalData, error: historicalError } = await supabase
            .from('historical_prices')
            .select('*')
            .eq('symbol', symbol)
            .eq('timeframe', timeframe)
            .order('date', { ascending: true });

          if (historicalError) {
            console.error(`Error fetching historical data for ${symbol}:`, historicalError);
            continue;
          }

          // Calculate backtest results
          const result = calculateBacktestResult(pattern, historicalData);

          // Save backtest result
          const { error: saveError } = await supabase
            .from('backtest_results')
            .upsert({
              pattern_id: pattern.id,
              success: result.success,
              profit_loss_percent: result.profitLossPercent,
              days_to_breakout: result.candlesToBreakout,
              max_drawdown: result.maxDrawdown,
              created_at: new Date().toISOString()
            });

          if (saveError) {
            console.error(`Error saving backtest result for pattern ${pattern.id}:`, saveError);
          }
        }
      }
    }

    // Process swing trading patterns
    for (const timeframe of SWING_TRADING_TIMEFRAMES) {
      console.log(`Processing swing trading patterns for ${timeframe} timeframe...`);
      
      // Similar process for swing trading symbols
      for (const symbol of SWING_TRADING_SYMBOLS) {
        const { data: patterns, error: patternError } = await supabase
          .from('patterns')
          .select('*')
          .eq('symbol', symbol)
          .eq('timeframe', timeframe)
          .gte('created_at', fromDate)
          .lte('created_at', toDate);

        if (patternError) {
          console.error(`Error fetching patterns for ${symbol}:`, patternError);
          continue;
        }

        if (!patterns || patterns.length === 0) {
          console.log(`No patterns found for ${symbol} in ${timeframe} timeframe`);
          continue;
        }

        // Run backtests for each pattern
        for (const pattern of patterns) {
          // Get historical data for backtesting
          const { data: historicalData, error: historicalError } = await supabase
            .from('historical_prices')
            .select('*')
            .eq('symbol', symbol)
            .eq('timeframe', timeframe)
            .order('date', { ascending: true });

          if (historicalError) {
            console.error(`Error fetching historical data for ${symbol}:`, historicalError);
            continue;
          }

          // Calculate backtest results
          const result = calculateBacktestResult(pattern, historicalData);

          // Save backtest result
          const { error: saveError } = await supabase
            .from('backtest_results')
            .upsert({
              pattern_id: pattern.id,
              success: result.success,
              profit_loss_percent: result.profitLossPercent,
              days_to_breakout: result.candlesToBreakout,
              max_drawdown: result.maxDrawdown,
              created_at: new Date().toISOString()
            });

          if (saveError) {
            console.error(`Error saving backtest result for pattern ${pattern.id}:`, saveError);
          }
        }
      }
    }

    // Calculate and update model performance metrics
    await updateModelPerformanceMetrics();

    return new Response(
      JSON.stringify({ success: true, message: 'Daily sync completed successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in daily sync:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Helper function to calculate backtest results
function calculateBacktestResult(pattern: any, historicalData: any[]): any {
  const entryPrice = pattern.entry_price;
  const targetPrice = pattern.target_price;
  const stopLoss = pattern.stop_loss || (entryPrice * 0.95); // Default 5% stop loss
  const direction = pattern.direction || "bullish";
  
  let exitIndex = -1;
  let exitPrice = entryPrice;
  let successful = false;
  let maxDrawdown = 0;
  let currentDrawdown = 0;
  let candlesToBreakout = 0;
  
  // Find entry point in historical data
  const entryPointIndex = historicalData.findIndex(
    bar => new Date(bar.date).getTime() >= new Date(pattern.created_at).getTime()
  );
  
  if (entryPointIndex === -1) {
    return {
      success: false,
      profitLossPercent: 0,
      candlesToBreakout: 0,
      maxDrawdown: 0
    };
  }
  
  // Loop through data starting from entry point
  for (let i = entryPointIndex + 1; i < historicalData.length; i++) {
    const bar = historicalData[i];
    
    // Calculate current drawdown
    if (direction === "bullish") {
      currentDrawdown = (entryPrice - Math.min(bar.low, entryPrice)) / entryPrice * 100;
    } else {
      currentDrawdown = (Math.max(bar.high, entryPrice) - entryPrice) / entryPrice * 100;
    }
    
    // Update max drawdown
    maxDrawdown = Math.max(maxDrawdown, currentDrawdown);
    
    // Check for target hit
    if (direction === "bullish" && bar.high >= targetPrice) {
      exitIndex = i;
      exitPrice = targetPrice;
      successful = true;
      break;
    } else if (direction === "bearish" && bar.low <= targetPrice) {
      exitIndex = i;
      exitPrice = targetPrice;
      successful = true;
      break;
    }
    
    // Check for stop loss hit
    if (direction === "bullish" && bar.low <= stopLoss) {
      exitIndex = i;
      exitPrice = stopLoss;
      break;
    } else if (direction === "bearish" && bar.high >= stopLoss) {
      exitIndex = i;
      exitPrice = stopLoss;
      break;
    }
    
    // If we've gone through 30 bars and no exit, force exit at current close
    if (i - entryPointIndex >= 30) {
      exitIndex = i;
      exitPrice = bar.close;
      successful = direction === "bullish" ? 
        bar.close > entryPrice : 
        bar.close < entryPrice;
      break;
    }
  }
  
  // Calculate profit/loss
  const profitLoss = direction === "bullish" ? 
    exitPrice - entryPrice : 
    entryPrice - exitPrice;
  
  const profitLossPercent = (profitLoss / entryPrice) * 100;
  
  // Calculate candles to breakout
  candlesToBreakout = exitIndex - entryPointIndex;
  
  return {
    success: successful,
    profitLossPercent: profitLossPercent,
    candlesToBreakout: candlesToBreakout,
    maxDrawdown: maxDrawdown
  };
}

// Helper function to update model performance metrics
async function updateModelPerformanceMetrics() {
  try {
    // Get all backtest results
    const { data: backtestResults, error: backtestError } = await supabase
      .from('backtest_results')
      .select('*');

    if (backtestError) {
      throw backtestError;
    }

    // Calculate overall metrics
    const totalPatterns = backtestResults.length;
    const successfulPatterns = backtestResults.filter(r => r.success).length;
    const successRate = (successfulPatterns / totalPatterns) * 100;
    
    // Calculate average profit/loss
    const totalProfitLoss = backtestResults.reduce((sum, r) => sum + r.profit_loss_percent, 0);
    const avgProfitLoss = totalProfitLoss / totalPatterns;
    
    // Calculate average days to breakout
    const totalDaysToBreakout = backtestResults.reduce((sum, r) => sum + r.days_to_breakout, 0);
    const avgDaysToBreakout = totalDaysToBreakout / totalPatterns;
    
    // Calculate metrics by timeframe
    const timeframeMetrics: Record<string, any> = {};
    const timeframes = [...DAY_TRADING_TIMEFRAMES, ...SWING_TRADING_TIMEFRAMES];
    
    for (const timeframe of timeframes) {
      const timeframeResults = backtestResults.filter(r => r.timeframe === timeframe);
      const timeframeTotal = timeframeResults.length;
      const timeframeSuccess = timeframeResults.filter(r => r.success).length;
      
      timeframeMetrics[timeframe] = {
        totalPatterns: timeframeTotal,
        successRate: (timeframeSuccess / timeframeTotal) * 100,
        avgProfitLoss: timeframeResults.reduce((sum, r) => sum + r.profit_loss_percent, 0) / timeframeTotal,
        avgDaysToBreakout: timeframeResults.reduce((sum, r) => sum + r.days_to_breakout, 0) / timeframeTotal
      };
    }
    
    // Save metrics to Supabase
    const { error: metricsError } = await supabase
      .from('model_metrics')
      .upsert({
        date: new Date().toISOString(),
        total_patterns: totalPatterns,
        success_rate: successRate,
        avg_profit_loss: avgProfitLoss,
        avg_days_to_breakout: avgDaysToBreakout,
        timeframe_metrics: timeframeMetrics
      });
    
    if (metricsError) {
      throw metricsError;
    }
    
    console.log('Model performance metrics updated successfully');
  } catch (error) {
    console.error('Error updating model performance metrics:', error);
  }
} 