
import React from 'react';
import TradeList from "@/components/scanner/TradeList";
import { TradeListItem } from "@/services/types/tradeTypes";

interface ScannerTradeListProps {
  activeTrades: TradeListItem[];
  onRemoveTrade: (id: string) => void;
  onCompleteTrade: (tradeId: string, exitPrice: number) => void;
}

const ScannerTradeList: React.FC<ScannerTradeListProps> = ({
  activeTrades,
  onRemoveTrade,
  onCompleteTrade
}) => {
  return (
    <TradeList 
      trades={activeTrades}
      onRemoveTrade={onRemoveTrade}
      onCompleteTrade={onCompleteTrade}
    />
  );
};

export default ScannerTradeList;
