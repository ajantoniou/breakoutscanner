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
  onSetExitAlert?: (pattern: PatternData) => void;
}

const PatternTableContent: React.FC<PatternTableContentProps> = ({ 
  patterns, 
  loading = false, 
  sortField, 
  sortDirection,
  handleSort,
  onAddToTradeList,
  onSetExitAlert
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
              onClick={() => handleSort('pattern_type')}
            >
              Pattern Type {renderSortIndicator('pattern_type')}
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-slate-50"
              onClick={() => handleSort('entry_price')}
            >
              Entry Price {renderSortIndicator('entry_price')}
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-slate-50"
              onClick={() => handleSort('target_price')}
            >
              Target Price {renderSortIndicator('target_price')}
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
                key={pattern.id || `${pattern.symbol}-${pattern.pattern_type}`}
                pattern={pattern}
                onAddToTradeList={onAddToTradeList}
                onSetExitAlert={onSetExitAlert}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default PatternTableContent;
