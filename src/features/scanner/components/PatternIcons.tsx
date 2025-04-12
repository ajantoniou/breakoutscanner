
import React from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Layers, 
  ArrowUpRight, 
  ArrowDownRight 
} from "lucide-react";

export const getPatternIcon = (patternType: string) => {
  if (patternType.includes("Bull") || patternType.includes("Bottom") || patternType.includes("Ascending")) {
    return <TrendingUp className="h-4 w-4 text-green-500" />;
  }
  if (patternType.includes("Bear") || patternType.includes("Top") || patternType.includes("Descending")) {
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  }
  return <Activity className="h-4 w-4 text-blue-500" />;
};

export const getChannelIcon = (channelType: string) => {
  if (channelType === "horizontal") {
    return <Layers className="h-4 w-4 text-blue-500" />;
  }
  if (channelType === "ascending") {
    return <ArrowUpRight className="h-4 w-4 text-green-500" />;
  }
  if (channelType === "descending") {
    return <ArrowDownRight className="h-4 w-4 text-red-500" />;
  }
  return <Layers className="h-4 w-4 text-gray-500" />;
};

export const getEMAPatternLabel = (emaPattern: string) => {
  switch(emaPattern) {
    case "7over50": return "7 > 50 EMA";
    case "7over100": return "7 > 100 EMA";
    case "50over100": return "50 > 100 EMA";
    case "allBullish": return "All EMAs Bullish";
    case "allBearish": return "All EMAs Bearish";
    default: return "Mixed EMAs";
  }
};
