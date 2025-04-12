
import { TradingStrategy } from "@/services/backtesting/strategyTypes";
import { adaptTradingStrategy } from "@/utils/strategyCompatibilityHelpers";

// In-memory strategies store
let strategies: TradingStrategy[] = [];

/**
 * Get all saved strategies
 */
export function getAllStrategies(): TradingStrategy[] {
  return strategies;
}

/**
 * Get a strategy by its ID
 */
export function getStrategyById(id: string): TradingStrategy | null {
  const strategy = strategies.find(s => s.id === id);
  return strategy || null;
}

/**
 * Add a new strategy
 */
export function addStrategy(strategy: TradingStrategy): TradingStrategy {
  // Ensure it has a valid ID
  if (!strategy.id) {
    strategy.id = `strategy-${Date.now()}`;
  }
  
  // Add to our collection
  strategies.push(strategy);
  
  return strategy;
}

/**
 * Update an existing strategy
 */
export function updateStrategy(strategy: TradingStrategy): TradingStrategy {
  const index = strategies.findIndex(s => s.id === strategy.id);
  
  if (index >= 0) {
    strategies[index] = strategy;
  } else {
    // If not found, add it
    strategies.push(strategy);
  }
  
  return strategy;
}

/**
 * Delete a strategy
 */
export function deleteStrategy(id: string): boolean {
  const initialLength = strategies.length;
  strategies = strategies.filter(s => s.id !== id);
  return initialLength > strategies.length;
}

/**
 * Initialize with some default strategies
 */
export function initializeDefaultStrategies(): void {
  if (strategies.length === 0) {
    const defaultStrategy: TradingStrategy = {
      id: "default-strategy-1",
      name: "Basic Breakout Strategy",
      description: "A simple breakout strategy that enters on pattern confirmation and exits on target or stop loss.",
      entryRules: [
        { id: "1", type: "pattern", value: "Bull Flag", enabled: true, name: "Pattern Confirmation" },
        { id: "2", type: "volume", value: "increasing", enabled: true, name: "Volume Increasing" }
      ],
      exitRules: [
        { id: "1", type: "target", value: "reached", enabled: true, name: "Target Reached" },
        { id: "2", type: "stop", value: "hit", enabled: true, name: "Stop Loss Hit" }
      ],
      timeframes: ["daily", "weekly"],
      riskManagement: {
        stopLossPercent: 2,
        takeProfitPercent: 6,
        maxDurationDays: 14,
        maxLossPerTrade: 1,
        maxPositionSize: 5,
        trailingStop: true
      },
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      version: "1.0",
      isActive: true,
      isSystem: true
    };
    
    strategies.push(defaultStrategy);
  }
}

// Initialize default strategies
initializeDefaultStrategies();
