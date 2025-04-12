
import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';
import { PatternData } from '@/services/types/patternTypes';
import { BacktestResult } from '@/services/types/backtestTypes';
import BreakoutOpportunityList from './BreakoutOpportunityList';
import { adaptBacktestResults } from '@/utils/backtestAdapter';

interface TopBreakoutOpportunitiesProps {
  patterns: PatternData[];
  backtestResults: any[];
  loading?: boolean;
}

const TopBreakoutOpportunities: React.FC<TopBreakoutOpportunitiesProps> = ({
  patterns,
  backtestResults,
  loading = false
}) => {
  // Sort patterns by confidence score and filter for only active ones
  const activePatterns = useMemo(() => {
    return patterns
      .filter(pattern => pattern.status === 'active')
      .sort((a, b) => (b.confidenceScore || 0) - (a.confidenceScore || 0));
  }, [patterns]);

  // Get top opportunities (can be customized based on criteria)
  const topOpportunities = useMemo(() => {
    return activePatterns.slice(0, 5);
  }, [activePatterns]);

  // Convert backtestResults to the expected format
  const adaptedResults = adaptBacktestResults(backtestResults);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xl">
          <BarChart3 className="h-5 w-5" /> 
          Top Breakout Opportunities
        </CardTitle>
        <CardDescription>
          Patterns with highest confidence scores and breakout potential
        </CardDescription>
      </CardHeader>
      <CardContent>
        <BreakoutOpportunityList 
          patterns={topOpportunities} 
          backtestResults={adaptedResults}
          loading={loading}
        />
      </CardContent>
    </Card>
  );
};

export default TopBreakoutOpportunities;
