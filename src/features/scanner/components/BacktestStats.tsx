import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  TableCaption
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart4, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle, 
  Clock,
  ChartPie,
  LineChart,
  BarChart
} from "lucide-react";
import { BacktestResult, BacktestSummary } from "@/services/backtesting/backtestTypes";
import { TimeframeStats } from "@/services/types/patternTypes";
import { TradeStatistics } from "@/services/types/tradeTypes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useScannerPatterns } from '../hooks/useScannerPatterns';

interface BacktestStatsProps {
  backtestResults: BacktestResult[];
  loading: boolean;
  timeframeStats: TimeframeStats[];
  tradeStatistics?: TradeStatistics;
}

const BacktestStats: React.FC<BacktestStatsProps> = ({
  backtestResults,
  loading,
  timeframeStats,
  tradeStatistics
}) => {
  const [activeTab, setActiveTab] = useState('all');
  const { getBacktestSummary, getPatternTypePerformance } = useScannerPatterns();
  const [summaries, setSummaries] = useState<Record<string, BacktestSummary>>({});
  const [patternTypeSummaries, setPatternTypeSummaries] = useState<Record<string, Record<string, BacktestSummary>>>({});
  
  // Get unique timeframes from results
  const timeframes = [...new Set(backtestResults.map(result => result.timeframe))].sort();
  if (timeframes.length > 0 && !timeframes.includes('all')) {
    timeframes.unshift('all'); // Add 'all' as the first timeframe option
  }
  
  useEffect(() => {
    if (loading || !backtestResults.length) return;
    
    // Generate summaries for each timeframe
    const newSummaries: Record<string, BacktestSummary> = {};
    const newPatternTypeSummaries: Record<string, Record<string, BacktestSummary>> = {};
    
    timeframes.forEach(timeframe => {
      newSummaries[timeframe] = getBacktestSummary(backtestResults, timeframe);
      newPatternTypeSummaries[timeframe] = getPatternTypePerformance(backtestResults, timeframe);
    });
    
    setSummaries(newSummaries);
    setPatternTypeSummaries(newPatternTypeSummaries);
  }, [backtestResults, timeframes, getBacktestSummary, getPatternTypePerformance, loading]);
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Backtest Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-6">
            <p>Loading backtest statistics...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!backtestResults.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Backtest Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-6">
            <p>No backtest results available.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Backtest Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              {timeframes.map(timeframe => (
                <TabsTrigger key={timeframe} value={timeframe}>
                  {timeframe.toUpperCase()}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {timeframes.map(tf => (
              <TabsContent key={tf} value={tf}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <OverallStatsCard summary={summaries[tf]} />
                  <ProfitMetricsCard summary={summaries[tf]} />
                </div>
                
                <PatternTypePerformance 
                  summaries={patternTypeSummaries[tf]} 
                  timeframe={tf}
                />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Trade Statistics - only show if available */}
      {tradeStatistics && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5" />
              Trade Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-muted/20">
                <div className="text-sm text-muted-foreground">Success Rate</div>
                <div className="text-2xl font-bold mt-1">{tradeStatistics.successRate.toFixed(1)}%</div>
              </div>
              
              <div className="p-4 rounded-lg bg-muted/20">
                <div className="text-sm text-muted-foreground">Avg. Return</div>
                <div className="text-2xl font-bold mt-1 text-green-600">+{tradeStatistics.avgReturn.toFixed(2)}%</div>
              </div>
              
              <div className="p-4 rounded-lg bg-muted/20">
                <div className="text-sm text-muted-foreground">Total Trades</div>
                <div className="text-2xl font-bold mt-1">{tradeStatistics.totalTrades}</div>
              </div>
              
              <div className="p-4 rounded-lg bg-muted/20">
                <div className="text-sm text-muted-foreground">Win/Loss Ratio</div>
                <div className="text-2xl font-bold mt-1">{
                  tradeStatistics.successfulTrades > 0 && 
                  (tradeStatistics.totalTrades - tradeStatistics.successfulTrades) > 0 
                    ? (tradeStatistics.successfulTrades / (tradeStatistics.totalTrades - tradeStatistics.successfulTrades)).toFixed(2)
                    : "N/A"
                }</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

interface StatsCardProps {
  summary: BacktestSummary;
}

const OverallStatsCard: React.FC<StatsCardProps> = ({ summary }) => {
  if (!summary) return null;
  
  return (
    <div className="p-4 bg-gray-50 rounded-md">
      <h3 className="text-lg font-semibold mb-3">Overall Performance</h3>
      <div className="grid grid-cols-2 gap-y-2">
        <div>Total Patterns:</div>
        <div className="font-medium">{summary.totalPatterns}</div>
        
        <div>Success Rate:</div>
        <div className="font-medium">{summary.successRate.toFixed(2)}%</div>
        
        <div>Avg. Candles to Breakout:</div>
        <div className="font-medium">{summary.avgCandlesToBreakout.toFixed(1)}</div>
        
        <div>Consistency Score:</div>
        <div className="font-medium">{summary.consistencyScore.toFixed(1)}</div>
        
        <div>Max Win Streak:</div>
        <div className="font-medium">{summary.maxWinStreak}</div>
        
        <div>Max Loss Streak:</div>
        <div className="font-medium">{summary.maxLossStreak}</div>
      </div>
    </div>
  );
};

const ProfitMetricsCard: React.FC<StatsCardProps> = ({ summary }) => {
  if (!summary) return null;
  
  return (
    <div className="p-4 bg-gray-50 rounded-md">
      <h3 className="text-lg font-semibold mb-3">Profit Metrics</h3>
      <div className="grid grid-cols-2 gap-y-2">
        <div>Avg. Win:</div>
        <div className="font-medium text-green-600">{summary.avgWin.toFixed(2)}%</div>
        
        <div>Avg. Loss:</div>
        <div className="font-medium text-red-600">{summary.avgLoss.toFixed(2)}%</div>
        
        <div>Risk/Reward Ratio:</div>
        <div className="font-medium">{summary.riskRewardRatio.toFixed(2)}</div>
        
        <div>Max Profit:</div>
        <div className="font-medium text-green-600">{summary.maxProfit.toFixed(2)}%</div>
        
        <div>Max Loss:</div>
        <div className="font-medium text-red-600">{summary.maxLoss.toFixed(2)}%</div>
        
        <div>Avg. Confidence Score:</div>
        <div className="font-medium">{summary.avgConfidenceScore.toFixed(1)}</div>
      </div>
    </div>
  );
};

interface PatternTypePerformanceProps {
  summaries: Record<string, BacktestSummary>;
  timeframe: string;
}

const PatternTypePerformance: React.FC<PatternTypePerformanceProps> = ({ summaries, timeframe }) => {
  if (!summaries) return null;
  
  // Get pattern types excluding 'all'
  const patternTypes = Object.keys(summaries).filter(type => type !== 'all');
  
  if (patternTypes.length === 0) {
    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-md">
        <p>No pattern type data available for this timeframe.</p>
      </div>
    );
  }
  
  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold mb-3">Performance by Pattern Type</h3>
      <Table>
        <TableCaption>
          Pattern performance metrics for {timeframe.toUpperCase()} timeframe
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Pattern Type</TableHead>
            <TableHead>Count</TableHead>
            <TableHead>Success Rate</TableHead>
            <TableHead>Avg Win</TableHead>
            <TableHead>Avg Loss</TableHead>
            <TableHead>R/R Ratio</TableHead>
            <TableHead>Consistency</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {patternTypes.map(patternType => {
            const summary = summaries[patternType];
            if (!summary || summary.totalPatterns === 0) return null;
            
            return (
              <TableRow key={patternType}>
                <TableCell className="font-medium">{patternType}</TableCell>
                <TableCell>{summary.totalPatterns}</TableCell>
                <TableCell>{summary.successRate.toFixed(2)}%</TableCell>
                <TableCell className="text-green-600">
                  {summary.avgWin.toFixed(2)}%
                </TableCell>
                <TableCell className="text-red-600">
                  {summary.avgLoss.toFixed(2)}%
                </TableCell>
                <TableCell>{summary.riskRewardRatio.toFixed(2)}</TableCell>
                <TableCell>{summary.consistencyScore.toFixed(1)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default BacktestStats;
