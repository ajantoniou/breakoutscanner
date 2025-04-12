
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, RefreshCw } from "lucide-react";
import { GeneratedStrategy } from "./StrategyAI"; // Import from StrategyAI

interface StrategyAIProps {
  generatedStrategies: GeneratedStrategy[];
  selectedStrategy: GeneratedStrategy; // Changed type to GeneratedStrategy
  setSelectedStrategy: React.Dispatch<React.SetStateAction<any>>;  // Changed to any to fix type error
  generateStrategyFromPatterns: () => Promise<any>;
  optimizeStrategy: (strategyId: string) => Promise<any>;
  saveStrategy: (strategy: any) => boolean;
  loading: boolean;
  aiResponse?: string;
  newStrategy?: any | null;
  handleCreateStrategy?: () => void;
  handleImproveStrategy?: () => void;
  handleBacktestSuggestion?: () => void;
  handleTrendlineStrategy?: () => void;
  generateStrategy?: (prompt: string) => void;
}

const StrategyAIComponent: React.FC<StrategyAIProps> = ({
  generatedStrategies,
  selectedStrategy,
  setSelectedStrategy,
  loading,
  aiResponse = "",
  newStrategy = null,
  handleCreateStrategy = () => {},
  handleImproveStrategy = () => {},
  handleBacktestSuggestion = () => {},
  handleTrendlineStrategy = () => {},
  generateStrategy = () => {},
  generateStrategyFromPatterns,
  optimizeStrategy,
  saveStrategy
}) => {
  
  // Fallback to core functions if handlers aren't provided
  const onCreateStrategy = handleCreateStrategy || generateStrategyFromPatterns;
  const onImproveStrategy = handleImproveStrategy || (() => optimizeStrategy(selectedStrategy.id));
  const onGenerateStrategy = generateStrategy || (() => generateStrategyFromPatterns());
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            <span>AI Strategy Generator</span>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onCreateStrategy}
              disabled={loading}
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Generate Strategy"}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onImproveStrategy}
              disabled={loading || !selectedStrategy}
            >
              Improve Strategy
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-8 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">
              AI is analyzing patterns and generating an optimal trading strategy...
            </p>
          </div>
        ) : (
          <div>
            {aiResponse && (
              <div className="mb-4 p-4 bg-muted rounded-md">
                <p className="whitespace-pre-line">{aiResponse}</p>
              </div>
            )}
            {generatedStrategies.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Generated Strategies</h3>
                <div className="grid gap-4">
                  {generatedStrategies.map((genStrategy) => (
                    <StrategyCard
                      key={genStrategy.id}
                      strategy={genStrategy}
                      isSelected={selectedStrategy?.id === genStrategy.id}
                      onSelect={() => setSelectedStrategy(genStrategy)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  No AI-generated strategies yet. Click "Generate Strategy" to create one based on your patterns.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface StrategyCardProps {
  strategy: GeneratedStrategy;
  isSelected: boolean;
  onSelect: () => void;
}

const StrategyCard: React.FC<StrategyCardProps> = ({
  strategy,
  isSelected,
  onSelect
}) => {
  return (
    <div 
      className={`p-4 border rounded-md cursor-pointer transition-colors ${
        isSelected ? "border-primary bg-primary/5" : "hover:bg-muted"
      }`}
      onClick={onSelect}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-medium">{strategy.name}</h4>
        <div className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
          {(strategy.confidence || 0).toFixed(0)}% Confidence
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-3">{strategy.description}</p>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-green-50 p-2 rounded">
          <span className="block text-green-700 font-medium">Win Rate</span>
          <span>{strategy.performanceMetrics?.winRate?.toFixed(1) || '0.0'}%</span>
        </div>
        <div className="bg-blue-50 p-2 rounded">
          <span className="block text-blue-700 font-medium">Avg Return</span>
          <span>{strategy.performanceMetrics?.averageReturn?.toFixed(1) || '0.0'}%</span>
        </div>
        <div className="bg-amber-50 p-2 rounded">
          <span className="block text-amber-700 font-medium">Sharpe</span>
          <span>{strategy.performanceMetrics?.sharpeRatio?.toFixed(2) || '0.00'}</span>
        </div>
      </div>
    </div>
  );
};

export default StrategyAIComponent;
