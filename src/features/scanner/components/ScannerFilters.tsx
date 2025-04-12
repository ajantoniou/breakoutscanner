import React from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import TimeframeSelector from "@/components/TimeframeSelector";

interface ScannerFiltersProps {
  timeframe: string;
  onTimeframeChange?: (timeframe: string) => void;
  patternTypeFilter?: string;
  setPatternTypeFilter?: (filter: string) => void;
  channelTypeFilter?: string;
  setChannelTypeFilter?: (filter: string) => void;
  emaFilter?: string;
  setEmaFilter?: (filter: string) => void;
  active?: boolean;
  onToggle?: () => void;
  scannerType?: 'daytrader' | 'swing' | 'standard';
}

const ScannerFilters: React.FC<ScannerFiltersProps> = ({
  timeframe,
  onTimeframeChange,
  patternTypeFilter = "all",
  setPatternTypeFilter = () => {},
  channelTypeFilter = "all",
  setChannelTypeFilter = () => {},
  emaFilter = "all",
  setEmaFilter = () => {},
  active = false,
  onToggle = () => {},
  scannerType = 'standard'
}) => {
  console.log("ScannerFilters rendering with timeframe:", timeframe);
  
  const handleTimeframeChange = (newTimeframe: string) => {
    console.log(`ScannerFilters: changing timeframe from ${timeframe} to ${newTimeframe}`);
    if (onTimeframeChange) {
      onTimeframeChange(newTimeframe);
    }
  };

  // Map scanner type to the appropriate scannerType for TimeframeSelector
  const timeframeSelectorType = scannerType === 'standard' ? 'standard' : scannerType;

  return (
    <Card className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div>
          <Label htmlFor="timeframe-selector" className="mb-2 block text-sm font-medium">
            Timeframe
          </Label>
          <TimeframeSelector
            selectedTimeframe={timeframe}
            onTimeframeChange={handleTimeframeChange}
            className="w-full"
            scannerType={timeframeSelectorType}
          />
        </div>

        <div>
          <Label htmlFor="direction-type" className="mb-2 block text-sm font-medium">
            Direction
          </Label>
          <Select
            value={patternTypeFilter}
            onValueChange={setPatternTypeFilter}
          >
            <SelectTrigger id="direction-type">
              <SelectValue placeholder="All Directions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Directions</SelectItem>
              <SelectItem value="bullish">Bullish</SelectItem>
              <SelectItem value="bearish">Bearish</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="channel-type" className="mb-2 block text-sm font-medium">
            Channel Type
          </Label>
          <Select
            value={channelTypeFilter}
            onValueChange={setChannelTypeFilter}
          >
            <SelectTrigger id="channel-type">
              <SelectValue placeholder="All Channels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Channels</SelectItem>
              <SelectItem value="ascending">Ascending</SelectItem>
              <SelectItem value="descending">Descending</SelectItem>
              <SelectItem value="horizontal">Horizontal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="ema-pattern" className="mb-2 block text-sm font-medium">
            EMA Pattern
          </Label>
          <Select value={emaFilter} onValueChange={setEmaFilter}>
            <SelectTrigger id="ema-pattern">
              <SelectValue placeholder="All EMA Patterns" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All EMA Patterns</SelectItem>
              <SelectItem value="allBullish">All Bullish (7 {`>`} 20 {`>`} 50)</SelectItem>
              <SelectItem value="allBearish">All Bearish (7 {`<`} 20 {`<`} 50)</SelectItem>
              <SelectItem value="7over50">7 over 50</SelectItem>
              <SelectItem value="7under50">7 under 50</SelectItem>
              <SelectItem value="mixed">Mixed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );
};

export default ScannerFilters;
