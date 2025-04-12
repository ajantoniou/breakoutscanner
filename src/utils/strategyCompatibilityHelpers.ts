
import { TradingStrategy, Rule } from "@/services/types/tradingTypes";

/**
 * Adapts a trading strategy object to ensure all required properties are present
 */
export function adaptTradingStrategy(strategy: Partial<TradingStrategy>): TradingStrategy {
  if (!strategy) {
    throw new Error("Cannot adapt null or undefined strategy");
  }
  
  // Provide default values for required fields
  return {
    id: strategy.id || 'default-strategy',
    name: strategy.name || 'Default Strategy',
    description: strategy.description || 'A default trading strategy',
    timeframes: strategy.timeframes || ['daily'],
    entryRules: strategy.entryRules || [],
    exitRules: strategy.exitRules || [],
    riskManagement: strategy.riskManagement || {
      stopLossPercent: 2,
      takeProfitPercent: 6,
      maxPositionSize: 5,
      trailingStop: false,
      maxLossPerTrade: 1,
      maxDurationDays: 10
    },
    created: strategy.created || new Date().toISOString(),
    lastModified: strategy.lastModified || new Date().toISOString(),
    version: strategy.version || '1.0.0',
    confidence: strategy.confidence || 70,
    ...strategy
  } as TradingStrategy;
}

/**
 * Adapts a rule object to ensure all required properties are present
 */
export function adaptRule(rule: Partial<Rule>): Rule {
  return {
    id: rule.id || `rule-${Date.now()}`,
    type: rule.type || 'basic',
    name: rule.name || 'Default Rule',
    description: rule.description || '',
    parameters: rule.parameters || {},
    ...rule
  } as Rule;
}
