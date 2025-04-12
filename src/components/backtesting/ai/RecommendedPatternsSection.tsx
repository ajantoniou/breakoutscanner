
import React from "react";
import { ArrowUpRight } from "lucide-react";
import { PatternData } from "@/services/types/patternTypes";
import { PatternPerformance } from "@/services/types/backtestTypes";

interface RecommendedPatternsSectionProps {
  recommendedPatterns: PatternData[];
  patternPerformance: Record<string, PatternPerformance>;
}

const RecommendedPatternsSection: React.FC<RecommendedPatternsSectionProps> = ({
  recommendedPatterns,
  patternPerformance
}) => {
  if (recommendedPatterns.length === 0) {
    return null;
  }

  return (
    <div className="pt-2 border-t">
      <p className="font-medium mb-2">High-Confidence Pattern Recommendations:</p>
      <div className="space-y-3">
        {recommendedPatterns.map((pattern, i) => {
          const patternPerf = patternPerformance[pattern.patternType];
          return (
            <div key={i} className="flex items-start">
              <ArrowUpRight className="h-4 w-4 text-green-600 shrink-0 mt-0.5 mr-2" />
              <div>
                <p className="text-sm font-medium">
                  {pattern.symbol} - {pattern.patternType} 
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({pattern.timeframe})
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Confidence: {pattern.confidenceScore}% {patternPerf && `| Historical return: ${patternPerf.successRate?.toFixed(2) || '0.00'}%`}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RecommendedPatternsSection;
