
import React from "react";
import { createStrategyHandlers, adaptTradingStrategy } from "@/utils/compatibilityHelpers";
import OriginalStrategyAI from "./StrategyAIComponent";
import { PatternData } from "@/services/types/patternTypes";
import { TradingStrategy as TypesTradingStrategy } from "@/services/types/tradingTypes";
import { TradingStrategy, Rule } from "@/services/backtesting/strategyTypes";

// Define a properly structured GeneratedStrategy type that includes missing properties
export interface GeneratedStrategy {
  id: string;
  name: string;
  description: string;
  timeframes: string[];
  entryRules: Rule[];  // Changed to Rule[] from string[]
  exitRules: Rule[];   // Changed to Rule[] from string[]
  riskManagement: {
    stopLossPercent: number;
    takeProfitPercent: number;
    maxPositionSize: number;
    trailingStop: boolean;
    maxLossPerTrade: number;
  };
  strategy?: any; // Add this property to fix property access errors
  performanceMetrics?: {
    winRate: number;
    averageReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    successfulTrades: number;
    totalTrades: number;
  };
  created: string;
  lastModified: string;
  createdAt?: string;
  aiGenerated?: boolean;
  confidence: number;
  entryConditions: string[];
  exitConditions: string[];
  indicators: string[];
  patternTypes: string[];
  version: string;
}

// Use proper type assertions and compatibility adapters
const StrategyAI = () => {
  const {
    generatedStrategies: originalStrategies,
    selectedStrategy: originalSelected,
    setSelectedStrategy,
    generateStrategyFromPatterns,
    optimizeStrategy,
    saveStrategy,
    loading
  } = useStrategyAI({});
  
  // Add default properties that might be missing
  const aiResponse = "";
  const newStrategy = null;
  
  // Create enhanced handlers to match expected interface
  const enhancedHandlers = createStrategyHandlers(
    generateStrategyFromPatterns,
    optimizeStrategy,
    saveStrategy
  );
  
  // Add any missing props with default values
  const handleCreateStrategy = () => generateStrategyFromPatterns();
  
  // Fix the handleImproveStrategy function to match expected types
  const handleImproveStrategy = () => {
    if (originalSelected?.id) {
      optimizeStrategy(originalSelected.id);
    }
  };
  
  const handleBacktestSuggestion = () => {}; // Placeholder implementation
  const handleTrendlineStrategy = () => {}; // Placeholder implementation
  const generateStrategy = (prompt?: string) => generateStrategyFromPatterns();
  
  // Adapt the strategy to the expected format with proper Rule types
  const adaptedSelectedStrategy = originalSelected 
    ? adaptTradingStrategy(originalSelected) as unknown as GeneratedStrategy
    : {
        id: "",
        name: "",
        description: "",
        timeframes: [],
        entryConditions: [],
        exitConditions: [],
        indicators: [],
        patternTypes: [],
        entryRules: [] as Rule[],
        exitRules: [] as Rule[],
        riskManagement: {
          stopLossPercent: 0,
          takeProfitPercent: 0,
          maxPositionSize: 0,
          trailingStop: false,
          maxLossPerTrade: 0
        },
        confidence: 0,
        version: "1.0",
        created: new Date().toISOString(), // Add the required 'created' field
        lastModified: new Date().toISOString() // Add the required 'lastModified' field
      } as GeneratedStrategy;
  
  // Adapt generated strategies to match the expected interface
  const adaptedGeneratedStrategies: GeneratedStrategy[] = originalStrategies.map(strategy => {
    const adapted = adaptTradingStrategy(strategy) as unknown as GeneratedStrategy;
    
    // Add performance metrics
    adapted.performanceMetrics = {
      winRate: (strategy as any).winRate || (strategy as any).performanceMetrics?.winRate || 0,
      averageReturn: (strategy as any).averageReturn || (strategy as any).performanceMetrics?.averageReturn || 0,
      sharpeRatio: (strategy as any).sharpeRatio || (strategy as any).performanceMetrics?.sharpeRatio || 0,
      maxDrawdown: (strategy as any).maxDrawdown || (strategy as any).performanceMetrics?.maxDrawdown || 0,
      successfulTrades: (strategy as any).successfulTrades || (strategy as any).performanceMetrics?.successfulTrades || 0,
      totalTrades: (strategy as any).totalTrades || (strategy as any).performanceMetrics?.totalTrades || 0
    };
    
    // Add missing properties
    adapted.createdAt = (strategy as any).created || new Date().toISOString();
    adapted.aiGenerated = (strategy as any).aiGenerated !== false;
    
    // Add required fields
    adapted.created = (strategy as any).created || new Date().toISOString();
    adapted.lastModified = (strategy as any).lastModified || adapted.created;
    
    return adapted;
  });
  
  // Pass both original props and enhanced handlers
  return (
    <OriginalStrategyAI
      generatedStrategies={adaptedGeneratedStrategies}
      selectedStrategy={adaptedSelectedStrategy}
      setSelectedStrategy={setSelectedStrategy}
      loading={loading}
      aiResponse={aiResponse}
      newStrategy={newStrategy}
      handleCreateStrategy={handleCreateStrategy}
      handleImproveStrategy={handleImproveStrategy}
      handleBacktestSuggestion={handleBacktestSuggestion}
      handleTrendlineStrategy={handleTrendlineStrategy}
      generateStrategy={generateStrategy}
      generateStrategyFromPatterns={generateStrategyFromPatterns}
      optimizeStrategy={optimizeStrategy}
      saveStrategy={saveStrategy}
      {...enhancedHandlers}
    />
  );
};

// Import at the end to avoid circular dependencies
import { useStrategyAI } from "@/hooks/useStrategyAI";

export default StrategyAI;
