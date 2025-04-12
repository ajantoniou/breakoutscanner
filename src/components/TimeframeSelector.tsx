import React, { useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

// Constants for our different timeframe groups
const DAY_TRADING_TIMEFRAMES = ["1min", "5min", "15min", "30min", "1hour"];
const SWING_TRADING_TIMEFRAMES = ["4hour", "daily", "weekly"];
const ALL_TIMEFRAMES = ["1min", "5min", "15min", "30min", "1hour", "4hour", "daily", "weekly"];

export interface TimeframeSelectorProps {
  value?: string;
  onChange?: (value: string) => void;
  selectedTimeframe?: string;
  onTimeframeChange?: (timeframe: string) => void;
  timeframes?: string[];
  className?: string;
  scannerType?: 'daytrader' | 'swing' | 'standard';
}

const TimeframeSelector: React.FC<TimeframeSelectorProps> = ({ 
  value, 
  onChange,
  selectedTimeframe,
  onTimeframeChange,
  timeframes,
  className,
  scannerType = 'standard'
}) => {
  // Determine which timeframes to use based on props and scanner type
  let effectiveTimeframes: string[] = timeframes || [];
  
  if (effectiveTimeframes.length === 0) {
    if (scannerType === 'daytrader') {
      effectiveTimeframes = DAY_TRADING_TIMEFRAMES;
    } else if (scannerType === 'swing') {
      effectiveTimeframes = SWING_TRADING_TIMEFRAMES;
    } else {
      effectiveTimeframes = ALL_TIMEFRAMES;
    }
  }

  // Ensure the selected timeframe is valid for the current scannerType
  useEffect(() => {
    const currentValue = value || selectedTimeframe;
    if (currentValue && scannerType === 'daytrader' && !DAY_TRADING_TIMEFRAMES.includes(currentValue)) {
      // If we're in day scanner and timeframe isn't in day timeframes, default to 15min
      const defaultDayTimeframe = '15min';
      if (onChange) onChange(defaultDayTimeframe);
      if (onTimeframeChange) onTimeframeChange(defaultDayTimeframe);
    } else if (currentValue && scannerType === 'swing' && !SWING_TRADING_TIMEFRAMES.includes(currentValue)) {
      // If we're in swing scanner and timeframe isn't in swing timeframes, default to daily
      const defaultSwingTimeframe = 'daily';
      if (onChange) onChange(defaultSwingTimeframe);
      if (onTimeframeChange) onTimeframeChange(defaultSwingTimeframe);
    }
  }, [scannerType, value, selectedTimeframe, onChange, onTimeframeChange]);
  
  const handleTimeframeChange = (newValue: string) => {
    if (onChange) onChange(newValue);
    if (onTimeframeChange) onTimeframeChange(newValue);
  };

  // Default value based on scanner type
  const defaultTimeframe = scannerType === 'swing' ? 'daily' : '15min';
  let timeframeValue = value || selectedTimeframe || defaultTimeframe;
  
  // Ensure timeframeValue is valid for the current scanner type
  if (scannerType === 'daytrader' && !DAY_TRADING_TIMEFRAMES.includes(timeframeValue)) {
    timeframeValue = '15min';
  } else if (scannerType === 'swing' && !SWING_TRADING_TIMEFRAMES.includes(timeframeValue)) {
    timeframeValue = 'daily';
  }
  
  // Format timeframe for display
  const formatTimeframe = (tf: string): string => {
    switch (tf) {
      case '1min': return '1 Minute';
      case '5min': return '5 Minutes';
      case '15min': return '15 Minutes';
      case '30min': return '30 Minutes';
      case '1hour': return '1 Hour';
      case '4hour': return '4 Hours';
      case 'daily': return 'Daily';
      case 'weekly': return 'Weekly';
      default: return tf.charAt(0).toUpperCase() + tf.slice(1);
    }
  };
  
  return (
    <div className={`space-y-2 ${className || ''}`}>
      <Label htmlFor="timeframe">Timeframe</Label>
      <Select 
        value={timeframeValue} 
        onValueChange={handleTimeframeChange}
      >
        <SelectTrigger id="timeframe" className="w-full">
          <SelectValue placeholder="Select timeframe" />
        </SelectTrigger>
        <SelectContent>
          {effectiveTimeframes.map((timeframe) => (
            <SelectItem key={timeframe} value={timeframe}>
              {formatTimeframe(timeframe)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default TimeframeSelector;
