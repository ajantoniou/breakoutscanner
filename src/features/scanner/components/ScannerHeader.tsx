
import React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowUpRight, BarChart3, RefreshCw, History, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimeframeStats } from "@/services/types/patternTypes";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ScannerHeaderProps {
  timeframe: string;
  onChangeTimeframe: (timeframe: string) => void;
  onRefresh: () => void;
  onRunFullBacktest: () => void;
  lastRefresh: Date | null;
  stats: TimeframeStats;
  loading: boolean;
  isRealTimeMode: boolean;
  onToggleRealTime: () => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  scannerType?: 'standard' | 'daytrader' | 'swing';
}

const ScannerHeader: React.FC<ScannerHeaderProps> = ({ 
  timeframe,
  onChangeTimeframe,
  onRefresh,
  onRunFullBacktest,
  lastRefresh,
  stats,
  loading,
  isRealTimeMode,
  onToggleRealTime,
  activeTab,
  onTabChange,
  scannerType = 'standard'
}) => {
  const getScannerTitle = () => {
    switch (scannerType) {
      case 'daytrader':
        return 'Day Trading Scanner';
      case 'swing':
        return 'Swing Trading Scanner';
      default:
        return 'Pattern Scanner';
    }
  };
  
  // Check if we're in production to modify UI
  const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost';
  
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold tracking-tight">
            {getScannerTitle()}
          </h2>
          
          {isProduction && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    <span>Production</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Auto-refresh is disabled in production to prevent excessive API usage.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {lastRefresh && `Last updated: ${lastRefresh.toLocaleTimeString()}`}
        </p>
      </div>
      
      <div className="flex items-center space-x-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        
        {!isProduction && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRunFullBacktest}
            disabled={loading}
            title="Run a full backtest on all current patterns"
          >
            <History className="h-4 w-4 mr-2" />
            Full Backtest
          </Button>
        )}
        
        <Button
          variant={isRealTimeMode ? "default" : "outline"}
          size="sm"
          onClick={onToggleRealTime}
          disabled={isProduction}
          title={isProduction ? "Real-time mode is disabled in production" : "Toggle real-time updates"}
        >
          {isProduction ? "Live Mode" : (isRealTimeMode ? "Live" : "Manual")}
        </Button>
      </div>
      
      {activeTab && onTabChange && (
        <Tabs value={activeTab} onValueChange={onTabChange} className="w-full sm:w-auto">
          <TabsList className="grid grid-cols-3 w-full sm:w-[400px]">
            <TabsTrigger value="patterns" className="text-xs sm:text-sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Pattern</span> Scanner
            </TabsTrigger>
            <TabsTrigger value="backtest" className="text-xs sm:text-sm">
              <ArrowUpRight className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Backtest</span> Results
            </TabsTrigger>
            <TabsTrigger value="trades" className="text-xs sm:text-sm">
              <ArrowUpRight className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Trade</span> List
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}
    </div>
  );
};

export default ScannerHeader;
