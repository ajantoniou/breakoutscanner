import { PatternData } from '@/services/types/patternTypes';

// Function to filter patterns by timeframe
function filterByTimeframe(patterns: PatternData[], timeframe: string): PatternData[] {
  if (timeframe === 'all') return patterns;
  return patterns.filter(pattern => pattern.timeframe === timeframe);
}

export const useFilterPatterns = (
  patterns: PatternData[],
  timeframe: string,
  patternTypeFilter: string,
  channelTypeFilter: string,
  emaFilter: string,
  showOnlyMultiTimeframeConfirmed: boolean = false,
  minConfidenceScore: number = 0
): PatternData[] => {
  let filteredPatterns = patterns;
  
  // Filter by timeframe
  if (timeframe !== 'all') {
    filteredPatterns = filterByTimeframe(filteredPatterns, timeframe);
  }
  
  // Filter by pattern type
  if (patternTypeFilter && patternTypeFilter !== 'all') {
    filteredPatterns = filteredPatterns.filter(p => 
      p.patternType === patternTypeFilter
    );
  }
  
  // Filter by channel type
  if (channelTypeFilter && channelTypeFilter !== 'all') {
    filteredPatterns = filteredPatterns.filter(p => 
      p.channelType === channelTypeFilter
    );
  }
  
  // Filter by EMA pattern
  if (emaFilter && emaFilter !== 'all') {
    filteredPatterns = filteredPatterns.filter(p => 
      p.emaPattern === emaFilter
    );
  }
  
  // Filter by multi-timeframe confirmation
  if (showOnlyMultiTimeframeConfirmed) {
    filteredPatterns = filteredPatterns.filter(p => p.multiTimeframeConfirmed);
  }
  
  // Filter by minimum confidence score
  if (minConfidenceScore > 0) {
    filteredPatterns = filteredPatterns.filter(p => 
      (p.confidenceScore || 0) >= minConfidenceScore
    );
  }
  
  return filteredPatterns;
};
