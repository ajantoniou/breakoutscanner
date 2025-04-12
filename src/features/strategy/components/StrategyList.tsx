
import React, { useState } from "react";
import { TradingStrategy } from "@/services/backtesting/strategyTypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings, ChevronRight, Target, Edit, Copy } from "lucide-react";

interface StrategyListProps {
  strategies: TradingStrategy[];
  onSelect: (strategyId: string) => void;
  onEdit?: (strategy: TradingStrategy) => void;
  onDuplicate?: (strategy: TradingStrategy) => void;
  selectedStrategyId?: string;
}

const StrategyList: React.FC<StrategyListProps> = ({
  strategies,
  onSelect,
  onEdit,
  onDuplicate,
  selectedStrategyId
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Check if the channelType is an array or a string
  const getChannelTypes = (strategy: TradingStrategy): string[] => {
    if (!strategy.channelType) return [];
    if (Array.isArray(strategy.channelType)) {
      return strategy.channelType;
    }
    return [strategy.channelType];
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-xl">
          <span>Trading Strategies</span>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => {}}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {strategies.map(strategy => {
            const isSelected = strategy.id === selectedStrategyId;
            const isHovered = strategy.id === hoveredId;
            
            return (
              <div 
                key={strategy.id}
                className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors relative ${isSelected ? 'bg-slate-50' : ''}`}
                onClick={() => onSelect(strategy.id)}
                onMouseEnter={() => setHoveredId(strategy.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <Target className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">{strategy.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{strategy.description}</p>
                      
                      <div className="flex mt-2 flex-wrap gap-1">
                        {strategy.timeframes.slice(0, 3).map(timeframe => (
                          <Badge key={timeframe} variant="outline" className="text-xs">
                            {timeframe}
                          </Badge>
                        ))}
                        
                        {getChannelTypes(strategy).slice(0, 2).map((channelType, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {channelType}
                          </Badge>
                        ))}
                        
                        <Badge variant={strategy.direction === 'long' ? 'success' : 'destructive'} className="text-xs">
                          {strategy.direction === 'long' ? 'Long' : strategy.direction === 'short' ? 'Short' : 'Both'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-1">
                    {(isHovered || isSelected) && onEdit && (
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(strategy);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {(isHovered || isSelected) && onDuplicate && (
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicate(strategy);
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                    
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className={!isHovered && !isSelected ? 'opacity-0' : ''}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default StrategyList;
