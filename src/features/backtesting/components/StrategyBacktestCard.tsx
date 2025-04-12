
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StrategyBacktestResult } from "@/services/backtesting/strategyTypes";
import { LineChart, Activity, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StrategyBacktestCardProps {
  result: StrategyBacktestResult;
  loading?: boolean;
}

const StrategyBacktestCard: React.FC<StrategyBacktestCardProps> = ({
  result,
  loading = false
}) => {
  if (loading) {
    return (
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Strategy Backtest Results</span>
            <LineChart className="h-5 w-5 text-primary" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2 animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get the average profit value using appropriate property, fallback if needed
  const averageProfit = result.averageWin || 0;
  
  // Handle potentially missing properties with fallbacks
  const consecutiveWins = typeof result.maxConsecutiveWins !== 'undefined' 
    ? result.maxConsecutiveWins 
    : 'N/A';
    
  const consecutiveLosses = typeof result.maxConsecutiveLosses !== 'undefined'
    ? result.maxConsecutiveLosses
    : 'N/A';

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>{result.strategyName}</span>
          <Activity className="h-5 w-5 text-primary" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Win Rate</p>
            <p className="text-2xl font-bold">{result.winRate}%</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Expectancy</p>
            <p 
              className={cn("text-2xl font-bold", 
                result.expectancy > 0 
                  ? "text-green-600" 
                  : "text-red-600"
              )}
            >
              {result.expectancy > 0 ? "+" : ""}
              {result.expectancy}%
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Profit Factor</p>
            <p className="text-lg font-medium">{result.profitFactor}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Avg Profit</p>
            <p className="text-lg font-medium text-green-600">+{averageProfit}%</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Avg Loss</p>
            <p className="text-lg font-medium text-red-600">-{result.averageLoss || 0}%</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-green-100 p-1.5 rounded">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Max Consecutive Wins</p>
              <p className="text-sm font-medium">{consecutiveWins}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="bg-red-100 p-1.5 rounded">
              <TrendingDown className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Max Consecutive Losses</p>
              <p className="text-sm font-medium">{consecutiveLosses}</p>
            </div>
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground mt-4">
          <div className="flex justify-between">
            <span>Total Trades: {result.totalTrades}</span>
            <span>Max Drawdown: {result.maxDrawdown}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StrategyBacktestCard;
