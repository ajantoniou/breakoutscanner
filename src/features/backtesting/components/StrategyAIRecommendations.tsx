
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot } from "lucide-react";
import { PatternData } from "@/services/types/patternTypes";
import { BacktestResult } from "@/services/types/backtestTypes";
import { StrategyBacktestResult } from "@/services/backtesting/strategyTypes";
import AILoadingState from "./ai/AILoadingState";
import AIEmptyState from "./ai/AIEmptyState";
import MarketInsightsSection from "./ai/MarketInsightsSection";
import RecommendedPatternsSection from "./ai/RecommendedPatternsSection";
import StrategyInsightsSection from "./ai/StrategyInsightsSection";
import {
  analyzeMarketConditions,
  analyzePatternDistribution,
  generateKeyInsights,
  analyzePatternPerformance,
  getRecommendedPatterns,
  analyzeStrategyPerformance,
  generateMarketInsights,
  getMarketBias
} from "@/services/ai/strategyAnalysisService";
import { PatternPerformance } from "@/services/types/patternTypes";
import { createPatternPerformanceRecord, getPerformanceInsights } from "@/utils/adapters/typeAdapters";

interface StrategyAIRecommendationsProps {
  patterns: PatternData[];
  backtestResults?: BacktestResult[];
  strategyResults?: StrategyBacktestResult[];
  loading?: boolean;
}

const StrategyAIRecommendations: React.FC<StrategyAIRecommendationsProps> = ({
  patterns,
  backtestResults = [],
  strategyResults = [],
  loading = false
}) => {
  if (loading) {
    return <AILoadingState />;
  }

  if (patterns.length === 0 || (strategyResults.length === 0 && backtestResults.length === 0)) {
    return <AIEmptyState />;
  }

  // Use our utility functions to analyze the data
  const marketConditions = analyzeMarketConditions(patterns);
  const { mostCommonPattern, bestTimeframe } = analyzePatternDistribution(patterns);
  const keyInsights = generateKeyInsights(patterns);
  
  // Explicitly cast to ensure compatible types
  const patternPerformance = analyzePatternPerformance(backtestResults) as unknown as PatternPerformance[];
  const recommendedPatterns = getRecommendedPatterns(patterns, patternPerformance);
  const { bestStrategy, bestStrategyWinRate } = analyzeStrategyPerformance(strategyResults);
  
  // Convert pattern performance to string insights for component compatibility
  const insightStrings = generateMarketInsights(patterns);

  // Convert patternPerformance to proper record type and provide string insights
  const patternPerformanceRecord = createPatternPerformanceRecord(patternPerformance);
  const performanceInsights = getPerformanceInsights(patternPerformanceRecord);
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          AI Strategy Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <MarketInsightsSection 
          marketBias={marketConditions.marketBias}
          mostCommonPattern={mostCommonPattern}
          bestStrategy={bestStrategy}
          bestStrategyWinRate={bestStrategyWinRate}
          bestTimeframe={bestTimeframe}
          hasStrategyResults={strategyResults.length > 0}
        />
        
        <RecommendedPatternsSection 
          recommendedPatterns={recommendedPatterns}
          patternPerformance={patternPerformanceRecord}
        />
        
        <StrategyInsightsSection 
          keyInsights={performanceInsights}
          marketBias={marketConditions.marketBias}
        />
      </CardContent>
    </Card>
  );
};

export default StrategyAIRecommendations;
