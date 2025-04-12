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
import { PlusCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PatternRowItemProps {
  pattern: PatternData;
  onAddToTradeList?: (pattern: PatternData) => void;
}

const PatternRowItem: React.FC<PatternRowItemProps> = ({ pattern, onAddToTradeList }) => {
  const formatPrice = (price: number | undefined) => {
    if (price === undefined || price === null) return "N/A";
    return price.toFixed(2);
  };

  const calculatePriceChange = () => {
    if (!pattern.entryPrice || !pattern.targetPrice) return null;
    
    const change = ((pattern.targetPrice - pattern.entryPrice) / pattern.entryPrice) * 100;
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

  return (
    <TableRow className={`text-xs ${pattern.multiTimeframeConfirmed ? 'bg-indigo-50 dark:bg-indigo-950/20' : ''}`}>
      <TableCell className="font-medium">{pattern.symbol}</TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <span>{pattern.timeframe}</span>
          {renderMultiTimeframeBadge(pattern.multiTimeframeConfirmed, pattern.confirmingTimeframe)}
        </div>
      </TableCell>
      <TableCell>{renderDirectionBadge(pattern.direction || 'neutral')}</TableCell>
      <TableCell>{pattern.patternType}</TableCell>
      <TableCell>${formatPrice(pattern.entryPrice)}</TableCell>
      <TableCell>
        {pattern.targetPrice && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={pattern.direction === 'bullish' ? "text-green-600" : "text-red-600"}>
                  ${formatPrice(pattern.targetPrice)} 
                  {priceChange && (
                    <span className="ml-1">({priceChange.formatted})</span>
                  )}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Potential {pattern.direction === 'bullish' ? "profit" : "loss"}: {priceChange?.formatted}</p>
                {pattern.multiTimeframeConfirmed && (
                  <p className="text-indigo-600 font-medium">
                    Confirmed in {pattern.confirmingTimeframe} timeframe
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <span>{pattern.confidenceScore !== undefined ? renderConfidenceBadge(pattern.confidenceScore) : "N/A"}</span>
          {pattern.multiTimeframeConfirmed && pattern.notes && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs text-indigo-600 cursor-help">+Boost</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{pattern.notes}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </TableCell>
      <TableCell>{pattern.rsi !== undefined ? renderRsiBadge(pattern.rsi) : "N/A"}</TableCell>
      <TableCell>{pattern.atr !== undefined ? pattern.atr.toFixed(2) : "N/A"}</TableCell>
      <TableCell>${formatPrice(pattern.supportLevel)}</TableCell>
      <TableCell>${formatPrice(pattern.resistanceLevel)}</TableCell>
      <TableCell>${formatPrice(pattern.trendlineSupport)}</TableCell>
      <TableCell>${formatPrice(pattern.trendlineResistance)}</TableCell>
      <TableCell className="text-center">
        {pattern.volumeConfirmation !== undefined ? 
          (pattern.volumeConfirmation ? 
            renderVolumeBadge(true, 20) : 
            renderVolumeBadge(false, 10)
          ) : "N/A"}
      </TableCell>
      <TableCell className="text-right">
        <Button 
          variant="outline" 
          size="sm" 
          className={`h-7 px-2 text-xs ${pattern.multiTimeframeConfirmed ? 'border-indigo-600 text-indigo-600 hover:bg-indigo-50' : ''}`}
          onClick={handleAddToTradeList}
        >
          <PlusCircle className="h-3.5 w-3.5 mr-1" />
          Add Trade
        </Button>
      </TableCell>
    </TableRow>
  );
};

export default PatternRowItem;
