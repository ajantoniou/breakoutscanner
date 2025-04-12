import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUpCircle, ArrowDownCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { PatternData } from '@/services/types/patternTypes';

interface BreakoutSummaryProps {
  patterns: PatternData[];
  loading?: boolean;
}

const BreakoutSummary: React.FC<BreakoutSummaryProps> = ({
  patterns,
  loading = false
}) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Breakout Summary</CardTitle>
          <CardDescription>Loading predictions...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Only include patterns with internal trendline breaks
  const confirmedPatterns = patterns.filter(p => p.trendlineBreak === true);
  
  // Group by timeframe
  const groupedByTimeframe = confirmedPatterns.reduce((acc, pattern) => {
    const timeframe = pattern.timeframe;
    if (!acc[timeframe]) {
      acc[timeframe] = [];
    }
    acc[timeframe].push(pattern);
    return acc;
  }, {} as Record<string, PatternData[]>);

  // Calculate stats for bullish vs bearish predictions
  const bullishPredictions = confirmedPatterns.filter(p => p.direction === 'bullish');
  const bearishPredictions = confirmedPatterns.filter(p => p.direction === 'bearish');
  
  // Calculate average confidence scores
  const avgConfidence = confirmedPatterns.length > 0
    ? confirmedPatterns.reduce((sum, p) => sum + p.confidenceScore, 0) / confirmedPatterns.length
    : 0;
  
  // Calculate high confidence patterns (>75%)
  const highConfidencePatterns = confirmedPatterns.filter(p => p.confidenceScore >= 75);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-600" />
          <TrendingDown className="h-5 w-5 text-red-600" />
          Higher Timeframe Breakout Summary
        </CardTitle>
        <CardDescription>
          Internal trendline breaks predicting higher timeframe channel breakouts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <ArrowUpCircle className="h-5 w-5 text-green-600" />
            <div>
              <div className="text-sm font-medium">Bullish Predictions</div>
              <div className="text-2xl font-bold">{bullishPredictions.length}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ArrowDownCircle className="h-5 w-5 text-red-600" />
            <div>
              <div className="text-sm font-medium">Bearish Predictions</div>
              <div className="text-2xl font-bold">{bearishPredictions.length}</div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-2">By Entry Timeframe</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(groupedByTimeframe).map(([timeframe, pats]) => (
                <Badge key={timeframe} variant="outline" className="px-2 py-1">
                  {timeframe}: {pats.length}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2">Confidence Overview</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-md">
                <div className="text-xs text-slate-500 dark:text-slate-400">Avg Confidence</div>
                <div className="font-medium">{avgConfidence.toFixed(0)}%</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-md">
                <div className="text-xs text-slate-500 dark:text-slate-400">High Confidence (&gt;75%)</div>
                <div className="font-medium">{highConfidencePatterns.length} predictions</div>
              </div>
            </div>
          </div>

          {confirmedPatterns.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">Top Prediction</h3>
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-md">
                {confirmedPatterns
                  .sort((a, b) => b.confidenceScore - a.confidenceScore)
                  .slice(0, 1)
                  .map(pattern => (
                    <div key={pattern.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{pattern.symbol}</span>
                        <Badge variant="outline" className="text-xs">
                          {pattern.timeframe}
                        </Badge>
                        {pattern.direction === 'bullish' ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <Badge 
                        className={
                          pattern.confidenceScore >= 80 ? 'bg-green-100 text-green-800' : 
                          pattern.confidenceScore >= 60 ? 'bg-amber-100 text-amber-800' : 
                          'bg-red-100 text-red-800'
                        }
                      >
                        {pattern.confidenceScore}%
                      </Badge>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BreakoutSummary; 