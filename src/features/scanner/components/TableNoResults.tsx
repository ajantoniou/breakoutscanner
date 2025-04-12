
import React from 'react';

export interface TableNoResultsProps {
  colSpan: number;
  message?: string;
}

const TableNoResults: React.FC<TableNoResultsProps> = ({ 
  colSpan, 
  message = "No results found" 
}) => {
  return (
    <tr>
      <td colSpan={colSpan} className="py-6 text-center">
        <div className="flex flex-col items-center">
          <p className="text-gray-500 mb-1">{message}</p>
        </div>
      </td>
    </tr>
  );
};

export default TableNoResults;
