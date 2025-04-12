import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { BacktestSummary } from "@/services/backtesting/backtestTypes";
import { TrendingUp, TrendingDown, Clock, LineChart, Target, ArrowUpDown, BarChart2, Activity } from "lucide-react";

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
    avgAtrPercent: 0,
    maxProfit: 0,
    maxLoss: 0,
    avgConfidenceScore: 0,
    avgRiskRewardRatio: 0,
    consistencyScore: 0,
    maxWinStreak: 0,
    maxLossStreak: 0,
    avgWin: 0,
    avgLoss: 0,
    riskRewardRatio: 0
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
                  {validSummary.avgProfitLossPercent.toFixed(2)}%
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
                  <p className="text-sm font-medium">{validSummary.avgCandlesToBreakout.toFixed(1)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="bg-primary/10 p-1.5 rounded">
                  <Target className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Risk/Reward Ratio
                  </p>
                  <p className="text-sm font-medium">{validSummary.riskRewardRatio.toFixed(2)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="bg-primary/10 p-1.5 rounded">
                  <ArrowUpDown className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Win/Loss
                  </p>
                  <p className="text-sm font-medium">
                    +{validSummary.avgWin.toFixed(2)}% / -{Math.abs(validSummary.avgLoss).toFixed(2)}%
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="bg-primary/10 p-1.5 rounded">
                  <Activity className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Consistency Score
                  </p>
                  <p className="text-sm font-medium">{validSummary.consistencyScore.toFixed(1)}</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <p className="text-xs text-muted-foreground">Max Profit</p>
                <p className="text-sm font-medium text-green-600">+{validSummary.maxProfit.toFixed(2)}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Max Loss</p>
                <p className="text-sm font-medium text-red-600">-{Math.abs(validSummary.maxLoss).toFixed(2)}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Max Win Streak</p>
                <p className="text-sm font-medium">{validSummary.maxWinStreak}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Max Loss Streak</p>
                <p className="text-sm font-medium">{validSummary.maxLossStreak}</p>
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground mt-4">
              <div className="flex justify-between">
                <span>Successful: {validSummary.successfulPatterns}</span>
                <span>Failed: {validSummary.failedPatterns}</span>
              </div>
              {validSummary.isSimulated && (
                <div className="mt-1 text-yellow-600">
                  * Simulated data
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default BacktestSummaryCard;
