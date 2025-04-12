import React from "react";
import { TableHeader, TableRow, TableHead } from "@/components/ui/table";
import { ArrowDown, ArrowUp } from "lucide-react";

interface PatternTableHeaderProps {
  sortField: string;
  sortDirection: "asc" | "desc";
  handleSort: (field: string) => void;
}

const PatternTableHeader: React.FC<PatternTableHeaderProps> = ({
  sortField,
  sortDirection,
  handleSort
}) => {
  const renderSortIndicator = (field: string) => {
    if (sortField === field) {
      return sortDirection === 'asc' 
        ? <ArrowUp className="h-3 w-3 ml-1 inline" />
        : <ArrowDown className="h-3 w-3 ml-1 inline" />;
    }
    return null;
  };

  return (
    <TableHeader className="sticky top-0 bg-white z-10">
      <TableRow>
        <TableHead 
          className="w-[80px] cursor-pointer"
          onClick={() => handleSort('symbol')}
        >
          Symbol {renderSortIndicator('symbol')}
        </TableHead>
        <TableHead 
          className="w-[100px] cursor-pointer"
          onClick={() => handleSort('timeframe')}
        >
          Timeframe {renderSortIndicator('timeframe')}
        </TableHead>
        <TableHead 
          className="cursor-pointer"
          onClick={() => handleSort('direction')}
        >
          Direction {renderSortIndicator('direction')}
        </TableHead>
        <TableHead 
          className="cursor-pointer"
          onClick={() => handleSort('patternType')}
        >
          Pattern {renderSortIndicator('patternType')}
        </TableHead>
        <TableHead 
          className="cursor-pointer"
          onClick={() => handleSort('entryPrice')}
        >
          Entry {renderSortIndicator('entryPrice')}
        </TableHead>
        <TableHead 
          className="cursor-pointer"
          onClick={() => handleSort('targetPrice')}
        >
          Target {renderSortIndicator('targetPrice')}
        </TableHead>
        <TableHead 
          className="cursor-pointer"
          onClick={() => handleSort('confidenceScore')}
        >
          Confidence {renderSortIndicator('confidenceScore')}
        </TableHead>
        <TableHead>RSI</TableHead>
        <TableHead>ATR</TableHead>
        <TableHead>Support</TableHead>
        <TableHead>Resistance</TableHead>
        <TableHead>Trendline Support</TableHead>
        <TableHead>Trendline Resistance</TableHead>
        <TableHead>Volume</TableHead>
        <TableHead 
          className="cursor-pointer"
          onClick={() => handleSort('multiTimeframeConfirmed')}
        >
          Actions {renderSortIndicator('multiTimeframeConfirmed')}
        </TableHead>
      </TableRow>
    </TableHeader>
  );
};

export default PatternTableHeader;
