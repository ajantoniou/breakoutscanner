import React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PatternData } from "@/services/types/patternTypes";
import { CheckCircle2, TrendingUp, TrendingDown, PlusCircle, BarChart3, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { renderConfidenceBadge, renderDirectionBadge, renderChannelBadge } from "./table/PatternTableBadges";

interface MultiTimeframePatternCardProps {
  pattern: PatternData;
  onAddToTradeList?: (pattern: PatternData) => void;
}

/**
 * Card component specifically designed to highlight patterns with multi-timeframe confirmations,
 * making them stand out in the UI for higher importance.
 */
const MultiTimeframePatternCard: React.FC<MultiTimeframePatternCardProps> = ({ 
  pattern,
  onAddToTradeList
}) => {
  if (!pattern.multiTimeframeConfirmed) {
    return null; // Only render for multi-timeframe confirmed patterns
  }

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

  const renderTrendlineBreakoutBadge = () => {
    if (!pattern.trendlineBreak) return null;
    
    return (
      <div className="flex items-center gap-1 bg-indigo-100 dark:bg-indigo-900 px-2 py-1 rounded text-xs text-indigo-600 dark:text-indigo-300 font-medium">
        {pattern.direction === 'bullish' ? 
          <ArrowUpRight className="h-3.5 w-3.5" /> : 
          <ArrowDownRight className="h-3.5 w-3.5" />
        }
        <span>Internal Trendline Breakout</span>
      </div>
    );
  };

  return (
    <Card className="overflow-hidden border-indigo-200 dark:border-indigo-900">
      <div className="bg-indigo-600 h-2" />
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              {pattern.symbol} 
              <Badge variant="outline" className="text-xs font-normal">
                {pattern.timeframe}
              </Badge>
              {pattern.direction === 'bullish' ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </CardTitle>
            <CardDescription className="flex items-center mt-1">
              {pattern.patternType} 
              {pattern.channelType && 
                <span className="text-xs ml-1 text-slate-500">
                  · {renderChannelBadge(pattern.channelType)} channel
                </span>
              }
            </CardDescription>
          </div>
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1 text-indigo-600 font-medium">
              <CheckCircle2 className="h-4 w-4" />
              <span>Confirmed in {pattern.confirmingTimeframe}</span>
            </div>
            <div className="mt-1">
              {pattern.confidenceScore !== undefined && renderConfidenceBadge(pattern.confidenceScore)}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        {renderTrendlineBreakoutBadge()}
        
        <div className="grid grid-cols-2 gap-2 my-3">
          <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-md">
            <div className="text-xs text-slate-500 dark:text-slate-400">Entry Price</div>
            <div className="font-medium">${formatPrice(pattern.entryPrice)}</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-md">
            <div className="text-xs text-slate-500 dark:text-slate-400">Target Price</div>
            <div className={`font-medium ${pattern.direction === 'bullish' ? "text-green-600" : "text-red-600"}`}>
              ${formatPrice(pattern.targetPrice)} 
              {priceChange && (
                <span className="ml-1 text-xs">({priceChange.formatted})</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 text-xs">
          {pattern.volumeConfirmation && (
            <div className="flex items-center gap-1 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded text-green-700 dark:text-green-400">
              <span>Volume Confirmed</span>
            </div>
          )}
          {pattern.rsi !== undefined && (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
              <span className="text-slate-500 dark:text-slate-400">RSI:</span> 
              <span className="font-medium">{pattern.rsi.toFixed(0)}</span>
            </div>
          )}
          {pattern.atr !== undefined && (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
              <span className="text-slate-500 dark:text-slate-400">ATR:</span> 
              <span className="font-medium">{pattern.atr.toFixed(2)}</span>
            </div>
          )}
          {pattern.emaPattern && (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
              <span className="text-slate-500 dark:text-slate-400">EMA:</span> 
              <span className="font-medium">{pattern.emaPattern}</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between pt-0">
        <Button 
          variant="outline" 
          size="sm" 
          className="text-xs"
          onClick={handleAddToTradeList}
        >
          <PlusCircle className="h-3.5 w-3.5 mr-1" />
          Add to Trade List
        </Button>
        <Button 
          variant="secondary" 
          size="sm" 
          className="text-xs"
        >
          <BarChart3 className="h-3.5 w-3.5 mr-1" />
          View Chart
        </Button>
      </CardFooter>
    </Card>
  );
};

export default MultiTimeframePatternCard; 