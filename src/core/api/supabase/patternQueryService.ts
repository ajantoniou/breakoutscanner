
import { supabase } from "@/integrations/supabase/client";
import { PatternData } from "@/services/types/patternTypes";
import { BacktestResult } from "@/services/types/backtestTypes";
import { mapPatternRowToPatternData, mapBacktestRowToBacktestResult } from "./mappers/patternMappers";

// Get all patterns from Supabase
export const getAllPatternsFromSupabase = async (): Promise<PatternData[]> => {
  const { data, error } = await supabase
    .from('patterns')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error("Error fetching patterns from Supabase:", error);
    return [];
  }
  
  return data ? data.map(mapPatternRowToPatternData) : [];
};

// Get backtest results from Supabase
export const getBacktestResultsFromSupabase = async (): Promise<BacktestResult[]> => {
  const { data: patterns, error: patternsError } = await supabase
    .from('patterns')
    .select('*');
    
  if (patternsError) {
    console.error("Error fetching patterns for backtests:", patternsError);
    return [];
  }
  
  const { data: backtests, error: backtestsError } = await supabase
    .from('backtest_results')
    .select('*');
    
  if (backtestsError) {
    console.error("Error fetching backtest results:", backtestsError);
    return [];
  }
  
  if (!patterns || !backtests) {
    return [];
  }
  
  const patternMap = new Map<string, PatternData>();
  patterns.forEach(pattern => {
    patternMap.set(pattern.id, mapPatternRowToPatternData(pattern));
  });
  
  return backtests
    .filter(backtest => patternMap.has(backtest.pattern_id))
    .map(backtest => mapBacktestRowToBacktestResult(backtest, patternMap.get(backtest.pattern_id)!));
};
