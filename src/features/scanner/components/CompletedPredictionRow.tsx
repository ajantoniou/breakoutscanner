
import React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { BacktestResult } from "@/services/types/backtestTypes";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/utils/dateConverter";
import { cn } from "@/lib/utils";

interface CompletedPredictionRowProps {
  result: BacktestResult;
}

const CompletedPredictionRow: React.FC<CompletedPredictionRowProps> = ({ result }) => {
  const formatPrice = (price: number | undefined) => {
    if (price === undefined) return "N/A";
    return price.toFixed(2);
  };

  const getDirectionBadge = () => {
    if (result.predictedDirection === 'bullish') {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Bullish</Badge>;
    }
    if (result.predictedDirection === 'bearish') {
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Bearish</Badge>;
    }
    return <Badge variant="outline">Neutral</Badge>;
  };

  const getActualDirectionBadge = () => {
    if (result.actualDirection === 'bullish') {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Bullish</Badge>;
    }
    if (result.actualDirection === 'bearish') {
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Bearish</Badge>;
    }
    return <Badge variant="outline">Neutral</Badge>;
  };

  const getRowStyle = () => {
    if (result.successful) return "hover:bg-green-50";
    return "hover:bg-red-50";
  };
  
  const entryDateFormatted = formatDate(result.entryDate);
  const exitDateFormatted = formatDate(result.exitDate);

  return (
    <TableRow className={cn("text-xs", getRowStyle())}>
      <TableCell className="font-medium">{result.symbol}</TableCell>
      <TableCell>{result.timeframe}</TableCell>
      <TableCell>{result.patternType}</TableCell>
      <TableCell>{getDirectionBadge()}</TableCell>
      <TableCell>{getActualDirectionBadge()}</TableCell>
      <TableCell>${formatPrice(result.entryPrice)}</TableCell>
      <TableCell>${formatPrice(result.actualExitPrice)}</TableCell>
      <TableCell>{entryDateFormatted}</TableCell>
      <TableCell>{exitDateFormatted}</TableCell>
      <TableCell>{result.candlesToBreakout}</TableCell>
      <TableCell className={cn(
        result.profitLossPercent >= 0 ? "text-green-600" : "text-red-600",
        "font-medium"
      )}>
        {result.profitLossPercent.toFixed(2)}%
      </TableCell>
      <TableCell>
        <Badge variant={result.successful ? "success" : "destructive"}>
          {result.successful ? "Success" : "Failed"}
        </Badge>
      </TableCell>
    </TableRow>
  );
};

export default CompletedPredictionRow;
