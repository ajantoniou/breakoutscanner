
import React from "react";
import { Database, RefreshCw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, formatDistanceToNow } from "date-fns";

interface CachedDataIndicatorProps {
  usingCachedData: boolean;
  lastUpdated: Date | null;
  className?: string;
  showText?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const CachedDataIndicator: React.FC<CachedDataIndicatorProps> = ({ 
  usingCachedData, 
  lastUpdated,
  className = "",
  showText = true,
  onRefresh,
  isRefreshing = false
}) => {
  if (!usingCachedData || !lastUpdated) return null;
  
  const timeAgo = formatDistanceToNow(lastUpdated, { addSuffix: true });
  const formattedDate = format(lastUpdated, "MMM d, yyyy h:mm a");
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`flex items-center gap-1 bg-blue-50 border-blue-200 ${className}`}>
              <Database className="h-3 w-3 text-blue-600" />
              {showText && (
                <span className="text-xs text-blue-600 font-medium">
                  Cached {timeAgo}
                </span>
              )}
            </Badge>
            
            {onRefresh && (
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={onRefresh}
                className="h-6 w-6 p-0"
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-3.5 w-3.5 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="sr-only">Refresh data</span>
              </Button>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">Using cached data from {formattedDate}</p>
          <p className="text-xs text-muted-foreground mt-1">Click refresh to get the latest data</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default CachedDataIndicator;
