import React from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { PatternData } from "@/services/types/patternTypes";
import {
  renderConfidenceBadge,
  renderDirectionBadge,
  renderChannelBadge,
  renderRsiBadge,
  renderVolumeBadge,
  renderMultiTimeframeBadge
} from "./PatternTableBadges";
import { Button } from "@/components/ui/button";
import { PlusCircle, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PatternRowItemProps {
  pattern: PatternData;
  onAddToTradeList?: (pattern: PatternData) => void;
  onSetExitAlert?: (pattern: PatternData) => void;
}

// Extended interface to work with our UI components
interface ExtendedPatternData extends PatternData {
  confirmingTimeframe?: string;
  notes?: string;
}

const PatternRowItem: React.FC<PatternRowItemProps> = ({ 
  pattern, 
  onAddToTradeList,
  onSetExitAlert
}) => {
  // Cast to extended type for UI purposes
  const extendedPattern = pattern as ExtendedPatternData;
  
  const formatPrice = (price: number | undefined) => {
    if (price === undefined || price === null) return "N/A";
    return price.toFixed(2);
  };

  const calculatePriceChange = () => {
    if (!pattern.entry_price || !pattern.target_price) return null;
    
    const change = ((pattern.target_price - pattern.entry_price) / pattern.entry_price) * 100;
    return {
      value: change,
      formatted: `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`
    };
  };

  const priceChange = calculatePriceChange();
  
  const handleAddToTradeList = () => {
    if (onAddToTradeList) {
      onAddToTradeList(pattern);
    }
  };

  const handleSetExitAlert = () => {
    if (onSetExitAlert) {
      onSetExitAlert(pattern);
    }
  };

  return (
    <TableRow className={`text-xs ${pattern.multi_timeframe_confirmed ? 'bg-indigo-50 dark:bg-indigo-950/20' : ''}`}>
      <TableCell className="font-medium">{pattern.symbol}</TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <span>{pattern.timeframe}</span>
          {renderMultiTimeframeBadge(
            pattern.multi_timeframe_confirmed, 
            extendedPattern.confirmingTimeframe
          )}
        </div>
      </TableCell>
      <TableCell>{renderDirectionBadge(pattern.direction || 'neutral')}</TableCell>
      <TableCell>{pattern.pattern_type}</TableCell>
      <TableCell>${formatPrice(pattern.entry_price)}</TableCell>
      <TableCell>
        {pattern.target_price && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={pattern.direction === 'bullish' ? "text-green-600" : "text-red-600"}>
                  ${formatPrice(pattern.target_price)} 
                  {priceChange && (
                    <span className="ml-1">({priceChange.formatted})</span>
                  )}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Potential {pattern.direction === 'bullish' ? "profit" : "loss"}: {priceChange?.formatted}</p>
                {pattern.multi_timeframe_confirmed && extendedPattern.confirmingTimeframe && (
                  <p className="text-indigo-600 font-medium">
                    Confirmed in {extendedPattern.confirmingTimeframe} timeframe
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <span>{pattern.confidence_score !== undefined ? renderConfidenceBadge(pattern.confidence_score) : "N/A"}</span>
          {pattern.multi_timeframe_confirmed && extendedPattern.notes && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs text-indigo-600 cursor-help">+Boost</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{extendedPattern.notes}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </TableCell>
      <TableCell>{pattern.rsi !== undefined ? renderRsiBadge(pattern.rsi) : "N/A"}</TableCell>
      <TableCell>{pattern.atr !== undefined ? pattern.atr.toFixed(2) : "N/A"}</TableCell>
      <TableCell>${formatPrice(pattern.support_level)}</TableCell>
      <TableCell>${formatPrice(pattern.resistance_level)}</TableCell>
      <TableCell>${formatPrice(pattern.trendline_support)}</TableCell>
      <TableCell>${formatPrice(pattern.trendline_resistance)}</TableCell>
      <TableCell className="text-center">
        {pattern.volume_confirmation !== undefined ? 
          (pattern.volume_confirmation ? 
            renderVolumeBadge(true, 20) : 
            renderVolumeBadge(false, 10)
          ) : "N/A"}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex gap-2 justify-end">
          {onSetExitAlert && (
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 px-2 text-xs border-amber-600 text-amber-600 hover:bg-amber-50"
              onClick={handleSetExitAlert}
            >
              <AlertCircle className="h-3.5 w-3.5 mr-1" />
              Exit Alert
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            className={`h-7 px-2 text-xs ${pattern.multi_timeframe_confirmed ? 'border-indigo-600 text-indigo-600 hover:bg-indigo-50' : ''}`}
            onClick={handleAddToTradeList}
          >
            <PlusCircle className="h-3.5 w-3.5 mr-1" />
            Add Trade
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

export default PatternRowItem;
