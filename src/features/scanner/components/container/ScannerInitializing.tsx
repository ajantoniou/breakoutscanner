
import React, { useEffect, useRef } from "react";
import { toast } from "sonner";

interface ScannerInitializingProps {
  handleRefresh: () => Promise<void>;
  handleFetchRealData: () => void;
  filteredPatterns: any[];
  loading: boolean;
  setIsInitialLoading: (isLoading: boolean) => void;
  isInitialLoading: boolean;
  usingCachedData: boolean;
  forceApiDataRefresh: () => void;
}

const ScannerInitializing: React.FC<ScannerInitializingProps> = ({
  handleRefresh,
  handleFetchRealData,
  filteredPatterns,
  loading,
  setIsInitialLoading,
  isInitialLoading,
  usingCachedData,
  forceApiDataRefresh
}) => {
  const initialLoadRef = useRef(false);
  const forcedRefreshRef = useRef(false);

  // Handle initial data load
  useEffect(() => {
    if (!initialLoadRef.current) {
      initialLoadRef.current = true;
      console.log("Initial load - fetching data with delay");
      
      toast("Loading market data", {
        description: "Looking for cached data first..."
      });
      
      handleRefresh().then(() => {
        if (filteredPatterns.length > 0) {
          setIsInitialLoading(false);
          return;
        }
        
        setTimeout(() => {
          handleFetchRealData();
          toast("Loading market data for pattern scanning", {
            description: "Fetching patterns and historical data"
          });
        }, 500);
      });
    }
  }, [filteredPatterns.length, handleFetchRealData, handleRefresh, setIsInitialLoading]);

  // Update loading state when patterns are loaded
  useEffect(() => {
    if (isInitialLoading && filteredPatterns.length > 0 && !loading) {
      setIsInitialLoading(false);
    }
  }, [filteredPatterns.length, loading, isInitialLoading, setIsInitialLoading]);

  // Force refresh if no patterns are found in cache
  useEffect(() => {
    if (usingCachedData && filteredPatterns.length === 0 && !forcedRefreshRef.current && !loading) {
      forcedRefreshRef.current = true;
      console.log("No patterns in cache - forcing real data refresh");
      toast("No patterns found in cache", {
        description: "Fetching fresh market data from API"
      });
      forceApiDataRefresh();
    }
  }, [usingCachedData, filteredPatterns.length, loading, forceApiDataRefresh]);

  // This component doesn't render anything, it just manages effects
  return null;
};

export default ScannerInitializing;
