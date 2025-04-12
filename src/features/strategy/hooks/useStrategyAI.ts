
// Fixed imports with required functions
import { useState, useEffect } from 'react';
import { TradingStrategy } from '@/services/backtesting/strategyTypes';
import { PatternData } from '@/services/types/patternTypes';
import { 
  getStrategyById, 
  getAllStrategies,
  addStrategy,
  updateStrategy
} from '@/services/backtesting/strategyManager';
import { toast } from 'sonner';
import { ensureDateString } from '@/utils/dateConverter';

interface UseStrategyAIProps {
  patterns?: PatternData[];
}

export interface GeneratedStrategy extends TradingStrategy {
  score?: number;
}

export const useStrategyAI = ({ patterns = [] }: UseStrategyAIProps = {}) => {
  const [generatedStrategies, setGeneratedStrategies] = useState<GeneratedStrategy[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<TradingStrategy | null>(null);
  
  // Generate a strategy based on successful patterns
  const generateStrategyFromPatterns = async (inputPatterns?: PatternData[]) => {
    setLoading(true);
    
    try {
      const patternsToUse = inputPatterns || patterns;
      
      if (patternsToUse.length === 0) {
        toast.error("No patterns available for strategy generation");
        return null;
      }
      
      // Simulate strategy generation with a timeout
      await new Promise(res => setTimeout(res, 1500));
      
      // Find the most successful pattern types
      const patternTypeCounts: Record<string, { count: number, successful: number }> = {};
      
      patternsToUse.forEach(pattern => {
        if (!patternTypeCounts[pattern.patternType]) {
          patternTypeCounts[pattern.patternType] = { count: 0, successful: 0 };
        }
        
        patternTypeCounts[pattern.patternType].count += 1;
        
        if (pattern.status === 'completed' && pattern.success) {
          patternTypeCounts[pattern.patternType].successful += 1;
        }
      });
      
      // Find the most successful pattern
      let bestPattern = '';
      let bestSuccessRate = 0;
      
      Object.entries(patternTypeCounts).forEach(([pattern, stats]) => {
        const successRate = stats.count > 0 ? stats.successful / stats.count : 0;
        
        if (successRate > bestSuccessRate && stats.count >= 3) {
          bestSuccessRate = successRate;
          bestPattern = pattern;
        }
      });
      
      if (!bestPattern) {
        toast.error("Not enough successful patterns to generate a strategy");
        return null;
      }
      
      // Create a strategy focused on the best pattern
      const newStrategy: GeneratedStrategy = {
        id: `ai-strategy-${Date.now()}`,
        name: `AI ${bestPattern} Strategy`,
        description: `Automatically generated strategy focusing on ${bestPattern} patterns with a ${(bestSuccessRate * 100).toFixed(0)}% success rate.`,
        entryRules: [
          { id: "1", type: "pattern", value: bestPattern, enabled: true, name: "Pattern Confirmation" },
          { id: "2", type: "volume", value: "increasing", enabled: true, name: "Volume Increasing" }
        ],
        exitRules: [
          { id: "1", type: "target", value: "reached", enabled: true, name: "Target Reached" },
          { id: "2", type: "stop", value: "hit", enabled: true, name: "Stop Loss Hit" }
        ],
        timeframes: ['daily', 'weekly'],
        tags: ['ai-generated', bestPattern.toLowerCase().replace(/\s+/g, '-')],
        riskManagement: {
          stopLossPercent: 2.5,
          takeProfitPercent: 7.5,
          maxDurationDays: 14,
          maxLossPerTrade: 1.5,
          maxPositionSize: 5,
          trailingStop: true
        },
        isActive: true,
        created: ensureDateString(new Date()) || new Date().toISOString(),
        version: "1.0",
        score: bestSuccessRate * 100
      };
      
      setGeneratedStrategies(prev => [newStrategy, ...prev]);
      setSelectedStrategy(newStrategy);
      
      toast.success("New AI strategy generated", {
        description: `Created a strategy focused on ${bestPattern} patterns`
      });
      
      return newStrategy;
    } catch (error) {
      console.error("Error generating strategy:", error);
      toast.error("Failed to generate strategy");
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // Save a generated strategy permanently
  const saveStrategy = (strategy: TradingStrategy) => {
    try {
      // Add the strategy to our collection
      addStrategy(strategy);
      
      toast.success("Strategy saved", {
        description: `${strategy.name} has been added to your strategies`
      });
      
      return true;
    } catch (error) {
      console.error("Error saving strategy:", error);
      toast.error("Failed to save strategy");
      return false;
    }
  };
  
  // Optimize an existing strategy
  const optimizeStrategy = async (strategyId: string) => {
    setLoading(true);
    
    try {
      const strategy = getStrategyById(strategyId);
      
      if (!strategy) {
        toast.error("Strategy not found");
        return null;
      }
      
      // Simulate optimization process
      await new Promise(res => setTimeout(res, 2000));
      
      // Create an "optimized" version
      const optimizedStrategy: GeneratedStrategy = {
        ...strategy,
        id: `${strategy.id}-optimized-${Date.now()}`,
        name: `${strategy.name} (Optimized)`,
        description: `Optimized version of ${strategy.name} with improved parameters.`,
        riskManagement: {
          ...strategy.riskManagement,
          stopLossPercent: strategy.riskManagement.stopLossPercent * 0.9,
          takeProfitPercent: strategy.riskManagement.takeProfitPercent * 1.1,
          maxLossPerTrade: strategy.riskManagement.maxLossPerTrade || 2
        },
        isActive: true,
        created: ensureDateString(new Date()) || new Date().toISOString(),
        version: strategy.version || "1.0"
      };
      
      setGeneratedStrategies(prev => [optimizedStrategy, ...prev]);
      setSelectedStrategy(optimizedStrategy);
      
      toast.success("Strategy optimized", {
        description: "Improved risk/reward parameters for better performance"
      });
      
      return optimizedStrategy;
    } catch (error) {
      console.error("Error optimizing strategy:", error);
      toast.error("Failed to optimize strategy");
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  return {
    generatedStrategies,
    selectedStrategy,
    setSelectedStrategy,
    generateStrategyFromPatterns,
    optimizeStrategy,
    saveStrategy,
    loading
  };
};
