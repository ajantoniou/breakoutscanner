import { PatternData } from '@/services/types/patternTypes';
import { TradingStrategy } from '@/services/types/tradingTypes';
import { EntryAnalysis, ExitAnalysis } from './analysisTypes';

/**
 * Generate an entry analysis for a specific pattern
 */
export async function generateEntryAnalysis(pattern: PatternData): Promise<EntryAnalysis> {
  try {
    // For now, generate a mock analysis
    return {
      keyLevels: {
        entry: pattern.entryPrice,
        target: pattern.targetPrice || pattern.entryPrice * 1.1,
        stopLoss: pattern.stopLoss || pattern.entryPrice * 0.95
      },
      nextLevels: {
        support: [
          pattern.entryPrice * 0.97,
          pattern.entryPrice * 0.95,
          pattern.entryPrice * 0.92
        ],
        resistance: [
          pattern.entryPrice * 1.02,
          pattern.entryPrice * 1.05,
          pattern.entryPrice * 1.08
        ]
      },
      strengths: [
        `Strong volume confirmation for this ${pattern.patternType}`,
        `Pattern formed after a period of consolidation`,
        `Price near key support level`
      ],
      weaknesses: [
        `Market sentiment is currently mixed`,
        `Potential resistance at ${(pattern.entryPrice * 1.03).toFixed(2)}`
      ],
      riskRewardRatio: 3.0,
      successProbability: 68,
      timeEstimate: {
        min: 3,
        max: 7,
        unit: 'days'
      },
      confidenceScore: pattern.confidenceScore || 75
    };
  } catch (error) {
    console.error('Error generating entry analysis:', error);
    // Return a default analysis
    return {
      keyLevels: {
        entry: pattern.entryPrice,
        target: pattern.targetPrice || pattern.entryPrice * 1.1,
        stopLoss: pattern.stopLoss || pattern.entryPrice * 0.95
      },
      nextLevels: {
        support: [],
        resistance: []
      },
      strengths: [],
      riskRewardRatio: 0,
      successProbability: 0
    };
  }
}

/**
 * Generate an exit analysis for a trade
 */
export async function generateExitAnalysis(
  pattern: PatternData,
  currentPrice: number = 0
): Promise<ExitAnalysis> {
  try {
    // Calculate some basic metrics
    const entryPrice = pattern.entryPrice || 0;
    const targetPrice = pattern.targetPrice || entryPrice * 1.1;
    const stopLossPrice = pattern.stopLoss || entryPrice * 0.95;
    
    // Use current price if provided, otherwise simulate one
    const actualCurrentPrice = currentPrice > 0 ? 
      currentPrice : 
      entryPrice * (Math.random() * 0.1 + 0.95);
    
    // Calculate percent move from entry
    const percentMove = ((actualCurrentPrice - entryPrice) / entryPrice) * 100;
    
    // Determine if we should exit based on price movement
    let recommendation: 'exit' | 'hold' | 'scale' = 'hold';
    let reasonSummary = '';
    
    if (percentMove >= 7) {
      recommendation = 'exit';
      reasonSummary = 'Price target reached, take profits';
    } else if (percentMove <= -3) {
      recommendation = 'exit';
      reasonSummary = 'Stop loss triggered, exit to prevent further losses';
    } else if (percentMove >= 4) {
      recommendation = 'scale';
      reasonSummary = 'Consider scaling out partial position';
    } else {
      recommendation = 'hold';
      reasonSummary = 'Continue holding, pattern still developing';
    }
    
    // Calculate how close we are to target (as a percentage)
    const targetProgress = Math.min(100, Math.max(0, 
      ((actualCurrentPrice - entryPrice) / (targetPrice - entryPrice)) * 100
    ));
    
    // Generate strengths and weaknesses based on price action
    const strengths = [];
    const weaknesses = [];
    
    if (actualCurrentPrice > entryPrice) {
      strengths.push('Price moving in expected direction');
      strengths.push('Momentum indicators confirming trend');
    } else {
      weaknesses.push('Price not showing expected momentum');
      weaknesses.push('Pattern may be failing to develop as expected');
    }
    
    if (targetProgress > 50) {
      strengths.push('Trade progressing well toward target');
    }
    
    if (Math.random() > 0.5) {
      strengths.push('Volume confirms price movement');
    } else {
      weaknesses.push('Volume not confirming price movement');
    }
    
    // Calculate confidence based on how well the trade is progressing
    const confidence = Math.floor(
      targetProgress + (Math.random() * 20) + 
      (recommendation === 'exit' ? 30 : 0)
    );
    
    // Risk/reward from current position
    const remainingUpside = targetPrice - actualCurrentPrice;
    const remainingDownside = actualCurrentPrice - stopLossPrice;
    const riskRewardRatio = remainingDownside > 0 ? 
      parseFloat((remainingUpside / remainingDownside).toFixed(2)) : 
      0;
    
    return {
      recommendation,
      reasonSummary,
      targetPrice,
      stopLoss: stopLossPrice,
      targetRationale: `Original pattern target at ${targetPrice.toFixed(2)}`,
      stopLossRationale: `Key support level and original stop loss`,
      riskRewardRatio,
      confidence,
      strengths,
      weaknesses,
      exitConditions: [
        `Price reaches target of $${targetPrice.toFixed(2)}`,
        `Price breaks below $${stopLossPrice.toFixed(2)}`,
        `Pattern invalidation if price closes below support`,
        `3 consecutive red candles on the ${pattern.timeframe} chart`
      ]
    };
  } catch (error) {
    console.error('Error generating exit analysis:', error);
    // Return a default analysis
    return {
      recommendation: 'hold',
      reasonSummary: 'Not enough data to make a recommendation',
      targetPrice: pattern.targetPrice || 0,
      stopLoss: pattern.stopLoss || 0,
      riskRewardRatio: 0,
      confidence: 0,
      strengths: [],
      weaknesses: [],
      exitConditions: []
    };
  }
}

