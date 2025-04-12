
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BacktestResult } from "@/services/types/backtestTypes";
import { format } from "date-fns";
import { TrendingUp, TrendingDown, AlertCircle } from "lucide-react";

interface BacktestSummaryProps {
  backtestResults: BacktestResult[];
  loading: boolean;
  timeframe: string;
}

const BacktestSummary: React.FC<BacktestSummaryProps> = ({
  backtestResults,
  loading,
  timeframe
}) => {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Recent Backtest Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <p className="text-sm text-muted-foreground">Loading backtest results...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (backtestResults.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Recent Backtest Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <AlertCircle className="h-8 w-8 text-gray-400 mb-2" />
            <h3 className="text-sm font-medium">No backtest results available</h3>
            <p className="text-xs text-gray-500 mt-1">
              Run backtests on your patterns to see results here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Recent Backtest Results</CardTitle>
        <span className="text-xs text-muted-foreground">{timeframe} timeframe</span>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {backtestResults.map((result) => (
            <div 
              key={result.patternId} 
              className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0"
            >
              <div>
                <div className="font-medium">{result.symbol}</div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(result.exitDate), "MMM d, yyyy")} • {result.patternType}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div 
                  className={`text-sm font-medium ${
                    result.successful ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {result.profitLossPercent >= 0 ? "+" : ""}
                  {result.profitLossPercent.toFixed(2)}%
                </div>
                
                {result.successful ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default BacktestSummary;
