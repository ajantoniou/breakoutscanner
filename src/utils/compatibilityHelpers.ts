
import { ensureDateFieldsAsStrings, ensureDateFieldsAsObjects, normalizeDirection } from "./typeConverters";
import { Rule } from "@/services/backtesting/strategyTypes";

/**
 * Convert string rules to Rule objects
 */
export function stringToRules(stringRules: string[]): Rule[] {
  return stringRules.map((rule, index) => ({
    id: `rule-${index}`,
    type: "condition",
    name: `Rule ${index + 1}`,
    description: rule,
    condition: rule
  }));
}

/**
 * Convert Rule objects to strings
 */
export function rulesToStrings(rules: Rule[]): string[] {
  return rules.map(rule => rule.condition || rule.description || rule.name);
}

/**
 * Adapts a TradingStrategy from one format to another
 */
export function adaptTradingStrategy(strategy: any): any {
  if (!strategy) return null;
  
  const result = {
    ...strategy,
    // Convert string rules to Rule objects if needed
    entryRules: Array.isArray(strategy.entryRules) && typeof strategy.entryRules[0] === 'string' 
      ? stringToRules(strategy.entryRules) 
      : strategy.entryRules || [],
    exitRules: Array.isArray(strategy.exitRules) && typeof strategy.exitRules[0] === 'string'
      ? stringToRules(strategy.exitRules)
      : strategy.exitRules || [],
    // Ensure required fields exist
    entryConditions: strategy.entryConditions || [],
    exitConditions: strategy.exitConditions || [],
    indicators: strategy.indicators || [],
    patternTypes: strategy.patternTypes || [],
    confidence: strategy.confidence || 0,
    version: strategy.version || "1.0"
  };
  
  // Ensure dates are in the right format
  if (strategy.created) {
    result.created = typeof strategy.created === 'string' ? strategy.created : strategy.created.toISOString();
  } else {
    result.created = new Date().toISOString();
  }
  
  if (strategy.lastModified) {
    result.lastModified = typeof strategy.lastModified === 'string' ? strategy.lastModified : strategy.lastModified.toISOString();
  } else {
    result.lastModified = result.created;
  }
  
  return result;
}

/**
 * Create strategy handlers that handle different function signatures
 */
export function createStrategyHandlers(
  generateStrategyFromPatterns: any,
  optimizeStrategy: any,
  saveStrategy: any
) {
  return {
    handleCreateStrategy: () => generateStrategyFromPatterns(),
    handleImproveStrategy: (strategyId?: string) => {
      if (strategyId) {
        return optimizeStrategy(strategyId);
      }
      return undefined;
    },
    handleSaveStrategy: (strategy: any) => saveStrategy(strategy)
  };
}
