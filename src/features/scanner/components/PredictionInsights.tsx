
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BacktestResult } from "@/services/backtesting/backtestTypes";
import { TimeframeStats } from "@/services/types/patternTypes";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Bot, TrendingUp, TrendingDown, LineChart, Clock } from "lucide-react";

interface PredictionInsightsProps {
  results: BacktestResult[];
  stats: any[]; // Updated to accept an array
}

const PredictionInsights: React.FC<PredictionInsightsProps> = ({ results, stats }) => {
  if (results.length === 0) {
    return (
      <Alert>
        <Bot className="h-4 w-4" />
        <AlertTitle>AI Insights</AlertTitle>
        <AlertDescription>
          Insufficient completed predictions data to generate AI insights. 
          More completed predictions are needed to improve pattern recognition.
        </AlertDescription>
      </Alert>
    );
  }
  
  // Calculate success metrics by pattern type
  const patternMetrics: Record<string, { total: number; success: number }> = {};
  results.forEach(result => {
    if (!patternMetrics[result.patternType]) {
      patternMetrics[result.patternType] = { total: 0, success: 0 };
    }
    patternMetrics[result.patternType].total += 1;
    if (result.successful) {
      patternMetrics[result.patternType].success += 1;
    }
  });
  
  // Find most successful pattern types
  const patternSuccessRates = Object.entries(patternMetrics)
    .map(([pattern, data]) => ({ 
      pattern, 
      successRate: data.success / data.total * 100,
      totalTrades: data.total 
    }))
    .filter(item => item.totalTrades >= 3) // Filter for patterns with enough data
    .sort((a, b) => b.successRate - a.successRate);
  
  // Calculate average time to breakout by timeframe
  const timeframeBreakouts: Record<string, number[]> = {};
  results.forEach(result => {
    if (!timeframeBreakouts[result.timeframe]) {
      timeframeBreakouts[result.timeframe] = [];
    }
    timeframeBreakouts[result.timeframe].push(result.candlesToBreakout);
  });
  
  const avgBreakoutByTimeframe = Object.entries(timeframeBreakouts)
    .map(([timeframe, breakouts]) => ({
      timeframe,
      avgBreakout: breakouts.reduce((sum, b) => sum + b, 0) / breakouts.length
    }))
    .sort((a, b) => a.avgBreakout - b.avgBreakout);
  
  // Generate insights based on the data
  const insights = [];
  
  if (patternSuccessRates.length > 0) {
    const bestPattern = patternSuccessRates[0];
    insights.push(
      `${bestPattern.pattern} patterns have ${bestPattern.successRate.toFixed(1)}% accuracy across ${bestPattern.totalTrades} trades.`
    );
  }
  
  if (avgBreakoutByTimeframe.length > 0) {
    const fastestTimeframe = avgBreakoutByTimeframe[0];
    insights.push(
      `${fastestTimeframe.timeframe} timeframe shows the fastest breakouts, averaging ${fastestTimeframe.avgBreakout.toFixed(1)} candles.`
    );
  }
  
  // Calculate overall trend direction success
  const bullishResults = results.filter(r => r.predictedDirection === 'bullish');
  const bearishResults = results.filter(r => r.predictedDirection === 'bearish');
  
  const bullishSuccessRate = bullishResults.length > 0
    ? bullishResults.filter(r => r.successful).length / bullishResults.length * 100
    : 0;
    
  const bearishSuccessRate = bearishResults.length > 0
    ? bearishResults.filter(r => r.successful).length / bearishResults.length * 100
    : 0;
    
  if (bullishResults.length > 5 && bearishResults.length > 5) {
    insights.push(
      `Bullish predictions are ${bullishSuccessRate.toFixed(1)}% accurate, while bearish predictions are ${bearishSuccessRate.toFixed(1)}% accurate.`
    );
  }
  
  // Use the first stats item if available, otherwise provide default values
  const timeframeData = stats && stats.length > 0 ? stats[0] : null;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" /> 
          AI Prediction Insights
        </CardTitle>
        <CardDescription>
          Pattern recognition insights based on {results.length} completed predictions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start space-x-3">
            <TrendingUp className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Most Successful Patterns</p>
              {patternSuccessRates.slice(0, 2).map((item, i) => (
                <p key={i} className="text-sm text-muted-foreground">
                  {item.pattern}: {item.successRate.toFixed(1)}% success ({item.totalTrades} trades)
                </p>
              ))}
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <TrendingDown className="h-5 w-5 text-red-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Least Successful Patterns</p>
              {patternSuccessRates.slice(-2).reverse().map((item, i) => (
                <p key={i} className="text-sm text-muted-foreground">
                  {item.pattern}: {item.successRate.toFixed(1)}% success ({item.totalTrades} trades)
                </p>
              ))}
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <LineChart className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Timeframe Performance</p>
              {timeframeData ? (
                <p className="text-sm text-muted-foreground">
                  {timeframeData.timeframe}: {timeframeData.successRate.toFixed(1)}% success rate
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No timeframe data available</p>
              )}
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <Clock className="h-5 w-5 text-amber-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Average Breakout Time</p>
              {avgBreakoutByTimeframe.slice(0, 2).map((item, i) => (
                <p key={i} className="text-sm text-muted-foreground">
                  {item.timeframe}: {item.avgBreakout.toFixed(1)} candles
                </p>
              ))}
            </div>
          </div>
        </div>
        
        <div className="pt-2 border-t">
          <p className="font-medium mb-2">AI Recommendations:</p>
          <ul className="space-y-1">
            {insights.map((insight, i) => (
              <li key={i} className="text-sm">{insight}</li>
            ))}
            {insights.length === 0 && (
              <li className="text-sm text-muted-foreground">
                More completed predictions needed for detailed recommendations.
              </li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default PredictionInsights;
