
import React from "react";
import { PatternData } from "@/services/types/patternTypes";
import PatternRowItem from "./PatternRowItem";

interface PatternTableRowProps {
  pattern: PatternData;
  onAddToTradeList?: (pattern: PatternData) => void;
}

const PatternTableRow: React.FC<PatternTableRowProps> = ({ 
  pattern,
  onAddToTradeList
}) => {
  return (
    <PatternRowItem 
      pattern={pattern}
      onAddToTradeList={onAddToTradeList}
    />
  );
};

export default PatternTableRow;
