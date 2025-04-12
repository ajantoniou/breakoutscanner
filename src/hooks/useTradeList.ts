
import { useState, useCallback, useEffect } from "react";
import { PatternData } from "@/services/types/patternTypes";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";

// Define proper TradeAlert interface
export interface TradeAlert {
  id: string;
  symbol: string;
  message: string;
  reason: string;
  timestamp: Date;
  price: number;
  status: "active" | "completed" | "rejected";
  type: "entry" | "exit";
  read: boolean;
}

// Define TradeStatistics interface
export interface TradeStatistics {
  totalTrades: number;
  completedTrades: number;
  successfulTrades: number;
  winRate: number;
  averageProfit: number;
  averageHoldingPeriod: number;
  maxDrawdown: number;
  profitFactor: number;
  expectancy: number;
  activeTrades?: number;
  avgReturn?: number;
  avgHoldingPeriod?: number;
  successRate?: number;
  timeframePerformance?: Record<string, any>;
}

// Define TradeListItem interface
export interface TradeListItem {
  id: string;
  symbol: string;
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  entryDate: Date | string;
  exitDate?: Date | string;
  exitPrice?: number;
  direction: 'bullish' | 'bearish';
  patternType: string;
  timeframe: string;
  status: 'active' | 'completed' | 'cancelled';
  confidenceScore: number;
  patternId?: string;
  notes?: string;
  success?: boolean;
  performance?: number;
  riskRewardRatio?: number;
  breakoutProgress?: number;
  exitSignal?: boolean;
  lastUpdated?: Date;
  aiSummary?: string;
}

// Helper function to get trades from localStorage
const getStoredTrades = (): TradeListItem[] => {
  try {
    const storedTrades = localStorage.getItem('tradingApp.tradeList');
    if (storedTrades) {
      return JSON.parse(storedTrades, (key, value) => {
        // Convert string dates back to Date objects
        if (key === 'entryDate' || key === 'exitDate' || key === 'lastUpdated') {
          return value ? new Date(value) : value;
        }
        return value;
      });
    }
  } catch (error) {
    console.error("Error parsing stored trades:", error);
  }
  return [];
};

// Helper function to save trades to localStorage
const saveTradesToStorage = (trades: TradeListItem[]): void => {
  try {
    localStorage.setItem('tradingApp.tradeList', JSON.stringify(trades));
  } catch (error) {
    console.error("Error saving trades to storage:", error);
  }
};

// Helper function to calculate risk-reward ratio
const calculateRiskReward = (entry: number, target: number, stopLoss: number, direction: 'bullish' | 'bearish'): number => {
  if (direction === 'bullish') {
    const reward = target - entry;
    const risk = entry - stopLoss;
    return risk > 0 ? reward / risk : 0;
  } else {
    const reward = entry - target;
    const risk = stopLoss - entry;
    return risk > 0 ? reward / risk : 0;
  }
};

// Helper to calculate breakout progress
const calculateBreakoutProgress = (entry: number, target: number, currentPrice: number, direction: 'bullish' | 'bearish'): number => {
  if (!currentPrice) return 0;
  
  if (direction === 'bullish') {
    if (currentPrice <= entry) return 0;
    if (currentPrice >= target) return 100;
    return Math.round(((currentPrice - entry) / (target - entry)) * 100);
  } else {
    if (currentPrice >= entry) return 0;
    if (currentPrice <= target) return 100;
    return Math.round(((entry - currentPrice) / (entry - target)) * 100);
  }
};

