
import { supabase } from "@/integrations/supabase/client";
import { HistoricalPrice } from "@/services/backtesting/backtestTypes";

/**
 * Save historical price data to Supabase
 */
export const saveHistoricalPrices = async (
  historicalData: HistoricalPrice[],
  symbol: string,
  timeframe: string
): Promise<boolean> => {
  if (!historicalData || historicalData.length === 0) {
    console.warn("No historical data to save");
    return false;
  }

  try {
    // Map data to the format expected by the historical_prices table
    const dataToInsert = historicalData.map(price => ({
      symbol,
      timeframe,
      date: price.date.toISOString(), // Convert Date to ISO string for Supabase
      open: price.open, // Keep as number
      high: price.high, // Keep as number
      low: price.low, // Keep as number
      close: price.close, // Keep as number
      volume: price.volume, // Keep as number
    }));

    // Insert data using upsert to avoid duplicate entries
    const { error } = await supabase
      .from('historical_prices')
      .upsert(dataToInsert, { 
        onConflict: 'symbol,timeframe,date',
        ignoreDuplicates: true
      });
    
    if (error) {
      console.error("Error saving historical prices:", error);
      return false;
    }
    
    console.log(`Successfully cached ${dataToInsert.length} price records for ${symbol} (${timeframe})`);
    return true;
  } catch (error) {
    console.error("Exception saving historical prices:", error);
    return false;
  }
};

/**
 * Retrieve historical price data from Supabase
 */
export const getHistoricalPrices = async (
  symbol: string,
  timeframe: string,
  lookbackDays: number = 365
): Promise<HistoricalPrice[] | null> => {
  try {
    // Calculate the date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - lookbackDays);
    
    const { data, error } = await supabase
      .from('historical_prices')
      .select('*')
      .eq('symbol', symbol)
      .eq('timeframe', timeframe)
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString())
      .order('date', { ascending: false });
    
    if (error) {
      console.error("Error fetching historical prices:", error);
      return null;
    }
    
    if (!data || data.length === 0) {
      return null;
    }
    
    // Transform data to match the HistoricalPrice interface
    return data.map(row => ({
      symbol: row.symbol,
      date: new Date(row.date), // Convert ISO string back to Date
      open: row.open, // Already a number
      high: row.high, // Already a number
      low: row.low, // Already a number
      close: row.close, // Already a number
      volume: row.volume, // Already a number
    }));
  } catch (error) {
    console.error("Exception fetching historical prices:", error);
    return null;
  }
};
