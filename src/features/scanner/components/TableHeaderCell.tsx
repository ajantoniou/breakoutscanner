
import React from "react";
import { TableHead } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { PatternData } from "@/services/types/patternTypes";

interface TableHeaderCellProps {
  field: keyof PatternData;
  label: string;
  sortField: keyof PatternData;
  onSort: (field: keyof PatternData) => void;
  className?: string;
}

const TableHeaderCell: React.FC<TableHeaderCellProps> = ({ 
  field, 
  label, 
  sortField, 
  onSort, 
  className 
}) => {
  const isActive = sortField === field;
  
  return (
    <TableHead className={cn("bg-slate-50 text-slate-600", className)}>
      <Button
        variant="ghost"
        onClick={() => onSort(field)}
        className={cn(
          "font-medium h-auto py-3 hover:bg-slate-100",
          isActive && "text-slate-900"
        )}
      >
        {label}
        <ArrowUpDown className={cn(
          "ml-2 h-4 w-4",
          isActive ? "text-slate-900" : "text-slate-400"
        )} />
      </Button>
    </TableHead>
  );
};

export default TableHeaderCell;
