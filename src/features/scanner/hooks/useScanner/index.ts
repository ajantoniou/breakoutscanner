import { useState, useEffect } from 'react';
import { useScannerCore } from "./useScannerCore";
import { useScannerData } from "./useScannerData";
import { useScannerRealTime } from "./useScannerRealTime";
import { useScannerRefreshLogic } from "./useScannerRefreshLogic";
import { voidifyPromise } from '@/utils/functionAdapters';

// Import useScannerInitialization conditionally to avoid conflicts
let useScannerInitFunc: any;
try {
  useScannerInitFunc = require("../useScannerInitialization").default;
} catch (error) {
  try {
    useScannerInitFunc = require("../scannerHooks/useScannerInitialization").useScannerInitialization;
  } catch (error) {
    console.warn("Scanner initialization module not available");
    useScannerInitFunc = () => {}; // Provide fallback implementation
  }
}

export type DataSourceType = "api" | "supabase";

export const useScanner = () => {
  const core = useScannerCore();
  const data = useScannerData();
  const realTime = useScannerRealTime();
  const refreshLogic = useScannerRefreshLogic();
  
  // Properly adapt the functions to handle type compatibility
  // Converting Promise<boolean> to Promise<void> and vice versa
  const adaptedLoadApiData = voidifyPromise(data.loadApiData);
  
  // Create a properly adapted toggleUniverseMode function
  const adaptedToggleUniverseMode = async (): Promise<void> => {
    try {
      realTime.toggleUniverseMode();
      // Return void instead of boolean
    } catch (error) {
      console.error("Error in toggleUniverseMode:", error);
    }
  };
  
  // Adapt handle refresh to return Promise<void> instead of Promise<boolean>
  const adaptedHandleRefresh = voidifyPromise(refreshLogic.handleRefresh);
  
  // Adapt forceApiDataRefresh to return Promise<void>
  const adaptedForceApiDataRefresh = voidifyPromise(refreshLogic.forceApiDataRefresh);
  
  // Use scanner initialization hook if it's available
  useEffect(() => {
    if (typeof useScannerInitFunc === 'function') {
      useScannerInitFunc(
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
    }
  }, [core.timeframe]); // Only re-run when timeframe changes
  
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
  };
};
