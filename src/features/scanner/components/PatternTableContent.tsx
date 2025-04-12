
import React from "react";
import { Table, TableBody } from "@/components/ui/table";
import { PatternData } from "@/services/types/patternTypes";
import PatternTableHeader from "./PatternTableHeader";
import PatternRowItem from "./PatternRowItem";
import TableRowLoading from "./TableRowLoading";
import TableNoResults from "./TableNoResults";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PatternTableContentProps {
  patterns: PatternData[];
  loading?: boolean;
  realTimeQuotes?: Record<string, any>;
  onAddToTradeList?: (pattern: PatternData) => void;
}

const PatternTableContent: React.FC<PatternTableContentProps> = ({ 
  patterns, 
  loading = false,
  realTimeQuotes = {},
  onAddToTradeList
}) => {
  // Log patterns for debugging
  console.log("PatternTableContent - Patterns received:", patterns?.length || 0, patterns);
  
  return (
    <ScrollArea className="h-[600px]" orientation="both">
      <div className="min-w-max">
        <Table>
          <PatternTableHeader 
            sortField="symbol" 
            handleSort={() => {}} 
          />
          
          <TableBody className="divide-y divide-slate-100">
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
                  onAddToTradeList={onAddToTradeList} 
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </ScrollArea>
  );
};

export default PatternTableContent;
