import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PatternData } from '@/services/types/patternTypes';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Star, ArrowUp, ArrowDown, TrendingUp, TrendingDown } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface PatternTableProps {
  patterns: PatternData[];
  loading?: boolean;
  onAddToTradeList?: (pattern: PatternData) => void;
  topPatterns?: PatternData[];
  scannerType?: 'daytrader' | 'swing';
}

const PatternTable = ({ 
  patterns, 
  loading = false,
  onAddToTradeList,
  topPatterns = [],
  scannerType = 'swing'
}: PatternTableProps): JSX.Element => {
  const [addingPattern, setAddingPattern] = useState<string | null>(null);

  const handleAddToTradeList = async (pattern: PatternData) => {
    setAddingPattern(pattern.id);
    
    try {
      if (onAddToTradeList) {
        await onAddToTradeList(pattern);
      }
    } finally {
      setTimeout(() => {
        setAddingPattern(null);
      }, 500);
    }
  };
  
  const isTopPattern = (patternId?: string): boolean => {
    if (!patternId) return false;
    return topPatterns.some(p => p.id === patternId);
  };
  
  const formatTimeAgo = (dateValue?: string | Date | null): string => {
    if (!dateValue) return 'Unknown';
    try {
      const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (e) {
      return 'Unknown';
    }
  };
  
  const renderDirectionIcon = (direction: string | undefined) => {
    if (direction === 'bullish') {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    }
    if (direction === 'bearish') {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return null;
  };
  
  const getDirectionColor = (direction: string | undefined) => {
    if (direction === 'bullish') return 'text-green-600';
    if (direction === 'bearish') return 'text-red-600';
    return '';
  };
  
  const getPatternTypeLabel = (patternType: string, channelType: string | undefined) => {
    // Instead of focusing on the channel type, focus on breakout prediction
    return "Breakout Prediction";
  };
  
  const getScannerTypeLabel = () => {
    return scannerType === 'daytrader' ? 'Day Trading' : 'Swing Trading';
  };

  return (
    <div className="pattern-table-container">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-indigo-700 dark:text-indigo-400">Internal Trendline Breakout Signals</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          These internal breakouts predict potential breakouts of higher timeframe channels with {patterns.filter(p => p.confidenceScore >= 75).length} high confidence signals
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Symbol</TableHead>
            <TableHead>Signal Type</TableHead>
            <TableHead>Direction</TableHead>
            <TableHead>Entry TF</TableHead>
            <TableHead>Predicted Breakout TF</TableHead>
            <TableHead>Entry Price</TableHead>
            <TableHead>Target Price</TableHead>
            <TableHead>Confidence</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={10} className="text-center py-8">
                <div className="flex justify-center items-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
                  <span>Loading {getScannerTypeLabel()} predictions...</span>
                </div>
              </TableCell>
            </TableRow>
          ) : patterns.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="text-center py-8">
                <p className="text-muted-foreground">No breakout predictions found.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try changing the timeframe or removing filters to see more results.
                </p>
              </TableCell>
            </TableRow>
          ) : (
            patterns.map((pattern) => (
              <TableRow key={pattern.id} className={isTopPattern(pattern.id) ? 'bg-amber-50' : ''}>
                <TableCell className="font-medium">
                  <div className="flex items-center">
                    {isTopPattern(pattern.id) && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Star className="h-4 w-4 text-amber-500 mr-1.5" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Top breakout prediction with high confidence</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {pattern.symbol}
                  </div>
                </TableCell>
                <TableCell>
                  {pattern.trendlineBreak ? 
                    <span className="text-indigo-600 font-medium">Internal Trendline Break</span> : 
                    "Potential Signal"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    {renderDirectionIcon(pattern.direction)}
                    <span className={`ml-1 ${getDirectionColor(pattern.direction)}`}>
                      {pattern.direction || 'Neutral'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{pattern.timeframe}</TableCell>
                <TableCell>
                  {pattern.higherTimeframe || pattern.confirmingTimeframe || 
                    (pattern.timeframe === '15m' ? '1h' : 
                     pattern.timeframe === '30m' ? '4h' : 
                     pattern.timeframe === '1h' ? '4h' : 
                     pattern.timeframe === '4h' ? 'daily' : 'weekly')}
                </TableCell>
                <TableCell>${pattern.entryPrice?.toFixed(2) || "N/A"}</TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <span>${pattern.targetPrice?.toFixed(2) || "N/A"}</span>
                    {pattern.entryPrice && pattern.targetPrice && (
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "ml-2 text-xs", 
                          pattern.targetPrice > pattern.entryPrice 
                            ? "bg-green-100 text-green-700" 
                            : "bg-red-100 text-red-700"
                        )}
                      >
                        {pattern.targetPrice > pattern.entryPrice ? (
                          <ArrowUp className="h-3 w-3 mr-1" />
                        ) : (
                          <ArrowDown className="h-3 w-3 mr-1" />
                        )}
                        {Math.abs(
                          ((pattern.targetPrice - pattern.entryPrice) / pattern.entryPrice) * 100
                        ).toFixed(1)}%
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div 
                    className={cn(
                      "px-2 py-0.5 rounded-full text-xs inline-flex items-center",
                      pattern.confidenceScore >= 80 
                        ? "bg-green-100 text-green-800" 
                        : pattern.confidenceScore >= 60
                          ? "bg-amber-100 text-amber-800"
                          : "bg-red-100 text-red-800"
                    )}
                  >
                    {pattern.confidenceScore || 0}%
                  </div>
                </TableCell>
                <TableCell>{formatTimeAgo(pattern.createdAt || pattern.lastUpdated || '')}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddToTradeList(pattern)}
                    disabled={!!addingPattern}
                  >
                    {addingPattern === pattern.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Plus className="h-3 w-3" />
                    )}
                    <span className="sr-only">Add to trade list</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default PatternTable;
