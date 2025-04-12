
import { useScannerCore } from "./useScannerCore";
import { useScannerData } from "./useScannerData";
import { useScannerRealTime } from "./useScannerRealTime";
import { useScannerRefreshLogic } from "./useScannerRefreshLogic";
import { useScannerInitialization } from "../scannerHooks/useScannerInitialization";
import { 
  adaptBooleanToVoidPromise, 
  adaptVoidToBooleanFunction,
  adaptVoidToBooleanPromise 
} from "@/utils/functionAdapters";

export type DataSourceType = "api" | "supabase";

export const useScanner = () => {
  const core = useScannerCore();
  const data = useScannerData();
  const realTime = useScannerRealTime();
  const refreshLogic = useScannerRefreshLogic();
  
  // Properly adapt the functions to handle type compatibility
  // Converting Promise<boolean> to Promise<void>
  const adaptedLoadApiData = adaptBooleanToVoidPromise(data.loadApiData);
  
  // Convert void function to boolean function with proper async handling
  const adaptedForceApiDataRefresh = adaptVoidToBooleanPromise(refreshLogic.forceApiDataRefresh);
  
  // Create a properly adapted toggleUniverseMode function that returns nothing
  const adaptedToggleUniverseMode = () => {
    realTime.toggleUniverseMode();
  };
  
  // Adapt handle refresh to return Promise<void> instead of Promise<boolean>
  const adaptedHandleRefresh = adaptBooleanToVoidPromise(refreshLogic.handleRefresh);
  
  // Use scanner initialization hook with adapted functions
  useScannerInitialization(
    core.timeframe,
    data.apiPatterns || [],
    data.apiBacktestResults,
    data.apiStats,
    core.dedupPatterns,
    core.isTimeframeLoaded,
    adaptedLoadApiData,
    core.markTimeframeAsLoaded,
    core.setLoading,
    core.setLastUpdated,
    core.setPatterns,
    core.setBacktestResults,
    core.setStats,
    adaptedForceApiDataRefresh,
    data.loadFilterPresets,
    adaptedHandleRefresh
  );
  
  return {
    // Core state
    timeframe: core.timeframe,
    loading: core.loading,
    lastUpdated: core.lastUpdated,
    dataSource: core.dataSource,
    activeTab: core.activeTab,
    stats: core.stats,
    backtestResults: core.backtestResults,
    
    // Filters
    patternTypeFilter: core.patternTypeFilter,
    channelTypeFilter: core.channelTypeFilter,
    emaFilter: core.emaFilter,
    setPatternTypeFilter: core.setPatternTypeFilter,
    setChannelTypeFilter: core.setChannelTypeFilter,
    setEmaFilter: core.setEmaFilter,
    
    // Actions
    handleTimeframeChange: core.handleTimeframeChange,
    setActiveTab: core.setActiveTab,
    
    // Data
    patterns: core.patterns || [],
    filteredPatterns: realTime.patternsWithLiveData || [],
    apiKeyConfig: data.apiKeyConfig,
    isCheckingKey: data.isCheckingKey,
    
    // API settings
    rawPolygonData: data.rawPolygonData,
    analyzeFullUniverse: data.analyzeFullUniverse,
    universeSize: data.universeSize,
    historicalYears: data.historicalYears,
    
    // Refresh logic
    handleRefresh: adaptedHandleRefresh,
    forceApiDataRefresh: adaptedForceApiDataRefresh,
    
    // Real-time data
    realTimeData: realTime.realTimeData,
    isRealTimeConnected: realTime.isRealTimeConnected,
    marketOpen: realTime.marketOpen,
    refreshQuotes: realTime.refreshQuotes,
    
    // Actions
    updateApiKey: data.updateApiKey,
    toggleUniverseMode: adaptedToggleUniverseMode,
    changeUniverseSize: data.changeUniverseSize,
    changeHistoricalYears: data.changeHistoricalYears,
    syncToSupabase: data.syncToSupabase,
    
    // Filter presets
    usingCachedData: data.usingCachedData,
    savedFilterPresets: data.savedFilterPresets,
    activePresetId: data.activePresetId,
    saveFilterPreset: data.saveFilterPreset,
    setActivePreset: data.setActivePreset,
    deleteFilterPreset: data.deleteFilterPreset,
    
    // Add missing function that's referenced in other parts of the app
    handleRunFullBacktest: () => data.loadApiData(undefined, true, true)
  };
};
