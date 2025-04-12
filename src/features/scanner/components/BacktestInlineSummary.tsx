
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BacktestResult } from "@/services/types/backtestTypes";
import { TimeframeStats } from "@/services/types/patternTypes";
import { BarChart3, Check, X } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BacktestInlineSummaryProps {
  backtestResults: BacktestResult[];
  timeframe: string;
  stats: TimeframeStats;
}

interface MultiTimeframeConfirmation {
  count: number;
  successRate: number;
}

const BacktestInlineSummary: React.FC<BacktestInlineSummaryProps> = ({
  backtestResults,
  timeframe,
  stats
}) => {
  // Filter results for the current timeframe
  const filteredResults = backtestResults.filter(r => r.timeframe === timeframe);
  
  // Calculate summary statistics
  const totalTrades = filteredResults.length;
  const successfulTrades = filteredResults.filter(r => r.successful).length;
  const winRate = totalTrades > 0 ? (successfulTrades / totalTrades) * 100 : 0;
  
  // Calculate average profit
  const profits = filteredResults
    .filter(r => r.successful)
    .map(r => r.profitLossPercent);
  const avgProfit = profits.length > 0 
    ? profits.reduce((sum, val) => sum + val, 0) / profits.length 
    : 0;
  
  // Calculate average loss
  const losses = filteredResults
    .filter(r => !r.successful)
    .map(r => r.profitLossPercent);
  const avgLoss = losses.length > 0 
    ? losses.reduce((sum, val) => sum + val, 0) / losses.length 
    : 0;
  
  // Calculate multi-timeframe confirmation stats
  // Handle the case when the property doesn't exist in stats
  const multiTimeframeConfirmation: MultiTimeframeConfirmation = (stats as any).multiTimeframeConfirmation || {
    count: 0, 
    successRate: 0
  };
  
  return (
    <Card className="border-muted bg-card shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-md font-medium flex items-center">
          <BarChart3 className="h-4 w-4 mr-2" />
          Backtest Performance ({timeframe})
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs">Win Rate</span>
            <span className="font-medium text-lg">{winRate.toFixed(1)}%</span>
            <span className="text-xs text-muted-foreground">
              {successfulTrades}/{totalTrades} trades
            </span>
          </div>
          
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs">Avg. Profit</span>
            <span className="font-medium text-lg text-green-600">
              +{avgProfit.toFixed(2)}%
            </span>
            <span className="text-xs text-muted-foreground">
              per winning trade
            </span>
          </div>
          
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs">Avg. Loss</span>
            <span className="font-medium text-lg text-red-600">
              {avgLoss.toFixed(2)}%
            </span>
            <span className="text-xs text-muted-foreground">
              per losing trade
            </span>
          </div>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex flex-col">
                  <span className="text-muted-foreground text-xs">Multi-TF Confirmation</span>
                  <span className="font-medium text-lg">
                    {multiTimeframeConfirmation.successRate.toFixed(1)}%
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {multiTimeframeConfirmation.count} patterns
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm max-w-xs">
                  Success rate when patterns are confirmed across multiple timeframes. 
                  This typically leads to higher accuracy predictions.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <div className="mt-3 text-xs text-muted-foreground">
          <div className="flex items-center">
            <Check className="h-3 w-3 text-green-500 mr-1" />
            <span>
              Higher accuracy is achieved when a shorter timeframe bounces off 
              longer timeframe support/resistance.
            </span>
          </div>
          <div className="flex items-center mt-1">
            <Check className="h-3 w-3 text-green-500 mr-1" />
            <span>
              Longer timeframe signals gain confidence when shorter timeframes 
              show a breakout in the same direction.
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BacktestInlineSummary;
