
import React from "react";
import { formatDistanceToNow } from "date-fns";
import { Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PerformanceMetrics } from "@/services/backtesting/performanceMonitor";

interface PerformanceMonitorBadgeProps {
  metrics: PerformanceMetrics | null;
  className?: string;
}

const PerformanceMonitorBadge: React.FC<PerformanceMonitorBadgeProps> = ({
  metrics,
  className = ""
}) => {
  if (!metrics) return null;
  
  const timeAgo = formatDistanceToNow(metrics.lastMonitoringDate, { addSuffix: true });
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`flex items-center gap-1 bg-purple-50 border-purple-200 ${className}`}>
            <Activity className="h-3 w-3 text-purple-600" />
            <span className="text-xs text-purple-600 font-medium">
              Monitored {timeAgo}
            </span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-medium">Performance Metrics</p>
            <p className="text-sm">Overall accuracy: {metrics.overallAccuracy.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">
              Based on {metrics.totalPatterns} patterns with {metrics.successfulPatterns} successful predictions
            </p>
            {Object.keys(metrics.timeframeAccuracy).length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium">Timeframe Accuracy:</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
                  {Object.entries(metrics.timeframeAccuracy).map(([timeframe, accuracy]) => (
                    <div key={timeframe} className="flex justify-between text-xs">
                      <span>{timeframe}:</span>
                      <span className="font-medium">{accuracy.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default PerformanceMonitorBadge;
