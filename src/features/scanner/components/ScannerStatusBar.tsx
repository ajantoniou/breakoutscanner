
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

interface ScannerStatusBarProps {
  lastRefresh: Date | null;
  autoRefreshEnabled?: boolean;
  refreshInterval?: number;
  onAutoRefreshChange?: (enabled: boolean, interval: number) => void;
  realTimeEnabled?: boolean;
}

const ScannerStatusBar: React.FC<ScannerStatusBarProps> = ({
  lastRefresh,
  autoRefreshEnabled = false,
  refreshInterval = 60000,
  onAutoRefreshChange = () => {},
  realTimeEnabled = false
}) => {
  const handleAutoRefreshToggle = (checked: boolean) => {
    onAutoRefreshChange(checked, refreshInterval);
  };
  
  const handleIntervalChange = (value: string) => {
    onAutoRefreshChange(autoRefreshEnabled, parseInt(value));
  };
  
  return (
    <Card>
      <CardContent className="py-3 px-4">
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {lastRefresh 
              ? `Last updated: ${lastRefresh.toLocaleString()}`
              : "Not yet updated"
            }
            {realTimeEnabled && " • Live data mode active"}
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch 
                id="auto-refresh" 
                checked={autoRefreshEnabled} 
                onCheckedChange={handleAutoRefreshToggle}
              />
              <Label htmlFor="auto-refresh" className="text-sm">Auto-refresh</Label>
            </div>
            
            <Select 
              disabled={!autoRefreshEnabled} 
              value={refreshInterval.toString()} 
              onValueChange={handleIntervalChange}
            >
              <SelectTrigger className="w-[150px] h-8 text-xs">
                <SelectValue placeholder="Refresh interval" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30000">Every 30 seconds</SelectItem>
                <SelectItem value="60000">Every minute</SelectItem>
                <SelectItem value="300000">Every 5 minutes</SelectItem>
                <SelectItem value="600000">Every 10 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ScannerStatusBar;
