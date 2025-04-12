import { useState, useCallback } from "react";
import { TimeframeStats } from "@/services/types/patternTypes";
import { createTimeframeStats } from "@/services/filters/patternFilters";

export const useScannerState = () => {
  const [timeframe, setTimeframe] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [dataSource, setDataSource] = useState<"api" | "supabase">("supabase"); // Default to Supabase
  const [activeTab, setActiveTab] = useState("patterns");
  const [loadedTimeframes, setLoadedTimeframes] = useState<Set<string>>(new Set());
  
  const handleTimeframeChange = useCallback((newTimeframe: string) => {
    console.log(`useScannerState: Setting timeframe to ${newTimeframe}`);
    if (newTimeframe !== timeframe) {
      setTimeframe(newTimeframe);
    }
  }, [timeframe]);

  const markTimeframeAsLoaded = useCallback((tf: string) => {
    setLoadedTimeframes(prev => new Set(prev).add(tf));
  }, []);
  
  const isTimeframeLoaded = useCallback((tf: string) => {
    return loadedTimeframes.has(tf);
  }, [loadedTimeframes]);

  // Pass empty arrays as default values for patterns and backtestResults
  const getTimeframeStats = useCallback((tf: string) => createTimeframeStats([], [], tf), []);
  
  return {
    timeframe,
    loading,
    setLoading,
    lastUpdated,
    setLastUpdated,
    dataSource,
    setDataSource,
    activeTab,
    setActiveTab,
    loadedTimeframes,
    handleTimeframeChange,
    markTimeframeAsLoaded,
    isTimeframeLoaded,
    getTimeframeStats
  };
};
