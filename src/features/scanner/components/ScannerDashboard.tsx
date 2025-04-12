
import { BacktestResult } from "@/services/types/backtestTypes";
import { PatternData } from "@/services/types/patternTypes";
import BacktestStats from "@/components/scanner/BacktestStats";
import TopBreakoutOpportunities from "@/components/breakout/TopBreakoutOpportunities";
import { ScannerStatusIndicator } from "@/components/scanner/container/ScannerStatusIndicator";
import { TradeStats, TradeStatistics } from "@/services/types/tradeTypes";

interface ScannerDashboardProps {
  patterns: PatternData[];
  backtestResults: BacktestResult[];
  isLoading: boolean;
  lastUpdated?: Date | null;
  onRefresh: () => void;
  timeframe: string;
  timeframeStats: any[];
  autoRefreshInterval?: number;
  marketOpen?: boolean;
  isRealTimeConnected?: boolean;
  tradeStats?: TradeStatistics;
}

const ScannerDashboard = ({
  patterns,
  backtestResults,
  isLoading,
  lastUpdated,
  onRefresh,
  timeframe,
  timeframeStats,
  autoRefreshInterval,
  marketOpen,
  isRealTimeConnected,
  tradeStats
}: ScannerDashboardProps) => {
  // Create default performance metrics
  const performanceMetrics = {
    avgSuccessRate: tradeStats?.successRate || 0,
    avgProfitPercent: tradeStats?.avgReturn || 0,
    overallAccuracy: tradeStats?.successRate || 0,
    totalPatterns: patterns.length,
    successfulPatterns: tradeStats?.successfulTrades || 0,
    timeframeAccuracy: {}
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="col-span-1 lg:col-span-12">
        <ScannerStatusIndicator 
          isLoading={isLoading}
          lastRefresh={lastUpdated || new Date()}
          onRefresh={onRefresh}
          timeframe={timeframe}
          patternsCount={patterns.length}
          uniqueSymbolsCount={[...new Set(patterns.map(p => p.symbol))].length}
          autoRefreshInterval={autoRefreshInterval}
          isRealTimeConnected={isRealTimeConnected}
          marketOpen={marketOpen}
          performanceMetrics={performanceMetrics}
          scannerType="swing"
          lastUpdated={lastUpdated ? new Date(lastUpdated) : null}
          usingCachedData={false}
        />
      </div>
      
      <div className="col-span-1 lg:col-span-8">
        <BacktestStats 
          backtestResults={backtestResults} 
          loading={isLoading} 
          timeframeStats={timeframeStats}
          tradeStatistics={tradeStats}
        />
      </div>
      
      <div className="col-span-1 lg:col-span-4">
        <TopBreakoutOpportunities 
          patterns={patterns}
          backtestResults={backtestResults}
          loading={isLoading}
        />
      </div>
    </div>
  );
};

export default ScannerDashboard;
