import React from 'react';
import { PatternData } from '@/services/types/patternTypes';
import { BacktestResult } from '@/services/types/backtestTypes';
import { Table, TableBody } from "@/components/ui/table";
import PatternTableHeader from './PatternTableHeader';
import PatternRowItem from './PatternRowItem';
import TableRowLoading from './TableRowLoading';
import TableNoResults from './TableNoResults';
import { ScrollArea } from "@/components/ui/scroll-area";

interface PatternsListProps {
  patterns: PatternData[];
  loading: boolean;
  backtestResults: BacktestResult[];
  realTimeQuotes?: Record<string, any>;
}

const PatternsList: React.FC<PatternsListProps> = ({
  patterns,
  loading,
  backtestResults,
  realTimeQuotes = {}
}) => {
  if (patterns.length === 0 && !loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">No patterns match your current filters</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Try adjusting your filters or timeframe</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <ScrollArea className="h-[600px]" orientation="both">
        <div className="min-w-max">
          <Table>
            <PatternTableHeader 
              sortField="symbol" 
              handleSort={() => {}} 
            />
            
            <TableBody className="divide-y divide-slate-100 dark:divide-gray-700">
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRowLoading key={`loading-${index}`} colSpan={14} />
                ))
              ) : patterns.length === 0 ? (
                <TableNoResults 
                  colSpan={14} 
                  message="No patterns found. Try changing your filters or refreshing data." 
                />
              ) : (
                patterns.map((pattern) => (
                  <PatternRowItem 
                    key={pattern.id} 
                    pattern={pattern}
                    backtestResults={backtestResults.filter(result => result.patternId === pattern.id)}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </ScrollArea>
    </div>
  );
};

export default PatternsList;
