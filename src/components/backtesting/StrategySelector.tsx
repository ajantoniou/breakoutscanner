
import React from "react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { getAllStrategies } from "@/services/backtesting/strategiesService";
import { TradingStrategy } from "@/services/backtesting/strategyTypes";
import { Badge } from "@/components/ui/badge";

interface StrategySelectorProps {
  selectedStrategy: string;
  onStrategyChange: (strategyId: string) => void;
}

const StrategySelector: React.FC<StrategySelectorProps> = ({
  selectedStrategy,
  onStrategyChange
}) => {
  const tradingStrategies = getAllStrategies();
  
  return (
    <div className="w-full">
      <Select 
        value={selectedStrategy}
        onValueChange={onStrategyChange}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a trading strategy" />
        </SelectTrigger>
        <SelectContent>
          {tradingStrategies.map((strategy) => (
            <SelectItem key={strategy.id} value={strategy.id}>
              {strategy.name}
              {strategy.id === 'combined-adaptive' && (
                <Badge variant="outline" className="ml-2 bg-primary/10 text-primary">New</Badge>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {selectedStrategy && (
        <StrategyDetails 
          strategy={tradingStrategies.find(s => s.id === selectedStrategy)} 
        />
      )}
    </div>
  );
};

interface StrategyDetailsProps {
  strategy?: TradingStrategy;
}

const StrategyDetails: React.FC<StrategyDetailsProps> = ({ strategy }) => {
  if (!strategy) return null;
  
  const isCombinedStrategy = strategy.id === 'combined-adaptive';
  
  return (
    <div className="mt-4 p-4 border rounded-md bg-muted/40">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">{strategy.name}</h4>
        {isCombinedStrategy && (
          <Badge className="bg-primary text-primary-foreground">Adaptive</Badge>
        )}
      </div>
      <p className="text-sm text-muted-foreground my-2">{strategy.description}</p>
      
      <div className="space-y-4 mt-4">
        {isCombinedStrategy ? (
          <div>
            <h5 className="text-sm font-medium mb-2">Confidence Levels & Risk Adjustment</h5>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center p-2 rounded-md bg-green-50 text-green-800 border border-green-100">
                <div className="w-4 h-4 rounded-full bg-green-500 mr-2"></div>
                <div>
                  <p className="text-xs font-medium">High Confidence (80%+)</p>
                  <p className="text-xs text-green-600">7% stop loss, 21% take profit, 30 bar time stop</p>
                </div>
              </div>
              <div className="flex items-center p-2 rounded-md bg-blue-50 text-blue-800 border border-blue-100">
                <div className="w-4 h-4 rounded-full bg-blue-500 mr-2"></div>
                <div>
                  <p className="text-xs font-medium">Medium-High Confidence (70-79%)</p>
                  <p className="text-xs text-blue-600">6% stop loss, 18% take profit, 25 bar time stop</p>
                </div>
              </div>
              <div className="flex items-center p-2 rounded-md bg-amber-50 text-amber-800 border border-amber-100">
                <div className="w-4 h-4 rounded-full bg-amber-500 mr-2"></div>
                <div>
                  <p className="text-xs font-medium">Medium Confidence (60-69%)</p>
                  <p className="text-xs text-amber-600">5% stop loss, 15% take profit, 20 bar time stop</p>
                </div>
              </div>
              <div className="flex items-center p-2 rounded-md bg-red-50 text-red-800 border border-red-100">
                <div className="w-4 h-4 rounded-full bg-red-300 mr-2"></div>
                <div>
                  <p className="text-xs font-medium">Lower Confidence (&lt; 60%)</p>
                  <p className="text-xs text-red-600">4% stop loss, 12% take profit, 15 bar time stop</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <h5 className="text-sm font-medium mb-2">Confidence Levels</h5>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center p-2 rounded-md bg-green-50 text-green-800 border border-green-100">
                <div className="w-4 h-4 rounded-full bg-green-500 mr-2"></div>
                <div>
                  <p className="text-xs font-medium">High Confidence (75%+)</p>
                  <p className="text-xs text-green-600">Strongest breakout signals with multiple confirmations</p>
                </div>
              </div>
              <div className="flex items-center p-2 rounded-md bg-blue-50 text-blue-800 border border-blue-100">
                <div className="w-4 h-4 rounded-full bg-blue-500 mr-2"></div>
                <div>
                  <p className="text-xs font-medium">Medium Confidence (60-75%)</p>
                  <p className="text-xs text-blue-600">Decent breakout signals with some confirmations</p>
                </div>
              </div>
              <div className="flex items-center p-2 rounded-md bg-amber-50 text-amber-800 border border-amber-100">
                <div className="w-4 h-4 rounded-full bg-amber-500 mr-2"></div>
                <div>
                  <p className="text-xs font-medium">Low Confidence (&lt; 60%)</p>
                  <p className="text-xs text-amber-600">Weak or unconfirmed breakout signals (no entry)</p>
                </div>
              </div>
            </div>
          </div>
        )}
      
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h5 className="text-sm font-medium">Entry Rules</h5>
            <ul className="text-xs space-y-1 mt-1">
              {strategy.entryRules.map(rule => (
                <li key={rule.id} className="flex items-start">
                  <span className="bg-primary/10 text-primary rounded-full w-4 h-4 flex items-center justify-center text-[10px] mr-1 mt-0.5">
                    ✓
                  </span>
                  {rule.name}
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h5 className="text-sm font-medium">Exit Rules</h5>
            <ul className="text-xs space-y-1 mt-1">
              {strategy.exitRules.map(rule => (
                <li key={rule.id} className="flex items-start">
                  <span className="bg-primary/10 text-primary rounded-full w-4 h-4 flex items-center justify-center text-[10px] mr-1 mt-0.5">
                    ✓
                  </span>
                  {rule.name}
                </li>
              ))}
              {strategy.stopLoss && (
                <li className="flex items-start">
                  <span className="bg-red-100 text-red-600 rounded-full w-4 h-4 flex items-center justify-center text-[10px] mr-1 mt-0.5">
                    ✕
                  </span>
                  Stop Loss: {strategy.stopLoss}%
                  {isCombinedStrategy && " (adaptive)"}
                </li>
              )}
              {strategy.takeProfit && (
                <li className="flex items-start">
                  <span className="bg-green-100 text-green-600 rounded-full w-4 h-4 flex items-center justify-center text-[10px] mr-1 mt-0.5">
                    $
                  </span>
                  Take Profit: {strategy.takeProfit}%
                  {isCombinedStrategy && " (adaptive)"}
                </li>
              )}
              {strategy.timeStop && (
                <li className="flex items-start">
                  <span className="bg-blue-100 text-blue-600 rounded-full w-4 h-4 flex items-center justify-center text-[10px] mr-1 mt-0.5">
                    ⏱
                  </span>
                  Time Stop: {strategy.timeStop} bars
                  {isCombinedStrategy && " (adaptive)"}
                </li>
              )}
            </ul>
          </div>
        </div>
        
        {isCombinedStrategy ? (
          <div>
            <h5 className="text-sm font-medium">Confidence Factors & Weights</h5>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div className="text-xs p-1.5 bg-slate-50 rounded border border-slate-100">
                <span className="font-medium">Volume Confirmation</span>
                <p className="text-slate-600">+10% confidence</p>
              </div>
              <div className="text-xs p-1.5 bg-slate-50 rounded border border-slate-100">
                <span className="font-medium">Trendline Break</span>
                <p className="text-slate-600">+10% confidence</p>
              </div>
              <div className="text-xs p-1.5 bg-slate-50 rounded border border-slate-100">
                <span className="font-medium">EMA Alignment</span>
                <p className="text-slate-600">+10% confidence</p>
              </div>
              <div className="text-xs p-1.5 bg-slate-50 rounded border border-slate-100">
                <span className="font-medium">Channel Alignment</span>
                <p className="text-slate-600">+10% confidence</p>
              </div>
              <div className="text-xs p-1.5 bg-slate-50 rounded border border-slate-100">
                <span className="font-medium">Pattern Integrity</span>
                <p className="text-slate-600">+15% confidence</p>
              </div>
              <div className="text-xs p-1.5 bg-slate-50 rounded border border-slate-100">
                <span className="font-medium">Multi-timeframe Confirmation</span>
                <p className="text-slate-600">+15% confidence</p>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <h5 className="text-sm font-medium">Confirmation Factors</h5>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div className="text-xs p-1.5 bg-slate-50 rounded border border-slate-100">
                <span className="font-medium">EMA Alignment</span>
                <p className="text-slate-600">+10% confidence</p>
              </div>
              <div className="text-xs p-1.5 bg-slate-50 rounded border border-slate-100">
                <span className="font-medium">Volume Confirmation</span>
                <p className="text-slate-600">+10% confidence</p>
              </div>
              <div className="text-xs p-1.5 bg-slate-50 rounded border border-slate-100">
                <span className="font-medium">Pattern Formation</span>
                <p className="text-slate-600">+15% confidence</p>
              </div>
              <div className="text-xs p-1.5 bg-slate-50 rounded border border-slate-100">
                <span className="font-medium">Near Channel Boundary</span>
                <p className="text-slate-600">+10% confidence</p>
              </div>
              <div className="text-xs p-1.5 bg-slate-50 rounded border border-slate-100">
                <span className="font-medium">Trendline Break</span>
                <p className="text-slate-600">+15% confidence</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StrategySelector;
