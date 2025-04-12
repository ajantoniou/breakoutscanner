
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Filter, RotateCcw, Save } from 'lucide-react';
import TimeframeSelector from '@/components/TimeframeSelector';
import FilterPresetsManager from './container/FilterPresetsManager';

export interface ScannerFilterPreset {
  id: string;
  name: string;
  patternTypes: string[];
  channelTypes: string[];
  emaPatterns: string[];
  timeframe: string;
  createdAt: string;
}

export interface EnhancedScannerFiltersProps {
  timeframe: string;
  onTimeframeChange: (timeframe: string) => void;
  patternTypeFilter: string;
  setPatternTypeFilter: (filter: string) => void;
  channelTypeFilter: string;
  setChannelTypeFilter: (filter: string) => void;
  emaFilter: string;
  setEmaFilter: (filter: string) => void;
  onRefresh: () => void;
  isLoading?: boolean;
  savedFilterPresets?: ScannerFilterPreset[];
  activePresetId?: string | null;
  saveFilterPreset?: (preset: Omit<ScannerFilterPreset, "id" | "createdAt">) => ScannerFilterPreset;
  setActivePreset?: (presetId: string) => void;
  deleteFilterPreset?: (presetId: string) => Promise<void>;
  timeframeOptions?: string[];
  scannerType?: 'standard' | 'daytrader' | 'swing';
}

const directionTypes = [
  { value: 'all', label: 'All Directions' },
  { value: 'bullish', label: 'Bullish' },
  { value: 'bearish', label: 'Bearish' }
];

const channelTypes = [
  { value: 'all', label: 'All Channels' },
  { value: 'horizontal', label: 'Horizontal' },
  { value: 'ascending', label: 'Ascending' },
  { value: 'descending', label: 'Descending' }
];

const emaPatterns = [
  { value: 'all', label: 'All EMA Patterns' },
  { value: 'allBullish', label: 'All EMAs Bullish' },
  { value: 'allBearish', label: 'All EMAs Bearish' },
  { value: '7over50', label: '7 EMA > 50 EMA' },
  { value: '7over100', label: '7 EMA > 100 EMA' },
  { value: '50over100', label: '50 EMA > 100 EMA' },
  { value: 'mixed', label: 'Mixed EMAs' }
];

// Update default timeframes to match our scanner type constraints
const DEFAULT_TIMEFRAMES = [
  '1min', '5min', '15min', '30min', 'hourly', 'daily', 'weekly'
];

const DAY_TRADING_TIMEFRAMES = ['1min', '5min', '15min', '30min', '1hour'];
const SWING_TRADING_TIMEFRAMES = ['4hour', 'daily', 'weekly'];

const EnhancedScannerFilters: React.FC<EnhancedScannerFiltersProps> = ({
  timeframe,
  onTimeframeChange,
  patternTypeFilter = "all",
  setPatternTypeFilter = () => {},
  channelTypeFilter = "all",
  setChannelTypeFilter = () => {},
  emaFilter = "all",
  setEmaFilter = () => {},
  onRefresh,
  isLoading = false,
  savedFilterPresets = [],
  activePresetId,
  saveFilterPreset,
  setActivePreset,
  deleteFilterPreset,
  timeframeOptions,
  scannerType = 'standard'
}) => {
  // Select the appropriate timeframes based on scanner type if not explicitly provided
  const effectiveTimeframeOptions = timeframeOptions || 
    (scannerType === 'daytrader' ? DAY_TRADING_TIMEFRAMES : 
     scannerType === 'swing' ? SWING_TRADING_TIMEFRAMES : 
     DEFAULT_TIMEFRAMES);
     
  const [showFilterPresetsManager, setShowFilterPresetsManager] = useState(false);
  
  const handleSetPatternType = (pattern: string) => {
    setPatternTypeFilter(pattern);
  };
  
  const handleSetChannelType = (channelType: string) => {
    setChannelTypeFilter(channelType);
  };
  
  const handleSetEmaPattern = (emaPattern: string) => {
    setEmaFilter(emaPattern);
  };
  
  const handleSaveCurrentPreset = () => {
    if (saveFilterPreset) {
      saveFilterPreset({
        name: `${timeframe} - ${patternTypeFilter !== 'all' ? patternTypeFilter : 'All directions'}`,
        patternTypes: patternTypeFilter === 'all' ? [] : [patternTypeFilter],
        channelTypes: channelTypeFilter === 'all' ? [] : [channelTypeFilter],
        emaPatterns: emaFilter === 'all' ? [] : [emaFilter],
        timeframe: timeframe
      });
    }
  };
  
  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <TimeframeSelector
              selectedTimeframe={timeframe}
              onTimeframeChange={onTimeframeChange}
              className="mb-4"
              timeframes={effectiveTimeframeOptions}
            />
            
            <div className="flex gap-2 mt-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onRefresh}
                disabled={isLoading}
                className="w-full"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowFilterPresetsManager(true)}
                className="w-full"
              >
                <Filter className="h-4 w-4 mr-2" />
                Presets
              </Button>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium mb-2">Direction</h3>
            <div className="flex flex-wrap gap-1">
              {directionTypes.map(direction => (
                <Badge 
                  key={direction.value}
                  variant={patternTypeFilter === direction.value ? "default" : "outline"}
                  className="cursor-pointer mb-1"
                  onClick={() => handleSetPatternType(direction.value)}
                >
                  {patternTypeFilter === direction.value && <Check className="h-3 w-3 mr-1" />}
                  {direction.label}
                </Badge>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium mb-2">Channel Type</h3>
            <div className="flex flex-wrap gap-1">
              {channelTypes.map(channel => (
                <Badge 
                  key={channel.value}
                  variant={channelTypeFilter === channel.value ? "default" : "outline"}
                  className="cursor-pointer mb-1"
                  onClick={() => handleSetChannelType(channel.value)}
                >
                  {channelTypeFilter === channel.value && <Check className="h-3 w-3 mr-1" />}
                  {channel.label}
                </Badge>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium mb-2">EMA Pattern</h3>
            <div className="flex flex-wrap gap-1">
              {emaPatterns.map(ema => (
                <Badge 
                  key={ema.value}
                  variant={emaFilter === ema.value ? "default" : "outline"}
                  className="cursor-pointer mb-1"
                  onClick={() => handleSetEmaPattern(ema.value)}
                >
                  {emaFilter === ema.value && <Check className="h-3 w-3 mr-1" />}
                  {ema.label}
                </Badge>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium mb-2">Active Filter Preset</h3>
            <div className="flex flex-col gap-2">
              <div className="text-sm">
                {activePresetId ? (
                  <Badge variant="secondary" className="mr-2">
                    {savedFilterPresets.find(p => p.id === activePresetId)?.name || 'Custom'}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">No preset selected</span>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleSaveCurrentPreset}
                  disabled={!saveFilterPreset}
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      
      {showFilterPresetsManager && saveFilterPreset && setActivePreset && deleteFilterPreset && (
        <FilterPresetsManager
          presets={savedFilterPresets}
          activePresetId={activePresetId}
          onSetActivePreset={setActivePreset}
          onDeletePreset={deleteFilterPreset}
          onClose={() => setShowFilterPresetsManager(false)}
          onSavePreset={saveFilterPreset}
          currentFilters={{
            patternTypes: patternTypeFilter === 'all' ? [] : [patternTypeFilter],
            channelTypes: channelTypeFilter === 'all' ? [] : [channelTypeFilter],
            emaPatterns: emaFilter === 'all' ? [] : [emaFilter],
            timeframe
          }}
        />
      )}
    </Card>
  );
};

export default EnhancedScannerFilters;
