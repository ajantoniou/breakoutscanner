
import { PatternData } from '../types/patternTypes';
import { 
  patternTypes, 
  channelTypes, 
  emaPatterns, 
  symbols, 
  timeframes,
  intraChannelPatterns
} from '../data/patternConstants';

// Utility function to generate a random number in a range
export const getRandomNumber = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

// Utility function to generate a random date
export const getRandomDate = (start: Date, end: Date): Date => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Generate a random pattern
export const generatePattern = (id: string): PatternData => {
  const symbol = symbols[Math.floor(Math.random() * symbols.length)];
  const timeframe = timeframes[Math.floor(Math.random() * timeframes.length)];
  const patternType = patternTypes[Math.floor(Math.random() * patternTypes.length)];
  const basePrice = Math.random() * 1000 + 10;
  const entryPrice = parseFloat(basePrice.toFixed(2));
  
  // Channel type
  const channelType = channelTypes[Math.floor(Math.random() * channelTypes.length)] as 'horizontal' | 'ascending' | 'descending';
  
  // EMA pattern
  const emaPattern = emaPatterns[Math.floor(Math.random() * emaPatterns.length)];
  
  // Support and resistance levels
  const supportLevel = parseFloat((basePrice * 0.95).toFixed(2));
  const resistanceLevel = parseFloat((basePrice * 1.05).toFixed(2));
  
  // Target price is higher for bullish patterns, lower for bearish
  const isBullish = patternType.includes('Bull') || 
                    patternType.includes('Cup') || 
                    patternType.includes('Bottom') ||
                    patternType.includes('Ascending') ||
                    (emaPattern.includes('Bullish') || emaPattern === '7over50' || emaPattern === '7over100');
  
  const targetMultiplier = isBullish ? (Math.random() * 0.15 + 1.05) : (0.95 - Math.random() * 0.15);
  const targetPrice = parseFloat((entryPrice * targetMultiplier).toFixed(2));
  
  // Generate an intra-channel pattern that matches the overall direction
  let intraChannelPattern: string;
  if (isBullish) {
    // Choose from bullish intra-channel patterns
    const bullishPatterns = ['Higher Lows', 'Bull Flag', 'Double Bottom'];
    intraChannelPattern = bullishPatterns[Math.floor(Math.random() * bullishPatterns.length)];
  } else {
    // Choose from bearish intra-channel patterns
    const bearishPatterns = ['Lower Highs', 'Bear Flag', 'Double Top'];
    intraChannelPattern = bearishPatterns[Math.floor(Math.random() * bearishPatterns.length)];
  }
  
  // Higher confidence with horizontal channels and trend line breaks
  let baseConfidence = Math.random() * 20 + 70; // 70-90 base
  
  // Boost confidence for horizontal channels (low IV)
  if (channelType === 'horizontal') {
    baseConfidence += 5;
  }
  
  // Boost for EMA alignment
  if (emaPattern === 'allBullish' || emaPattern === 'allBearish') {
    baseConfidence += 3;
  } else if (emaPattern !== 'mixed') {
    baseConfidence += 2;
  }
  
  // Boost confidence if intra-channel pattern confirms overall direction
  const isConfirmingPattern = (
    (isBullish && ['Higher Lows', 'Bull Flag', 'Double Bottom'].includes(intraChannelPattern)) ||
    (!isBullish && ['Lower Highs', 'Bear Flag', 'Double Top'].includes(intraChannelPattern))
  );
  
  if (isConfirmingPattern) {
    baseConfidence += 5;
  }
  
  // Random for trend line break
  const trendlineBreak = Math.random() > 0.5;
  if (trendlineBreak) {
    baseConfidence += 4;
  }
  
  // Random for volume confirmation
  const volumeConfirmation = Math.random() > 0.3;
  if (volumeConfirmation) {
    baseConfidence += 3;
  }
  
  // Cap at 100
  const confidenceScore = parseFloat(Math.min(baseConfidence, 99.9).toFixed(1));
  
  // Random date in the last 30 days
  const createdAt = new Date();
  createdAt.setDate(createdAt.getDate() - Math.floor(Math.random() * 30));
  
  // Status based on creation date (newer are more likely active)
  const daysSinceCreation = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  let status: 'active' | 'completed' | 'failed';
  
  if (daysSinceCreation < 3) {
    status = 'active';
  } else if (daysSinceCreation < 7) {
    status = Math.random() > 0.5 ? 'active' : (Math.random() > 0.5 ? 'completed' : 'failed');
  } else {
    status = Math.random() > 0.7 ? 'active' : (Math.random() > 0.4 ? 'completed' : 'failed');
  }
  
  return {
    id,
    symbol,
    timeframe,
    patternType,
    entryPrice,
    targetPrice,
    confidenceScore,
    status,
    createdAt, // This is now properly typed as Date
    channelType: channelType as 'horizontal' | 'ascending' | 'descending',
    emaPattern,
    supportLevel,
    resistanceLevel,
    trendlineBreak,
    volumeConfirmation,
    intraChannelPattern
  };
};

// Generate patterns data
export const getPatterns = (count: number = 20): PatternData[] => {
  const patterns: PatternData[] = [];
  
  for (let i = 0; i < count; i++) {
    patterns.push(generatePattern(`pattern-${i}`));
  }
  
  return patterns;
};
