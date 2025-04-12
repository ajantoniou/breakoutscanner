import { useState, useEffect, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { PatternData } from "@/services/types/patternTypes";
import { BacktestResult, ApiKeyConfig } from "@/services/types/backtestTypes";
import { TimeframeStats } from "@/services/types/patternTypes";
import { fetchPatternData } from "@/services/api/marketData/patternAnalysis";
import { runBacktest } from "@/services/backtesting/backtestService";
import { 
  getApiKey, 
  storeApiKey, 
  validateApiKey 
} from "@/services/api/marketData/apiKeyService";
import { 
  fetchCachedPatterns, 
  storeCachedPatterns,
  clearCachedPatterns,
  fetchCachedBacktestResults,
  storeCachedBacktestResults,
  clearCachedBacktestResults,
  fetchCachedStats,
  storeCachedStats,
  clearCachedStats,
  fetchFilterPresets,
  storeFilterPresets,
  deleteFilterPresets
} from "@/services/cache/cacheService";
import { ScannerFilterPreset } from "@/services/cache/cacheTypes";
import { checkApiKeyStatus } from "@/services/api/marketData/apiKeyService";

type UniverseSize = 'small' | 'medium' | 'large' | 'xlarge';

export const useApiDataSource = (timeframe) => {
  const [apiPatterns, setApiPatterns] = useState<PatternData[]>([]);
  const [apiBacktestResults, setApiBacktestResults] = useState<BacktestResult[]>([]);
  const [apiStats, setApiStats] = useState<TimeframeStats>({
    timeframe: timeframe,
    accuracyRate: 0,
    avgDaysToBreakout: 0,
    successRate: 0,
    totalPatterns: 0,
    avgProfit: 0
  });
  const [apiKeyConfig, setApiKeyConfig] = useState<ApiKeyConfig>(() => {
    const initialKeyConfig = getApiKey();
    return initialKeyConfig || { key: '', provider: 'Polygon.io', isPremium: false }; 
  });
  const [isCheckingKey, setIsCheckingKey] = useState(false);
  const [rawPolygonData, setRawPolygonData] = useState<any>(null);
  const [analyzeFullUniverse, setAnalyzeFullUniverse] = useState(false);
  const [universeSize, setUniverseSize] = useState<UniverseSize>('medium');
  const [historicalYears, setHistoricalYears] = useState(1);
  const [usingCachedData, setUsingCachedData] = useState(false);
  const [savedFilterPresets, setSavedFilterPresets] = useState<ScannerFilterPreset[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  
  // Add a state for tracking API call status
  const [isDataLoading, setIsDataLoading] = useState(false);
  
  // Only load API key once during component mount
  useEffect(() => {
    let mounted = true; // Track if component is mounted
    
    try {
      const currentConfig = getApiKey(); // Use the central getter
      if (currentConfig && mounted) {
        setApiKeyConfig(currentConfig);
      } else if (mounted) {
        // This case should theoretically not happen often if getApiKey has a fallback,
        // but handle it defensively.
        console.warn("No API key found during initial mount, check getApiKey logic.");
        setApiKeyConfig({ key: '', provider: 'Polygon.io', isPremium: false });
      }
    } catch (error) {
      console.error("Error loading API key:", error);
    }
    
    return () => { mounted = false; }; // Cleanup
  }, []);
  
  // Optimize to only load filter presets once, with proper cleanup
  useEffect(() => {
    let mounted = true;
    
    const loadPresets = async () => {
      try {
        const presets = await fetchFilterPresets();
        if (mounted) {
          setSavedFilterPresets(presets);
        }
      } catch (error) {
        console.error("Error loading filter presets:", error);
      }
    };
    
    loadPresets();
    
    return () => { mounted = false; };
  }, []);
  
  const loadFilterPresets = useCallback(async (): Promise<ScannerFilterPreset[]> => {
    try {
      const presets = await fetchFilterPresets();
      setSavedFilterPresets(presets);
      return presets;
    } catch (error) {
      console.error("Error loading filter presets:", error);
      toast({
        title: "Error loading filter presets",
        description: "Could not retrieve saved filter settings.",
        variant: "destructive"
      });
      return [];
    }
  }, []);
  
  const saveFilterPreset = useCallback(async (preset: Omit<ScannerFilterPreset, "id" | "createdAt">): Promise<void> => {
    try {
      const newPreset = {
        ...preset,
        id: Date.now().toString(),
        createdAt: new Date()
      };
      
      const updatedPresets = [...savedFilterPresets, newPreset];
      await storeFilterPresets(updatedPresets);
      
      setSavedFilterPresets(updatedPresets);
      
      toast({
        title: "Filter preset saved",
        description: `Successfully saved filter preset "${preset.name}".`
      });
    } catch (error) {
      console.error("Error saving filter preset:", error);
      toast({
        title: "Error saving filter preset",
        description: "Could not save filter settings.",
        variant: "destructive"
      });
    }
  }, [savedFilterPresets]);
  
  const setActivePreset = useCallback((presetId: string) => {
    setActivePresetId(presetId);
  }, []);
  
  const deleteFilterPreset = useCallback(async (presetId: string): Promise<void> => {
    try {
      const updatedPresets = savedFilterPresets.filter(preset => preset.id !== presetId);
      await deleteFilterPresets(updatedPresets);
      
      setSavedFilterPresets(updatedPresets);
      
      toast({
        title: "Filter preset deleted",
        description: "Successfully deleted filter preset."
      });
    } catch (error) {
      console.error("Error deleting filter preset:", error);
      toast({
        title: "Error deleting filter preset",
        description: "Could not delete filter settings.",
        variant: "destructive"
      });
    }
  }, [savedFilterPresets]);
  
  // Optimize loadApiData without rate limiting for unlimited API usage
  const loadApiData = useCallback(async (
    symbols: string[] = [
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'AMD', 'INTC', 'MU',
      'SPY', 'QQQ', 'DIA', 'IWM', 'XLF', 'XLE', 'XLK', 'XLV', 'XLI', 'XLU'
    ],
    forceRefresh: boolean = false,
    runFullBacktest: boolean = false
  ): Promise<boolean> => {
    // Prevent simultaneous calls
    if (isDataLoading) {
      console.log("Data loading already in progress, skipping redundant call");
      return false;
    }
    
    // No rate limiting since we have unlimited API
    
    setIsDataLoading(true);
    let success = false;
    
    try {
      setUsingCachedData(false);
      let patterns: PatternData[] = [];
      let backtestResults: BacktestResult[] = [];
      let stats: TimeframeStats | null = null;

      // First try to load from cache (unless forcing refresh)
      if (!forceRefresh) {
        try {
          const cachedPatterns = await fetchCachedPatterns(timeframe);
          const cachedBacktestResults = await fetchCachedBacktestResults(timeframe);
          const cachedStats = await fetchCachedStats(timeframe);
          
          // Use cache if ALL needed data is available
          if (cachedPatterns && cachedPatterns.length > 0 && 
              cachedBacktestResults && cachedStats) {
            patterns = cachedPatterns;
            backtestResults = cachedBacktestResults;
            stats = cachedStats;
            setUsingCachedData(true);
            console.log(`Loaded ${patterns.length} patterns from cache for ${timeframe}`);
            
            // Set state and return early - no need for API calls
            setApiPatterns(patterns);
            setApiBacktestResults(backtestResults);
            setApiStats(stats);
            success = true;
            return success;
          }
        } catch (cacheError) {
          console.error("Error reading from cache:", cacheError);
          // Continue to API fetch on cache error
        }
      }

      // Only clear cache if explicitly forcing refresh
      if (forceRefresh) {
        try {
          await clearCachedPatterns(timeframe);
          await clearCachedBacktestResults(timeframe);
          await clearCachedStats(timeframe);
          console.log("Cleared cache for timeframe:", timeframe);
        } catch (clearError) {
          console.error("Error clearing cache:", clearError);
          // Continue even if cache clearing fails
        }
      }

      // Fetch fresh data with unlimited API key
      console.log(`Fetching fresh pattern data from API for ${timeframe}`);
      
      try {
        // Use all symbols without limiting for safety - we have unlimited API
        const rawPatterns = await fetchPatternData(symbols, timeframe, apiKeyConfig.key, true);
        // Convert Date objects to strings to prevent type issues
        patterns = rawPatterns.map(pattern => {
          return {
            ...pattern,
            createdAt: typeof pattern.createdAt === 'object' ? 
              (pattern.createdAt as Date).toISOString() : String(pattern.createdAt),
            lastUpdated: typeof pattern.lastUpdated === 'object' ? 
              (pattern.lastUpdated as Date).toISOString() : String(pattern.lastUpdated)
          };
        });
      } catch (fetchError) {
        console.error("Error fetching patterns:", fetchError);
        // If fetch fails but we have cached patterns, fall back to them
        const cachedPatterns = await fetchCachedPatterns(timeframe);
        if (cachedPatterns && cachedPatterns.length > 0) {
          patterns = cachedPatterns;
          console.log(`Falling back to ${patterns.length} cached patterns after fetch error`);
        } else {
          // No fallback available
          setApiPatterns([]);
          setApiBacktestResults([]);
          setApiStats({ 
            timeframe, 
            accuracyRate: 0, 
            avgDaysToBreakout: 0, 
            successRate: 0, 
            totalPatterns: 0, 
            avgProfit: 0 
          });
          toast({
            title: "Error fetching data",
            description: "Please try again later",
            variant: "destructive"
          });
          return false;
        }
      }
      
      // Check if we actually got patterns
      if (patterns.length === 0) {
        toast({
          title: "No patterns found",
          description: "Please try again later or adjust your filters"
        });
        setApiPatterns([]);
        setApiBacktestResults([]);
        setApiStats({ 
          timeframe, 
          accuracyRate: 0, 
          avgDaysToBreakout: 0, 
          successRate: 0, 
          totalPatterns: 0, 
          avgProfit: 0 
        });
        return false;
      }
      
      // Run backtest only if specifically requested
      if ((forceRefresh || runFullBacktest) && patterns.length > 0) {
        try {
          console.log(`Running backtest on ${patterns.length} patterns...`);
          const rawBacktestResults = await runBacktest(patterns, historicalYears, apiKeyConfig.key);
          
          // Convert Date objects to strings in backtest results
          backtestResults = rawBacktestResults.map(result => {
            return {
              ...result,
              entryDate: typeof result.entryDate === 'object' ? 
                (result.entryDate as Date).toISOString() : String(result.entryDate),
              exitDate: result.exitDate && typeof result.exitDate === 'object' ? 
                (result.exitDate as Date).toISOString() : result.exitDate ? String(result.exitDate) : null
            };
          });
          
          const successfulPatterns = backtestResults.filter(r => r.successful).length;
          const successRate = backtestResults.length > 0 ? 
            (successfulPatterns / backtestResults.length) * 100 : 0;
          
          stats = {
            timeframe: timeframe,
            accuracyRate: successRate,
            avgDaysToBreakout: backtestResults.length > 0 ? 
              backtestResults.reduce((acc, r) => acc + (r.candlesToBreakout || 0), 0) / backtestResults.length : 0,
            successRate: successRate,
            totalPatterns: patterns.length,
            avgProfit: backtestResults.length > 0 ? 
              backtestResults.reduce((acc, r) => acc + (r.profitLossPercent || 0), 0) / backtestResults.length : 0
          };
          
          // Store in cache for future use
          await storeCachedPatterns(timeframe, patterns);
          await storeCachedBacktestResults(timeframe, backtestResults);
          await storeCachedStats(timeframe, stats);
          console.log("Stored fresh data in cache");
        } catch (backtestError) {
          console.error("Error running backtest:", backtestError);
          // Use default stats if backtest fails
          stats = { 
            timeframe, 
            accuracyRate: 0, 
            avgDaysToBreakout: 0, 
            successRate: 0, 
            totalPatterns: patterns.length, 
            avgProfit: 0 
          };
          backtestResults = [];
        }
      } else {
        // Try to load cached backtest results if available
        try {
          const cachedBacktestResults = await fetchCachedBacktestResults(timeframe);
          const cachedStats = await fetchCachedStats(timeframe);
          
          if (cachedBacktestResults && cachedBacktestResults.length > 0 && cachedStats) {
            backtestResults = cachedBacktestResults;
            stats = cachedStats;
            console.log("Using cached backtest results and stats");
          } else {
            console.log("No cached backtest data, using default stats");
            backtestResults = [];
            stats = { 
              timeframe, 
              accuracyRate: 0, 
              avgDaysToBreakout: 0, 
              successRate: 0, 
              totalPatterns: patterns.length, 
              avgProfit: 0 
            };
          }
        } catch (cacheError) {
          console.error("Error loading cached backtest data:", cacheError);
          backtestResults = [];
          stats = { 
            timeframe, 
            accuracyRate: 0, 
            avgDaysToBreakout: 0, 
            successRate: 0, 
            totalPatterns: patterns.length, 
            avgProfit: 0 
          };
        }
      }
      
      // Finally, update state with whatever data we have
      setApiPatterns(patterns);
      setApiBacktestResults(backtestResults);
      setApiStats(stats || { 
        timeframe, 
        accuracyRate: 0, 
        avgDaysToBreakout: 0, 
        successRate: 0, 
        totalPatterns: patterns.length, 
        avgProfit: 0 
      });
      
      success = true;
    } catch (error: any) {
      console.error("Critical error in loadApiData:", error);
      toast({
        title: "Error loading data",
        description: "An error occurred loading market data",
        variant: "destructive"
      });
      success = false;
    } finally {
      setIsDataLoading(false);
    }
    
    return success;
  }, [timeframe, apiKeyConfig.key, apiKeyConfig.isPremium, historicalYears, isDataLoading]);
  
  const updateApiKey = useCallback(async (newKey: string): Promise<boolean> => {
    setIsCheckingKey(true);
    let success = false;
    try {
      const validationResult = await validateApiKey(newKey);
      
      if (validationResult && validationResult.isValid) {
        const isPremium = validationResult.usage === 'Unlimited';
        
        const newConfig = {
          key: newKey,
          provider: 'Polygon.io',
          isPremium: isPremium
        };
        
        setApiKeyConfig(newConfig); // Update state
        storeApiKey(newConfig); // Update local storage
        
        toast({
          title: "API key updated",
          description: "Successfully updated Polygon.io API key."
        });
        success = true;
      } else {
        // The validateApiKey function now handles the error toast internally
        console.error('API key validation failed from useApiDataSource');
        success = false;
      }
    } catch (error) {
      console.error("Error during API key validation process:", error);
      toast({
        title: "Error Validating Key",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
      success = false;
    } finally {
      setIsCheckingKey(false);
    }
    return success; // Return the success status
  }, []); // Dependencies remain empty as it uses functions from apiKeyService
  
  const toggleAnalysisMode = useCallback(() => {
    setAnalyzeFullUniverse(prev => !prev);
  }, []);
  
  const changeUniverseSize = useCallback((size: string) => {
    setUniverseSize(size as any);
  }, []);
  
  const changeHistoricalYears = useCallback((years: number) => {
    setHistoricalYears(years);
  }, []);
  
  return {
    apiPatterns,
    apiBacktestResults,
    apiStats,
    apiKeyConfig,
    isCheckingKey,
    loadApiData,
    updateApiKey,
    rawPolygonData,
    analyzeFullUniverse,
    toggleAnalysisMode,
    universeSize,
    changeUniverseSize,
    historicalYears,
    changeHistoricalYears,
    usingCachedData,
    savedFilterPresets,
    activePresetId,
    saveFilterPreset,
    loadFilterPresets,
    setActivePreset,
    deleteFilterPreset,
    isDataLoading
  };
};
