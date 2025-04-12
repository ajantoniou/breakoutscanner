import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { SearchX } from 'lucide-react';

interface TableNoResultsProps {
  colSpan: number;
  message?: string;
  className?: string;
}

const TableNoResults: React.FC<TableNoResultsProps> = ({ 
  colSpan, 
  message = "No results found", 
  className 
}) => {
  return (
    <TableRow className={className}>
      <TableCell colSpan={colSpan} className="h-24 text-center">
        <div className="flex flex-col items-center justify-center text-muted-foreground">
          <SearchX className="h-8 w-8 mb-2 opacity-50" />
          <span>{message}</span>
        </div>
      </TableCell>
    </TableRow>
  );
};

export default TableNoResults; 