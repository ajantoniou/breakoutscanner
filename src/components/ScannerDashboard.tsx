import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ArrowUpCircle, ArrowDownCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { PatternData } from '@/services/types/patternTypes';

interface ScannerDashboardProps {
  patterns: PatternData[];
  loading?: boolean;
  title?: string;
}

const ScannerDashboard: React.FC<ScannerDashboardProps> = ({
  patterns,
  loading = false,
  title = 'Higher Timeframe Breakout Prediction'
}) => {
  if (loading) {
    return (
      <Card className="p-6">
        <CardTitle>Loading prediction data...</CardTitle>
      </Card>
    );
  }

  // Only include patterns with trendline breaks (internal breakouts)
  const trendlineBreakPatterns = patterns.filter(p => p.trendlineBreak === true);
  
  // Group by direction
  const bullishPatterns = trendlineBreakPatterns.filter(p => p.direction === 'bullish');
  const bearishPatterns = trendlineBreakPatterns.filter(p => p.direction === 'bearish');
  
  // Calculate average confidence score
  const avgConfidence = trendlineBreakPatterns.length > 0
    ? trendlineBreakPatterns.reduce((acc, p) => acc + (p.confidenceScore || 0), 0) / trendlineBreakPatterns.length
    : 0;

  return (
    <div className="space-y-6">
      <Card className="border-2 border-indigo-100 dark:border-indigo-900">
        <CardHeader className="bg-indigo-50 dark:bg-indigo-950/30">
          <CardTitle className="text-xl flex items-center gap-2">
            {title}
          </CardTitle>
          <CardDescription className="mt-2">
            <p className="font-medium text-indigo-700 dark:text-indigo-400">
              Internal trendline breakouts predicting higher timeframe channel breakouts
            </p>
            <p className="text-xs mt-1 text-slate-600 dark:text-slate-400">
              Detecting early signals for future breakouts of higher timeframe channels
            </p>
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg text-center">
              <div className="text-sm text-slate-500 dark:text-slate-400">Active Predictions</div>
              <div className="text-2xl font-bold">{trendlineBreakPatterns.length}</div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg text-center">
              <div className="text-sm text-slate-500 dark:text-slate-400">Avg Confidence</div>
              <div className="text-2xl font-bold">{avgConfidence.toFixed(0)}%</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-center">
              <div className="flex items-center justify-center gap-1 text-sm text-green-600 dark:text-green-400">
                <ArrowUpCircle className="h-4 w-4" />
                <span>Bullish</span>
              </div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{bullishPatterns.length}</div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-center">
              <div className="flex items-center justify-center gap-1 text-sm text-red-600 dark:text-red-400">
                <ArrowDownCircle className="h-4 w-4" />
                <span>Bearish</span>
              </div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{bearishPatterns.length}</div>
            </div>
          </div>

          {trendlineBreakPatterns.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-900">
                  <TableHead>Symbol</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Entry TF</TableHead>
                  <TableHead>Predicted Breakout TF</TableHead>
                  <TableHead>Confidence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trendlineBreakPatterns
                  .sort((a, b) => (b.confidenceScore || 0) - (a.confidenceScore || 0))
                  .slice(0, 5)
                  .map(pattern => (
                    <TableRow key={pattern.id} className="hover:bg-indigo-50 dark:hover:bg-indigo-950/20">
                      <TableCell className="font-medium">{pattern.symbol}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {pattern.direction === 'bullish' ? (
                            <>
                              <TrendingUp className="h-4 w-4 text-green-500" />
                              <span className="text-green-600">Bullish</span>
                            </>
                          ) : (
                            <>
                              <TrendingDown className="h-4 w-4 text-red-500" />
                              <span className="text-red-600">Bearish</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{pattern.timeframe}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800">
                          {pattern.higherTimeframe || pattern.confirmingTimeframe || 
                            (pattern.timeframe === '15m' ? '1h' : 
                             pattern.timeframe === '30m' ? '4h' : 
                             pattern.timeframe === '1h' ? '4h' : 
                             pattern.timeframe === '4h' ? 'daily' : 'weekly')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={
                            pattern.confidenceScore >= 80 ? 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-400' : 
                            pattern.confidenceScore >= 60 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400' : 
                            'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-400'
                          }
                        >
                          {pattern.confidenceScore || 0}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}

          {trendlineBreakPatterns.length === 0 && (
            <div className="text-center py-8 px-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
              <p className="text-slate-500 dark:text-slate-400 mb-2">No internal trendline breakouts detected</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Internal trendline breaks provide early signals of potential higher timeframe channel breakouts
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ScannerDashboard; 