import React from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Info } from "lucide-react";

interface MultiTimeframeFilterToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  confirmedCount: number;
  totalCount: number;
}

/**
 * Toggle component to filter patterns based on multi-timeframe confirmation
 */
const MultiTimeframeFilterToggle: React.FC<MultiTimeframeFilterToggleProps> = ({
  enabled,
  onToggle,
  confirmedCount,
  totalCount
}) => {
  const percentage = totalCount > 0 ? Math.round((confirmedCount / totalCount) * 100) : 0;
  
  return (
    <div className="flex items-center space-x-4 py-2">
      <div className="flex-1">
        <div className="flex items-center">
          <Label htmlFor="multi-timeframe-filter" className="font-medium mr-2">
            Multi-Timeframe Confirmed Only
          </Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-slate-400" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Show only patterns that are confirmed in multiple timeframes. 
                  These patterns have higher reliability and confidence scores.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="text-sm text-slate-500 mt-1 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          <span>
            {confirmedCount} of {totalCount} patterns confirmed
            {totalCount > 0 && ` (${percentage}%)`}
          </span>
          {confirmedCount > 0 && (
            <Badge variant="outline" className="ml-1 text-xs font-normal">
              Higher confidence
            </Badge>
          )}
        </div>
      </div>
      <Switch
        id="multi-timeframe-filter"
        checked={enabled}
        onCheckedChange={onToggle}
      />
    </div>
  );
};

export default MultiTimeframeFilterToggle; 