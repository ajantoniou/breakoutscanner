import React from "react";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, CheckCircle2 } from "lucide-react";

export const renderConfidenceBadge = (score: number) => {
  let variant: "default" | "secondary" | "destructive" | "outline" = "outline";
  
  if (score >= 80) {
    variant = "default"; // Green
  } else if (score >= 60) {
    variant = "secondary"; // Yellow/Orange
  } else {
    variant = "destructive"; // Red
  }
  
  return (
    <Badge variant={variant}>
      {score}%
    </Badge>
  );
};

export const renderDirectionBadge = (direction: string) => {
  if (direction === 'bullish') {
    return (
      <Badge variant="default" className="flex items-center gap-1">
        <TrendingUp className="h-3 w-3" />
        Bullish
      </Badge>
    );
  } 
  
  if (direction === 'bearish') {
    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        <TrendingDown className="h-3 w-3" />
        Bearish
      </Badge>
    );
  }
  
  return <Badge variant="outline">Neutral</Badge>;
};

export const renderChannelBadge = (channelType: string) => {
  return (
    <Badge variant={
      channelType === 'ascending' ? 'default' :
      channelType === 'descending' ? 'destructive' :
      'secondary'
    }>
      {channelType}
    </Badge>
  );
};

export const renderVolumeBadge = (increasing: boolean, percent: number) => {
  return (
    <Badge variant={increasing ? 'default' : 'destructive'}>
      {increasing ? '+' : '−'}
      {Math.abs(percent)}%
    </Badge>
  );
};

export const renderRsiBadge = (rsi: number) => {
  return (
    <Badge variant={
      rsi > 70 ? 'destructive' :
      rsi < 30 ? 'default' :
      'outline'
    }>
      {rsi}
    </Badge>
  );
};

/**
 * Renders a badge indicating multi-timeframe confirmation
 * @param confirmed Whether the pattern is confirmed in a higher timeframe
 * @param confirmingTimeframe The timeframe that confirms the pattern
 * @returns Badge component showing confirmation status
 */
export const renderMultiTimeframeBadge = (confirmed?: boolean, confirmingTimeframe?: string | null) => {
  if (!confirmed) {
    return <Badge variant="outline" className="font-normal">Single TF</Badge>;
  }
  
  return (
    <Badge variant="default" className="bg-indigo-600 text-white flex items-center gap-1 font-medium">
      <CheckCircle2 className="h-3 w-3" />
      Confirmed {confirmingTimeframe && `(${confirmingTimeframe})`}
    </Badge>
  );
};
