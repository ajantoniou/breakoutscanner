
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PatternData } from "@/services/types/patternTypes";
import { ArrowUpFromLine, ArrowDownFromLine, Clock, Percent } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PatternCardProps {
  pattern: PatternData;
  className?: string;
}

const PatternCard: React.FC<PatternCardProps> = ({ pattern, className }) => {
  const isBullish = pattern.direction === "bullish";
  
  const formatPercentage = (value?: number): string => {
    if (value === undefined) return "N/A";
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  };
  
  // Calculate target percent if not provided
  const calculatedTargetPercent = 
    pattern.targetPercent || 
    (pattern.targetPrice && pattern.entryPrice 
      ? ((pattern.targetPrice - pattern.entryPrice) / pattern.entryPrice) * 100 
      : undefined);
  
  // Default breakout candles to 0 if not defined
  const breakoutCandles = pattern.predictedBreakoutCandles || 0;
  
  return (
    <Card className={cn("overflow-hidden border-l-4", className, {
      "border-l-green-500": isBullish,
      "border-l-red-500": !isBullish
    })}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-1">
              <h3 className="font-bold text-lg">{pattern.symbol}</h3>
              <Badge variant="outline" className={cn({
                "bg-green-50 text-green-700 border-green-200": isBullish,
                "bg-red-50 text-red-700 border-red-200": !isBullish
              })}>
                {isBullish ? 
                  <ArrowUpFromLine className="h-3 w-3 mr-1" /> : 
                  <ArrowDownFromLine className="h-3 w-3 mr-1" />
                }
                {isBullish ? "Bullish" : "Bearish"}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {pattern.patternType} ({pattern.timeframe})
            </div>
          </div>
          
          <div className="text-right">
            <div className="flex items-center gap-1 text-sm font-medium">
              <Percent className="h-3.5 w-3.5 text-primary" />
              <span>Target: {formatPercentage(calculatedTargetPercent)}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Clock className="h-3 w-3" />
              <span>Est. {breakoutCandles || "?"} candles</span>
            </div>
          </div>
        </div>
        
        <div className="mt-3 text-sm">
          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            <div className="text-muted-foreground">Entry:</div>
            <div className="text-right font-medium">${pattern.entryPrice?.toFixed(2)}</div>
            
            <div className="text-muted-foreground">Target:</div>
            <div className="text-right font-medium">${pattern.targetPrice?.toFixed(2)}</div>
            
            {pattern.confidenceScore !== undefined && (
              <>
                <div className="text-muted-foreground">Confidence:</div>
                <div className="text-right font-medium">
                  {pattern.confidenceScore.toFixed(0)}%
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PatternCard;
