import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { BarChart2, Info, LineChart, TrendingUp, TrendingDown, Timer, PieChart } from "lucide-react";
import { TradingStrategy, StrategyBacktestResult, TradeResult } from "@/services/backtesting/strategyTypes";
import StrategyResultsTable from "@/components/backtesting/StrategyResultsTable";
import StrategyPerformanceChart from "@/components/backtesting/StrategyPerformanceChart";

interface CombinedStrategyViewProps {
  strategy: TradingStrategy;
  backtestResult: StrategyBacktestResult | null;
  tradeResults: TradeResult[];
  isLoading: boolean;
  timeframeResults: StrategyBacktestResult[];
}

const CombinedStrategyView: React.FC<CombinedStrategyViewProps> = ({
  strategy,
  backtestResult,
  tradeResults,
  isLoading,
  timeframeResults
}) => {
  const [activeTab, setActiveTab] = useState<string>("overview");
  
  // Group trade results by timeframe
  const tradesByTimeframe = tradeResults.reduce<Record<string, TradeResult[]>>((acc, trade) => {
    const timeframe = trade.timeframe || "unknown";
    if (!acc[timeframe]) {
      acc[timeframe] = [];
    }
    acc[timeframe].push(trade);
    return acc;
  }, {});
  
  // Calculate performance metrics by timeframe
  const timeframePerformance = Object.entries(tradesByTimeframe).map(([timeframe, trades]) => {
    const winningTrades = trades.filter(t => t.profitLossPercent > 0);
    const winRate = trades.length ? (winningTrades.length / trades.length) * 100 : 0;
    const avgReturn = trades.length ? 
      trades.reduce((sum, t) => sum + t.profitLossPercent, 0) / trades.length : 0;
    
    return {
      timeframe,
      tradeCount: trades.length,
      winRate,
      avgReturn,
      trades
    };
  }).sort((a, b) => b.avgReturn - a.avgReturn);
  
  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="overview" className="flex items-center justify-center">
            <Info className="h-4 w-4 mr-2" />
            Strategy Overview
          </TabsTrigger>
          <TabsTrigger value="timeframes" className="flex items-center justify-center">
            <LineChart className="h-4 w-4 mr-2" />
            Timeframe Analysis
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center justify-center">
            <BarChart2 className="h-4 w-4 mr-2" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="trades" className="flex items-center justify-center">
            <PieChart className="h-4 w-4 mr-2" />
            Recent Trades
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Strategy Components</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium mb-2">Confidence Criteria</h3>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="p-3 bg-slate-50 rounded-md border border-slate-100">
                      <div className="flex items-center">
                        <Badge variant="outline" className="mr-2 bg-primary/10">+10%</Badge>
                        <span className="font-medium">Volume Confirmation</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Higher volume on breakout candle confirms strength of move
                      </p>
                    </div>
                    
                    <div className="p-3 bg-slate-50 rounded-md border border-slate-100">
                      <div className="flex items-center">
                        <Badge variant="outline" className="mr-2 bg-primary/10">+10%</Badge>
                        <span className="font-medium">Trendline Break</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Clean break of resistance/support trendline
                      </p>
                    </div>
                    
                    <div className="p-3 bg-slate-50 rounded-md border border-slate-100">
                      <div className="flex items-center">
                        <Badge variant="outline" className="mr-2 bg-primary/10">+10%</Badge>
                        <span className="font-medium">EMA Alignment</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Moving averages aligned with trade direction
                      </p>
                    </div>
                    
                    <div className="p-3 bg-slate-50 rounded-md border border-slate-100">
                      <div className="flex items-center">
                        <Badge variant="outline" className="mr-2 bg-primary/10">+10%</Badge>
                        <span className="font-medium">Channel Alignment</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Channel direction aligns with expected breakout
                      </p>
                    </div>
                    
                    <div className="p-3 bg-slate-50 rounded-md border border-slate-100">
                      <div className="flex items-center">
                        <Badge variant="outline" className="mr-2 bg-primary/10">+15%</Badge>
                        <span className="font-medium">Pattern Integrity</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Clear and well-formed chart pattern
                      </p>
                    </div>
                    
                    <div className="p-3 bg-slate-50 rounded-md border border-slate-100">
                      <div className="flex items-center">
                        <Badge variant="outline" className="mr-2 bg-primary/10">+15%</Badge>
                        <span className="font-medium">Multi-timeframe Confirmation</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Pattern confirmed on multiple timeframes
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Adaptive Risk Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center p-3 rounded-md bg-green-50 text-green-800 border border-green-100">
                    <div className="w-4 h-4 rounded-full bg-green-500 mr-2"></div>
                    <div>
                      <p className="text-sm font-medium">High Confidence (80%+)</p>
                      <p className="text-xs text-green-600">7% stop loss, 21% take profit, 30 bar time stop</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center p-3 rounded-md bg-blue-50 text-blue-800 border border-blue-100">
                    <div className="w-4 h-4 rounded-full bg-blue-500 mr-2"></div>
                    <div>
                      <p className="text-sm font-medium">Medium-High Confidence (70-79%)</p>
                      <p className="text-xs text-blue-600">6% stop loss, 18% take profit, 25 bar time stop</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center p-3 rounded-md bg-amber-50 text-amber-800 border border-amber-100">
                    <div className="w-4 h-4 rounded-full bg-amber-500 mr-2"></div>
                    <div>
                      <p className="text-sm font-medium">Medium Confidence (60-69%)</p>
                      <p className="text-xs text-amber-600">5% stop loss, 15% take profit, 20 bar time stop</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center p-3 rounded-md bg-red-50 text-red-800 border border-red-100">
                    <div className="w-4 h-4 rounded-full bg-red-300 mr-2"></div>
                    <div>
                      <p className="text-sm font-medium">Lower Confidence (&lt; 60%)</p>
                      <p className="text-xs text-red-600">4% stop loss, 12% take profit, 15 bar time stop</p>
                    </div>
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">Entry Rules</h3>
                  <ul className="text-xs space-y-1 list-disc pl-5">
                    {strategy.entryRules.map(rule => (
                      <li key={rule.id}>
                        {rule.name}
                      </li>
                    ))}
                  </ul>
                  
                  <h3 className="text-sm font-medium mt-3">Exit Rules</h3>
                  <ul className="text-xs space-y-1 list-disc pl-5">
                    {strategy.exitRules.map(rule => (
                      <li key={rule.id}>
                        {rule.name}
                      </li>
                    ))}
                    <li>Dynamic stop loss (based on confidence)</li>
                    <li>Dynamic take profit (based on confidence)</li>
                    <li>Adaptive time stop (based on confidence)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="timeframes" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Strategy Performance by Timeframe</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-40 flex items-center justify-center">
                  <p>Loading timeframe analysis...</p>
                </div>
              ) : timeframePerformance.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center">
                  <p>No timeframe data available yet.</p>
                  <p className="text-sm text-muted-foreground mt-1">Run a backtest to generate timeframe analysis</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    {timeframePerformance.map(({ timeframe, tradeCount, winRate, avgReturn }) => (
                      <Card key={timeframe} className="overflow-hidden">
                        <CardHeader className="p-4 pb-2">
                          <CardTitle className="text-base">{timeframe}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <p className="text-muted-foreground text-xs">Win Rate</p>
                              <p className={`font-semibold ${winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                                {winRate.toFixed(1)}%
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs">Avg Return</p>
                              <p className={`font-semibold ${avgReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {avgReturn > 0 ? '+' : ''}{avgReturn.toFixed(2)}%
                              </p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-muted-foreground text-xs">Trades</p>
                              <p className="font-semibold">{tradeCount}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  
                  <div className="pt-4">
                    <h3 className="text-sm font-medium mb-3">Best Performing Timeframe Trades</h3>
                    {timeframePerformance.length > 0 && (
                      <StrategyResultsTable 
                        results={timeframePerformance[0].trades.slice(0, 5)} 
                        loading={false} 
                      />
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="performance" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Overall Strategy Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-40 flex items-center justify-center">
                  <p>Loading performance data...</p>
                </div>
              ) : !backtestResult ? (
                <div className="h-40 flex flex-col items-center justify-center">
                  <p>No performance data available yet.</p>
                  <p className="text-sm text-muted-foreground mt-1">Run a backtest to generate performance metrics</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">Win Rate</p>
                          <p className="text-2xl font-bold">{backtestResult.winRate.toFixed(1)}%</p>
                          <p className="text-xs text-muted-foreground">
                            {backtestResult.winningTrades} wins / {backtestResult.losingTrades} losses
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">Profit Factor</p>
                          <p className="text-2xl font-bold">{backtestResult.profitFactor.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">
                            Higher values indicate stronger performance
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">Expectancy</p>
                          <p className="text-2xl font-bold">{backtestResult.expectancy.toFixed(2)}%</p>
                          <p className="text-xs text-muted-foreground">
                            Expected return per trade
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium mb-3">Performance Chart</h3>
                    <div className="h-72">
                      <StrategyPerformanceChart 
                        results={[backtestResult]}
                        height={270}
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="trades" className="pt-4">
          <Card>
            <CardContent className="p-0">
              <StrategyResultsTable 
                results={tradeResults} 
                loading={isLoading} 
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CombinedStrategyView;
