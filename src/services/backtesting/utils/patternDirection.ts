
/**
 * Determines the expected direction of a pattern
 */
export const determinePatternDirection = (patternType: string): 'bullish' | 'bearish' => {
  const bullishPatterns = [
    'Double Bottom',
    'Cup and Handle',
    'Bull Flag',
    'Ascending Triangle',
    'Inverse Head and Shoulders',
    'Bullish Pennant',
    'Bullish Rectangle'
  ];
  
  const bearishPatterns = [
    'Double Top',
    'Head and Shoulders',
    'Bear Flag',
    'Descending Triangle',
    'Bearish Pennant',
    'Bearish Rectangle'
  ];
  
  if (bullishPatterns.includes(patternType)) {
    return 'bullish';
  } else if (bearishPatterns.includes(patternType)) {
    return 'bearish';
  }
  
  // Default to bullish for unknown patterns
  return 'bullish';
};
