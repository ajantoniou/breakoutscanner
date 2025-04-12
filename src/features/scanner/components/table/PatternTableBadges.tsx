
import React from "react";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";

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
