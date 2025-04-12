
import React from "react";
import { TrendingUp, BarChart3 } from "lucide-react";

interface StrategyInsightsSectionProps {
  keyInsights: string[];
  marketBias: string;
}

const StrategyInsightsSection: React.FC<StrategyInsightsSectionProps> = ({
  keyInsights,
  marketBias
}) => {
  return (
    <div className="pt-2 border-t">
      <p className="font-medium mb-2">AI Strategy Insights:</p>
      <ul className="space-y-1">
        {keyInsights.length > 0 ? (
          keyInsights.map((insight, i) => (
            <li key={i} className="text-sm flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>{insight}</span>
            </li>
          ))
        ) : (
          <li className="text-sm text-muted-foreground">
            Insufficient data to generate detailed insights.
          </li>
        )}
        <li className="text-sm flex items-start gap-2 mt-2">
          <BarChart3 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
          <span>
            {marketBias.includes("bullish") 
              ? "Focus on breakout strategies targeting higher timeframes for stronger trends."
              : marketBias.includes("bearish")
                ? "Consider shorter timeframes for faster exits and tighter stop losses."
                : "Balanced approach recommended with focus on range-trading strategies."}
          </span>
        </li>
      </ul>
    </div>
  );
};

export default StrategyInsightsSection;