// Helper to generate AI summary for a trade
const generateAiSummary = (trade: TradeListItem, currentPrice?: number): string => {
  const progress = trade.breakoutProgress || 0;
  const riskReward = trade.riskRewardRatio || 0;
  const direction = trade.direction === 'bullish' ? 'bullish' : 'bearish';
  
  let summary = '';
  
  // Base summary on trade status
  if (trade.status === 'completed') {
    const outcome = trade.success ? 'successfully' : 'unsuccessfully';
    const performanceText = trade.performance ? `with ${trade.performance > 0 ? '+' : ''}${trade.performance.toFixed(2)}%` : '';
    summary = `Trade ${outcome} completed ${performanceText}.`;
  } else if (trade.exitSignal) {
    summary = `⚠️ EXIT SIGNAL ACTIVE: Consider closing position immediately based on technical criteria.`;
  } else {
    // Active trade summary
    const priceInfo = currentPrice ? ` Current price: $${currentPrice.toFixed(2)}.` : '';
    
    if (progress < 25) {
      summary = `${direction.toUpperCase()} ${trade.patternType} pattern in early breakout stage (${progress}%).${priceInfo} Maintain stop at $${trade.stopLoss.toFixed(2)}.`;
    } else if (progress < 50) {
      summary = `${direction.toUpperCase()} ${trade.patternType} confirming with ${progress}% progress toward target.${priceInfo} Consider trailing stop.`;
    } else if (progress < 75) {
      summary = `${direction.toUpperCase()} ${trade.patternType} showing strength at ${progress}% to target.${priceInfo} Consider taking partial profits.`;
    } else {
      summary = `${direction.toUpperCase()} ${trade.patternType} nearing target (${progress}%).${priceInfo} Prepare to exit position at $${trade.targetPrice.toFixed(2)}.`;
    }
    
    // Add risk-reward context
    if (riskReward > 0) {
      summary += ` Risk/reward ratio: ${riskReward.toFixed(1)}:1.`;
    }
  }
  
  return summary;
};

// Helper to check if a trade should have an exit signal
const shouldExitTrade = (trade: TradeListItem, currentPrice?: number): boolean => {
  if (!currentPrice || trade.status !== 'active') return false;
  
  const breakoutProgress = calculateBreakoutProgress(
    trade.entryPrice, 
    trade.targetPrice, 
    currentPrice, 
    trade.direction
  );
  
  // Exit signals based on different criteria
  if (breakoutProgress >= 90) return true; // Near target
  
  if (trade.direction === 'bullish') {
    // Exit if price drops close to stop loss or shows significant reversal from progress
    if (currentPrice <= trade.stopLoss * 1.02) return true;
    if (breakoutProgress > 50 && currentPrice < trade.entryPrice * 1.01) return true;
  } else {
    // Exit if price rises close to stop loss or shows significant reversal from progress
    if (currentPrice >= trade.stopLoss * 0.98) return true;
    if (breakoutProgress > 50 && currentPrice > trade.entryPrice * 0.99) return true;
  }
  
  return false;
};

