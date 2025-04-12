
import React from "react";
import { Table, TableBody, TableHeader, TableHead, TableRow } from "@/components/ui/table";
import { PatternData } from "@/services/types/patternTypes";
import PatternTableRow from "./PatternTableRow";

interface PatternTableContentProps {
  patterns: PatternData[];
  loading?: boolean;
  sortField: keyof PatternData;
  sortDirection: 'asc' | 'desc';
  handleSort: (field: keyof PatternData) => void;
  onAddToTradeList?: (pattern: PatternData) => void;
}

const PatternTableContent: React.FC<PatternTableContentProps> = ({ 
  patterns, 
  loading = false, 
  sortField, 
  sortDirection,
  handleSort,
  onAddToTradeList
}) => {
  // Helper function to render sort indicator
  const renderSortIndicator = (field: keyof PatternData) => {
    if (sortField === field) {
      return sortDirection === 'asc' ? ' ↑' : ' ↓';
    }
    return null;
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead 
              className="cursor-pointer hover:bg-slate-50"
              onClick={() => handleSort('symbol')}
            >
              Symbol {renderSortIndicator('symbol')}
            </TableHead>
            <TableHead>Timeframe</TableHead>
            <TableHead>Direction</TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-slate-50"
              onClick={() => handleSort('patternType')}
            >
              Pattern Type {renderSortIndicator('patternType')}
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-slate-50"
              onClick={() => handleSort('entryPrice')}
            >
              Entry Price {renderSortIndicator('entryPrice')}
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-slate-50"
              onClick={() => handleSort('targetPrice')}
            >
              Target Price {renderSortIndicator('targetPrice')}
            </TableHead>
            <TableHead>RSI</TableHead>
            <TableHead>ATR</TableHead>
            <TableHead>Support</TableHead>
            <TableHead>Resistance</TableHead>
            <TableHead>Trendline Support</TableHead>
            <TableHead>Trendline Resistance</TableHead>
            <TableHead>Volume</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableHead colSpan={14} className="h-24 text-center">
                Loading pattern data...
              </TableHead>
            </TableRow>
          ) : patterns.length === 0 ? (
            <TableRow>
              <TableHead colSpan={14} className="h-24 text-center">
                No patterns found
              </TableHead>
            </TableRow>
          ) : (
            patterns.map((pattern) => (
              <PatternTableRow
                key={pattern.id || `${pattern.symbol}-${pattern.patternType}`}
                pattern={pattern}
                onAddToTradeList={onAddToTradeList}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default PatternTableContent;
