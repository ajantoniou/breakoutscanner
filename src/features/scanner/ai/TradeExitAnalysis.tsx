
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain } from "lucide-react";

interface TradeExitAnalysisProps {
  symbol: string;
  entryPrice: number;
  exitPrice: number;
  timeframe: string;
  patternType: string;
}

const TradeExitAnalysis: React.FC<TradeExitAnalysisProps> = ({
  symbol,
  entryPrice,
  exitPrice,
  timeframe,
  patternType
}) => {
  const profitLoss = exitPrice - entryPrice;
  const profitLossPercent = (profitLoss / entryPrice) * 100;
  const isProfit = profitLoss > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Trade Exit Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-medium">Performance Summary</h4>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="bg-muted p-2 rounded">
              <span className="text-sm font-medium">Profit/Loss</span>
              <span className={`block text-lg ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                {profitLoss.toFixed(2)} ({profitLossPercent.toFixed(2)}%)
              </span>
            </div>
            <div className="bg-muted p-2 rounded">
              <span className="text-sm font-medium">Pattern Type</span>
              <span className="block">{patternType}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">AI Analysis</h4>
          <p className="text-sm text-muted-foreground">
            Analysis would be generated based on trade performance, market conditions, and pattern success rates.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default TradeExitAnalysis;
