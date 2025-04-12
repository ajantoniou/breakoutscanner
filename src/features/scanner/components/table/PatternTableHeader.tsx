
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
          className="w-[80px] cursor-pointer"
          onClick={() => handleSort('currentPrice')}
        >
          Price {renderSortIndicator('currentPrice')}
        </TableHead>
        <TableHead 
          className="cursor-pointer"
          onClick={() => handleSort('channelType')}
        >
          Channel {renderSortIndicator('channelType')}
        </TableHead>
        <TableHead>Support</TableHead>
        <TableHead>Resistance</TableHead>
        <TableHead 
          className="cursor-pointer"
          onClick={() => handleSort('rsi')}
        >
          RSI {renderSortIndicator('rsi')}
        </TableHead>
        <TableHead>ATR</TableHead>
        <TableHead>EMAs</TableHead>
        <TableHead>Volume</TableHead>
        <TableHead 
          className="cursor-pointer"
          onClick={() => handleSort('direction')}
        >
          Direction {renderSortIndicator('direction')}
        </TableHead>
        <TableHead 
          className="cursor-pointer"
          onClick={() => handleSort('confidenceScore')}
        >
          Confidence {renderSortIndicator('confidenceScore')}
        </TableHead>
        <TableHead>Target</TableHead>
        <TableHead>Action</TableHead>
      </TableRow>
    </TableHeader>
  );
};

export default PatternTableHeader;
