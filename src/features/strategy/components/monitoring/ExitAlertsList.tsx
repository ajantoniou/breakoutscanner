
import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

interface ExitAlert {
  symbol: string;
  reason: string;
  timestamp: Date;
}

interface ExitAlertsListProps {
  exitAlerts: ExitAlert[];
  onClearAlerts: () => void;
}

const ExitAlertsList: React.FC<ExitAlertsListProps> = ({ exitAlerts, onClearAlerts }) => {
  if (exitAlerts.length === 0) {
    return null;
  }
  
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">Recent Exit Signals</h3>
        <Button variant="ghost" size="sm" onClick={onClearAlerts}>
          Clear
        </Button>
      </div>
      <div className="space-y-2">
        {exitAlerts.slice(0, 3).map((alert, i) => (
          <div key={i} className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded p-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="font-medium">{alert.symbol}</span>
              <span className="text-sm text-muted-foreground">{alert.reason}</span>
            </div>
            <Badge variant="outline">{new Date(alert.timestamp).toLocaleTimeString()}</Badge>
          </div>
        ))}
        {exitAlerts.length > 3 && (
          <Button variant="link" size="sm" className="pl-0">
            View all {exitAlerts.length} alerts
          </Button>
        )}
      </div>
    </div>
  );
};

export default ExitAlertsList;
