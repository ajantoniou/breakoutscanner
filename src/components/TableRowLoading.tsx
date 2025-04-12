import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

interface TableRowLoadingProps {
  columns: number;
  className?: string;
}

const TableRowLoading: React.FC<TableRowLoadingProps> = ({ 
  columns = 5,
  className
}) => {
  return (
    <TableRow className={className}>
      {Array.from({ length: columns }).map((_, index) => (
        <TableCell key={index} className="py-2">
          <Skeleton className="h-6 w-full" />
        </TableCell>
      ))}
    </TableRow>
  );
};

export default TableRowLoading; 