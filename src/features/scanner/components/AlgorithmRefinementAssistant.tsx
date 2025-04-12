import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BacktestResult } from '@/services/types/backtestTypes';
import { PatternData } from '@/services/types/patternTypes';
import { 
  BrainCircuit, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  ArrowUpRight 
} from 'lucide-react';
import { 
  analyzePatternPerformance, 
  analyzeTimeframePerformance, 
  analyzeStopLosses, 
  analyzeTechnicalIndicators,
  analyzeDirections 
} from '@/utils/algorithmAnalysis';

export interface AlgorithmInsight {
  type: 'success' | 'warning' | 'info';
  message: string;
  confidence: number; // 0-100
  action?: string;
}

interface AlgorithmRefinementAssistantProps {
  patterns: PatternData[];
  backtestResults: BacktestResult[];
  showTitle?: boolean;
}

const AlgorithmRefinementAssistant: React.FC<AlgorithmRefinementAssistantProps> = ({ 
  patterns, 
  backtestResults,
  showTitle = true
}) => {
  const [insights, setInsights] = useState<AlgorithmInsight[]>([]);

  useEffect(() => {
    if (patterns.length === 0 || backtestResults.length < 10) {
      // Not enough data for meaningful insights
      return;
    }
    
    const newInsights: AlgorithmInsight[] = [];
    
    // 1. Analyze pattern types
    const patternPerformance = analyzePatternPerformance(backtestResults);
    
    if (patternPerformance.length > 0) {
      const bestPattern = patternPerformance[0];
      const worstPattern = patternPerformance[patternPerformance.length - 1];
      
      if (bestPattern && bestPattern.successRate > 0.6) {
        newInsights.push({
          type: 'success',
          message: `${bestPattern.patternType} has a ${(bestPattern.successRate * 100).toFixed(1)}% success rate - your highest performing pattern.`,
          confidence: 80,
          action: `Consider increasing allocation for ${bestPattern.patternType} patterns.`
        });
      }
      
      if (worstPattern && worstPattern.successRate < 0.4 && patternPerformance.length > 1) {
        newInsights.push({
          type: 'warning',
          message: `${worstPattern.patternType} has only ${(worstPattern.successRate * 100).toFixed(1)}% success rate - your lowest performing pattern.`,
          confidence: 75,
          action: `Consider filtering out ${worstPattern.patternType} patterns until you refine the detection algorithm.`
        });
      }
    }
    
    // 2. Analyze timeframes
    const timeframePerformance = analyzeTimeframePerformance(backtestResults);
    
    if (timeframePerformance.length > 0) {
      const bestTimeframe = timeframePerformance[0];
      const worstTimeframe = timeframePerformance[timeframePerformance.length - 1];
      
      if (bestTimeframe && bestTimeframe.successRate > 0.6) {
        newInsights.push({
          type: 'success',
          message: `${bestTimeframe.timeframe} timeframe has ${(bestTimeframe.successRate * 100).toFixed(1)}% success rate - your best timeframe.`,
          confidence: 80,
          action: `Focus on ${bestTimeframe.timeframe} for more consistent results.`
        });
      }
      
      // Check for large discrepancies between timeframes
      if (bestTimeframe && worstTimeframe && 
          bestTimeframe.successRate > worstTimeframe.successRate + 0.2 && 
          timeframePerformance.length > 1) {
        newInsights.push({
          type: 'info',
          message: `Large variation between timeframes: ${bestTimeframe.timeframe} (${(bestTimeframe.successRate * 100).toFixed(1)}%) vs ${worstTimeframe.timeframe} (${(worstTimeframe.successRate * 100).toFixed(1)}%).`,
          confidence: 70,
          action: `Your pattern detection may need timeframe-specific tuning.`
        });
      }
    }
    
    // 3. Analyze stop losses
    const stopLossAnalysis = analyzeStopLosses(backtestResults);
    
    if (stopLossAnalysis.sampleSize >= 10) {
      if (stopLossAnalysis.tooTight) {
        newInsights.push({
          type: 'warning',
          message: `Stop losses appear too tight. ${stopLossAnalysis.tooTightPercent.toFixed(1)}% of trades are stopped out before reaching targets.`,
          confidence: 75,
          action: `Consider widening stop losses by approximately ${stopLossAnalysis.suggestedAdjustment}%.`
        });
      }
      
      if (stopLossAnalysis.avgDrawdown > 0) {
        newInsights.push({
          type: 'info',
          message: `Average max drawdown is ${stopLossAnalysis.avgDrawdown.toFixed(1)}% before successful trades reach their targets.`,
          confidence: 60,
          action: `Set stop losses at least ${(stopLossAnalysis.avgDrawdown * 1.2).toFixed(1)}% away from entry to allow for normal price movement.`
        });
      }
    }
    
    // 4. Analyze technical indicators
    const technicalAnalysis = analyzeTechnicalIndicators(backtestResults);
    
    if (technicalAnalysis.significantIndicators.length > 0) {
      technicalAnalysis.significantIndicators.forEach(indicator => {
        newInsights.push({
          type: 'info',
          message: `${indicator.name} correlation detected (${indicator.correlation.toFixed(2)}).`,
          confidence: Math.abs(indicator.correlation) * 100 * 2, // Scale to 0-100
          action: indicator.recommendation
        });
      });
    }
    
    // 5. Analyze trading directions (bullish vs bearish)
    const directionAnalysis = analyzeDirections(backtestResults);
    
    if (directionAnalysis.strongerDirection) {
      const betterDir = directionAnalysis.strongerDirection;
      const betterRate = betterDir === 'bullish' ? 
        directionAnalysis.bullishSuccessRate : 
        directionAnalysis.bearishSuccessRate;
      
      const worseDir = betterDir === 'bullish' ? 'bearish' : 'bullish';
      const worseRate = betterDir === 'bullish' ? 
        directionAnalysis.bearishSuccessRate : 
        directionAnalysis.bullishSuccessRate;
      
      newInsights.push({
        type: 'success',
        message: `${betterDir.charAt(0).toUpperCase() + betterDir.slice(1)} patterns (${(betterRate * 100).toFixed(1)}%) outperform ${worseDir} patterns (${(worseRate * 100).toFixed(1)}%).`,
        confidence: 70,
        action: `Consider specializing in ${betterDir} patterns until you improve ${worseDir} pattern recognition.`
      });
    }
    
    setInsights(newInsights);
  }, [patterns, backtestResults]);

  const renderInsightIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  if (insights.length === 0) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BrainCircuit className="h-5 w-5" />
            Algorithm Refinement Assistant
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Not enough backtest data to provide recommendations yet. Need at least 10 backtest results to generate insights.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-4">
      {showTitle && (
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BrainCircuit className="h-5 w-5" />
            Algorithm Refinement Assistant
          </CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <div className="space-y-3">
          {insights.map((insight, i) => (
            <div 
              key={i} 
              className={`p-3 rounded-md ${
                insight.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
                insight.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' :
                'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
              } border`}
            >
              <div className="flex gap-2">
                {renderInsightIcon(insight.type)}
                <div className="flex-1">
                  <p className="font-medium text-sm">{insight.message}</p>
                  {insight.action && (
                    <p className="text-sm mt-1 text-muted-foreground flex items-center gap-1">
                      <ArrowUpRight className="h-4 w-4" />
                      {insight.action}
                    </p>
                  )}
                </div>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full mt-2">
                <div 
                  className={`h-1.5 rounded-full ${
                    insight.type === 'success' ? 'bg-green-500' :
                    insight.type === 'warning' ? 'bg-amber-500' :
                    'bg-blue-500'
                  }`}
                  style={{width: `${insight.confidence}%`}}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default AlgorithmRefinementAssistant; 