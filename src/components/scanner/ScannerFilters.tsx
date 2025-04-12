/**
 * Scanner Filters Component
 * Provides filtering options for the scanner dashboard
 */

import React from 'react';
import { Box, Slider, Typography, FormControl, InputLabel, Select, MenuItem, Chip, OutlinedInput, SelectChangeEvent } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';

interface ScannerFiltersProps {
  minConfidence: number;
  setMinConfidence: (value: number) => void;
  patternTypes: string[];
  setPatternTypes: (value: string[]) => void;
  availablePatternTypes: string[];
  direction: 'all' | 'bullish' | 'bearish';
  setDirection: (value: 'all' | 'bullish' | 'bearish') => void;
}

const ScannerFilters: React.FC<ScannerFiltersProps> = ({
  minConfidence,
  setMinConfidence,
  patternTypes,
  setPatternTypes,
  availablePatternTypes,
  direction,
  setDirection
}) => {
  // Handle confidence slider change
  const handleConfidenceChange = (event: Event, newValue: number | number[]) => {
    setMinConfidence(newValue as number);
  };

  // Handle pattern type selection change
  const handlePatternTypeChange = (event: SelectChangeEvent<typeof patternTypes>) => {
    const {
      target: { value },
    } = event;
    setPatternTypes(typeof value === 'string' ? value.split(',') : value);
  };

  // Handle direction change
  const handleDirectionChange = (event: SelectChangeEvent) => {
    setDirection(event.target.value as 'all' | 'bullish' | 'bearish');
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Typography id="confidence-slider" gutterBottom>
        Minimum Confidence: {minConfidence}%
      </Typography>
      <Slider
        value={minConfidence}
        onChange={handleConfidenceChange}
        aria-labelledby="confidence-slider"
        valueLabelDisplay="auto"
        step={5}
        marks
        min={50}
        max={100}
      />

      <FormControl fullWidth sx={{ mt: 2 }}>
        <InputLabel id="direction-select-label">Direction</InputLabel>
        <Select
          labelId="direction-select-label"
          id="direction-select"
          value={direction}
          label="Direction"
          onChange={handleDirectionChange}
        >
          <MenuItem value="all">
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TrendingFlatIcon sx={{ mr: 1 }} />
              All Directions
            </Box>
          </MenuItem>
          <MenuItem value="bullish">
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TrendingUpIcon sx={{ mr: 1, color: 'success.main' }} />
              Bullish Only
            </Box>
          </MenuItem>
          <MenuItem value="bearish">
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TrendingDownIcon sx={{ mr: 1, color: 'error.main' }} />
              Bearish Only
            </Box>
          </MenuItem>
        </Select>
      </FormControl>

      <FormControl fullWidth sx={{ mt: 2 }}>
        <InputLabel id="pattern-type-select-label">Pattern Types</InputLabel>
        <Select
          labelId="pattern-type-select-label"
          id="pattern-type-select"
          multiple
          value={patternTypes}
          onChange={handlePatternTypeChange}
          input={<OutlinedInput id="select-multiple-chip" label="Pattern Types" />}
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {selected.map((value) => (
                <Chip key={value} label={value} />
              ))}
            </Box>
          )}
        >
          {availablePatternTypes.map((type) => (
            <MenuItem key={type} value={type}>
              {type}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default ScannerFilters;
