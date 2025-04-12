
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { getAllStrategies } from "@/services/backtesting/strategiesService";
import { PatternData } from "@/services/types/patternTypes";
import { BacktestResult } from "@/services/types/backtestTypes";
import { useStrategyBacktest } from "@/hooks/scannerHooks/useStrategyBacktest";
import StrategyHeader from "./StrategyHeader";
import StrategyContent from "./StrategyContent";
import StrategyDashboard from "./StrategyDashboard";
import { adaptTradingStrategy } from "@/utils/strategyCompatibilityHelpers";

interface StrategyManagementProps {
  patterns: PatternData[];
  loading: boolean;
  backtestResults: BacktestResult[];
}

const StrategyManagement: React.FC<StrategyManagementProps> = ({
  patterns,
  loading,
  backtestResults
}) => {
  const strategies = getAllStrategies().map(strategy => adaptTradingStrategy(strategy));
  // Always use the combined-adaptive strategy
  const strategyId = "combined-adaptive";
  const [monitoringActive, setMonitoringActive] = useState(false);
  const [exitAlerts, setExitAlerts] = useState<{symbol: string, reason: string, timestamp: Date}[]>([]);
  
  const {
    tradeResults,
    strategyResults,
    currentStrategyResult,
    loading: strategyLoading,
    runStrategyBacktest,
    monitorActivePositions
  } = useStrategyBacktest(patterns, strategyId);
  
  const handleBacktestStrategy = async () => {
    try {
      await runStrategyBacktest();
      toast.success("Strategy backtest completed");
    } catch (error) {
      toast.error("Failed to run backtest");
      console.error(error);
    }
  };
  
  const handleToggleMonitoring = () => {
    const newState = !monitoringActive;
    setMonitoringActive(newState);
    
    if (newState) {
      toast.info("Position monitoring activated", {
        description: "We'll alert you when exit signals appear for your active positions"
      });
    } else {
      toast.info("Position monitoring deactivated");
    }
  };
  
  const handleClearAlerts = () => {
    setExitAlerts([]);
  };
  
  // Monitor positions when monitoring is active
  useEffect(() => {
    if (!monitoringActive || tradeResults.length === 0) return;
    
    const interval = setInterval(async () => {
      try {
        const alerts = await monitorActivePositions();
        
        if (alerts && alerts.length > 0) {
          // Update our alerts list with new alerts
          setExitAlerts(prev => {
            const newAlerts = alerts.filter(alert => 
              !prev.some(existing => 
                existing.symbol === alert.symbol && 
                existing.reason === alert.reason
              )
            );
            
            // Show toast notifications for new alerts
            newAlerts.forEach(alert => {
              toast.warning(`Exit signal: ${alert.symbol}`, {
                description: `${alert.reason} detected at ${alert.timestamp.toLocaleTimeString()}`,
                duration: 5000,
                icon: <AlertTriangle className="h-4 w-4" />
              });
            });
            
            return [...prev, ...newAlerts];
          });
        }
      } catch (error) {
        console.error("Error monitoring positions:", error);
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [monitoringActive, tradeResults, monitorActivePositions]);
  
  const strategy = strategies.find(s => s.id === strategyId);
  
  if (!strategy) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <p>Strategy not found. Please check configuration.</p>
        </div>
      </Card>
    );
  }
  
  const isLoading = loading || strategyLoading;
  
  // Add missing properties to currentStrategyResult for type compatibility
  const enhancedStrategyResult = currentStrategyResult ? {
    ...currentStrategyResult,
    riskRewardRatio: currentStrategyResult.riskRewardRatio || 0,
    successfulTrades: currentStrategyResult.successfulTrades || 0,
    failedTrades: currentStrategyResult.failedTrades || 0,
    startingCapital: currentStrategyResult.startingCapital || 10000,
    endingCapital: currentStrategyResult.endingCapital || 10000,
    netProfit: currentStrategyResult.netProfit || 0,
    netProfitPercent: currentStrategyResult.netProfitPercent || 0,
    expectancy: 0,
    averageLoss: 0,
    winningTrades: 0,
    losingTrades: 0,
    expectancyScore: 0,
    profitability: 0
  } : null;
  
  return (
    <Card>
      <CardHeader>
        <StrategyHeader
          monitoringActive={monitoringActive}
          onToggleMonitoring={handleToggleMonitoring}
          onBacktestStrategy={handleBacktestStrategy}
          isLoading={isLoading}
          exitAlerts={exitAlerts}
          onClearAlerts={handleClearAlerts}
        />
      </CardHeader>
      <CardContent className="space-y-6">
        <StrategyDashboard 
          strategy={strategy}
          currentStrategyResult={enhancedStrategyResult}
          isMonitoringActive={monitoringActive}
          alertsCount={exitAlerts.length}
        />
        
        <StrategyContent
          isLoading={isLoading}
          strategy={strategy}
          currentStrategyResult={enhancedStrategyResult}
          tradeResults={tradeResults}
          strategyResults={strategyResults}
        />
      </CardContent>
    </Card>
  );
};

export default StrategyManagement;
