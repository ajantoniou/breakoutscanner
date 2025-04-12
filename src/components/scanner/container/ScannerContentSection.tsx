import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { 
  LayoutGrid, 
  List, 
  Table, 
  RefreshCw, 
  DatabaseZap,
  AlertCircle,
  ListFilter,
  BookOpen,
  ListVideo
} from "lucide-react";
import { PatternData, TimeframeStats } from "@/services/types/patternTypes";
import { RealTimeQuote } from "@/hooks/scannerHooks/useRealTimeData";
import { PerformanceMetrics } from "@/services/backtesting/performanceMonitor";
import { BacktestResult } from "@/services/types/backtestTypes";

type DataSourceType = "api" | "supabase"; 

interface ScannerContentSectionProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  filteredPatterns: PatternData[];
  loading: boolean;
  lastUpdated: Date;
  dataSource: DataSourceType;
  timeframeStats: TimeframeStats[];
  isPremiumApi?: boolean;
  apiProvider?: string;
  isLoading?: boolean;
  usingCachedData?: boolean;
  onForceRefresh?: () => void;
  backtestResults?: BacktestResult[];
  realTimeData?: Record<string, RealTimeQuote>;
  topPatterns?: PatternData[];
  performanceMetrics?: PerformanceMetrics | null;
  onAddToTradeList?: (pattern: PatternData) => void;
}

const ScannerContentSection: React.FC<ScannerContentSectionProps> = ({
  activeTab,
  setActiveTab,
  filteredPatterns,
  loading,
  lastUpdated,
  dataSource,
  timeframeStats,
  isPremiumApi = false,
  apiProvider = "Polygon.io",
  isLoading = false,
  usingCachedData = false,
  onForceRefresh,
  backtestResults = [],
  realTimeData = {},
  topPatterns = [],
  performanceMetrics,
  onAddToTradeList
}) => {
  const [viewMode, setViewMode] = useState("grid");
  
  const handleViewModeChange = (mode: string) => {
    setViewMode(mode);
  };
  
  return (
    <Card className="h-full flex flex-col">
      <CardContent className="flex-grow flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {activeTab === "patterns" ? "Pattern Scanner" : "Backtest Results"}
          </h2>
          
          <div className="flex items-center space-x-4">
            <ToggleGroup 
              value={viewMode}
              onValueChange={handleViewModeChange}
              type="single"
            >
              <ToggleGroupItem value="grid" aria-label="Grid" className="h-8 w-8">
                <LayoutGrid className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="list" aria-label="List" className="h-8 w-8">
                <List className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="table" aria-label="Table" className="h-8 w-8">
                <Table className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
            
            {onForceRefresh && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onForceRefresh}
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Refresh Data
              </Button>
            )}
          </div>
        </div>
        
        <ScrollArea className="flex-grow">
          {loading ? (
            <div className="flex items-center justify-center p-6">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <p>Loading data...</p>
              </div>
            </div>
          ) : filteredPatterns.length === 0 ? (
            <div className="flex items-center justify-center p-6">
              <div className="text-center">
                <AlertCircle className="h-8 w-8 mx-auto mb-4 text-yellow-500" />
                <p>No patterns found for the selected filters.</p>
                {usingCachedData && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Using cached data. Try refreshing for the latest results.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {viewMode === "list" ? (
                <div className="grid grid-cols-1 gap-4">
                  {filteredPatterns.map(pattern => (
                    <Card key={pattern.id}>
                      <CardContent>
                        <p className="font-semibold">{pattern.symbol}</p>
                        <p className="text-sm text-muted-foreground">
                          {pattern.patternType} - {pattern.timeframe}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredPatterns.map(pattern => (
                    <Card key={pattern.id}>
                      <CardContent>
                        <p className="font-semibold">{pattern.symbol}</p>
                        <p className="text-sm text-muted-foreground">
                          {pattern.patternType} - {pattern.timeframe}
                        </p>
                        {onAddToTradeList && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-2"
                            onClick={() => onAddToTradeList(pattern)}
                          >
                            Add to Trade List
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ScannerContentSection;