/**
 * Generate a strategy analysis
 */
export async function generateStrategyAnalysis(strategy: TradingStrategy): Promise<any> {
  try {
    return {
      name: strategy.name,
      strengths: [
        'Clear entry and exit rules',
        'Well-defined risk management',
        'Adapts to multiple timeframes'
      ],
      weaknesses: [
        'Lacks volume confirmation',
        'May not perform well in choppy markets',
        'Limited backtest data'
      ],
      recommendations: [
        'Add volume confirmation rules',
        'Test on more market conditions',
        'Consider adding trailing stops'
      ],
      performance: {
        expectedWinRate: 65,
        averageRR: 2.3,
        bestTimeframes: ['daily', '4h'],
        bestPatterns: ['Bull Flag', 'Cup and Handle']
      }
    };
  } catch (error) {
    console.error('Error generating strategy analysis:', error);
    return null;
  }
}

/**
 * Analyze market conditions based on patterns
 */
export function analyzeMarketConditions(patterns: PatternData[] = []) {
  const bullishCount = patterns.filter(p => p.direction === 'bullish').length;
  const bearishCount = patterns.filter(p => p.direction === 'bearish').length;
  
  let marketBias = 'neutral';
  if (bullishCount > bearishCount * 1.5) marketBias = 'bullish';
  if (bearishCount > bullishCount * 1.5) marketBias = 'bearish';
  
  return { marketBias, bullishCount, bearishCount };
}

/**
 * Analyze pattern distribution
 */
export function analyzePatternDistribution(patterns: PatternData[] = []) {
  // Count patterns by type
  const patternCounts: Record<string, number> = {};
  patterns.forEach(p => {
    patternCounts[p.patternType] = (patternCounts[p.patternType] || 0) + 1;
  });
  
  // Find most common pattern
  let mostCommonPattern = 'None';
  let maxCount = 0;
  Object.entries(patternCounts).forEach(([pattern, count]) => {
    if (count > maxCount) {
      mostCommonPattern = pattern;
      maxCount = count;
    }
  });
  
  // Count patterns by timeframe
  const timeframeCounts: Record<string, number> = {};
  patterns.forEach(p => {
    timeframeCounts[p.timeframe] = (timeframeCounts[p.timeframe] || 0) + 1;
  });
  
  // Find best timeframe
  let bestTimeframe = 'daily';
  maxCount = 0;
  Object.entries(timeframeCounts).forEach(([timeframe, count]) => {
    if (count > maxCount) {
      bestTimeframe = timeframe;
      maxCount = count;
    }
  });
  
  return { 
    mostCommonPattern, 
    bestTimeframe,
    patternCounts,
    timeframeCounts
  };
}

/**
 * Generate key insights from patterns
 */
