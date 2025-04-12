
import React from "react";
import { Button } from "@/components/ui/button";
import { Server, Database, Shield, RefreshCw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DataSourceType } from "@/hooks/useScanner";
import { Badge } from "@/components/ui/badge";

interface DataSourceToggleProps {
  dataSource: DataSourceType;
  toggleDataSource: () => void;
  isPremiumApi?: boolean;
  apiProvider?: string;
  isLoading?: boolean;
  analyzeFullUniverse?: boolean;
  toggleUniverseMode?: () => void;
  usingCachedData?: boolean;
  onForceRefresh?: () => void;
}

const DataSourceToggle: React.FC<DataSourceToggleProps> = ({ 
  dataSource, 
  toggleDataSource,
  isPremiumApi = true,
  apiProvider = "Polygon.io",
  isLoading = false,
  analyzeFullUniverse = true,
  toggleUniverseMode,
  usingCachedData = false,
  onForceRefresh
}) => {
  // Log the props to debug
  console.log("DataSourceToggle props:", { 
    dataSource, 
    usingCachedData, 
    isLoading, 
    analyzeFullUniverse,
    apiProvider
  });

  const getIcon = () => {
    if (isLoading) {
      return <RefreshCw className="h-4 w-4 mr-2 animate-spin" />;
    }
    
    switch (dataSource) {
      case "supabase":
        return <Database className="h-4 w-4 mr-2" />;
      case "api":
        return <Shield className="h-4 w-4 mr-2 text-green-600" />;
      default:
        return <Database className="h-4 w-4 mr-2" />;
    }
  };

  const getLabel = () => {
    if (isLoading) {
      return "Loading Data...";
    }
    
    switch (dataSource) {
      case "supabase":
        return "Stored Data";
      case "api":
        return `${apiProvider}`;
      default:
        return "Data Source";
    }
  };

  const getTooltip = () => {
    if (isLoading) {
      return `Fetching real-time market data from ${apiProvider} API...`;
    }
    
    switch (dataSource) {
      case "supabase":
        return "Using stored data from Supabase database. Click to switch to real market data.";
      case "api":
        return usingCachedData
          ? `Using cached market data from Supabase. Data refreshes automatically based on timeframe (4h data refreshes every 4 hours, daily every 24 hours, etc.)`
          : `Using real market data from ${apiProvider} API with 5 years of price history and 15-minute delay. Click to switch to stored data.`;
      default:
        return "Select data source";
    }
  };

  const getVariant = () => {
    return dataSource === "api" ? "default" : "outline";
  };

  return (
    <TooltipProvider>
      <div className="flex items-center space-x-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center">
              <Button
                variant={getVariant()}
                size="sm"
                onClick={toggleDataSource}
                className="text-xs"
                disabled={isLoading}
              >
                {getIcon()}
                {getLabel()}
                {isLoading && <span className="ml-2 animate-pulse">...</span>}
              </Button>
              
              {dataSource === "api" && !isLoading && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge 
                      variant="outline" 
                      className="ml-2 text-[10px] h-5 bg-green-50 text-green-800 border-green-200"
                    >
                      {usingCachedData ? "Auto-Refresh" : "Live Data"}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="w-56">
                    {usingCachedData 
                      ? "Using cached data that automatically refreshes based on timeframe" 
                      : "Using real-time market data from API"}
                  </TooltipContent>
                </Tooltip>
              )}

              {(usingCachedData || dataSource === "supabase") && onForceRefresh && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onForceRefresh();
                  }}
                  className="ml-1 h-6 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent"
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                  {isLoading ? 'Refreshing...' : 'Refresh'}
                </Button>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs">{getTooltip()}</p>
            {dataSource === "api" && !isLoading && (
              <div className="flex items-center text-xs text-green-600 mt-1">
                <Shield className="h-3 w-3 mr-1" />
                <span>Using {apiProvider} API with unlimited calls (15min delay)</span>
              </div>
            )}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};

export default DataSourceToggle;
