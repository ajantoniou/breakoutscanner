import React from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { PatternData } from "@/services/types/patternTypes";
import { BacktestResult } from "@/services/types/backtestTypes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, Plus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ConfidenceScore from "./ConfidenceScore";

interface PatternRowItemProps {
  pattern: PatternData;
  backtestResults?: BacktestResult[];
  onAddToTradeList?: (pattern: PatternData) => void;
}

const PatternRowItem: React.FC<PatternRowItemProps> = ({ 
  pattern, 
  backtestResults = [],
  onAddToTradeList 
}) => {
  const {
    symbol,
    timeframe,
    patternType,
    entryPrice,
    targetPrice,
    direction,
    supportLevel,
    resistanceLevel,
    trendlineSupport,
    trendlineResistance,
    volumeConfirmation,
    rsi,
    atr
  } = pattern;

  const formatPrice = (price: number | undefined) => {
    if (price === undefined) return "N/A";
    return price.toFixed(2);
  };

  const calculatePercentChange = () => {
    if (!entryPrice || !targetPrice) return 0;
    return ((targetPrice - entryPrice) / entryPrice) * 100;
  };

  const percentChange = calculatePercentChange();
  
  const getRowStyle = () => {
    if (direction === 'bullish') return "hover:bg-green-50 dark:hover:bg-green-950/20";
    if (direction === 'bearish') return "hover:bg-red-50 dark:hover:bg-red-950/20";
    return "hover:bg-slate-50 dark:hover:bg-slate-800/50";
  };

  const getDirectionBadge = () => {
    if (direction === 'bullish') {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-100">Bullish</Badge>;
    }
    if (direction === 'bearish') {
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-100">Bearish</Badge>;
    }
    return <Badge variant="outline">Neutral</Badge>;
  };

  const renderVolumeConfirmation = () => {
    if (volumeConfirmation === true) {
      return <Check className="text-green-500 w-5 h-5" />;
    }
    return <X className="text-red-500 w-5 h-5" />;
  };

  const handleAddToTradeList = () => {
    if (onAddToTradeList) {
      onAddToTradeList(pattern);
    }
  };

  // Get only the relevant backtest results for this pattern type and timeframe
  const relevantBacktests = backtestResults.filter(
    result => result.patternType === patternType && result.timeframe === timeframe
  );

  return (
    <TableRow className={`text-xs ${getRowStyle()}`}>
      <TableCell className="px-4 py-3 font-medium">
        {symbol}
      </TableCell>
      
      <TableCell className="px-4 py-3">
        {timeframe}
      </TableCell>
      
      <TableCell className="px-4 py-3">
        {getDirectionBadge()}
      </TableCell>
      
      <TableCell className="px-4 py-3">
        ${formatPrice(entryPrice)}
      </TableCell>
      
      <TableCell className="px-4 py-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={percentChange >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                ${formatPrice(targetPrice)} 
                <span className="ml-1">
                  ({percentChange >= 0 ? "+" : ""}{percentChange.toFixed(2)}%)
                </span>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Potential {percentChange >= 0 ? "profit" : "loss"}: {Math.abs(percentChange).toFixed(2)}%</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>
      
      <TableCell className="px-4 py-3">
        {rsi !== undefined ? rsi.toFixed(1) : "N/A"}
      </TableCell>
      
      <TableCell className="px-4 py-3">
        {atr !== undefined ? atr.toFixed(2) : "N/A"}
      </TableCell>
      
      <TableCell className="px-4 py-3">
        ${formatPrice(supportLevel)}
      </TableCell>
      
      <TableCell className="px-4 py-3">
        ${formatPrice(resistanceLevel)}
      </TableCell>
      
      <TableCell className="px-4 py-3">
        ${formatPrice(trendlineSupport)}
      </TableCell>
      
      <TableCell className="px-4 py-3">
        ${formatPrice(trendlineResistance)}
      </TableCell>
      
      <TableCell className="px-4 py-3 text-center">
        {renderVolumeConfirmation()}
      </TableCell>
      
      <TableCell className="px-4 py-3 text-right">
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 px-3 text-xs"
          onClick={handleAddToTradeList}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Trade
        </Button>
      </TableCell>
    </TableRow>
  );
};

export default PatternRowItem;
