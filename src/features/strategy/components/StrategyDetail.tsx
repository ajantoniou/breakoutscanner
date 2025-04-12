
import React from "react";
import { TradingStrategy } from "@/services/backtesting/strategyTypes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Box, Layers, Target, TrendingUp } from "lucide-react";

interface StrategyDetailProps {
  strategy: TradingStrategy;
  isActive?: boolean;
}

const StrategyDetail: React.FC<StrategyDetailProps> = ({ 
  strategy,
  isActive = false
}) => {
  // Format the created date
  const createdDate = strategy.created ? new Date(strategy.created).toLocaleDateString() : "Unknown";
  
  // Get a list of pattern types from the strategy setups
  const patternTypes = strategy.setups.map(setup => setup.pattern.patternType).filter(Boolean);
  
  // Get a unique list of timeframes
  const timeframes = Array.from(new Set(strategy.timeframes));
  
  // Check if the channelType is an array or a string
  const getChannelTypes = (): string[] => {
    if (!strategy.channelType) return [];
    if (Array.isArray(strategy.channelType)) {
      return strategy.channelType;
    }
    return [strategy.channelType];
  };
  
  const channelTypes = getChannelTypes();
  
  return (
    <Card className={isActive ? "border-primary" : ""}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              {strategy.name}
            </CardTitle>
            <CardDescription>{strategy.description}</CardDescription>
          </div>
          <Badge variant={isActive ? "default" : "outline"}>
            {strategy.direction || "Any Direction"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium mb-1 flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                Timeframes
              </h4>
              <div className="flex flex-wrap gap-1">
                {timeframes.map(tf => (
                  <Badge 
                    key={tf} 
                    variant="secondary" 
                    className="text-xs"
                  >
                    {tf}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-1 flex items-center gap-1">
                <Layers className="h-4 w-4 text-muted-foreground" />
                Pattern Types
              </h4>
              <div className="flex flex-wrap gap-1">
                {patternTypes.length > 0 ? (
                  patternTypes.map((pattern, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary" 
                      className="text-xs"
                    >
                      {pattern}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">Any pattern</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium mb-1 flex items-center gap-1">
                <Box className="h-4 w-4 text-muted-foreground" />
                Channel Types
              </h4>
              <div className="flex flex-wrap gap-1">
                {channelTypes.length > 0 ? (
                  channelTypes.map((channel, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary" 
                      className="text-xs"
                    >
                      {channel}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">Any channel</span>
                )}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-1">Created</h4>
              <span className="text-sm">{createdDate}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StrategyDetail;
