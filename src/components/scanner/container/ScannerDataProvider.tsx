
import React, { createContext, useState, useEffect } from 'react';
import { toast } from "sonner";
import { PatternData } from '@/services/types/patternTypes';
import { BacktestResult } from '@/services/types/backtestTypes';

interface ScannerDataContextType {
  patterns: PatternData[];
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  backtestResults: BacktestResult[];
}

export const ScannerDataContext = createContext<ScannerDataContextType>({
  patterns: [],
  loading: false,
  error: null,
  refreshData: async () => {},
  backtestResults: []
});

interface ScannerDataProviderProps {
  children: React.ReactNode;
  timeframe?: string;
  initialPatterns?: PatternData[];
}

export const ScannerDataProvider: React.FC<ScannerDataProviderProps> = ({ 
  children,
  timeframe = 'daily',
  initialPatterns = []
}) => {
  const [patterns, setPatterns] = useState<PatternData[]>(initialPatterns);
  const [backtestResults, setBacktestResults] = useState<BacktestResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Load patterns on mount if none provided
  useEffect(() => {
    if (initialPatterns.length === 0) {
      refreshData();
    }
  }, []);
  
  // Refresh data
  const refreshData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // In a real implementation, this would fetch data from an API
      // For now, just simulate a delay and use mock data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate patterns based on timeframe
      const mockPatterns: PatternData[] = [];
      
      setPatterns(mockPatterns);
      setBacktestResults([]);
      
      // Simulate backtests
      
      // Success message
      toast("Pattern data refreshed");
    } catch (err) {
      console.error("Error refreshing pattern data:", err);
      setError("Failed to load pattern data");
      toast("Failed to refresh pattern data");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <ScannerDataContext.Provider
      value={{
        patterns,
        loading,
        error,
        refreshData,
        backtestResults
      }}
    >
      {children}
    </ScannerDataContext.Provider>
  );
};
