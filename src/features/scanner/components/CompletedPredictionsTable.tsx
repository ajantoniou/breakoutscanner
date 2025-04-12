import React from "react";
import { Table, TableBody, TableHeader, TableRow } from "@/components/ui/table";
import { BacktestResult } from "@/services/types/backtestTypes";
import BacktestTableHeaderCell from "./BacktestTableHeaderCell";
import TableRowLoading from "./TableRowLoading";
import TableNoResults from "./TableNoResults";
import CompletedPredictionRow from "./CompletedPredictionRow";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PatternData } from "@/services/types/patternTypes";
import { ensureDateString } from "@/utils/dateConverter";

interface CompletedPredictionsTableProps {
  completedPatterns: PatternData[];
  loading?: boolean;
  backtestResults?: BacktestResult[];
}

const CompletedPredictionsTable: React.FC<CompletedPredictionsTableProps> = ({ 
  completedPatterns, 
  loading = false,
  backtestResults = [] 
}) => {
  const [sortField, setSortField] = React.useState<keyof BacktestResult>("exitDate");
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("desc");
  
  const handleSort = (field: keyof BacktestResult) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };
  
  const ensureDirection = (direction: string | undefined): "bullish" | "bearish" => {
    if (direction === "bullish" || direction === "up") return "bullish";
    if (direction === "bearish" || direction === "down") return "bearish";
    return "bullish"; // Default
  };
  
  const results = completedPatterns.map(pattern => {
    const matchingResult = backtestResults.find(r => r.patternId === pattern.id);
    
    if (matchingResult) {
      return matchingResult;
    }
    
    const result: BacktestResult = {
      patternId: pattern.id,
      symbol: pattern.symbol,
      patternType: pattern.patternType,
      timeframe: pattern.timeframe,
      entryPrice: pattern.entryPrice,
      targetPrice: pattern.targetPrice,
      entryDate: ensureDateString(pattern.createdAt) || new Date().toISOString(),
      exitDate: new Date().toISOString(),
      actualExitPrice: 0,
      profitLossPercent: 0,
      candlesToBreakout: 0,
      successful: false,
      predictedDirection: ensureDirection(pattern.direction),
      actualDirection: ensureDirection(pattern.direction),
      profitLoss: 0,
      maxDrawdown: 0
    };
    
    return result;
  });
  
  const sortedResults = [...results].sort((a, b) => {
    if (sortField === "exitDate" || sortField === "entryDate") {
      const aDate = new Date(a[sortField]).getTime();
      const bDate = new Date(b[sortField]).getTime();
      return sortDirection === "asc" ? aDate - bDate : bDate - aDate;
    }
    
    if (typeof a[sortField] === "number" && typeof b[sortField] === "number") {
      return sortDirection === "asc" 
        ? (a[sortField] as number) - (b[sortField] as number) 
        : (b[sortField] as number) - (a[sortField] as number);
    }
    
    if (typeof a[sortField] === "string" && typeof b[sortField] === "string") {
      return sortDirection === "asc"
        ? (a[sortField] as string).localeCompare(b[sortField] as string)
        : (b[sortField] as string).localeCompare(a[sortField] as string);
    }
    
    return 0;
  });
  
  return (
    <div className="rounded-md border border-slate-200 bg-white shadow-md overflow-hidden">
      <ScrollArea className="h-[600px]" orientation="both">
        <div className="min-w-max">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-slate-50">
              <TableRow>
                <BacktestTableHeaderCell 
                  field="symbol" 
                  label="Symbol" 
                  sortField={sortField} 
                  sortDirection={sortDirection}
                  onSort={() => handleSort("symbol")} 
                  className="w-[8%]"
                />
                <BacktestTableHeaderCell 
                  field="patternType" 
                  label="Pattern Type" 
                  sortField={sortField} 
                  sortDirection={sortDirection}
                  onSort={() => handleSort("patternType")} 
                  className="w-[8%]"
                />
                <BacktestTableHeaderCell 
                  field="timeframe" 
                  label="Timeframe" 
                  sortField={sortField} 
                  sortDirection={sortDirection}
                  onSort={() => handleSort("timeframe")} 
                  className="w-[8%]"
                />
                <BacktestTableHeaderCell 
                  field="entryPrice" 
                  label="Entry Price" 
                  sortField={sortField} 
                  sortDirection={sortDirection}
                  onSort={() => handleSort("entryPrice")} 
                  className="w-[10%]"
                />
                <BacktestTableHeaderCell 
                  field="targetPrice" 
                  label="Target Price" 
                  sortField={sortField} 
                  sortDirection={sortDirection}
                  onSort={() => handleSort("targetPrice")} 
                  className="w-[10%]"
                />
                <BacktestTableHeaderCell 
                  field="actualExitPrice" 
                  label="Exit Price" 
                  sortField={sortField} 
                  sortDirection={sortDirection}
                  onSort={() => handleSort("actualExitPrice")} 
                  className="w-[10%]"
                />
                <BacktestTableHeaderCell 
                  field="profitLossPercent" 
                  label="P/L %" 
                  sortField={sortField} 
                  sortDirection={sortDirection}
                  onSort={() => handleSort("profitLossPercent")} 
                  className="w-[8%]"
                />
                <BacktestTableHeaderCell 
                  field="entryDate" 
                  label="Entry Date" 
                  sortField={sortField} 
                  sortDirection={sortDirection}
                  onSort={() => handleSort("entryDate")} 
                  className="w-[10%]"
                />
                <BacktestTableHeaderCell 
                  field="exitDate" 
                  label="Exit Date" 
                  sortField={sortField} 
                  sortDirection={sortDirection}
                  onSort={() => handleSort("exitDate")} 
                  className="w-[10%]"
                />
                <BacktestTableHeaderCell 
                  field="successful" 
                  label="Result" 
                  sortField={sortField} 
                  sortDirection={sortDirection}
                  onSort={() => handleSort("successful")} 
                  className="w-[8%]"
                />
              </TableRow>
            </TableHeader>
            
            <TableBody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 10 }).map((_, index) => (
                  <TableRowLoading key={`loading-${index}`} colSpan={10} />
                ))
              ) : results.length === 0 ? (
                <TableNoResults 
                  colSpan={10} 
                  message="No completed predictions found. Patterns need to be analyzed before predictions can be completed." 
                />
              ) : (
                results.map((result) => (
                  <CompletedPredictionRow key={result.patternId} result={result} />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </ScrollArea>
    </div>
  );
};

export default CompletedPredictionsTable;
