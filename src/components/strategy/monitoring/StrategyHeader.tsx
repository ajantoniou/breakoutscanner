
import React from "react";
import { CardTitle, CardDescription } from "@/components/ui/card";
import StrategyControls from "./StrategyControls";
import ExitAlertsList from "./ExitAlertsList";

interface ExitAlert {
  symbol: string;
  reason: string;
  timestamp: Date;
}

interface StrategyHeaderProps {
  monitoringActive: boolean;
  onToggleMonitoring: () => void;
  onBacktestStrategy: () => void;
  isLoading: boolean;
  exitAlerts: ExitAlert[];
  onClearAlerts: () => void;
}

const StrategyHeader: React.FC<StrategyHeaderProps> = ({
  monitoringActive,
  onToggleMonitoring,
  onBacktestStrategy,
  isLoading,
  exitAlerts,
  onClearAlerts
}) => {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <CardTitle>Combined Adaptive Strategy</CardTitle>
          <CardDescription>
            Our comprehensive trading strategy adjusts risk parameters based on confidence level
          </CardDescription>
        </div>
        <StrategyControls
          monitoringActive={monitoringActive}
          onToggleMonitoring={onToggleMonitoring}
          onBacktestStrategy={onBacktestStrategy}
          isLoading={isLoading}
        />
      </div>
      
      <ExitAlertsList 
        exitAlerts={exitAlerts} 
        onClearAlerts={onClearAlerts} 
      />
    </div>
  );
};

export default StrategyHeader;
