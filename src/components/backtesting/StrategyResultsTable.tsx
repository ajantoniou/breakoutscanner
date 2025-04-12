
import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableHeader,
  TableRow,
  TableHead,
  TableCell
} from "@/components/ui/table";
import { TradeResult } from "@/services/backtesting/strategyTypes";
import { ArrowUpDown, TrendingUp, TrendingDown, Clock, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import TableRowLoading from "../scanner/TableRowLoading";
import TableNoResults from "../scanner/TableNoResults";

interface StrategyResultsTableProps {
  results: TradeResult[];
  loading?: boolean;
}

const StrategyResultsTable: React.FC<StrategyResultsTableProps> = ({ 
  results,
  loading = false
}) => {
  const [sortField, setSortField] = useState<keyof TradeResult>("profitLossPercent");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const handleSort = (field: keyof TradeResult) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedResults = [...results].sort((a, b) => {
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

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString();
  };

  const getExitReasonIcon = (reason: string) => {
    switch(reason) {
      case 'take-profit':
        return <DollarSign className="h-4 w-4 text-green-600" />;
      case 'stop-loss':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'time-stop':
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return <TrendingUp className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <div className="rounded-md border bg-white shadow-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Symbol</TableHead>
            <TableHead>Direction</TableHead>
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
              className="cursor-pointer hidden md:table-cell"
              onClick={() => handleSort("exitDate")}
            >
              <div className="flex items-center">
                Exit Date
                <ArrowUpDown className="ml-1 h-4 w-4" />
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer hidden md:table-cell"
              onClick={() => handleSort("exitReason")}
            >
              <div className="flex items-center">
                Exit Reason
                <ArrowUpDown className="ml-1 h-4 w-4" />
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer"
              onClick={() => handleSort("barsInTrade")}
            >
              <div className="flex items-center">
                Bars
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
              message="No strategy backtest results available." 
            />
          ) : (
            sortedResults.map((result) => (
              <TableRow key={result.setupId}>
                <TableCell className="font-medium">{result.symbol}</TableCell>
                <TableCell>
                  {result.direction === 'long' ? (
                    <span className="flex items-center text-green-600">
                      <TrendingUp className="mr-1 h-4 w-4" />
                      Long
                    </span>
                  ) : (
                    <span className="flex items-center text-red-600">
                      <TrendingDown className="mr-1 h-4 w-4" />
                      Short
                    </span>
                  )}
                </TableCell>
                <TableCell>{formatDate(result.entryDate)}</TableCell>
                <TableCell className="hidden md:table-cell">{formatDate(result.exitDate)}</TableCell>
                <TableCell className="hidden md:table-cell">
                  <span className="flex items-center">
                    {getExitReasonIcon(result.exitReason)}
                    <span className="ml-1 capitalize">
                      {result.exitReason.replace('-', ' ')}
                    </span>
                  </span>
                </TableCell>
                <TableCell>{result.barsInTrade}</TableCell>
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

export default StrategyResultsTable;
