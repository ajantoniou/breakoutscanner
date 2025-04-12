
import { PatternData } from "@/services/types/patternTypes";

// Define ChannelType directly here instead of importing it
type ChannelType = 'horizontal' | 'ascending' | 'descending';

// Import function to get patterns with similar characteristics 
// for comparison when generating analysis
const getSimilarPatterns = (pattern: PatternData, allPatterns: PatternData[]): PatternData[] => {
  return allPatterns.filter(p => 
    p.patternType === pattern.patternType && 
    p.id !== pattern.id
  ).slice(0, 5); // Just return up to 5 similar patterns
};

// Helper to calculate distance to key levels
const calculateDistanceToKeyLevels = (
  currentPrice: number, 
  levels: { 
    entry: number; 
    target: number; 
    support: number; 
    resistance: number; 
  }
): { 
  toEntry: number;
  toTarget: number; 
  toSupport: number; 
  toResistance: number;
} => {
  return {
    toEntry: Math.abs((currentPrice - levels.entry) / levels.entry * 100),
    toTarget: Math.abs((levels.target - currentPrice) / currentPrice * 100),
    toSupport: Math.abs((currentPrice - levels.support) / currentPrice * 100),
    toResistance: Math.abs((levels.resistance - currentPrice) / currentPrice * 100),
  };
};

// Calculate risk/reward ratio based on entry, target, and stop loss
const calculateRiskReward = (
  entry: number, 
  target: number, 
  stopLoss: number, 
  isLong: boolean = true
): number => {
  if (isLong) {
    const reward = target - entry;
    const risk = entry - stopLoss;
    return risk > 0 ? parseFloat((reward / risk).toFixed(2)) : 0;
  } else {
    const reward = entry - target;
    const risk = stopLoss - entry;
    return risk > 0 ? parseFloat((reward / risk).toFixed(2)) : 0;
  }
};

// Define interface for entry analysis
export interface EntryAnalysis {
  symbol?: string;
  patternType?: string;
  price?: number;
  currentPrice?: number;
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  riskRewardRatio?: number;
  timeframe?: string;
  confidence: number;
  reasonSummary?: string;
  recommendation?: 'enter' | 'wait' | 'avoid';
  technicalFactors?: string[];
  sentiment?: 'bullish' | 'neutral' | 'bearish';
  timeToTarget?: string;
  nextLevels?: {
    support: number[];
    resistance: number[];
  };
  stopLossRationale?: string;
  targetRationale?: string;
  strengths: string[];
  weaknesses: string[];
  keyLevels: {
    entry: number;
    target: number;
    support: number;
    resistance: number;
    stopLoss: number;
  };
  catalysts?: string[];
  summary: string;
  confidenceScore?: number;
}

// Define interface for exit analysis
export interface ExitAnalysis {
  symbol?: string;
  currentPrice?: number;
  targetPrice?: number;
  stopLoss?: number;
  stopLossRationale: string;
  targetRationale: string;
  riskRewardRatio: number;
  recommendation: 'hold' | 'exit' | 'adjust stop loss' | 'move to breakeven';
  confidence: number; 
  reasonSummary?: string;
  technicalFactors?: string[];
  sentiment?: 'bullish' | 'neutral' | 'bearish';
  timeToTarget?: string;
  nextLevels?: {
    support: number[];
    resistance: number[];
  };
  strengths: string[];
  weaknesses: string[];
  summary: string;
  exitConditions: string[];
}

