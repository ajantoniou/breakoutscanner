import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Brain,
  CheckCircle2,
  Clock,
  Compass,
  Rocket,
  Target,
  TrendingDown,
  TrendingUp,
  AlertTriangle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TradeExitAnalysisProps } from "./TradeExitAnalysisProps";
import { generateExitAnalysis, ExitAnalysis } from "@/services/ai/strategyAnalysisService";
import { PatternData } from "@/services/types/patternTypes";

const TradeExitAnalysis: React.FC<TradeExitAnalysisProps> = ({ 
  trade, 
  showCard = true 
}) => {
  const [analysis, setAnalysis] = useState<ExitAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Generate analysis when component mounts or trade changes
    async function fetchAnalysis() {
      try {
        const currentPrice = (trade as any).currentPrice || trade.entryPrice * 1.1;
        // Convert trade to compatible format if needed
        const compatibleTrade = {
          ...trade,
          // Add any missing properties required by PatternData
          createdAt: trade.entryDate || new Date().toISOString(),
          id: trade.id || 'temp-id',
          status: trade.status || 'active',
          confidenceScore: trade.confidenceScore || 0,
          stopLoss: trade.stopLoss || trade.stopLossPrice || (trade.entryPrice * 0.95), // Use stopLoss or calculate it
        } as PatternData;
        
        const generatedAnalysis = await generateExitAnalysis(compatibleTrade, currentPrice);
        setAnalysis(generatedAnalysis);
      } catch (error) {
        console.error('Error generating analysis:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchAnalysis();
  }, [trade]);

  if (loading) {
    return <div className="p-4 text-center">Analyzing trade...</div>;
  }

  if (!analysis) {
    return <div className="p-4 text-center">No analysis available.</div>;
  }

  const content = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">{trade.symbol}</h3>
          <p className="text-sm text-muted-foreground">
            {trade.patternType} ({trade.timeframe})
          </p>
        </div>
        
        <Badge className={trade.direction === 'bullish' 
          ? 'bg-green-100 text-green-800' 
          : 'bg-red-100 text-red-800'
        }>
          {trade.direction === 'bullish' ? (
            <TrendingUp className="h-3 w-3 mr-1" />
          ) : (
            <TrendingDown className="h-3 w-3 mr-1" />
          )}
          {trade.direction.charAt(0).toUpperCase() + trade.direction.slice(1)}
        </Badge>
      </div>
      
      <div className="bg-primary/5 p-3 rounded-md">
        <h4 className="font-medium flex items-center gap-1.5 mb-1">
          <Brain className="h-4 w-4" />
          AI Recommendation
        </h4>
        <div className="flex space-x-2 items-center">
          <Badge variant={analysis.recommendation === 'exit' ? 'destructive' : 'outline'}>
            {analysis.recommendation === 'exit' && <AlertTriangle className="h-3 w-3 mr-1" />}
            {analysis.recommendation?.toUpperCase() || 'HOLD'}
          </Badge>
          <p className="text-sm">{analysis.reasonSummary || 'Based on technical analysis'}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-medium flex items-center gap-1.5 mb-1">
            <Target className="h-4 w-4" />
            Target Price
          </h4>
          <div className="flex flex-col">
            <span className="text-lg font-medium">${typeof analysis.targetPrice === 'number' ? analysis.targetPrice.toFixed(2) : 'N/A'}</span>
            <span className="text-xs text-muted-foreground">{analysis.targetRationale || 'Based on pattern projection'}</span>
          </div>
        </div>
        
        <div>
          <h4 className="text-sm font-medium flex items-center gap-1.5 mb-1">
            <AlertTriangle className="h-4 w-4" />
            Stop Loss
          </h4>
          <div className="flex flex-col">
            <span className="text-lg font-medium">${typeof analysis.stopLoss === 'number' ? analysis.stopLoss.toFixed(2) : 'N/A'}</span>
            <span className="text-xs text-muted-foreground">{analysis.stopLossRationale || 'Based on support level'}</span>
          </div>
        </div>
      </div>
      
      <Separator />
      
      <div>
        <h4 className="text-sm font-medium flex items-center gap-1.5 mb-2">
          <Compass className="h-4 w-4" />
          Technical Analysis
        </h4>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Risk/Reward Ratio</span>
            <Badge variant="outline">{typeof analysis.riskRewardRatio === 'number' ? analysis.riskRewardRatio.toFixed(1) : '2.0'}:1</Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">Confidence</span>
            <Badge variant="outline">{analysis.confidence || 0}%</Badge>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <h4 className="text-sm font-medium flex items-center gap-1.5 mb-1">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Strengths
          </h4>
          <ul className="text-xs space-y-1">
            {analysis.strengths && analysis.strengths.map((strength, index) => (
              <li key={index} className="flex items-start">
                <span className="text-green-600 mr-1">•</span>
                {strength}
              </li>
            ))}
          </ul>
        </div>
        
        <div>
          <h4 className="text-sm font-medium flex items-center gap-1.5 mb-1">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Weaknesses
          </h4>
          <ul className="text-xs space-y-1">
            {analysis.weaknesses && analysis.weaknesses.map((weakness, index) => (
              <li key={index} className="flex items-start">
                <span className="text-amber-600 mr-1">•</span>
                {weakness}
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      <div>
        <h4 className="text-sm font-medium flex items-center gap-1.5 mb-1">
          <Clock className="h-4 w-4" />
          Exit Conditions
        </h4>
        <ul className="text-xs space-y-1">
          {analysis.exitConditions && analysis.exitConditions.map((condition, index) => (
            <li key={index} className="flex items-start">
              <span className="text-blue-600 mr-1">•</span>
              {condition}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  if (showCard) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Trade Exit Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          {content}
        </CardContent>
      </Card>
    );
  }

  return content;
};

export default TradeExitAnalysis;
