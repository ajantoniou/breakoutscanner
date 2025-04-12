
import React from "react";
import { TableHead } from "@/components/ui/table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { BacktestResult } from "@/services/types/backtestTypes";

interface BacktestTableHeaderCellProps {
  field: keyof BacktestResult;
  label: string;
  sortField: keyof BacktestResult;
  sortDirection: "asc" | "desc";
  onSort: () => void;
  className?: string;
}

const BacktestTableHeaderCell: React.FC<BacktestTableHeaderCellProps> = ({
  field,
  label,
  sortField,
  sortDirection,
  onSort,
  className
}) => {
  const isSorted = sortField === field;
  
  return (
    <TableHead 
      className={cn(
        "cursor-pointer select-none whitespace-nowrap", 
        className
      )}
      onClick={onSort}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {isSorted ? (
            sortDirection === "asc" ? (
              <ArrowUp className="h-3.5 w-3.5" />
            ) : (
              <ArrowDown className="h-3.5 w-3.5" />
            )
          ) : (
            <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
          )}
        </span>
      </div>
    </TableHead>
  );
};

export default BacktestTableHeaderCell;