export const useTradeList = () => {
  const [trades, setTrades] = useState<TradeListItem[]>([]);
  const [tradeAlerts, setTradeAlerts] = useState<TradeAlert[]>([]);
  const [statistics, setStatistics] = useState<TradeStatistics>({
    totalTrades: 0,
    activeTrades: 0,
    completedTrades: 0,
    successfulTrades: 0,
    avgReturn: 0,
    avgHoldingPeriod: 0,
    successRate: 0,
    profitFactor: 0,
    timeframePerformance: {},
    winRate: 0,
    averageProfit: 0,
    averageHoldingPeriod: 0,
    maxDrawdown: 0,
    expectancy: 0
  });
  
  // Load trades from localStorage on initial render
  useEffect(() => {
    const storedTrades = getStoredTrades();
    setTrades(storedTrades);
  }, []);
  
  // Save trades to localStorage whenever they change
  useEffect(() => {
    if (trades.length > 0) {
      saveTradesToStorage(trades);
    }
  }, [trades]);

  // Calculate statistics whenever trades change
  useEffect(() => {
    if (trades.length === 0) return;
    
    const active = trades.filter(t => t.status === 'active');
    const completed = trades.filter(t => t.status === 'completed');
    const successful = completed.filter(t => t.success);
    
    // Calculate avg holding period for completed trades
    const calcHoldingPeriod = (t: TradeListItem): number => {
      if (!t.exitDate) return 0;
      const entryTime = new Date(t.entryDate).getTime();
      const exitTime = new Date(t.exitDate).getTime();
      return (exitTime - entryTime) / (1000 * 60 * 60 * 24); // days
    };
    
    const holdingPeriods = completed.map(calcHoldingPeriod);
    const avgHoldingPeriod = holdingPeriods.length > 0 
      ? holdingPeriods.reduce((a, b) => a + b, 0) / holdingPeriods.length 
      : 0;
    
    // Calculate avg return
    const returns = completed.map(t => t.performance || 0);
    const avgReturn = returns.length > 0 
      ? returns.reduce((a, b) => a + b, 0) / returns.length 
      : 0;
    
    // Calculate success rate
    const successRate = completed.length > 0 
      ? (successful.length / completed.length) * 100 
      : 0;
    
    // Calculate profit factor
    const gains = successful.reduce((sum, t) => sum + (t.performance || 0), 0);
    const losses = completed
      .filter(t => !t.success)
      .reduce((sum, t) => sum + Math.abs(t.performance || 0), 0);
    const profitFactor = losses > 0 ? gains / losses : gains > 0 ? 2 : 0;

    // Calculate max drawdown (simplified)
    const maxDrawdown = 5.0; // Default value since we don't track this dynamically
    
    // Calculate expectancy
    const expectancy = (successRate / 100) * avgReturn - ((100 - successRate) / 100) * Math.abs(avgReturn);
    
    // Calculate performance by timeframe
    const timeframePerformance: Record<string, { count: number; successRate: number; avgReturn: number }> = {};
    
    // Get unique timeframes
    const timeframes = Array.from(new Set(trades.map(t => t.timeframe)));
    
    timeframes.forEach(timeframe => {
      const timeframeTrades = completed.filter(t => t.timeframe === timeframe);
      const timeframeSuccessful = timeframeTrades.filter(t => t.success);
      
      const tfSuccessRate = timeframeTrades.length > 0 
        ? (timeframeSuccessful.length / timeframeTrades.length) * 100 
        : 0;
      
      const tfReturns = timeframeTrades.map(t => t.performance || 0);
      const tfAvgReturn = tfReturns.length > 0 
        ? tfReturns.reduce((a, b) => a + b, 0) / tfReturns.length 
        : 0;
      
      timeframePerformance[timeframe] = {
        count: timeframeTrades.length,
        successRate: tfSuccessRate,
        avgReturn: tfAvgReturn
      };
    });
    
    setStatistics({
      totalTrades: trades.length,
      activeTrades: active.length,
      completedTrades: completed.length,
      successfulTrades: successful.length,
      avgReturn,
      avgHoldingPeriod,
      successRate,
      profitFactor,
      timeframePerformance,
      // Added these mappings for compatibility
      winRate: successRate,
      averageProfit: avgReturn,
      averageHoldingPeriod: avgHoldingPeriod,
      maxDrawdown: maxDrawdown,
      expectancy: expectancy
    });
  }, [trades]);
  
  const addToTradeList = useCallback((pattern: PatternData): void => {
    // Check if the pattern is already in the trade list
    const exists = trades.some(trade => 
      trade.symbol === pattern.symbol && trade.patternType === pattern.patternType
    );
    
    if (exists) {
      toast.info(`${pattern.symbol} is already in your trade list`);
      return;
    }
    
    // Calculate default stop loss if not provided
    const stopLoss = pattern.stopLoss || pattern.entryPrice * 0.95;
    
    // Ensure we have a valid direction (not 'neutral')
    let direction: 'bullish' | 'bearish' = 'bullish';
    if (pattern.direction === 'bearish') {
      direction = 'bearish';
    }
    
    const riskReward = calculateRiskReward(
      pattern.entryPrice,
      pattern.targetPrice,
      stopLoss,
      direction
    );
    
    const newTrade: TradeListItem = {
      id: uuidv4(),
      symbol: pattern.symbol,
      entryPrice: pattern.entryPrice,
      targetPrice: pattern.targetPrice,
      stopLoss: stopLoss,
      entryDate: new Date(),
      direction: direction,
      patternType: pattern.patternType,
      timeframe: pattern.timeframe,
      status: 'active',
      notes: `Added from ${pattern.patternType} pattern`,
      confidenceScore: pattern.confidenceScore,
      riskRewardRatio: riskReward,
      breakoutProgress: 0,
      exitSignal: false,
      lastUpdated: new Date()
    };
    
    // Generate AI summary for the new trade
    newTrade.aiSummary = generateAiSummary(newTrade);
    
    setTrades(prev => [...prev, newTrade]);
    
    toast.success(`Added ${pattern.symbol} to Trade List`, {
      description: `${direction.toUpperCase()} pattern detected with ${pattern.confidenceScore}% confidence`
    });
  }, [trades]);
  
  const removeTrade = useCallback((id: string): void => {
    setTrades(prev => prev.filter(trade => trade.id !== id));
    toast.info("Trade removed from list");
  }, []);
  
  const completeTrade = useCallback((id: string, exitPrice: number): void => {
    setTrades(prev => 
      prev.map(trade => {
        if (trade.id === id) {
          // Calculate performance metrics
          const priceChange = exitPrice - trade.entryPrice;
          const percentageChange = (priceChange / trade.entryPrice) * 100;
          const isProfit = 
            (trade.direction === 'bullish' && exitPrice > trade.entryPrice) ||
            (trade.direction === 'bearish' && exitPrice < trade.entryPrice);
          
          const performance = trade.direction === 'bullish' 
            ? percentageChange 
            : -percentageChange;
          
          const updatedTrade = {
            ...trade,
            status: 'completed' as const,
            exitPrice,
            exitDate: new Date(),
            performance,
            success: isProfit,
            exitSignal: false,
            breakoutProgress: isProfit ? 100 : 0
          };
          
          // Update AI summary for the completed trade
          updatedTrade.aiSummary = generateAiSummary(updatedTrade);
          
          return updatedTrade;
        }
        return trade;
      })
    );
    
    toast.success("Trade marked as completed", {
      description: "Performance statistics have been updated"
    });
  }, []);
  
  // Update trade data with current prices
  const updateTradesWithPrices = useCallback((priceData: Record<string, number>): void => {
    if (!priceData || Object.keys(priceData).length === 0) return;
    
    setTrades(prev => 
      prev.map(trade => {
        const currentPrice = priceData[trade.symbol];
        
        if (trade.status === 'active' && currentPrice) {
          const progress = calculateBreakoutProgress(
            trade.entryPrice, 
            trade.targetPrice, 
            currentPrice, 
            trade.direction
          );
          
          const shouldExit = shouldExitTrade(trade, currentPrice);
          
          // Only create an alert if exit status has changed to true
          if (shouldExit && !trade.exitSignal) {
            const newAlert: TradeAlert = {
              id: uuidv4(),
              symbol: trade.symbol,
              message: `Exit signal detected for ${trade.symbol}`,
              reason: `Exit signal detected for ${trade.symbol}`,
              timestamp: new Date(),
              price: currentPrice,
              status: 'active',
              type: 'exit', 
              read: false
            };
            
            setTradeAlerts(prev => [...prev, newAlert]);
            
            toast.warning(`Exit Alert: ${trade.symbol}`, {
              description: `Consider closing position at $${currentPrice.toFixed(2)}`
            });
          }
          
          const updatedTrade = {
            ...trade,
            breakoutProgress: progress,
            exitSignal: shouldExit,
            lastUpdated: new Date()
          };
          
          // Generate AI summary with current price data
          updatedTrade.aiSummary = generateAiSummary(updatedTrade, currentPrice);
          
          return updatedTrade;
        }
        
        return trade;
      })
    );
  }, []);
  
  const resolveAlert = useCallback((alertIndex: number): void => {
    setTradeAlerts(prev => 
      prev.map((alert, index) => 
        index === alertIndex 
          ? { ...alert, status: 'resolved' as 'active' | 'completed' | 'rejected' } 
          : alert
      )
    );
  }, []);
  
  const clearAlerts = useCallback((): void => {
    setTradeAlerts([]);
  }, []);
  
  return {
    trades,
    tradeAlerts,
    statistics,
    addToTradeList,
    removeTrade,
    completeTrade,
    updateTradesWithPrices,
    resolveAlert,
    clearAlerts
  };
};
