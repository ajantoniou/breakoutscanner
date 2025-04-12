
import React, { useRef, useState } from "react";
import { PatternData } from "@/services/types/patternTypes";
import { Card } from "@/components/ui/card";
import { usePatternTable } from "@/hooks/usePatternTable";
import ScrollToTopButton from "./ScrollToTopButton";
import { toast } from "sonner";
import PatternTableContent from "./table/PatternTableContent";
import LastUpdatedIndicator from "./LastUpdatedIndicator";
import CachedDataIndicator from "./CachedDataIndicator";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EnhancedPatternTableProps {
  patterns: PatternData[];
  loading?: boolean;
  onAddToTradeList?: (pattern: PatternData) => void;
  lastUpdated?: Date | null;
  usingCachedData?: boolean;
  onForceRefresh?: () => void;
}

const EnhancedPatternTable: React.FC<EnhancedPatternTableProps> = ({ 
  patterns, 
  loading = false,
  onAddToTradeList,
  lastUpdated = null,
  usingCachedData = false,
  onForceRefresh
}) => {
  const tableRef = useRef<HTMLDivElement>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const {
    sortField,
    sortDirection,
    handleSort,
  } = usePatternTable({
    patterns,
    rowsPerPage: 10,
  });

  const scrollToTop = () => {
    if (tableRef.current) {
      tableRef.current.scrollTop = 0;
    }
  };
  
  const handleAddToTradeList = (pattern: PatternData) => {
    if (onAddToTradeList) {
      onAddToTradeList(pattern);
      toast.success(`Added ${pattern.symbol} to Trade List`, {
        description: `${pattern.direction?.toUpperCase()} prediction added to active trades`
      });
    }
  };

  const handleRefresh = async () => {
    if (onForceRefresh) {
      setRefreshing(true);
      toast.info("Refreshing data...", {
        description: "Fetching latest pattern data from API"
      });
      
      try {
        await onForceRefresh();
      } finally {
        // Add a small delay to ensure UI updates properly
        setTimeout(() => setRefreshing(false), 500);
      }
    }
  };
  
  const renderEmptyState = () => {
    if (loading) return null;
    
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-3" />
        <h3 className="text-lg font-medium mb-2">No Pattern Data Found</h3>
        <p className="text-muted-foreground mb-4 max-w-md">
          No trading patterns could be detected for the current timeframe and filter settings.
        </p>
        {onForceRefresh && (
          <Button onClick={handleRefresh} disabled={loading || refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        )}
      </div>
    );
  };
  
  return (
    <Card className="rounded-md border border-slate-200 bg-white shadow-md overflow-hidden">
      <div className="relative p-4" ref={tableRef}>
        <div className="mb-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <CachedDataIndicator 
              usingCachedData={usingCachedData} 
              lastUpdated={lastUpdated}
              onRefresh={onForceRefresh ? handleRefresh : undefined}
              isRefreshing={refreshing || loading}
            />
            
            {!usingCachedData && onForceRefresh && (
              <Button 
                onClick={handleRefresh}
                variant="outline" 
                size="sm" 
                className="h-7 px-2 text-xs"
                disabled={loading || refreshing}
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${(loading || refreshing) ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            )}
          </div>
          
          {lastUpdated && !usingCachedData && (
            <LastUpdatedIndicator lastUpdated={lastUpdated} />
          )}
        </div>
        
        {patterns.length > 0 ? (
          <PatternTableContent
            patterns={patterns}
            loading={loading || refreshing}
            sortField={sortField || "symbol"}
            sortDirection={sortDirection || "asc"}
            handleSort={handleSort}
            onAddToTradeList={handleAddToTradeList}
          />
        ) : renderEmptyState()}
        
        <ScrollToTopButton onClick={scrollToTop} />
      </div>
    </Card>
  );
};

export default EnhancedPatternTable;
