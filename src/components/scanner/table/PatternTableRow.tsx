import React from "react";
import { PatternData } from "@/services/types/patternTypes";
import PatternRowItem from "./PatternRowItem";

interface PatternTableRowProps {
  pattern: PatternData;
  onAddToTradeList?: (pattern: PatternData) => void;
  onSetExitAlert?: (pattern: PatternData) => void;
}

const PatternTableRow: React.FC<PatternTableRowProps> = ({ 
  pattern,
  onAddToTradeList,
  onSetExitAlert
}) => {
  return (
    <PatternRowItem 
      pattern={pattern}
      onAddToTradeList={onAddToTradeList}
      onSetExitAlert={onSetExitAlert}
    />
  );
};

export default PatternTableRow;
