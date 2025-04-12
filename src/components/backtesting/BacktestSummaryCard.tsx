
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { BacktestSummary } from "@/services/backtesting/backtestTypes";
import { TrendingUp, TrendingDown, Clock, LineChart } from "lucide-react";

interface BacktestSummaryCardProps {
  summary?: BacktestSummary | null;
  loading?: boolean;
  className?: string;
}

const BacktestSummaryCard: React.FC<BacktestSummaryCardProps> = ({
  summary,
  loading = false,
  className
}) => {
  // Create a default summary to use if the provided summary is undefined or null
  const defaultSummary: BacktestSummary = {
    timeframe: "all",
    totalPatterns: 0,
    successfulPatterns: 0,
    failedPatterns: 0,
    successRate: 0,
    avgProfitLossPercent: 0,
    avgCandlesToBreakout: 0,
    isSimulated: false,
    avgRsiAtEntry: 0,
    avgAtrPercent: 0
  };

  // Use the provided summary or fallback to default
  const validSummary = summary || defaultSummary;

  return (
    <Card className={cn("shadow-card", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Backtest Results</span>
          <LineChart className="h-5 w-5 text-primary" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        ) : (
          <>
            <div className="flex justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{validSummary.successRate}%</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Avg. Return</p>
                <p 
                  className={cn("text-2xl font-bold", 
                    validSummary.avgProfitLossPercent > 0 
                      ? "text-green-600" 
                      : "text-red-600"
                  )}
                >
                  {validSummary.avgProfitLossPercent > 0 ? "+" : ""}
                  {validSummary.avgProfitLossPercent}%
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <div className="bg-primary/10 p-1.5 rounded">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Avg Candles to Breakout
                  </p>
                  <p className="text-sm font-medium">{validSummary.avgCandlesToBreakout}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="bg-primary/10 p-1.5 rounded">
                  {validSummary.successRate >= 50 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Total Patterns
                  </p>
                  <p className="text-sm font-medium">{validSummary.totalPatterns}</p>
                </div>
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground mt-4">
              <div className="flex justify-between">
                <span>Successful: {validSummary.successfulPatterns}</span>
                <span>Failed: {validSummary.failedPatterns}</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default BacktestSummaryCard;