// Function to generate an entry analysis for a pattern
export const generateEntryAnalysis = (
  pattern: PatternData, 
  currentPrice?: number
): EntryAnalysis => {
  // Use the current price if provided, otherwise use the pattern's entry price
  const price = currentPrice || pattern.currentPrice || pattern.entryPrice;
  
  // Calculate default stop loss if not provided
  const stopLoss = pattern.stopLoss || (pattern.entryPrice * 0.95);
  
  // Determine if this is a bullish pattern
  const isBullish = pattern.direction === 'bullish' || pattern.targetPrice > pattern.entryPrice;
  
  // Calculate risk/reward ratio
  const riskReward = calculateRiskReward(
    pattern.entryPrice, 
    pattern.targetPrice, 
    stopLoss, 
    isBullish
  );
  
  // Calculate confidence score based on pattern properties
  let confidence = pattern.confidenceScore;
  
  // Adjust confidence based on pattern type and conditions
  if (pattern.volumeConfirmation) confidence += 5;
  if (pattern.trendlineBreak) confidence += 5;
  if (pattern.emaPattern === 'allBullish' && isBullish) confidence += 5;
  if (pattern.emaPattern === 'allBearish' && !isBullish) confidence += 5;
  
  // Cap confidence at 100
  confidence = Math.min(100, confidence);
  
  // Determine recommendation based on confidence and risk/reward
  let recommendation: 'enter' | 'wait' | 'avoid' = 'wait';
  if (confidence >= 75 && riskReward >= 2) {
    recommendation = 'enter';
  } else if (confidence < 60 || riskReward < 1) {
    recommendation = 'avoid';
  }
  
  // Calculate key levels
  const supportLevel = pattern.supportLevel || pattern.entryPrice * 0.95;
  const resistanceLevel = pattern.resistanceLevel || pattern.targetPrice * 1.05;
  
  // Generate strengths based on pattern properties
  const strengths: string[] = [];
  if (pattern.confidenceScore >= 70) 
    strengths.push(`Strong pattern formation with ${pattern.confidenceScore}% confidence`);
  if (pattern.volumeConfirmation) 
    strengths.push(`Volume confirms the ${pattern.patternType} pattern`);
  if (pattern.trendlineBreak) 
    strengths.push(`Trendline breakout provides additional confirmation`);
  if (riskReward >= 2) 
    strengths.push(`Favorable risk/reward ratio of ${riskReward}:1`);
  if (pattern.emaPattern === 'allBullish' && isBullish) 
    strengths.push(`EMA alignment supports the bullish bias`);
  if (pattern.emaPattern === 'allBearish' && !isBullish) 
    strengths.push(`EMA alignment supports the bearish bias`);
  
  // Generate weaknesses based on pattern properties
  const weaknesses: string[] = [];
  if (pattern.confidenceScore < 70) 
    weaknesses.push(`Pattern confidence score is only ${pattern.confidenceScore}%`);
  if (!pattern.volumeConfirmation) 
    weaknesses.push(`Lacking volume confirmation`);
  if (!pattern.trendlineBreak) 
    weaknesses.push(`No clear trendline breakout yet`);
  if (riskReward < 2) 
    weaknesses.push(`Risk/reward ratio of ${riskReward}:1 is below ideal`);
  if ((pattern.emaPattern === 'allBearish' && isBullish) || 
      (pattern.emaPattern === 'allBullish' && !isBullish)) 
    weaknesses.push(`EMA alignment contradicts the pattern direction`);
  
  // Add a summary based on the recommendation
  let summary = '';
  if (recommendation === 'enter') {
    summary = `Strong ${pattern.patternType} pattern with favorable risk/reward of ${riskReward}:1. Entry conditions are confirmed with ${confidence}% confidence.`;
  } else if (recommendation === 'wait') {
    summary = `${pattern.patternType} pattern shows potential but requires additional confirmation. Wait for clearer signals or improved risk/reward.`;
  } else {
    summary = `${pattern.patternType} pattern lacks sufficient confirmation with only ${confidence}% confidence. Better opportunities likely exist elsewhere.`;
  }
  
  // Generate rationale for stop loss and target
  const stopLossRationale = isBullish
    ? `Stop loss placed below recent support at ${stopLoss.toFixed(2)}`
    : `Stop loss placed above recent resistance at ${stopLoss.toFixed(2)}`;
    
  const targetRationale = isBullish
    ? `Target based on pattern projection and previous resistance at ${pattern.targetPrice.toFixed(2)}`
    : `Target based on pattern projection and previous support at ${pattern.targetPrice.toFixed(2)}`;
  
  // Return the complete analysis
  return {
    symbol: pattern.symbol,
    patternType: pattern.patternType,
    price: price,
    currentPrice: price,
    entryPrice: pattern.entryPrice,
    targetPrice: pattern.targetPrice,
    stopLoss: stopLoss,
    riskRewardRatio: riskReward,
    timeframe: pattern.timeframe,
    confidence: confidence,
    recommendation: recommendation,
    technicalFactors: [
      `${pattern.patternType} formation identified`,
      pattern.volumeConfirmation ? 'Volume confirms pattern' : 'Volume is neutral',
      pattern.trendlineBreak ? 'Trendline breakout observed' : 'No clear trendline break yet'
    ],
    sentiment: isBullish ? 'bullish' : 'bearish',
    timeToTarget: '1-3 weeks',
    nextLevels: {
      support: [supportLevel, supportLevel * 0.95],
      resistance: [resistanceLevel, resistanceLevel * 1.05]
    },
    stopLossRationale: stopLossRationale,
    targetRationale: targetRationale,
    strengths: strengths.length > 0 ? strengths : ['Pattern identified with reasonable confidence'],
    weaknesses: weaknesses.length > 0 ? weaknesses : ['Market conditions may impact pattern development'],
    keyLevels: {
      entry: pattern.entryPrice,
      target: pattern.targetPrice,
      support: supportLevel,
      resistance: resistanceLevel,
      stopLoss: stopLoss
    },
    catalysts: [
      'Monitor volume for confirmation',
      'Watch for breaking news on the stock',
      'Be aware of broader market conditions'
    ],
    summary: summary,
    confidenceScore: confidence
  };
};

