import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { useApiKey } from '@/hooks/useApiKey';
import { useApiDataLoading } from '@/features/scanner/hooks/apiDataSource/useApiDataLoading';
import { useScannerState } from '@/features/scanner/hooks/useScanner/useScannerState';
import { useScannerPatterns } from '@/features/scanner/hooks/useScanner/useScannerPatterns';
import { useScannerData } from '@/features/scanner/hooks/useScanner/useScannerData';
import { useScannerRealTime } from '@/features/scanner/hooks/useScanner/useScannerRealTime';
import { patternAdapter } from '@/utils/typeConverters';
import ScannerHeader from '../ScannerHeader';
import ScannerContent from '../ScannerContent';
import ScannerStatusBar from '../ScannerStatusBar';
import LoadingIndicator from '@/components/shared/LoadingIndicator';

interface ScannerContainerProps {
  scannerType?: 'daytrader' | 'swing' | 'standard';
  defaultTimeframe?: string;
  allowedTimeframes?: string[];
  autoRefreshInterval?: number;
  initialTab?: string;
}

const ScannerContainer: React.FC<ScannerContainerProps> = ({ 
  scannerType = 'standard',
  defaultTimeframe = '15min',
  allowedTimeframes,
  autoRefreshInterval = 60000,
  initialTab
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [timeframe, setTimeframe] = useState(defaultTimeframe);
  const [universeSize, setUniverseSize] = useState("top100");
  const [historicalYears, setHistoricalYears] = useState<1 | 2 | 5>(1);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [usingCachedData, setUsingCachedData] = useState(false);
  const [cacheTimestamp, setCacheTimestamp] = useState<Date | null>(null);
  const [patternTypeStats, setPatternTypeStats] = useState<Record<string, number>>({});
  
  // Constants for timeframe groups
  const DAY_TRADING_TIMEFRAMES = ["1min", "5min", "15min", "30min", "1hour"];
  const SWING_TRADING_TIMEFRAMES = ["4hour", "daily", "weekly"];
  const ALL_TIMEFRAMES = ["1min", "5min", "15min", "30min", "1hour", "4hour", "daily", "weekly"];
  
  // Effect to update timeframe when scanner type changes
  useEffect(() => {
    let validTimeframes: string[] = ALL_TIMEFRAMES;
    let defaultTimeframeForType = '15min';
    
    if (scannerType === 'daytrader') {
      validTimeframes = DAY_TRADING_TIMEFRAMES;
      defaultTimeframeForType = '15min';
    } else if (scannerType === 'swing') {
      validTimeframes = SWING_TRADING_TIMEFRAMES;
      defaultTimeframeForType = 'daily';
    }
    
    // If current timeframe is not valid for the scanner type, update it
    if (!validTimeframes.includes(timeframe)) {
      console.log(`[ScannerContainer] Updating timeframe from ${timeframe} to ${defaultTimeframeForType} for scanner type ${scannerType}`);
      setTimeframe(defaultTimeframeForType);
      setSearchParams({ timeframe: defaultTimeframeForType });
    }
  }, [scannerType, timeframe, setSearchParams]);
  
  // Real-time mode
  const [isRealTimeMode, setIsRealTimeMode] = useState(false);
  const [realTimeQuotes, setRealTimeQuotes] = useState<Record<string, any>>({});
  
  // API Key Configuration
  const { apiKeyConfig } = useApiKey();
  
  // Scanner State
  const scannerState = useScannerState(timeframe);
  
  // Scanner Data
  const {
    apiPatterns,
    apiBacktestResults,
    apiStats,
    loadApiData,
    rawPolygonData,
    usingCachedData: isUsingCache,
    filteredPatterns,
    analyzeFullUniverse
  } = useScannerData();
  
  // Scanner Real Time
  const {
    realTimeData,
    isRealTimeConnected,
    marketOpen,
    realTimeLastUpdated,
    refreshQuotes,
    patternsWithLiveData
  } = useScannerRealTime();
  
  // Load initial data
  useEffect(() => {
    if (apiKeyConfig.key) {
      loadApiData();
    }
  }, [apiKeyConfig.key, loadApiData]);
  
  // Auto-refresh logic
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (autoRefreshEnabled && !isUsingCache && apiKeyConfig.key && !isRealTimeMode) {
      intervalId = setInterval(() => {
        loadApiData();
        setLastRefresh(new Date());
      }, autoRefreshInterval);
      
      setLastRefresh(new Date());
    }
    
    return () => clearInterval(intervalId);
  }, [autoRefreshEnabled, isUsingCache, apiKeyConfig.key, loadApiData, autoRefreshInterval, isRealTimeMode]);
  
  // Handle timeframe changes
  const handleChangeTimeframe = useCallback((newTimeframe: string) => {
    setTimeframe(newTimeframe);
    setUsingCachedData(false);
    setCacheTimestamp(null);
    setSearchParams({ timeframe: newTimeframe });
  }, [setSearchParams]);
  
  // Refresh data manually
  const handleRefreshData = () => {
    setUsingCachedData(false);
    setCacheTimestamp(null);
    loadApiData();
    setLastRefresh(new Date());
  };
  
  // Run full backtest
  const handleRunFullBacktest = () => {
    analyzeFullUniverse();
  };
  
  // Toggle auto-refresh
  const handleAutoRefreshChange = (enabled: boolean, interval: number) => {
    setAutoRefreshEnabled(enabled);
  };
  
  // Toggle real-time mode
  const handleToggleRealTime = () => {
    if (!isRealTimeMode) {
      setIsRealTimeMode(true);
      refreshQuotes();
      toast({
        title: "Real-time mode enabled",
        description: "Connected to real-time data feed"
      });
    } else {
      setIsRealTimeMode(false);
      setRealTimeQuotes({});
      toast({
        title: "Real-time mode disabled",
        description: "Disconnected from real-time data feed"
      });
    }
  };
  
  return (
    <Card>
      <CardContent className="p-0">
        <ScannerContent
          patterns={isRealTimeMode ? patternsWithLiveData : apiPatterns}
          loading={isUsingCache}
          timeframe={timeframe}
          backtestResults={apiBacktestResults}
          timeframeStats={apiStats}
          patternTypeStats={patternTypeStats}
          onChangeTimeframe={handleChangeTimeframe}
          onRefresh={handleRefreshData}
          onRunFullBacktest={handleRunFullBacktest}
          onAutoRefreshChange={handleAutoRefreshChange}
          lastRefresh={lastRefresh}
          autoRefreshEnabled={autoRefreshEnabled}
          autoRefreshInterval={autoRefreshInterval}
          realTimeQuotes={realTimeData}
          isRealTimeMode={isRealTimeMode}
          onToggleRealTime={handleToggleRealTime}
          scannerType={scannerType}
        />
      </CardContent>
    </Card>
  );
};

export default ScannerContainer;
