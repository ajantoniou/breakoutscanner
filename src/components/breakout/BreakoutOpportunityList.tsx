
import React from 'react';
import { PatternData } from '@/services/types/patternTypes';
import { BacktestResult } from '@/services/types/backtestTypes';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/utils/dateConverter';
import LoadingIndicator from '@/components/shared/LoadingIndicator';

interface BreakoutOpportunityListProps {
  title?: string;
}

const BreakoutOpportunityList: React.FC<BreakoutOpportunityListProps & {
  patterns: PatternData[];
  backtestResults: BacktestResult[];
  loading: boolean;
}> = ({ title = 'Breakout Opportunities', patterns, backtestResults, loading }) => {
  if (loading) {
    return <LoadingIndicator message="Loading breakout opportunities..." />;
  }

  // Filter for patterns that are close to breakout
  const breakoutOpportunities = patterns
    .filter(pattern => 
      pattern.status === 'active' && 
      pattern.predictedBreakoutCandles !== undefined && 
      pattern.predictedBreakoutCandles <= 5)
    .sort((a, b) => 
      (a.predictedBreakoutCandles || 999) - (b.predictedBreakoutCandles || 999)
    );

  if (breakoutOpportunities.length === 0) {
    return (
      <Card className="p-6 text-center">
        <h3 className="text-lg font-medium mb-2">{title}</h3>
        <p className="text-muted-foreground">No immediate breakout opportunities found</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-4 bg-muted/20 border-b">
        <h3 className="text-lg font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground">
          Patterns predicted to break out soon
        </p>
      </div>

      <ScrollArea className="h-[400px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>Pattern</TableHead>
              <TableHead>Direction</TableHead>
              <TableHead>Timeframe</TableHead>
              <TableHead>Predicted Breakout</TableHead>
              <TableHead>Confidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {breakoutOpportunities.map(pattern => {
              // Find corresponding backtest result
              const backtestResult = backtestResults.find(r => r.patternId === pattern.id);
              
              return (
                <TableRow key={pattern.id}>
                  <TableCell className="font-medium">{pattern.symbol}</TableCell>
                  <TableCell>{pattern.patternType}</TableCell>
                  <TableCell>
                    <Badge variant={pattern.direction === 'bullish' ? 'success' : 'destructive'}>
                      {pattern.direction}
                    </Badge>
                  </TableCell>
                  <TableCell>{pattern.timeframe}</TableCell>
                  <TableCell>
                    {pattern.predictedBreakoutCandles === 0 
                      ? 'Imminent' 
                      : `${pattern.predictedBreakoutCandles} candles`}
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      (pattern.confidenceScore || 0) > 80 ? 'success' : 
                      (pattern.confidenceScore || 0) > 60 ? 'default' : 'outline'
                    }>
                      {pattern.confidenceScore || 0}%
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ScrollArea>
    </Card>
  );
};

export default BreakoutOpportunityList;
