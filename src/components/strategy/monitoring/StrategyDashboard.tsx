import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  AlertTriangle, 
  PieChart, 
  List, 
  CheckCircle2,
  XCircle
} from "lucide-react";
import { TradingStrategy, StrategyBacktestResult } from "@/services/backtesting/strategyTypes";

interface StrategyMetric {
  label: string;
  value: string | number;
  change?: number;
  status?: 'positive' | 'negative' | 'neutral';
}

interface StrategyDashboardProps {
  strategy: TradingStrategy;
  currentStrategyResult: StrategyBacktestResult | null;
  isMonitoringActive: boolean;
  alertsCount: number;
}

const StrategyDashboard: React.FC<StrategyDashboardProps> = ({
  strategy,
  currentStrategyResult,
  isMonitoringActive,
  alertsCount
}) => {
  // Derive metrics from strategy results
  const metrics: StrategyMetric[] = [
    {
      label: "Win Rate",
      value: currentStrategyResult?.winRate 
        ? `${currentStrategyResult.winRate.toFixed(1)}%` 
        : "N/A",
      change: 2.5,
      status: 'positive'
    },
    {
      label: "Profit Factor",
      value: currentStrategyResult?.profitFactor 
        ? currentStrategyResult.profitFactor.toFixed(2) 
        : "N/A",
      change: -0.8,
      status: 'negative'
    },
    {
      label: "Drawdown",
      value: currentStrategyResult?.maxDrawdown 
        ? `${currentStrategyResult.maxDrawdown.toFixed(1)}%` 
        : "N/A",
      change: 1.2,
      status: 'neutral'
    },
    {
      label: "Sharpe Ratio",
      value: currentStrategyResult?.sharpeRatio 
        ? currentStrategyResult.sharpeRatio.toFixed(2) 
        : "N/A",
      change: 0.3,
      status: 'positive'
    }
  ];
  
  return (
    <Card className="shadow-md border-slate-200">
      <CardContent className="p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{strategy.name} Dashboard</h3>
            <div className="flex items-center gap-2">
              {isMonitoringActive ? (
                <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Monitoring Active
                </Badge>
              ) : (
                <Badge variant="outline">
                  <XCircle className="h-3 w-3 mr-1" />
                  Monitoring Inactive
                </Badge>
              )}
              
              {alertsCount > 0 && (
                <Badge variant="destructive" className="flex items-center">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {alertsCount} Alerts
                </Badge>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map((metric, index) => (
              <div key={index} className="bg-slate-50 rounded-md p-4 border border-slate-200">
                <div className="text-sm text-muted-foreground mb-1">{metric.label}</div>
                <div className="flex items-end justify-between">
                  <div className="text-2xl font-semibold">{metric.value}</div>
                  {metric.change !== undefined && (
                    <div className={`text-xs flex items-center ${
                      metric.status === 'positive' ? 'text-green-600' : 
                      metric.status === 'negative' ? 'text-red-600' : 
                      'text-slate-600'
                    }`}>
                      {metric.status === 'positive' ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : metric.status === 'negative' ? (
                        <TrendingUp className="h-3 w-3 mr-1 rotate-180" />
                      ) : null}
                      {metric.change > 0 ? '+' : ''}{metric.change}%
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="overview" className="flex items-center">
              <PieChart className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="positions" className="flex items-center">
              <List className="h-4 w-4 mr-2" />
              Active Positions
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Alerts {alertsCount > 0 && `(${alertsCount})`}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>{strategy.description}</p>
              <p className="mt-2">This strategy has been backtested across multiple timeframes and has shown 
              {currentStrategyResult?.winRate && currentStrategyResult.winRate > 60 
                ? " strong " 
                : currentStrategyResult?.winRate && currentStrategyResult.winRate > 50 
                  ? " moderate " 
                  : " limited "} 
              profitability.</p>
            </div>
          </TabsContent>
          
          <TabsContent value="positions">
            <div className="text-center py-6 text-muted-foreground">
              {!isMonitoringActive ? (
                <p>Enable monitoring to track active positions.</p>
              ) : (
                <p>No active positions are currently being tracked.</p>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="alerts">
            <div className="text-center py-6 text-muted-foreground">
              {alertsCount === 0 ? (
                <p>No active alerts at this time.</p>
              ) : (
                <p>View and manage your active alerts.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default StrategyDashboard;
