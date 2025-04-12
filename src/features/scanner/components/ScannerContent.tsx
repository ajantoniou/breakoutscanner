import React, { useState } from 'react';
import { PatternData, TimeframeStats } from '@/services/types/patternTypes';
import ScannerHeader from './ScannerHeader';
import ScannerCharts from './ScannerCharts';
import PatternsList from './PatternsList';
import ScannerFilters from './ScannerFilters';
import ScannerTabs from './ScannerTabs';
import ScannerStatusBar from './ScannerStatusBar';
import LoadingIndicator from '../shared/LoadingIndicator';
import AlgorithmRefinementAssistant from './AlgorithmRefinementAssistant';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RefreshCw, AlertCircle, KeySquare } from 'lucide-react'; 
import { Button } from '@/components/ui/button';
import ApiKeyButton from './ApiKeyButton';
import { getApiKey } from '@/services/api/marketData/apiKeyService';

interface ScannerContentProps {
  patterns: PatternData[];
  loading: boolean;
  timeframe: string;
  backtestResults: any[];
  timeframeStats: TimeframeStats;
  patternTypeStats: Record<string, number>;
  onChangeTimeframe: (timeframe: string) => void;
  onRefresh: () => void;
  onRunFullBacktest: () => void;
  onAutoRefreshChange: (enabled: boolean, interval: number) => void;
  lastRefresh: Date | null;
  autoRefreshEnabled: boolean;
  autoRefreshInterval: number;
  realTimeQuotes: Record<string, any>;
  isRealTimeMode: boolean;
  onToggleRealTime: () => void;
  scannerType?: 'daytrader' | 'swing' | 'standard';
}

const ScannerContent: React.FC<ScannerContentProps> = ({
  patterns,
  loading,
  timeframe,
  backtestResults,
  timeframeStats,
  patternTypeStats,
  onChangeTimeframe,
  onRefresh,
  onRunFullBacktest,
  onAutoRefreshChange,
  lastRefresh,
  autoRefreshEnabled,
  autoRefreshInterval,
  realTimeQuotes,
  isRealTimeMode,
  onToggleRealTime,
  scannerType = 'standard'
}) => {
  const [currentTab, setCurrentTab] = useState<string>('active');
  const [filterActive, setFilterActive] = useState(false);
  
  const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost';
  
  const apiKeyConfig = getApiKey();
  const isUsingDefaultKey = !apiKeyConfig || apiKeyConfig.key === 'RbQS5oXFUydxTBiJnQVzU_67whX2Nxzm';
  
  console.log(`[ScannerContent Render] Loading: ${loading}, Patterns: ${patterns.length}, Timeframe: ${timeframe}, Production: ${isProduction}`);
  
  if (patterns.length > 0) {
    console.log(`[ScannerContent Render] First pattern details:`, {
      id: patterns[0].id,
      symbol: patterns[0].symbol,
      timeframe: patterns[0].timeframe,
      patternType: patterns[0].patternType,
      createdAt: patterns[0].createdAt
    });
  } else {
    console.log(`[ScannerContent Render] No patterns available to display.`);
  }
  
  const filteredPatterns = patterns.filter(pattern => {
    if (currentTab === 'active') return pattern.status === 'active';
    if (currentTab === 'completed') return pattern.status === 'completed';
    if (currentTab === 'failed') return pattern.status === 'failed';
    return true;
  });
  
  const relevantBacktestResults = backtestResults.filter(result => {
    return filteredPatterns.some(pattern => pattern.id === result.patternId);
  });
  
  const completeTimeframeStats: TimeframeStats = {
    ...timeframeStats,
    avgProfit: timeframeStats.avgProfit ?? 0,
    successfulPatterns: timeframeStats.successfulPatterns ?? 0
  };
  
  return (
    <div className="flex flex-col gap-4">
      <ScannerHeader 
        timeframe={timeframe}
        onChangeTimeframe={onChangeTimeframe}
        onRefresh={onRefresh}
        onRunFullBacktest={onRunFullBacktest}
        lastRefresh={lastRefresh}
        stats={completeTimeframeStats}
        loading={loading}
        isRealTimeMode={isRealTimeMode}
        onToggleRealTime={onToggleRealTime}
      />
      
      <ScannerFilters 
        active={filterActive} 
        onToggle={() => setFilterActive(!filterActive)} 
        timeframe={timeframe}
        onTimeframeChange={onChangeTimeframe}
        scannerType={scannerType}
      />
      
      {loading ? (
        <LoadingIndicator message="Loading market patterns..." />
      ) : patterns.length === 0 ? (
        <div className="p-6 bg-background border rounded-lg shadow-sm">
          <div className="text-center">
            <h3 className="font-medium text-lg mb-2">No patterns found</h3>
            
            {isUsingDefaultKey ? (
              <Alert className="mb-4 mx-auto max-w-md">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>API Key Required</AlertTitle>
                <AlertDescription className="text-left">
                  <p className="mb-2">
                    The default API key is not valid. You need to set your own Polygon.io API key to fetch market data.
                  </p>
                  <div className="flex justify-end">
                    <ApiKeyButton />
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <p className="text-muted-foreground mb-4">
                {isProduction 
                  ? "In production mode, data is loaded once per session. Try refreshing or check your API key settings."
                  : "No patterns were detected for the current timeframe and settings."
                }
              </p>
            )}
            
            <Button 
              onClick={onRefresh} 
              variant="outline" 
              className="mx-auto"
              disabled={isUsingDefaultKey}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
            
            {isUsingDefaultKey && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">
                  Visit <a href="https://polygon.io" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">polygon.io</a> to sign up for a free API key
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <ScannerCharts 
            patterns={patterns}
            backtestResults={backtestResults}
            patternTypeStats={patternTypeStats}
            timeframeStats={completeTimeframeStats}
          />
          
          {backtestResults.length > 0 && (
            <AlgorithmRefinementAssistant 
              patterns={patterns}
              backtestResults={backtestResults}
            />
          )}
          
          <ScannerTabs 
            activeTab={currentTab}
            onTabChange={setCurrentTab}
            patternCounts={{
              all: patterns.length,
              active: patterns.filter(p => p.status === 'active').length,
              completed: patterns.filter(p => p.status === 'completed').length,
              failed: patterns.filter(p => p.status === 'failed').length
            }}
          />
          
          <PatternsList 
            patterns={filteredPatterns}
            loading={loading}
            backtestResults={relevantBacktestResults}
            realTimeQuotes={realTimeQuotes}
          />
        </>
      )}
      
      {isProduction ? (
        <div className="p-3 border border-muted rounded-md bg-muted/30 flex justify-between items-center text-xs text-muted-foreground">
          <div>
            <span className="font-medium">Production Mode:</span> Data loaded. Use refresh button for updates.
          </div>
          <div>
            {lastRefresh && `Last updated: ${lastRefresh.toLocaleTimeString()}`}
          </div>
        </div>
      ) : (
        <ScannerStatusBar 
          autoRefreshEnabled={autoRefreshEnabled}
          onAutoRefreshChange={onAutoRefreshChange}
          refreshInterval={autoRefreshInterval}
          lastRefresh={lastRefresh}
          realTimeEnabled={isRealTimeMode}
        />
      )}
    </div>
  );
};

export default ScannerContent;
