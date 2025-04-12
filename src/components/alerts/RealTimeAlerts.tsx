
import React, { useState, useEffect } from "react";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { 
  Bell, 
  BellOff, 
  BellRing, 
  Settings, 
  Zap, 
  ArrowUpRight, 
  ArrowDownRight
} from "lucide-react";
import { toast } from "sonner";
import { PatternData } from "@/services/types/patternTypes";
import { getAlerts } from "@/services/generators/alertGenerator";

interface RealTimeAlertsProps {
  patterns: PatternData[];
  isRealTime: boolean;
  onToggleRealTime: () => void;
}

const RealTimeAlerts: React.FC<RealTimeAlertsProps> = ({
  patterns,
  isRealTime,
  onToggleRealTime
}) => {
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [alertFrequency, setAlertFrequency] = useState(15); // minutes
  const [potentialBreakouts, setPotentialBreakouts] = useState<PatternData[]>([]);
  
  // Generate potential breakouts based on pattern data
  useEffect(() => {
    if (patterns.length > 0) {
      // Find high confidence patterns that are close to breakout
      const highConfidencePatterns = patterns
        .filter(p => 
          p.status === 'active' && 
          p.confidenceScore >= 75 &&
          p.channelType && // Must have channel info
          p.entryPrice > 5 // Price filter
        )
        .sort((a, b) => b.confidenceScore - a.confidenceScore)
        .slice(0, 5); // Take top 5
      
      setPotentialBreakouts(highConfidencePatterns);
    }
  }, [patterns]);
  
  // Simulate real-time alerts
  useEffect(() => {
    if (!alertsEnabled || !isRealTime) return;
    
    const alertInterval = setInterval(() => {
      const shouldTriggerAlert = Math.random() > 0.7; // 30% chance
      
      if (shouldTriggerAlert && potentialBreakouts.length > 0) {
        // Pick a random pattern to alert on
        const randomIndex = Math.floor(Math.random() * potentialBreakouts.length);
        const pattern = potentialBreakouts[randomIndex];
        
        const isBullish = pattern.patternType.includes('Bull') || 
                        pattern.patternType.includes('Cup') || 
                        pattern.patternType.includes('Bottom') ||
                        pattern.patternType.includes('Ascending');
        
        // Show toast notification
        toast(
          <div className="flex items-start gap-3">
            <div className={`rounded-full p-2 ${isBullish ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
              {isBullish ? (
                <ArrowUpRight className="h-5 w-5 text-green-600" />
              ) : (
                <ArrowDownRight className="h-5 w-5 text-red-600" />
              )}
            </div>
            <div className="space-y-1">
              <h3 className="font-medium">Potential Breakout: {pattern.symbol}</h3>
              <p className="text-sm text-muted-foreground">
                {isBullish ? 'Bullish' : 'Bearish'} {pattern.patternType} pattern detected
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-medium">Entry: ${pattern.entryPrice.toFixed(2)}</span>
                <span className="text-xs text-muted-foreground">→</span>
                <span className="text-xs font-medium">Target: ${pattern.targetPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>,
          {
            duration: 8000,
            action: {
              label: "View",
              onClick: () => {
                // This would open the pattern details
                console.log("View pattern:", pattern);
              }
            }
          }
        );
      }
    }, alertFrequency * 1000 * 60); // Convert minutes to milliseconds
    
    return () => clearInterval(alertInterval);
  }, [alertsEnabled, isRealTime, potentialBreakouts, alertFrequency]);
  
  const toggleAlerts = () => {
    const newState = !alertsEnabled;
    setAlertsEnabled(newState);
    
    if (newState) {
      toast.success("Real-time alerts enabled", {
        description: `You'll be notified of potential breakouts every ${alertFrequency} minutes`
      });
    } else {
      toast.info("Alerts disabled", {
        description: "You won't receive breakout notifications"
      });
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <BellRing className="h-5 w-5 text-primary" />
            Real-Time Breakout Alerts
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center space-x-2">
              <Switch 
                id="alerts-mode" 
                checked={alertsEnabled} 
                onCheckedChange={toggleAlerts} 
                disabled={!isRealTime}
              />
              <Label htmlFor="alerts-mode" className="cursor-pointer">
                {alertsEnabled ? 'Enabled' : 'Disabled'}
              </Label>
            </div>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <CardDescription>
          {isRealTime 
            ? 'Receive notifications when stocks are approaching breakout levels' 
            : 'Enable real-time data to activate breakout alerts'}
        </CardDescription>
      </CardHeader>
      
      {showSettings && (
        <div className="px-6 py-2 border-t border-b bg-muted/50">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="alert-frequency">Alert Frequency</Label>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setAlertFrequency(Math.max(5, alertFrequency - 5))}
                  disabled={alertFrequency <= 5}
                >
                  -5m
                </Button>
                <span className="w-16 text-center">{alertFrequency} min</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setAlertFrequency(Math.min(60, alertFrequency + 5))}
                  disabled={alertFrequency >= 60}
                >
                  +5m
                </Button>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="real-time-toggle">Real-Time Data</Label>
              <Button 
                variant={isRealTime ? "default" : "outline"} 
                size="sm"
                onClick={onToggleRealTime}
              >
                {isRealTime ? (
                  <>
                    <Zap className="h-4 w-4 mr-1" />
                    <span>Real-Time Active</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-1" />
                    <span>Activate Real-Time</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <CardContent className="p-0">
        {alertsEnabled && isRealTime ? (
          <div>
            {potentialBreakouts.length > 0 ? (
              <div className="divide-y">
                {potentialBreakouts.map((pattern) => {
                  const isBullish = pattern.patternType.includes('Bull') || 
                                  pattern.patternType.includes('Cup') || 
                                  pattern.patternType.includes('Bottom') ||
                                  pattern.patternType.includes('Ascending');
                  
                  return (
                    <div key={pattern.id} className="p-4 flex items-center gap-3 hover:bg-muted/50 cursor-pointer">
                      <div className={`rounded-full p-2 ${isBullish ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                        {isBullish ? (
                          <ArrowUpRight className="h-5 w-5 text-green-600" />
                        ) : (
                          <ArrowDownRight className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{pattern.symbol}</span>
                          <Badge variant={isBullish ? "default" : "destructive"}>
                            {isBullish ? 'Bullish' : 'Bearish'}
                          </Badge>
                        </div>
                        
                        <div className="text-sm text-muted-foreground">
                          {pattern.patternType} pattern in {pattern.channelType} channel
                        </div>
                        
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-medium">Entry: ${pattern.entryPrice.toFixed(2)}</span>
                          <span className="text-xs text-muted-foreground">→</span>
                          <span className="text-xs font-medium">Target: ${pattern.targetPrice.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
                  <Bell className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">No active alerts</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                  When potential breakout patterns are found, they'll appear here and
                  you'll receive real-time notifications.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
              <BellOff className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">Alerts are {!isRealTime ? 'not available' : 'disabled'}</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              {!isRealTime
                ? "Enable real-time data to receive breakout alerts"
                : "Toggle alerts on to be notified when stocks approach breakout levels"}
            </p>
            
            <Button 
              className="mt-3" 
              onClick={isRealTime ? toggleAlerts : onToggleRealTime}
            >
              {isRealTime ? (
                <>
                  <Bell className="h-4 w-4 mr-1" />
                  <span>Enable Alerts</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-1" />
                  <span>Activate Real-Time</span>
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RealTimeAlerts;
