
import React from 'react';

export interface TableRowLoadingProps {
  colSpan?: number; // Making this optional but adding it to the interface
}

const TableRowLoading: React.FC<TableRowLoadingProps> = ({ colSpan = 5 }) => {
  return (
    <tr>
      <td colSpan={colSpan} className="py-3">
        <div className="flex flex-col space-y-2">
          <div className="h-4 bg-gray-100 rounded animate-pulse"></div>
          <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse"></div>
        </div>
      </td>
    </tr>
  );
};

export default TableRowLoading;
