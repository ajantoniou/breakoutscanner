
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Info, 
  Plus,
  Brain,
  LineChart
} from "lucide-react";
import { PatternData } from "@/services/types/patternTypes";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

interface InteractivePatternCardProps {
  pattern: PatternData;
  isTopPattern?: boolean;
  onShowAnalysis?: (pattern: PatternData) => void;
  onAddToTradeList?: (pattern: PatternData) => void;
}

const InteractivePatternCard: React.FC<InteractivePatternCardProps> = ({
  pattern,
  isTopPattern = false,
  onShowAnalysis,
  onAddToTradeList
}) => {
  const [expanded, setExpanded] = useState(false);
  
  const confidenceColor = 
    pattern.confidenceScore >= 80 ? "bg-green-100 text-green-800" :
    pattern.confidenceScore >= 60 ? "bg-blue-100 text-blue-800" :
    "bg-yellow-100 text-yellow-800";
  
  const handleAddToTradeList = () => {
    if (onAddToTradeList) {
      onAddToTradeList(pattern);
      toast.success(`Added ${pattern.symbol} to Trade List`, {
        description: `${pattern.direction?.toUpperCase()} prediction added to active trades`
      });
    }
  };
  
  return (
    <Card className={`transition-all duration-300 ${expanded ? 'shadow-md' : 'shadow-sm'} hover:shadow-md`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center">
            <CardTitle className="text-lg flex items-center gap-1.5">
              {pattern.symbol}
              {isTopPattern && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge className="h-5 w-5 p-0 rounded-full flex items-center justify-center bg-primary text-white">
                        <Brain className="h-3 w-3" />
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Top AI recommended pattern</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={pattern.direction === 'bullish' ? 'default' : 'destructive'} 
                  className={pattern.direction === 'bullish' ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}>
              {pattern.direction === 'bullish' ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              {pattern.direction === 'bullish' ? 'Bullish' : 'Bearish'}
            </Badge>
            <Badge className={`${confidenceColor}`}>
              <Zap className="h-3 w-3 mr-1" />
              {pattern.confidenceScore}%
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="py-2">
        <div className="text-sm">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <div className="text-muted-foreground">Pattern</div>
              <div className="font-medium">{pattern.patternType}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Timeframe</div>
              <div className="font-medium">{pattern.timeframe}</div>
            </div>
          </div>
          
          {expanded && (
            <div className="grid grid-cols-2 gap-2 mt-4 animate-fade-in">
              <div>
                <div className="text-muted-foreground">Entry Price</div>
                <div className="font-medium">${pattern.entryPrice.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Target Price</div>
                <div className="font-medium">${pattern.targetPrice.toFixed(2)}</div>
              </div>
              <div className="mt-2">
                <div className="text-muted-foreground">Stop Loss</div>
                <div className="font-medium">${pattern.stopLoss?.toFixed(2) || "N/A"}</div>
              </div>
              <div className="mt-2">
                <div className="text-muted-foreground">Potential Profit</div>
                <div className={`font-medium ${
                  pattern.direction === 'bullish' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {pattern.direction === 'bullish' 
                    ? ((pattern.targetPrice - pattern.entryPrice) / pattern.entryPrice * 100).toFixed(2)
                    : ((pattern.entryPrice - pattern.targetPrice) / pattern.entryPrice * 100).toFixed(2)
                  }%
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-2 flex justify-between">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="px-2 text-xs"
        >
          {expanded ? "Less" : "More"} Details
          <ChevronRight className={`h-4 w-4 ml-1 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </Button>
        
        <div className="flex gap-2">
          {onShowAnalysis && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onShowAnalysis(pattern)}
              className="px-2.5 text-xs"
            >
              <Brain className="h-3.5 w-3.5 mr-1" />
              AI Analysis
            </Button>
          )}
          
          <Button 
            variant="default" 
            size="sm" 
            onClick={handleAddToTradeList}
            className="px-2.5 text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add to Trades
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default InteractivePatternCard;
