
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Clock, 
  TrendingUp, 
  BarChart3, 
  Activity,
  Calendar
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PerformanceMetricsData {
  avgSuccessRate: number;
  avgProfitPercent: number;
  overallAccuracy: number;
  totalPatterns: number;
  successfulPatterns: number;
  timeframeAccuracy: Record<string, number>;
  patternTypeAccuracy?: Record<string, number>;
}

export interface ScannerStatusIndicatorProps {
  isLoading: boolean;
  timeframe: string;
  patternsCount: number;
  uniqueSymbolsCount: number;
  lastRefresh: Date;
  performanceMetrics: PerformanceMetricsData;
  scannerType: string;
  autoRefreshInterval?: number;
  onRefresh: () => void;
  isRealTimeConnected?: boolean;
  marketOpen?: boolean;
  lastUpdated?: Date | null;
}

export const ScannerStatusIndicator: React.FC<ScannerStatusIndicatorProps> = ({
  isLoading,
  timeframe,
  patternsCount,
  uniqueSymbolsCount,
  lastRefresh,
  performanceMetrics,
  scannerType,
  autoRefreshInterval,
  onRefresh,
  isRealTimeConnected,
  marketOpen,
  lastUpdated
}) => {
  const { avgSuccessRate, avgProfitPercent } = performanceMetrics;
  
  // Format the last refresh time
  const lastRefreshText = lastUpdated || lastRefresh
    ? formatDistanceToNow(new Date(lastUpdated || lastRefresh), { addSuffix: true })
    : "Never";
  
  // Determine badge color based on success rate
  const getSuccessRateBadgeColor = (rate: number) => {
    if (rate >= 70) return "bg-green-100 text-green-800 hover:bg-green-200";
    if (rate >= 50) return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
    return "bg-red-100 text-red-800 hover:bg-red-200";
  };

  // Determines badge text based on scanner type
  const getScannerTypeBadge = () => {
    if (scannerType === 'daytrader') {
      return (
        <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-200">
          <Clock className="h-3 w-3 mr-1" />
          Day Trading
        </Badge>
      );
    }
    
    return (
      <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200">
        <Calendar className="h-3 w-3 mr-1" />
        Swing Trading
      </Badge>
    );
  };
  
  // Auto-refresh text
  const getAutoRefreshText = () => {
    if (!autoRefreshInterval) return null;
    
    const minutes = Math.floor(autoRefreshInterval / 60000);
    return (
      <Badge variant="outline" className="ml-2">
        <Activity className="h-3 w-3 mr-1" />
        {minutes === 0 ? 'Auto-refresh' : `Refresh: ${minutes}m`}
      </Badge>
    );
  };

  return (
    <Card className="border-muted bg-background shadow-sm">
      <CardContent className="p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {getScannerTypeBadge()}
            
            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
              <BarChart3 className="h-3 w-3 mr-1" />
              {timeframe}
            </Badge>
            
            <Badge variant="outline">
              Patterns: {patternsCount} ({uniqueSymbolsCount} symbols)
            </Badge>
            
            {!isLoading && (
              <>
                <Badge 
                  className={getSuccessRateBadgeColor(avgSuccessRate)}
                  title="Success rate based on historical backtest data"
                >
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {avgSuccessRate.toFixed(1)}% accuracy
                </Badge>
                
                <Badge 
                  className="bg-blue-100 text-blue-800 hover:bg-blue-200"
                  title="Average profit per successful trade"
                >
                  +{avgProfitPercent.toFixed(1)}% avg. profit
                </Badge>
              </>
            )}
          </div>
          
          <div className="flex items-center text-xs text-muted-foreground">
            <span className="mr-1">Updated:</span>
            <span>{lastRefreshText}</span>
            {getAutoRefreshText()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