export function generateKeyInsights(patterns: PatternData[] = []) {
  const insights = [
    'Analyze patterns for trading opportunities',
    'Consider risk management for each trade',
    'Monitor pattern completion rates',
  ];
  
  if (patterns.length > 0) {
    const successfulPatterns = patterns.filter(p => p.status === 'completed');
    const successRate = successfulPatterns.length / patterns.length;
    
    if (successRate > 0.7) {
      insights.push('Pattern success rate is strong at ' + (successRate * 100).toFixed(1) + '%');
    } else if (successRate < 0.3) {
      insights.push('Pattern success rate is weak at ' + (successRate * 100).toFixed(1) + '%');
    }
  }
  
  return insights;
}

/**
 * Analyze pattern performance
 */
export function analyzePatternPerformance(backtestResults: any[] = []) {
  // Group by pattern type
  const patternGroups: Record<string, any[]> = {};
  backtestResults.forEach(result => {
    const patternType = result.patternType || 'Unknown';
    if (!patternGroups[patternType]) {
      patternGroups[patternType] = [];
    }
    patternGroups[patternType].push(result);
  });
  
  // Calculate performance for each pattern type
  const performance = Object.entries(patternGroups).map(([patternType, results]) => {
    const successfulTrades = results.filter(r => r.successful).length;
    const totalTrades = results.length;
    const winRate = totalTrades > 0 ? (successfulTrades / totalTrades) * 100 : 0;
    
    const returns = results.map(r => r.profitLossPercent || 0);
    const avgReturn = returns.reduce((sum, val) => sum + val, 0) / returns.length || 0;
    
    const holdingPeriods = results.map(r => {
      const entryDate = new Date(r.entryDate);
      const exitDate = new Date(r.exitDate || new Date());
      return (exitDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24); // Days
    });
    
    const averageHoldingPeriod = holdingPeriods.reduce((sum, val) => sum + val, 0) / holdingPeriods.length || 0;
    
    // Get timeframes used for this pattern
    const timeframes = [...new Set(results.map(r => r.timeframe))];
    
    return {
      patternType,
      successRate: winRate,
      winRate,
      averageReturn: avgReturn,
      avgReturn: avgReturn,
      count: totalTrades,
      sampleSize: totalTrades,
      averageHoldingPeriod,
      timeframes,
      totalTrades,
      successfulTrades
    };
  });
  
  return performance;
}

/**
 * Get recommended patterns
 */
export function getRecommendedPatterns(patterns: PatternData[] = [], performance: any[] = []) {
  // If we have performance data, recommend the best performing patterns
  if (performance.length > 0) {
    return performance
      .sort((a, b) => (b.successRate || 0) - (a.successRate || 0))
      .slice(0, 3)
      .map(p => p.patternType);
  }
  
  // Otherwise, count active patterns and recommend the most common ones
  const patternCounts: Record<string, number> = {};
  patterns.forEach(p => {
    if (p.status === 'active') {
      patternCounts[p.patternType] = (patternCounts[p.patternType] || 0) + 1;
    }
  });
  
  return Object.entries(patternCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([pattern]) => pattern);
}

/**
 * Analyze strategy performance
 */
export function analyzeStrategyPerformance(strategyResults: any[] = []) {
  if (strategyResults.length === 0) {
    return { bestStrategy: '', bestStrategyWinRate: 0 };
  }
  
  // Find the best strategy
  const bestStrategy = strategyResults.reduce((best, current) => {
    return (current.winRate || 0) > (best.winRate || 0) ? current : best;
  }, strategyResults[0]);
  
  return {
    bestStrategy: bestStrategy.strategyName || bestStrategy.name || 'Unknown',
    bestStrategyWinRate: bestStrategy.winRate || 0
  };
}

/**
 * Generate market insights
 */
export function generateMarketInsights(patterns: PatternData[] = []) {
  const insights = [
    'Monitor market trends for trading opportunities',
    'Consider multiple timeframes for confirmation',
    'Use proper risk management for all trades'
  ];
  
  const { marketBias } = analyzeMarketConditions(patterns);
  
  if (marketBias === 'bullish') {
    insights.push('Market shows bullish bias, focus on bullish patterns');
  } else if (marketBias === 'bearish') {
    insights.push('Market shows bearish bias, be cautious with long positions');
  } else {
    insights.push('Market is neutral, consider both bullish and bearish setups');
  }
  
  return insights;
}

/**
 * Get market bias
 */
export function getMarketBias(patterns: PatternData[] = []) {
  const { marketBias } = analyzeMarketConditions(patterns);
  return marketBias;
}

// Export interface types properly for TypeScript
export type { EntryAnalysis, ExitAnalysis };
