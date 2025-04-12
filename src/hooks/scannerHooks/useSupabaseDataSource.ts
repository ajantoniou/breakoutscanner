
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PatternData } from "@/services/types/patternTypes";
import { BacktestResult } from '@/services/types/backtestTypes';
import { adaptResultsArray } from '@/services/backtesting/resultAdapter';
import { 
  mapPatternRowToPatternData, 
  mapBacktestRowToBacktestResult,
  getAllPatternsFromSupabase,
  getBacktestResultsFromSupabase,
  savePatternToSupabase,
  saveBacktestToSupabase
} from '@/services/supabase/patternService';

export const useSupabaseDataSource = () => {
  const [supabasePatterns, setSupabasePatterns] = useState<PatternData[]>([]);
  const [supabaseBacktestResults, setSupabaseBacktestResults] = useState<BacktestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load data from Supabase
  const loadSupabaseData = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    
    try {
      // Use the service functions to get data
      const patterns = await getAllPatternsFromSupabase();
      const backtestResults = await getBacktestResultsFromSupabase();
      
      setSupabasePatterns(patterns);
      setSupabaseBacktestResults(backtestResults);
      
      console.log(`Loaded ${patterns.length} patterns and ${backtestResults.length} backtest results from Supabase`);
    } catch (error) {
      console.error("Error in loadSupabaseData:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save a pattern and its backtest result to Supabase
  const savePatternWithBacktest = useCallback(async (pattern: PatternData, backtestResult: BacktestResult): Promise<void> => {
    try {
      // Save pattern first 
      const savedPattern = await savePatternToSupabase(pattern);
      
      if (savedPattern && backtestResult) {
        // Update the backtest with the new pattern ID
        const modifiedBacktest = {
          ...backtestResult,
          patternId: savedPattern.id
        };
        
        // Save the backtest result
        await saveBacktestToSupabase(modifiedBacktest);
      }
    } catch (error) {
      console.error("Error saving pattern with backtest:", error);
    }
  }, []);

  return {
    supabasePatterns,
    supabaseBacktestResults,
    isLoading,
    loadSupabaseData,
    savePatternWithBacktest
  };
};