// Function to generate an exit analysis for a pattern
export const generateExitAnalysis = (pattern: PatternData, currentPrice?: number): ExitAnalysis => {
  // Use the current price if provided, otherwise use the pattern's current price or entry price
  const price = currentPrice || pattern.currentPrice || pattern.entryPrice;
  
  // Determine if this is a bullish pattern
  const isBullish = pattern.direction === 'bullish' || pattern.targetPrice > pattern.entryPrice;
  
  // Calculate default stop loss if not provided
  const stopLoss = pattern.stopLoss || (pattern.entryPrice * 0.95);
  
  // Calculate progress towards target
  const progressToTarget = isBullish
    ? (price - pattern.entryPrice) / (pattern.targetPrice - pattern.entryPrice) * 100
    : (pattern.entryPrice - price) / (pattern.entryPrice - pattern.targetPrice) * 100;
  
  // Calculate risk/reward at current price
  const currentRiskReward = isBullish
    ? (pattern.targetPrice - price) / (price - stopLoss)
    : (price - pattern.targetPrice) / (stopLoss - price);
  
  // Determine recommended action
  let recommendation: 'hold' | 'exit' | 'adjust stop loss' | 'move to breakeven' = 'hold';
  let confidence = 70;
  
  if (progressToTarget >= 90) {
    recommendation = 'exit';
    confidence = 85;
  } else if (progressToTarget >= 50) {
    recommendation = 'adjust stop loss';
    confidence = 75;
  } else if (progressToTarget >= 25) {
    recommendation = 'move to breakeven';
    confidence = 65;
  }
  
  // Generate strengths based on current price action
  const strengths: string[] = [];
  if (progressToTarget > 0) {
    strengths.push(`Price has moved ${progressToTarget.toFixed(0)}% towards target`);
  }
  if ((isBullish && price > pattern.entryPrice) || (!isBullish && price < pattern.entryPrice)) {
    strengths.push(`Price action confirms ${isBullish ? 'bullish' : 'bearish'} bias`);
  }
  if (currentRiskReward > 1) {
    strengths.push(`Current risk/reward ratio remains favorable at ${currentRiskReward.toFixed(1)}:1`);
  }
  
  // Generate weaknesses based on current price action
  const weaknesses: string[] = [];
  if (progressToTarget < 0) {
    weaknesses.push(`Price has moved against expected direction by ${Math.abs(progressToTarget).toFixed(0)}%`);
  }
  if ((isBullish && price < pattern.entryPrice) || (!isBullish && price > pattern.entryPrice)) {
    weaknesses.push(`Price action contradicts ${isBullish ? 'bullish' : 'bearish'} bias`);
  }
  if (currentRiskReward < 1) {
    weaknesses.push(`Current risk/reward ratio has deteriorated to ${currentRiskReward.toFixed(1)}:1`);
  }
  
  // Generate exit conditions
  const exitConditions = [
    `Price reaches target at ${pattern.targetPrice.toFixed(2)}`,
    `Price hits stop loss at ${stopLoss.toFixed(2)}`,
    `Technical breakdown of pattern structure`,
    `Risk/reward becomes unfavorable`
  ];
  
  // Generate summary based on recommendation
  let summary = '';
  switch(recommendation) {
    case 'exit':
      summary = `${pattern.patternType} pattern has largely played out with price achieving ${progressToTarget.toFixed(0)}% of target. Consider taking profits or tightening stop significantly.`;
      break;
    case 'adjust stop loss':
      summary = `${pattern.patternType} pattern progressing well with ${progressToTarget.toFixed(0)}% move towards target. Adjust stop loss to lock in some profits while maintaining exposure.`;
      break;
    case 'move to breakeven':
      summary = `${pattern.patternType} pattern showing initial confirmation with ${progressToTarget.toFixed(0)}% progress. Move stop loss to breakeven to eliminate downside risk.`;
      break;
    default:
      summary = `${pattern.patternType} pattern still developing with ${progressToTarget.toFixed(0)}% progress towards target. Maintain original stop loss and monitor for further confirmation.`;
  }
  
  return {
    symbol: pattern.symbol,
    currentPrice: price,
    targetPrice: pattern.targetPrice,
    stopLoss: stopLoss,
    stopLossRationale: isBullish
      ? `Stop loss based on support level below entry`
      : `Stop loss based on resistance level above entry`,
    targetRationale: isBullish
      ? `Target based on pattern projection and overhead resistance`
      : `Target based on pattern projection and underlying support`,
    riskRewardRatio: Math.max(0, parseFloat(currentRiskReward.toFixed(2))),
    recommendation: recommendation,
    confidence: confidence,
    reasonSummary: `Price has moved ${progressToTarget.toFixed(0)}% towards target from entry`,
    technicalFactors: [
      `${progressToTarget > 50 ? 'Strong' : 'Moderate'} follow-through on ${pattern.patternType} pattern`,
      `Current risk/reward: ${currentRiskReward.toFixed(1)}:1`,
      `Pattern integrity: ${progressToTarget > 0 ? 'Maintaining' : 'Weakening'}`
    ],
    sentiment: isBullish ? 'bullish' : 'bearish',
    timeToTarget: progressToTarget > 50 
      ? '1-2 weeks' 
      : '2-4 weeks',
    nextLevels: {
      support: [stopLoss, stopLoss * 0.95],
      resistance: [pattern.targetPrice, pattern.targetPrice * 1.05]
    },
    strengths: strengths.length > 0 
      ? strengths 
      : [`Pattern continuing to develop as expected`],
    weaknesses: weaknesses.length > 0 
      ? weaknesses 
      : [`Market volatility could impact pattern completion`],
    summary: summary,
    exitConditions: exitConditions
  };
};

// Removed the duplicate re-export at the end
