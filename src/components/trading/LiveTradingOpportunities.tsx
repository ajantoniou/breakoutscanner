
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PatternData } from "@/services/types/patternTypes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, TrendingUp, ArrowUpRight, AlertTriangle, RefreshCw } from "lucide-react";
import { BacktestResult } from "@/services/backtesting/backtestTypes";

interface LiveTradingOpportunitiesProps {
  patterns: PatternData[];
  backtestResults?: BacktestResult[];
  loading?: boolean;
  onRefresh?: () => void;
}

const LiveTradingOpportunities: React.FC<LiveTradingOpportunitiesProps> = ({
  patterns,
  backtestResults = [],
  loading = false,
  onRefresh
}) => {
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <span>Live Trading Opportunities</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const highConfidencePatterns = patterns
    .filter(pattern => 
      pattern.status === 'active' && 
      pattern.confidenceScore >= 80 &&
      pattern.volumeConfirmation === true &&
      pattern.entryPrice >= 5
    )
    .sort((a, b) => b.confidenceScore - a.confidenceScore)
    .slice(0, 3);

  const now = new Date();
  const marketOpen = now.getHours() >= 9 && now.getHours() < 16;
  const minutesToClose = marketOpen ? (16 - now.getHours()) * 60 - now.getMinutes() : 0;
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <span>Live Trading Opportunities ({">"}$5 Price)</span>
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Badge variant={marketOpen ? "default" : "outline"} className="font-medium">
              {marketOpen ? "Market Open" : "Market Closed"}
            </Badge>
            {marketOpen && minutesToClose <= 60 && (
              <Badge variant="destructive" className="font-medium">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Closing in {minutesToClose}m
              </Badge>
            )}
            {onRefresh && (
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1" 
                onClick={onRefresh}
              >
                <RefreshCw className="h-3 w-3" />
                Refresh Data
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {highConfidencePatterns.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>No high confidence trade opportunities found right now.</p>
            <p className="text-sm mt-1">
              {patterns.length > 0 ? 
                "Found patterns, but none meet high confidence criteria." : 
                "Try refreshing data or adjusting filters."}
            </p>
            {onRefresh && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4 gap-1" 
                onClick={onRefresh}
              >
                <RefreshCw className="h-3 w-3" />
                Refresh Market Data
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {highConfidencePatterns.map(pattern => {
              const backtestResult = backtestResults.find(result => result.patternId === pattern.id);
              const isBullish = pattern.patternType.includes('Bull') || 
                              pattern.patternType.includes('Bottom') ||
                              pattern.patternType === 'Ascending Triangle';
              
              const profitPotential = ((pattern.targetPrice - pattern.entryPrice) / pattern.entryPrice * 100).toFixed(2);
              
              return (
                <div 
                  key={pattern.id} 
                  className="flex flex-col sm:flex-row items-stretch border rounded-lg overflow-hidden hover:border-primary transition-colors"
                >
                  <div className={`p-4 sm:w-1/4 flex flex-col justify-between ${isBullish ? 'bg-green-50' : 'bg-red-50'}`}>
                    <div>
                      <h3 className="font-bold text-lg">{pattern.symbol}</h3>
                      <p className={`text-sm font-medium ${isBullish ? 'text-green-600' : 'text-red-600'}`}>
                        {pattern.patternType}
                      </p>
                    </div>
                    <div className="mt-2">
                      <Badge 
                        variant={pattern.confidenceScore > 90 ? "default" : "outline"}
                        className="font-medium"
                      >
                        {pattern.confidenceScore}% Confidence
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="p-4 flex-1 bg-card">
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Entry Price</p>
                        <p className="font-medium">${pattern.entryPrice.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Target Price</p>
                        <p className={`font-medium ${isBullish ? 'text-green-600' : 'text-red-600'}`}>
                          ${pattern.targetPrice.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Profit Potential</p>
                        <p className={`font-medium ${isBullish ? 'text-green-600' : 'text-red-600'}`}>
                          {isBullish ? '+' : ''}{profitPotential}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Support/Resistance</p>
                        <p className="font-medium text-xs">
                          S: ${pattern.supportLevel?.toFixed(2) || '?'} / R: ${pattern.resistanceLevel?.toFixed(2) || '?'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-end">
                      <Button size="sm" className="gap-1">
                        <ArrowUpRight className="h-3 w-3" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LiveTradingOpportunities;
