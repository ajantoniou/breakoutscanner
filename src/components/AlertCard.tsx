
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertData, PatternData } from "@/services/types/patternTypes";
import { Check, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface AlertCardProps {
  alert: AlertData;
  onMarkAsRead: (alertId: string) => void;
}

const AlertCard: React.FC<AlertCardProps> = ({ alert, onMarkAsRead }) => {
  // Create a dummy pattern if not provided
  const pattern = alert.pattern || {
    symbol: alert.symbol,
    patternType: alert.patternType || "Unknown",
    timeframe: alert.timeframe || "Daily",
    entryPrice: 0,
    targetPrice: alert.targetPrice || 0,
    status: "active" as const,
    confidenceScore: 0,
    createdAt: alert.createdAt,
    id: alert.patternId
  };
  
  // Determine if pattern is bullish, bearish, or neutral
  const isBullish = pattern.patternType.includes('Bull') || 
                    pattern.patternType.includes('Cup') || 
                    pattern.patternType.includes('Bottom') ||
                    pattern.patternType.includes('Ascending');
  
  const isBearish = pattern.patternType.includes('Bear') || 
                    pattern.patternType.includes('Top') ||
                    pattern.patternType.includes('Descending');
  
  const patternDirection = isBullish ? 'bullish' : isBearish ? 'bearish' : 'neutral';
  
  const getPatternIcon = () => {
    if (isBullish) {
      return <TrendingUp className="h-5 w-5 text-green-500" />;
    }
    if (isBearish) {
      return <TrendingDown className="h-5 w-5 text-red-500" />;
    }
    return <Activity className="h-5 w-5 text-blue-500" />;
  };
  
  const formatDate = (date: Date | string) => {
    // Handle both Date objects and string dates
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };
  
  const priceChange = ((pattern.targetPrice - pattern.entryPrice) / pattern.entryPrice * 100).toFixed(2);
  const isPriceUp = pattern.targetPrice > pattern.entryPrice;

  // Use alert.isRead property for consistency (read is an alias)
  const isRead = alert.isRead;

  return (
    <Card className={cn(
      "pattern-card overflow-hidden border-l-4",
      !isRead && "border-l-primary",
      isRead && "border-l-muted-foreground/30",
      patternDirection === 'bullish' && !isRead && "border-l-green-500",
      patternDirection === 'bearish' && !isRead && "border-l-red-500"
    )}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex items-start space-x-3">
            <div className="mt-1">
              {getPatternIcon()}
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold">{pattern.symbol}</h3>
                <Badge variant={
                  pattern.status === "active" ? "default" :
                  pattern.status === "completed" ? "success" : "destructive"
                }>
                  {pattern.status.charAt(0).toUpperCase() + pattern.status.slice(1)}
                </Badge>
                <Badge variant="outline" className="ml-1">
                  {pattern.timeframe}
                </Badge>
              </div>
              
              <p className="text-sm text-muted-foreground mt-1">
                {pattern.patternType} Pattern
              </p>
              
              <div className="grid grid-cols-2 gap-x-8 gap-y-1 mt-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Entry:</span>{" "}
                  <span className="font-medium">${pattern.entryPrice.toFixed(2)}</span>
                </div>
                
                <div>
                  <span className="text-muted-foreground">Target:</span>{" "}
                  <span className={cn(
                    "font-medium",
                    isPriceUp ? "text-green-600" : "text-red-600"
                  )}>
                    ${pattern.targetPrice.toFixed(2)}
                    <span className="text-xs ml-1">
                      ({isPriceUp ? "+" : ""}{priceChange}%)
                    </span>
                  </span>
                </div>
                
                <div>
                  <span className="text-muted-foreground">Confidence:</span>{" "}
                  <span className={cn(
                    "font-medium",
                    pattern.confidenceScore >= 85 ? "text-green-600" :
                    pattern.confidenceScore >= 75 ? "text-blue-600" : "text-amber-600"
                  )}>
                    {pattern.confidenceScore}%
                  </span>
                </div>
                
                <div>
                  <span className="text-muted-foreground">Created:</span>{" "}
                  <span className="font-medium">
                    {formatDate(pattern.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center">
            {!isRead && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => onMarkAsRead(alert.id)}
              >
                <Check className="h-3 w-3 mr-1" />
                Mark as Read
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AlertCard;
