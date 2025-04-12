
import React from "react";
import { LineChart, Zap } from "lucide-react";

interface MarketInsightsSectionProps {
  marketBias: string;
  mostCommonPattern: string;
  bestStrategy: string;
  bestStrategyWinRate: number;
  bestTimeframe: string;
  hasStrategyResults: boolean;
}

const MarketInsightsSection: React.FC<MarketInsightsSectionProps> = ({
  marketBias,
  mostCommonPattern,
  bestStrategy,
  bestStrategyWinRate,
  bestTimeframe,
  hasStrategyResults
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="flex items-start space-x-3">
        <LineChart className="h-5 w-5 text-blue-500 mt-0.5" />
        <div>
          <p className="text-sm font-medium">Market Condition Analysis</p>
          <p className="text-sm text-muted-foreground">
            Current market bias: <span className="font-medium">{marketBias}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Dominant pattern: <span className="font-medium">{mostCommonPattern}</span>
          </p>
        </div>
      </div>
      
      <div className="flex items-start space-x-3">
        <Zap className="h-5 w-5 text-amber-500 mt-0.5" />
        <div>
          <p className="text-sm font-medium">Strategy Performance</p>
          {hasStrategyResults ? (
            <p className="text-sm text-muted-foreground">
              Best strategy: <span className="font-medium">{bestStrategy}</span> ({bestStrategyWinRate.toFixed(1)}% win rate)
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Run strategy backtest for performance data
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Recommended timeframe: <span className="font-medium">{bestTimeframe}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default MarketInsightsSection;
