import { PatternData } from "@/services/types/patternTypes";

/**
 * Removes duplicate patterns by keeping only the one with the highest confidence score
 * for each unique symbol, pattern type, and timeframe combination.
 */
export const dedupPatterns = (patternList: PatternData[]): PatternData[] => {
  if (!patternList || !Array.isArray(patternList)) {
    console.warn("dedupPatterns received invalid input:", patternList);
    return [];
  }
  
  // Create a map to identify duplicate symbols with the same pattern type
  const patternMap = new Map<string, PatternData>();
  
  patternList.forEach(pattern => {
    const key = `${pattern.symbol}-${pattern.patternType}-${pattern.timeframe}`;
    
    // If we haven't seen this exact pattern before, or if this one has a higher confidence score
    if (!patternMap.has(key) || (pattern.confidenceScore || 0) > (patternMap.get(key)?.confidenceScore || 0)) {
      patternMap.set(key, pattern);
    }
  });
  
  return Array.from(patternMap.values());
}; 