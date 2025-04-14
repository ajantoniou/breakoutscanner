import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Tabs, 
  Tab, 
  Button, 
  Grid, 
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  Alert
} from '@mui/material';
import PatternCard from './PatternCard';
import { PatternData } from '@/services/types/patternTypes';
import { BreakoutData } from '@/services/api/marketData/patternDetection/breakoutDetector';
import { TIMEFRAMES } from '@/services/api/marketData/dataService';
import { getAllowedTimeframes } from '@/services/api/marketData/stockUniverses';

// Define the tab panel interface
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// Tab panel component
const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`scanner-tabpanel-${index}`}
      aria-labelledby={`scanner-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

interface ScannerDashboardProps {
  dayTradingResults: (PatternData | BreakoutData)[];
  swingTradingResults: (PatternData | BreakoutData)[];
  backtestStats: {
    avgCandlesToBreakout: Record<string, number>;
    winRateByTimeframe: Record<string, number>;
    profitFactorByTimeframe: Record<string, number>;
  };
  isLoading: boolean;
  activeScanner: 'day' | 'swing' | null;
  onRunScanner: (mode: 'day' | 'swing', timeframe: string) => void;
}

const ScannerDashboard: React.FC<ScannerDashboardProps> = ({ 
  dayTradingResults, 
  swingTradingResults,
  backtestStats,
  isLoading,
  activeScanner,
  onRunScanner
}) => {
  // State for active tab
  const [activeTab, setActiveTab] = useState(0);
  
  // State for filters
  const [confidenceFilter, setConfidenceFilter] = useState<number>(0);
  const [directionFilter, setDirectionFilter] = useState<string>('all');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('1h');
  
  // Get current scanner mode
  const getCurrentScannerMode = () => {
    if (activeTab === 0) {
      return 'day';
    } else {
      return 'swing';
    }
  };
  
  // Get current mode
  const currentMode = getCurrentScannerMode();
  
  // Get allowed timeframes for current mode
  const allowedTimeframes = getAllowedTimeframes(currentMode);
  
  // Update selected timeframe when tab changes to ensure it's valid for the current mode
  useEffect(() => {
    // If current timeframe is not allowed for this mode, select the first allowed timeframe
    if (!allowedTimeframes.includes(selectedTimeframe)) {
      setSelectedTimeframe(allowedTimeframes[0]);
    }
  }, [activeTab, allowedTimeframes, selectedTimeframe]);
  
  // Function to handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  
  // Function to handle confidence filter change
  const handleConfidenceFilterChange = (event: any) => {
    setConfidenceFilter(event.target.value);
  };
  
  // Function to handle direction filter change
  const handleDirectionFilterChange = (event: any) => {
    setDirectionFilter(event.target.value);
  };

  // Function to handle timeframe change
  const handleTimeframeChange = (event: any) => {
    setSelectedTimeframe(event.target.value);
  };
  
  // Function to filter results
  const filterResults = (results: (PatternData | BreakoutData)[]) => {
    return results.filter(result => {
      // Filter by confidence
      if (result.confidenceScore < confidenceFilter) {
        return false;
      }
      
      // Filter by direction
      if (directionFilter !== 'all' && result.direction !== directionFilter) {
        return false;
      }
      
      return true;
    });
  };
  
  // Get filtered results for current tab
  const getCurrentResults = () => {
    if (activeTab === 0) {
      return filterResults(dayTradingResults);
    } else {
      return filterResults(swingTradingResults);
    }
  };
  
  // Get current results
  const currentResults = getCurrentResults();

  // Get average candles to breakout for current timeframe
  const avgCandlesToBreakout = backtestStats.avgCandlesToBreakout[selectedTimeframe] || 0;
  const winRate = backtestStats.winRateByTimeframe[selectedTimeframe] || 0;
  const profitFactor = backtestStats.profitFactorByTimeframe[selectedTimeframe] || 0;
  
  return (
    <Box sx={{ width: '100%' }}>
      <Paper elevation={3} sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          aria-label="scanner tabs"
          centered
        >
          <Tab label={`Day Trading (${dayTradingResults.length})`} />
          <Tab label={`Swing Trading (${swingTradingResults.length})`} />
        </Tabs>
      </Paper>
      
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel id="confidence-filter-label">Min Confidence</InputLabel>
              <Select
                labelId="confidence-filter-label"
                id="confidence-filter"
                value={confidenceFilter}
                label="Min Confidence"
                onChange={handleConfidenceFilterChange}
              >
                <MenuItem value={0}>All</MenuItem>
                <MenuItem value={60}>60%+</MenuItem>
                <MenuItem value={70}>70%+</MenuItem>
                <MenuItem value={80}>80%+</MenuItem>
                <MenuItem value={90}>90%+</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel id="direction-filter-label">Direction</InputLabel>
              <Select
                labelId="direction-filter-label"
                id="direction-filter"
                value={directionFilter}
                label="Direction"
                onChange={handleDirectionFilterChange}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="bullish">Bullish</MenuItem>
                <MenuItem value="bearish">Bearish</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel id="timeframe-label">Timeframe</InputLabel>
              <Select
                labelId="timeframe-label"
                id="timeframe"
                value={selectedTimeframe}
                label="Timeframe"
                onChange={handleTimeframeChange}
              >
                {allowedTimeframes.map((tf) => (
                  <MenuItem key={tf} value={tf}>{tf}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Button 
              variant="contained" 
              color="primary" 
              fullWidth
              onClick={() => onRunScanner(currentMode, selectedTimeframe)}
              disabled={isLoading}
              startIcon={isLoading && activeScanner === currentMode ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {isLoading && activeScanner === currentMode ? 'Scanning...' : 'Run Scanner'}
            </Button>
          </Grid>
        </Grid>
      </Box>
      
      <Box sx={{ mb: 3 }}>
        <Paper elevation={3} sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Backtest Stats for {selectedTimeframe}
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <Box sx={{ textAlign: 'center', p: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Avg Candles to Breakout
                </Typography>
                <Typography variant="h6">
                  {avgCandlesToBreakout.toFixed(1)}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={4}>
              <Box sx={{ textAlign: 'center', p: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Win Rate
                </Typography>
                <Typography variant="h6">
                  {(winRate * 100).toFixed(1)}%
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={4}>
              <Box sx={{ textAlign: 'center', p: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Profit Factor
                </Typography>
                <Typography variant="h6">
                  {profitFactor.toFixed(2)}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Box>
      
      <TabPanel value={activeTab} index={0}>
        <Typography variant="h6" gutterBottom>
          Day Trading Patterns
        </Typography>
        {isLoading && activeScanner === 'day' ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : dayTradingResults.length === 0 ? (
          <Alert severity="info">
            No day trading patterns found. Try running the scanner for a different timeframe.
          </Alert>
        ) : (
          <>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Chip 
                label={`All Patterns: ${dayTradingResults.length}`} 
                color="primary" 
                variant="outlined" 
              />
              <Chip 
                label={`Filtered: ${activeTab === 0 ? currentResults.length : 0}`} 
                color="secondary" 
              />
            </Stack>
            
            <Grid container spacing={3}>
              {activeTab === 0 && currentResults.map((pattern, index) => (
                <Grid item xs={12} md={6} lg={4} key={index}>
                  <PatternCard 
                    pattern={pattern}
                    avgCandlesToBreakout={avgCandlesToBreakout}
                  />
                </Grid>
              ))}
            </Grid>
          </>
        )}
      </TabPanel>
      
      <TabPanel value={activeTab} index={1}>
        <Typography variant="h6" gutterBottom>
          Swing Trading Patterns
        </Typography>
        {isLoading && activeScanner === 'swing' ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : swingTradingResults.length === 0 ? (
          <Alert severity="info">
            No swing trading patterns found. Try running the scanner for a different timeframe.
          </Alert>
        ) : (
          <>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Chip 
                label={`All Patterns: ${swingTradingResults.length}`} 
                color="primary" 
                variant="outlined" 
              />
              <Chip 
                label={`Filtered: ${activeTab === 1 ? currentResults.length : 0}`} 
                color="secondary" 
              />
            </Stack>
            
            <Grid container spacing={3}>
              {activeTab === 1 && currentResults.map((pattern, index) => (
                <Grid item xs={12} md={6} lg={4} key={index}>
                  <PatternCard 
                    pattern={pattern}
                    avgCandlesToBreakout={avgCandlesToBreakout}
                  />
                </Grid>
              ))}
            </Grid>
          </>
        )}
      </TabPanel>
    </Box>
  );
};

export default ScannerDashboard;
