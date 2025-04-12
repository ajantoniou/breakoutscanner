
import React from "react";
import { Button } from "@/components/ui/button";
import { BellRing, TrendingUp, RefreshCw } from "lucide-react";

interface StrategyControlsProps {
  monitoringActive: boolean;
  onToggleMonitoring: () => void;
  onBacktestStrategy: () => void;
  isLoading: boolean;
}

const StrategyControls: React.FC<StrategyControlsProps> = ({
  monitoringActive,
  onToggleMonitoring,
  onBacktestStrategy,
  isLoading
}) => {
  return (
    <div className="flex items-center space-x-2">
      <Button
        variant={monitoringActive ? "secondary" : "outline"}
        onClick={onToggleMonitoring}
        className="flex items-center gap-1"
        disabled={isLoading}
      >
        <BellRing className="h-4 w-4 mr-1" />
        {monitoringActive ? "Monitoring" : "Monitor Positions"}
      </Button>
      <Button
        variant="default"
        onClick={onBacktestStrategy}
        disabled={isLoading}
        className="flex items-center gap-1"
      >
        {isLoading ? (
          <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
        ) : (
          <TrendingUp className="h-4 w-4 mr-1" />
        )}
        {isLoading ? "Running Backtest..." : "Run Backtest"}
      </Button>
    </div>
  );
};

export default StrategyControls;
