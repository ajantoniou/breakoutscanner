import React, { useEffect, useState } from 'react';
import { PatternData } from '@/services/types/patternTypes';
import { BacktestResult } from '@/services/types/backtestTypes';
import { calculateConfidenceScore, getConfidenceLabel, getConfidenceColor } from '@/utils/confidenceScoring';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

interface ConfidenceScoreProps {
  pattern: PatternData;
  backtestResults: BacktestResult[];
  showLabel?: boolean;
}

const ConfidenceScore: React.FC<ConfidenceScoreProps> = ({ 
  pattern, 
  backtestResults,
  showLabel = true 
}) => {
  const [score, setScore] = useState<number>(pattern.confidenceScore || 0);
  
  // Calculate confidence score if not already provided
  useEffect(() => {
    if (!pattern.confidenceScore && backtestResults.length > 0) {
      const calculatedScore = calculateConfidenceScore(pattern, backtestResults);
      setScore(calculatedScore);
    } else {
      setScore(pattern.confidenceScore || 0);
    }
  }, [pattern, backtestResults]);
  
  if (score === 0) return null;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5">
            {showLabel && <span className="text-xs text-muted-foreground">Confidence:</span>}
            <Badge 
              variant="outline"
              className={`flex items-center text-xs px-1.5 py-0.5 ${score >= 70 ? 'border-green-500' : score >= 40 ? 'border-amber-500' : 'border-red-500'}`}
            >
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full mr-1 overflow-hidden">
                  <div className={`h-full ${getConfidenceColor(score)}`}></div>
                </div>
                {showLabel && (
                  <span>{getConfidenceLabel(score)}</span>
                )}
                <span className="font-mono">{score}%</span>
              </div>
            </Badge>
            <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help opacity-70 hover:opacity-100" />
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-[300px]">
          <div className="flex flex-col gap-2">
            <div className="font-semibold">Pattern Confidence Score</div>
            <p className="text-xs">
              This AI-generated score evaluates the likelihood of a successful breakout based on:
            </p>
            <ul className="text-xs list-disc pl-4 space-y-1">
              <li>Historical performance of {pattern.patternType} patterns</li>
              <li>Success rate in the {pattern.timeframe} timeframe</li>
              <li>Technical indicator alignment (RSI, momentum)</li>
              <li>Channel type and price action quality</li>
              <li>Volume confirmation strength</li>
            </ul>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ConfidenceScore; 