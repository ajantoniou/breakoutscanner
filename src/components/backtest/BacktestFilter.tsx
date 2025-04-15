import React, { useState } from 'react';
import { Box, Button, TextField, MenuItem, FormControl, InputLabel, Select, Chip, Typography, Paper } from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CloseIcon from '@mui/icons-material/Close';
import { BacktestFilter as FilterType } from '../../services/types/backtestTypes';

interface BacktestFilterProps {
  onApplyFilter: (filter: FilterType) => void;
  availablePatternTypes: string[];
  availableTimeframes: string[];
}

const BacktestFilter: React.FC<BacktestFilterProps> = ({ 
  onApplyFilter, 
  availablePatternTypes, 
  availableTimeframes 
}) => {
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<FilterType>({});
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const handleChange = (field: keyof FilterType, value: any) => {
    // If value is empty string or null, remove the filter
    if (value === '' || value === null) {
      const newFilter = { ...filter };
      delete newFilter[field];
      setFilter(newFilter);
      
      // Remove from active filters
      setActiveFilters(prev => prev.filter(f => f !== field));
    } else {
      // Set the filter
      setFilter(prev => ({ ...prev, [field]: value }));
      
      // Add to active filters if not already there
      if (!activeFilters.includes(field)) {
        setActiveFilters(prev => [...prev, field]);
      }
    }
  };

  const handleApplyFilter = () => {
    onApplyFilter(filter);
    setExpanded(false);
  };

  const handleResetFilter = () => {
    setFilter({});
    setActiveFilters([]);
    onApplyFilter({});
  };

  const removeFilter = (field: keyof FilterType) => {
    const newFilter = { ...filter };
    delete newFilter[field];
    setFilter(newFilter);
    setActiveFilters(prev => prev.filter(f => f !== field));
    onApplyFilter(newFilter);
  };

  // Helper function to get display value for a filter
  const getFilterDisplay = (field: keyof FilterType): string => {
    const value = filter[field];
    
    switch (field) {
      case 'symbol':
        return `Symbol: ${value}`;
      case 'pattern_type':
        return `Pattern: ${value}`;
      case 'direction':
        return `Direction: ${value === 'bullish' ? 'Bullish' : 'Bearish'}`;
      case 'timeframe':
        return `Timeframe: ${value}`;
      case 'confidence_min':
        return `Min Confidence: ${value}%`;
      case 'confidence_max':
        return `Max Confidence: ${value}%`;
      case 'result':
        return `Result: ${value}`;
      case 'date_from':
        return `From: ${value}`;
      case 'date_to':
        return `To: ${value}`;
      default:
        return `${field}: ${value}`;
    }
  };

  return (
    <Paper sx={{ mb: 3, p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <FilterListIcon sx={{ mr: 1 }} />
          <Typography variant="h6">Filters</Typography>
        </Box>
        <Button 
          variant="outlined" 
          color="primary" 
          onClick={() => setExpanded(!expanded)}
          startIcon={expanded ? <CloseIcon /> : <FilterListIcon />}
        >
          {expanded ? 'Close' : 'Expand Filters'}
        </Button>
      </Box>

      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {activeFilters.map((field) => (
            <Chip 
              key={field} 
              label={getFilterDisplay(field as keyof FilterType)}
              onDelete={() => removeFilter(field as keyof FilterType)}
              color="primary"
              variant="outlined"
            />
          ))}
          
          {activeFilters.length > 0 && (
            <Chip 
              icon={<RestartAltIcon />}
              label="Reset All" 
              onClick={handleResetFilter}
              color="error"
              variant="outlined"
            />
          )}
        </Box>
      )}

      {/* Filter Form */}
      {expanded && (
        <Box sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ width: { xs: '100%', sm: '47%', md: '23%' } }}>
              <TextField
                fullWidth
                label="Symbol"
                value={filter.symbol || ''}
                onChange={(e) => handleChange('symbol', e.target.value)}
                variant="outlined"
                size="small"
              />
            </Box>
            
            <Box sx={{ width: { xs: '100%', sm: '47%', md: '23%' } }}>
              <FormControl fullWidth size="small">
                <InputLabel id="pattern-type-label">Pattern</InputLabel>
                <Select
                  labelId="pattern-type-label"
                  value={filter.pattern_type || ''}
                  onChange={(e) => handleChange('pattern_type', e.target.value)}
                  label="Pattern"
                >
                  <MenuItem value="">All Patterns</MenuItem>
                  {availablePatternTypes.map((type) => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            
            <Box sx={{ width: { xs: '100%', sm: '47%', md: '23%' } }}>
              <FormControl fullWidth size="small">
                <InputLabel id="direction-label">Direction</InputLabel>
                <Select
                  labelId="direction-label"
                  value={filter.direction || ''}
                  onChange={(e) => handleChange('direction', e.target.value)}
                  label="Direction"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="bullish">Bullish</MenuItem>
                  <MenuItem value="bearish">Bearish</MenuItem>
                </Select>
              </FormControl>
            </Box>
            
            <Box sx={{ width: { xs: '100%', sm: '47%', md: '23%' } }}>
              <FormControl fullWidth size="small">
                <InputLabel id="timeframe-label">Timeframe</InputLabel>
                <Select
                  labelId="timeframe-label"
                  value={filter.timeframe || ''}
                  onChange={(e) => handleChange('timeframe', e.target.value)}
                  label="Timeframe"
                >
                  <MenuItem value="">All Timeframes</MenuItem>
                  {availableTimeframes.map((tf) => (
                    <MenuItem key={tf} value={tf}>{tf}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            
            <Box sx={{ width: { xs: '100%', sm: '47%', md: '23%' } }}>
              <FormControl fullWidth size="small">
                <InputLabel id="result-label">Result</InputLabel>
                <Select
                  labelId="result-label"
                  value={filter.result || ''}
                  onChange={(e) => handleChange('result', e.target.value)}
                  label="Result"
                >
                  <MenuItem value="">All Results</MenuItem>
                  <MenuItem value="win">Wins</MenuItem>
                  <MenuItem value="loss">Losses</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                </Select>
              </FormControl>
            </Box>
            
            <Box sx={{ width: { xs: '100%', sm: '47%', md: '23%' } }}>
              <TextField
                fullWidth
                label="Min Confidence %"
                type="number"
                value={filter.confidence_min || ''}
                onChange={(e) => handleChange('confidence_min', e.target.value ? Number(e.target.value) : '')}
                InputProps={{ inputProps: { min: 0, max: 100 } }}
                variant="outlined"
                size="small"
              />
            </Box>
            
            <Box sx={{ width: { xs: '100%', sm: '47%', md: '23%' } }}>
              <TextField
                fullWidth
                label="Max Confidence %"
                type="number"
                value={filter.confidence_max || ''}
                onChange={(e) => handleChange('confidence_max', e.target.value ? Number(e.target.value) : '')}
                InputProps={{ inputProps: { min: 0, max: 100 } }}
                variant="outlined"
                size="small"
              />
            </Box>
            
            <Box sx={{ width: { xs: '100%', sm: '47%', md: '23%' } }}>
              <TextField
                fullWidth
                label="From Date"
                type="date"
                value={filter.date_from || ''}
                onChange={(e) => handleChange('date_from', e.target.value)}
                InputLabelProps={{ shrink: true }}
                variant="outlined"
                size="small"
              />
            </Box>
            
            <Box sx={{ width: { xs: '100%', sm: '47%', md: '23%' } }}>
              <TextField
                fullWidth
                label="To Date"
                type="date"
                value={filter.date_to || ''}
                onChange={(e) => handleChange('date_to', e.target.value)}
                InputLabelProps={{ shrink: true }}
                variant="outlined"
                size="small"
              />
            </Box>
          </Box>
          
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button 
              variant="outlined" 
              onClick={handleResetFilter} 
              startIcon={<RestartAltIcon />}
            >
              Reset
            </Button>
            <Button 
              variant="contained" 
              onClick={handleApplyFilter} 
              startIcon={<FilterListIcon />}
              color="primary"
            >
              Apply Filters
            </Button>
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default BacktestFilter; 