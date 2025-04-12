import React from "react";
import { PatternData } from "@/services/types/patternTypes";
import MultiTimeframePatternCard from "../MultiTimeframePatternCard";
import { Info } from "lucide-react";

interface MultiTimeframePatternContainerProps {
  patterns: PatternData[];
  onAddToTradeList?: (pattern: PatternData) => void;
}

/**
 * Container component that displays multi-timeframe confirmed patterns
 * in a prominent grid at the top of the scanner page
 */
const MultiTimeframePatternContainer: React.FC<MultiTimeframePatternContainerProps> = ({ 
  patterns,
  onAddToTradeList
}) => {
  // Filter only patterns with multi-timeframe confirmation
  const confirmedPatterns = patterns.filter(pattern => pattern.multiTimeframeConfirmed);
  
  if (confirmedPatterns.length === 0) {
    return null;
  }
  
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-lg font-semibold">Multi-Timeframe Confirmed Patterns</h2>
        <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
          <Info className="h-3 w-3 mr-1" />
          Higher confidence signals
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {confirmedPatterns.map((pattern) => (
          <MultiTimeframePatternCard
            key={pattern.id}
            pattern={pattern}
            onAddToTradeList={onAddToTradeList}
          />
        ))}
      </div>
    </div>
  );
};

export default MultiTimeframePatternContainer; 