
import React from "react";
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PatternData } from "@/services/types/patternTypes";
import { ArrowDown, ArrowUp } from "lucide-react";

interface PatternTableHeaderProps {
  sortField: keyof PatternData;
  handleSort: (field: keyof PatternData) => void;
}

const PatternTableHeader: React.FC<PatternTableHeaderProps> = ({ 
  sortField, 
  handleSort 
}) => {
  const SortIndicator = ({ field }: { field: keyof PatternData }) => {
    if (sortField === field) {
      return <ArrowDown className="ml-1 h-4 w-4 inline" />;
    }
    return null;
  };

  return (
    <TableHeader>
      <TableRow className="bg-slate-50 text-xs font-medium text-slate-600">
        <TableHead 
          className="w-28 px-4 py-3 cursor-pointer hover:bg-slate-100"
          onClick={() => handleSort('symbol')}
        >
          Symbol <SortIndicator field="symbol" />
        </TableHead>
        
        <TableHead 
          className="w-24 px-4 py-3 cursor-pointer hover:bg-slate-100"
          onClick={() => handleSort('timeframe')}
        >
          Timeframe <SortIndicator field="timeframe" />
        </TableHead>
        
        <TableHead 
          className="w-20 px-4 py-3 cursor-pointer hover:bg-slate-100"
          onClick={() => handleSort('direction')}
        >
          Direction <SortIndicator field="direction" />
        </TableHead>
        
        <TableHead 
          className="w-28 px-4 py-3 cursor-pointer hover:bg-slate-100"
          onClick={() => handleSort('entryPrice')}
        >
          Entry Price <SortIndicator field="entryPrice" />
        </TableHead>
        
        <TableHead 
          className="w-28 px-4 py-3 cursor-pointer hover:bg-slate-100"
          onClick={() => handleSort('targetPrice')}
        >
          Target Price <SortIndicator field="targetPrice" />
        </TableHead>
        
        <TableHead 
          className="w-24 px-4 py-3 cursor-pointer hover:bg-slate-100"
          onClick={() => handleSort('rsi')}
        >
          RSI <SortIndicator field="rsi" />
        </TableHead>
        
        <TableHead 
          className="w-24 px-4 py-3 cursor-pointer hover:bg-slate-100"
          onClick={() => handleSort('atr')}
        >
          ATR <SortIndicator field="atr" />
        </TableHead>
        
        <TableHead 
          className="w-32 px-4 py-3 cursor-pointer hover:bg-slate-100"
          onClick={() => handleSort('supportLevel')}
        >
          Support <SortIndicator field="supportLevel" />
        </TableHead>
        
        <TableHead 
          className="w-32 px-4 py-3 cursor-pointer hover:bg-slate-100"
          onClick={() => handleSort('resistanceLevel')}
        >
          Resistance <SortIndicator field="resistanceLevel" />
        </TableHead>
        
        <TableHead 
          className="w-32 px-4 py-3 cursor-pointer hover:bg-slate-100"
          onClick={() => handleSort('trendlineSupport')}
        >
          Trendline Support <SortIndicator field="trendlineSupport" />
        </TableHead>
        
        <TableHead 
          className="w-32 px-4 py-3 cursor-pointer hover:bg-slate-100"
          onClick={() => handleSort('trendlineResistance')}
        >
          Trendline Resistance <SortIndicator field="trendlineResistance" />
        </TableHead>
        
        <TableHead 
          className="w-28 px-4 py-3 cursor-pointer hover:bg-slate-100"
          onClick={() => handleSort('volumeConfirmation')}
        >
          Volume Confirmation <SortIndicator field="volumeConfirmation" />
        </TableHead>
        
        <TableHead className="w-20 px-4 py-3 text-right">
          Actions
        </TableHead>
      </TableRow>
    </TableHeader>
  );
};

export default PatternTableHeader;
