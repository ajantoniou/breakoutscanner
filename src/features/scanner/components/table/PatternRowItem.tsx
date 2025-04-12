
import React from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { PatternData } from "@/services/types/patternTypes";
import {
  renderConfidenceBadge,
  renderDirectionBadge,
  renderChannelBadge,
  renderRsiBadge,
  renderVolumeBadge
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
    <TableRow className="text-xs">
      <TableCell className="font-medium">{pattern.symbol}</TableCell>
      <TableCell>{pattern.timeframe}</TableCell>
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
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
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
          className="h-7 px-2 text-xs"
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
