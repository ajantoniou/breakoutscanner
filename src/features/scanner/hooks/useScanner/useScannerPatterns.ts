import { useCallback } from 'react';
import { PatternData } from '@/services/types/patternTypes';
import { fetchStockData } from '@/services/api/marketData/dataService';
import { runBacktest } from '@/services/backtesting/backtestService';
import { adaptBacktestResults } from '@/utils/backtestAdapter';
import { useApiKey } from './useApiKey';
import { processPolygonDataForBacktest, createDefaultPatternData } from '@/services/api/marketData/polygon/dataTransformer';
import { calculateRSI, calculateATR, checkEMACrossover, analyzeVolume } from '@/services/api/marketData/technicalIndicators';

interface UseScannerPatternsProps {
  setPatterns: (patterns: PatternData[]) => void;
  setLoading: (loading: boolean) => void;
  setLastUpdated: (date: Date | null) => void;
  setBacktestResults: (results: any[]) => void;
  timeframe: string;
  symbols?: string[];
}

export function useScannerPatterns({
  setPatterns,
  setLoading,
  setLastUpdated,
  setBacktestResults,
  timeframe,
  symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA']
}: UseScannerPatternsProps) {
  const { apiKey } = useApiKey();

  const fetchPatterns = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch stock data for each symbol
      const stockDataPromises = symbols.map(symbol => 
        fetchStockData(symbol, timeframe, apiKey)
      );
      
      const stockDataResults = await Promise.all(stockDataPromises);
      
      // Process the data to identify patterns
      const patterns: PatternData[] = stockDataResults.map((data, index) => {
        if (!data || !data.results || data.results.length === 0) return null;
        
        // Convert to historical prices for technical analysis
        const historicalPrices = processPolygonDataForBacktest(data, symbols[index]);
        
        if (historicalPrices.length === 0) return null;
        
        // Calculate technical indicators
        const rsi = calculateRSI(historicalPrices);
        const atr = calculateATR(historicalPrices);
        const emaCrossovers = checkEMACrossover(historicalPrices);
        const volumeAnalysis = analyzeVolume(historicalPrices);
        
        // Create pattern data with technical indicators
        const pattern = createDefaultPatternData(symbols[index], historicalPrices);
        
        // Add technical indicators to pattern
        pattern.rsi = rsi;
        pattern.atr = atr;
        pattern.emaCrossovers = emaCrossovers.crossovers;
        pattern.volumeTrend = volumeAnalysis;
        
        // Set confidence score based on technical indicators
        let confidenceScore = 0.5; // Base score
        
        // RSI contribution (0-0.3)
        if (rsi < 30) confidenceScore += 0.3; // Oversold
        else if (rsi > 70) confidenceScore += 0.3; // Overbought
        else if (rsi > 40 && rsi < 60) confidenceScore += 0.1; // Neutral
        
        // EMA crossover contribution (0-0.3)
        if (emaCrossovers.crossovers.includes('7over50') || 
            emaCrossovers.crossovers.includes('7over100')) {
          confidenceScore += 0.3;
        }
        
        // Volume contribution (0-0.2)
        if (volumeAnalysis.increasing && volumeAnalysis.percent > 50) {
          confidenceScore += 0.2;
        }
        
        // ATR contribution (0-0.2)
        const atrPercent = (atr / historicalPrices[historicalPrices.length - 1].close) * 100;
        if (atrPercent > 2) confidenceScore += 0.2; // High volatility
        
        pattern.confidenceScore = Math.min(confidenceScore, 1); // Cap at 1.0
        
        return pattern;
      }).filter(Boolean) as PatternData[];
      
      // Run backtest on the patterns
      const backtestResults = await runBacktest(patterns, 1, apiKey);
      
      setPatterns(patterns);
      setBacktestResults(adaptBacktestResults(backtestResults));
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching patterns:', error);
    } finally {
      setLoading(false);
    }
  }, [timeframe, symbols, apiKey, setPatterns, setBacktestResults, setLastUpdated, setLoading]);

  const refreshPatterns = useCallback(async () => {
    await fetchPatterns();
  }, [fetchPatterns]);

  return {
    fetchPatterns,
    refreshPatterns
  };
} 