import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Grid, 
  TextField, 
  Button, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Typography,
  Slider,
  Chip,
  Stack,
  IconButton
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import ClearIcon from '@mui/icons-material/Clear';
import { BacktestFilter } from '../../services/types/backtestTypes';

interface BacktestResultsFilterProps {
  onApply: (filters: BacktestFilter) => void;
  onCancel: () => void;
  initialFilters?: BacktestFilter;
}

const timeframeOptions = ['1m', '5m', '15m', '30m', '1h', '4h', 'D', 'W', 'M'];
const patternTypeOptions = [
  'Double Top', 'Double Bottom', 'Head and Shoulders', 'Inverse Head and Shoulders',
  'Bull Flag', 'Bear Flag', 'Cup and Handle', 'Rising Wedge', 'Falling Wedge',
  'Triangle', 'Rectangle', 'Channel', 'Fibonacci Retracement'
];
const directionOptions = ['bullish', 'bearish'];

const BacktestResultsFilter: React.FC<BacktestResultsFilterProps> = ({ 
  onApply, 
  onCancel, 
  initialFilters = {} 
}) => {
  const [filters, setFilters] = useState<BacktestFilter>(initialFilters);
  
  const handleChange = (name: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleConfidenceRangeChange = (event: Event, newValue: number | number[]) => {
    const [min, max] = newValue as number[];
    setFilters(prev => ({
      ...prev,
      minConfidence: min,
      maxConfidence: max
    }));
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onApply(filters);
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Filter Backtest Results</Typography>
        <IconButton onClick={handleClearFilters} size="small" title="Clear all filters">
          <ClearIcon />
        </IconButton>
      </Box>
      
      <form onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Symbol"
              fullWidth
              value={filters.symbol || ''}
              onChange={(e) => handleChange('symbol', e.target.value)}
              placeholder="e.g., AAPL"
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id="pattern-type-label">Pattern Type</InputLabel>
              <Select
                labelId="pattern-type-label"
                value={filters.patternType || ''}
                label="Pattern Type"
                onChange={(e) => handleChange('patternType', e.target.value)}
              >
                <MenuItem value="">All Patterns</MenuItem>
                {patternTypeOptions.map(option => (
                  <MenuItem key={option} value={option}>{option}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id="direction-label">Direction</InputLabel>
              <Select
                labelId="direction-label"
                value={filters.direction || ''}
                label="Direction"
                onChange={(e) => handleChange('direction', e.target.value)}
              >
                <MenuItem value="">All Directions</MenuItem>
                {directionOptions.map(option => (
                  <MenuItem key={option} value={option}>{option}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id="timeframe-label">Timeframe</InputLabel>
              <Select
                labelId="timeframe-label"
                value={filters.timeframe || ''}
                label="Timeframe"
                onChange={(e) => handleChange('timeframe', e.target.value)}
              >
                <MenuItem value="">All Timeframes</MenuItem>
                {timeframeOptions.map(option => (
                  <MenuItem key={option} value={option}>{option}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <Typography id="confidence-range-slider" gutterBottom>
              Confidence Score Range
            </Typography>
            <Box sx={{ px: 2 }}>
              <Slider
                value={[
                  filters.minConfidence ?? 0, 
                  filters.maxConfidence ?? 100
                ]}
                onChange={handleConfidenceRangeChange}
                valueLabelDisplay="auto"
                min={0}
                max={100}
                marks={[
                  { value: 0, label: '0%' },
                  { value: 25, label: '25%' },
                  { value: 50, label: '50%' },
                  { value: 75, label: '75%' },
                  { value: 100, label: '100%' }
                ]}
              />
            </Box>
          </Grid>
          
          <Grid item xs={12}>
            <Typography gutterBottom>Date Range</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker 
                    label="From Date"
                    value={filters.dateStart ? new Date(filters.dateStart) : null}
                    onChange={(date) => handleChange('dateStart', date)}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} sm={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker 
                    label="To Date"
                    value={filters.dateEnd ? new Date(filters.dateEnd) : null}
                    onChange={(date) => handleChange('dateEnd', date)}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </LocalizationProvider>
              </Grid>
            </Grid>
          </Grid>
          
          <Grid item xs={12}>
            <Typography gutterBottom>Active Filters:</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {filters.symbol && (
                <Chip 
                  label={`Symbol: ${filters.symbol}`} 
                  onDelete={() => handleChange('symbol', '')}
                />
              )}
              {filters.patternType && (
                <Chip 
                  label={`Pattern: ${filters.patternType}`} 
                  onDelete={() => handleChange('patternType', '')}
                />
              )}
              {filters.direction && (
                <Chip 
                  label={`Direction: ${filters.direction}`} 
                  onDelete={() => handleChange('direction', '')}
                />
              )}
              {filters.timeframe && (
                <Chip 
                  label={`Timeframe: ${filters.timeframe}`} 
                  onDelete={() => handleChange('timeframe', '')}
                />
              )}
              {(filters.minConfidence !== undefined || filters.maxConfidence !== undefined) && (
                <Chip 
                  label={`Confidence: ${filters.minConfidence ?? 0}% - ${filters.maxConfidence ?? 100}%`} 
                  onDelete={() => {
                    handleChange('minConfidence', undefined);
                    handleChange('maxConfidence', undefined);
                  }}
                />
              )}
              {filters.dateStart && (
                <Chip 
                  label={`From: ${new Date(filters.dateStart).toLocaleDateString()}`} 
                  onDelete={() => handleChange('dateStart', null)}
                />
              )}
              {filters.dateEnd && (
                <Chip 
                  label={`To: ${new Date(filters.dateEnd).toLocaleDateString()}`} 
                  onDelete={() => handleChange('dateEnd', null)}
                />
              )}
            </Stack>
          </Grid>
          
          <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
            <Button onClick={onCancel} variant="outlined">
              Cancel
            </Button>
            <Button type="submit" variant="contained" color="primary">
              Apply Filters
            </Button>
          </Grid>
        </Grid>
      </form>
    </Paper>
  );
};

export default BacktestResultsFilter; 