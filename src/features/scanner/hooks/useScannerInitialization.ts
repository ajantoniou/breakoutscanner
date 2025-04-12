import { useEffect, useCallback, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { PatternData } from "@/services/types/patternTypes";

export const useScannerInitialization = (
  timeframe: string,
  apiPatterns: PatternData[],
  apiBacktestResults: any[],
  apiStats: any,
  dedupPatterns: (patterns: PatternData[]) => PatternData[],
  isTimeframeLoaded: (tf: string) => boolean,
  loadApiData: (symbols?: string[], forceRefresh?: boolean, runFullBacktest?: boolean) => Promise<void>,
  markTimeframeAsLoaded: (tf: string) => void,
  setLoading: (loading: boolean) => void,
  setLastUpdated: (date: Date) => void,
  setPatterns: (patterns: PatternData[]) => void,
  setBacktestResults: (results: any[]) => void,
  setStats: (stats: any) => void,
  forceApiDataRefresh: () => Promise<void>,
  loadFilterPresets: () => void,
  handleRefresh: () => Promise<void>
) => {
  // Track initialization state
  const initialized = useRef(false);
  const timeframeChanging = useRef(false);
  const operationInProgress = useRef(false);
  const initialLoadAttempted = useRef(false);
  const initialLoadCompletedRef = useRef(false);
  const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost';
  
  // Load filter presets from localStorage on initial render, but only once
  useEffect(() => {
    try {
      loadFilterPresets();
    } catch (error) {
      console.error('Error loading filter presets:', error);
    }
  }, []);

  // ALLOW ONE-TIME INITIALIZATION IN PRODUCTION, BUT PREVENT REFRESH LOOPS
  useEffect(() => {
    // Skip if already initialized or timeframe is already loaded
    if (initialized.current || isTimeframeLoaded('initial')) {
      return;
    }
    
    initialized.current = true;
    initialLoadAttempted.current = true;
    console.log("Initializing scanner with timeframe:", timeframe);
    
    // Mark as initialized to prevent loops
    markTimeframeAsLoaded('initial');
    
    // For production, do one initial data load but with safeguards
    if (isProduction) {
      if (!operationInProgress.current && !initialLoadCompletedRef.current) {
        operationInProgress.current = true;
        console.log("Performing one-time initial data load in production");
        
        // Explicitly try to load data for production
        loadApiData(undefined, false, false)
          .then(() => {
            console.log('Initial production data load complete');
            markTimeframeAsLoaded(timeframe);
            setLastUpdated(new Date());
            initialLoadCompletedRef.current = true;
            
            // Update UI states only if we have data
            console.log(`[Production Init] API Patterns received: ${apiPatterns.length}`);
            if (apiPatterns.length > 0) {
              const uniquePatterns = dedupPatterns(apiPatterns);
              console.log(`[Production Init] Setting ${uniquePatterns.length} unique patterns`);
              setPatterns(uniquePatterns);
              setBacktestResults(apiBacktestResults);
              setStats(apiStats);
            } else {
              console.log('[Production Init] No API patterns found, clearing existing state.');
              setPatterns([]);
              setBacktestResults([]);
              setStats({});
            }
          })
          .catch((error) => {
            console.error('Error during initial production data load:', error);
            markTimeframeAsLoaded(timeframe);
            initialLoadCompletedRef.current = true;
          })
          .finally(() => {
            operationInProgress.current = false;
          });
      }
      return;
    }
    
    // For development, proceed with normal initialization
    const timer = setTimeout(() => {
      if (!operationInProgress.current) {
        operationInProgress.current = true;
        try {
          handleRefresh()
            .then(() => {
              console.log('Initial development data load complete');
              markTimeframeAsLoaded('initial');
            })
            .catch((error) => {
              console.error('Error during initial data load:', error);
              markTimeframeAsLoaded('initial');
            })
            .finally(() => {
              operationInProgress.current = false;
            });
        } catch (error) {
          console.error('Error during initial refresh:', error);
          markTimeframeAsLoaded('initial');
          operationInProgress.current = false;
        }
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [
    timeframe, 
    isTimeframeLoaded, 
    markTimeframeAsLoaded, 
    loadApiData, 
    handleRefresh, 
    isProduction
  ]);

  // HANDLE TIMEFRAME CHANGES - ALLOW FIRST LOAD BUT PREVENT LOOPS IN PRODUCTION
  useEffect(() => {
    // Skip if in the middle of changing timeframes
    if (timeframeChanging.current || operationInProgress.current) {
      return;
    }
    
    // Skip if this timeframe is already loaded
    if (isTimeframeLoaded(timeframe)) {
      return;
    }
    
    // Skip if initialization hasn't happened yet or timeframe is undefined
    if (!initialized.current || !timeframe) {
      return;
    }
    
    timeframeChanging.current = true;
    operationInProgress.current = true;
    setLoading(true);
    console.log(`Loading data for timeframe ${timeframe}...`);
    
    // Modified approach for production
    if (isProduction) {
      // Enforce timeframe load limits for production - only load once per session
      if (initialLoadCompletedRef.current) {
        console.log(`Skipping additional data load for timeframe ${timeframe} in production`);
        markTimeframeAsLoaded(timeframe);
        setLoading(false);
        timeframeChanging.current = false;
        operationInProgress.current = false;
        return;
      }
      
      // First-time timeframe load in production - load data without forcing refresh or backtest
      console.log(`First-time data load for timeframe ${timeframe} in production`);
      initialLoadCompletedRef.current = true; // Mark as completed before load to prevent multiple attempts
      
      loadApiData(undefined, false, false)
        .then(() => {
          console.log(`Data loaded for timeframe ${timeframe} in production`);
          markTimeframeAsLoaded(timeframe);
          setLastUpdated(new Date());
          
          // Update UI states only if we have data
          if (apiPatterns.length > 0) {
            const uniquePatterns = dedupPatterns(apiPatterns);
            setPatterns(uniquePatterns);
            setBacktestResults(apiBacktestResults);
            setStats(apiStats);
          }
        })
        .catch((error) => {
          console.error(`Error loading data for timeframe ${timeframe}:`, error);
          markTimeframeAsLoaded(timeframe);
        })
        .finally(() => {
          setLoading(false);
          timeframeChanging.current = false;
          operationInProgress.current = false;
        });
      return;
    }
    
    // Development mode - normal functionality
    try {
      loadApiData(undefined, false, false)
        .then(() => {
          console.log(`Data loaded for timeframe ${timeframe} in development`);
          markTimeframeAsLoaded(timeframe);
          // Update UI states after loading data in development as well
          console.log(`[Development Load] API Patterns received: ${apiPatterns.length}`);
          if (apiPatterns.length > 0) {
            const uniquePatterns = dedupPatterns(apiPatterns);
            console.log(`[Development Load] Setting ${uniquePatterns.length} unique patterns`);
            setPatterns(uniquePatterns);
            setBacktestResults(apiBacktestResults);
            setStats(apiStats);
            setLastUpdated(new Date());
          } else {
            console.log('[Development Load] No API patterns found, clearing existing state.');
            setPatterns([]);
            setBacktestResults([]);
            setStats({});
          }
        })
        .catch((error) => {
          console.error(`Error loading data for timeframe ${timeframe}:`, error);
          markTimeframeAsLoaded(timeframe);
        })
        .finally(() => {
          setLoading(false);
          timeframeChanging.current = false;
          operationInProgress.current = false;
        });
    } catch (error) {
      console.error(`Exception during timeframe change for ${timeframe}:`, error);
      markTimeframeAsLoaded(timeframe);
      setLoading(false);
      timeframeChanging.current = false;
      operationInProgress.current = false;
    }
  }, [
    timeframe, 
    isTimeframeLoaded, 
    markTimeframeAsLoaded, 
    loadApiData, 
    setLoading, 
    isProduction
  ]);

  return {
    isInitialized: isTimeframeLoaded('initial')
  };
};
