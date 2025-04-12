import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableHeader,
  TableRow,
  TableHead,
  TableCell
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { BacktestResult } from "@/services/backtesting/backtestTypes";
import { ArrowUpDown, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import TableRowLoading from "@/components/scanner/TableRowLoading";
import TableNoResults from "@/components/scanner/TableNoResults";

interface BacktestResultsTableProps {
  backtestResults: BacktestResult[];
  loading?: boolean;
}

const BacktestResultsTable: React.FC<BacktestResultsTableProps> = ({ 
  backtestResults,
  loading = false
}) => {
  const [sortField, setSortField] = useState<keyof BacktestResult>("profitLossPercent");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const handleSort = (field: keyof BacktestResult) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedResults = [...backtestResults].sort((a, b) => {
    if (sortField === "entryDate" || sortField === "exitDate") {
      return sortDirection === "asc"
        ? new Date(a[sortField]).getTime() - new Date(b[sortField]).getTime()
        : new Date(b[sortField]).getTime() - new Date(a[sortField]).getTime();
    }

    if (typeof a[sortField] === "string" && typeof b[sortField] === "string") {
      return sortDirection === "asc"
        ? (a[sortField] as string).localeCompare(b[sortField] as string)
        : (b[sortField] as string).localeCompare(a[sortField] as string);
    }

    return sortDirection === "asc"
      ? Number(a[sortField]) - Number(b[sortField])
      : Number(b[sortField]) - Number(a[sortField]);
  });

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="rounded-md border bg-white shadow-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Symbol</TableHead>
            <TableHead>Pattern Type</TableHead>
            <TableHead className="hidden md:table-cell">Timeframe</TableHead>
            <TableHead 
              className="cursor-pointer"
              onClick={() => handleSort("entryDate")}
            >
              <div className="flex items-center">
                Entry Date
                <ArrowUpDown className="ml-1 h-4 w-4" />
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer"
              onClick={() => handleSort("candlesToBreakout")}
            >
              <div className="flex items-center">
                Candles to Breakout
                <ArrowUpDown className="ml-1 h-4 w-4" />
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer hidden md:table-cell"
              onClick={() => handleSort("successful")}
            >
              <div className="flex items-center">
                Result
                <ArrowUpDown className="ml-1 h-4 w-4" />
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer"
              onClick={() => handleSort("profitLossPercent")}
            >
              <div className="flex items-center">
                Return
                <ArrowUpDown className="ml-1 h-4 w-4" />
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        
        <TableBody>
          {loading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <TableRowLoading key={`loading-${index}`} colSpan={7} />
            ))
          ) : sortedResults.length === 0 ? (
            <TableNoResults 
              colSpan={7} 
              message="No backtest results available. Try changing timeframe or refreshing data." 
            />
          ) : (
            sortedResults.map((result) => (
              <TableRow key={result.patternId}>
                <TableCell className="font-medium">{result.symbol}</TableCell>
                <TableCell>{result.patternType}</TableCell>
                <TableCell className="hidden md:table-cell">{result.timeframe}</TableCell>
                <TableCell>{formatDate(result.entryDate)}</TableCell>
                <TableCell>{result.candlesToBreakout}</TableCell>
                <TableCell className="hidden md:table-cell">
                  {result.successful ? (
                    <span className="flex items-center text-green-600">
                      <TrendingUp className="mr-1 h-4 w-4" />
                      Success
                    </span>
                  ) : (
                    <span className="flex items-center text-red-600">
                      <TrendingDown className="mr-1 h-4 w-4" />
                      Failed
                    </span>
                  )}
                </TableCell>
                <TableCell
                  className={cn(
                    "font-medium",
                    result.profitLossPercent > 0 
                      ? "text-green-600" 
                      : "text-red-600"
                  )}
                >
                  {result.profitLossPercent > 0 ? "+" : ""}
                  {result.profitLossPercent}%
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default BacktestResultsTable;
