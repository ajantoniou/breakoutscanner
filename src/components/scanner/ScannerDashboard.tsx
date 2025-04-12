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
  goldenScannerResults: (PatternData | BreakoutData)[];
  backtestStats: {
    avgCandlesToBreakout: Record<string, number>;
    winRateByTimeframe: Record<string, number>;
    profitFactorByTimeframe: Record<string, number>;
  };
  isLoading: boolean;
  activeScanner: 'day' | 'swing' | 'golden' | null;
  onRunScanner: (mode: 'day' | 'swing' | 'golden', timeframe: string) => void;
}

const ScannerDashboard: React.FC<ScannerDashboardProps> = ({ 
  dayTradingResults, 
  swingTradingResults, 
  goldenScannerResults,
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
    } else if (activeTab === 1) {
      return 'swing';
    } else {
      return 'golden';
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
    } else if (activeTab === 1) {
      return filterResults(swingTradingResults);
    } else {
      return filterResults(goldenScannerResults);
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
          <Tab label={`Golden Scanner (${goldenScannerResults.length})`} />
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
                {Object.keys(TIMEFRAMES)
                  .filter(tf => allowedTimeframes.includes(tf))
                  .map(tf => (
                    <MenuItem key={tf} value={tf}>{tf}</MenuItem>
                  ))
                }
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Button 
              variant="contained" 
              color="primary" 
              fullWidth
              onClick={() => onRunScanner(currentMode, selectedTimeframe)}
              disabled={isLoading && activeScanner === currentMode}
              startIcon={isLoading && activeScanner === currentMode ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {isLoading && activeScanner === currentMode ? 'Scanning...' : 'Run Scanner'}
            </Button>
          </Grid>
        </Grid>
      </Box>

      {activeTab === 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Day Trading Scanner is restricted to 15min, 30min, and 1hour timeframes and scans 20 high-volume stocks with 0 DTE options capability and key indices.
        </Alert>
      )}

      {activeTab === 1 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Swing Trading Scanner is restricted to 1hour, 4hour, daily, and weekly timeframes and scans 100 high-options-volume stocks with strong volatility profiles.
        </Alert>
      )}

      <Box sx={{ mb: 3 }}>
        <Paper elevation={3} sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Backtest Statistics for {selectedTimeframe}
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Paper elevation={1} sx={{ p: 2, bgcolor: 'background.default' }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Avg. Candles to Breakout
                </Typography>
                <Typography variant="h4" color="primary">
                  {avgCandlesToBreakout.toFixed(1)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Average number of candles before breakout occurs
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper elevation={1} sx={{ p: 2, bgcolor: 'background.default' }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Win Rate
                </Typography>
                <Typography variant="h4" color={winRate >= 60 ? 'success.main' : 'warning.main'}>
                  {winRate.toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Percentage of profitable trades
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper elevation={1} sx={{ p: 2, bgcolor: 'background.default' }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Profit Factor
                </Typography>
                <Typography variant="h4" color={profitFactor >= 2 ? 'success.main' : 'warning.main'}>
                  {profitFactor.toFixed(2)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Ratio of gross profits to gross losses
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Paper>
      </Box>
      
      <TabPanel value={activeTab} index={0}>
        {isLoading && activeScanner === 'day' ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : dayTradingResults.length === 0 ? (
          <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              No Day Trading Patterns Found
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Run the scanner to find day trading opportunities.
            </Typography>
            <Button 
              variant="contained" 
              color="primary"
              onClick={() => onRunScanner('day', selectedTimeframe)}
            >
              Run Day Trading Scanner
            </Button>
          </Paper>
        ) : currentResults.length === 0 ? (
          <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              No Results Match Your Filters
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Try adjusting your filter criteria.
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {currentResults.map(pattern => (
              <Grid item xs={12} sm={6} md={4} key={pattern.id}>
                <PatternCard 
                  pattern={pattern} 
                  avgCandlesToBreakout={avgCandlesToBreakout}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>
      
      <TabPanel value={activeTab} index={1}>
        {isLoading && activeScanner === 'swing' ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : swingTradingResults.length === 0 ? (
          <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              No Swing Trading Patterns Found
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Run the scanner to find swing trading opportunities.
            </Typography>
            <Button 
              variant="contained" 
              color="primary"
              onClick={() => onRunScanner('swing', selectedTimeframe)}
            >
              Run Swing Trading Scanner
            </Button>
          </Paper>
        ) : currentResults.length === 0 ? (
          <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              No Results Match Your Filters
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Try adjusting your filter criteria.
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {currentResults.map(pattern => (
              <Grid item xs={12} sm={6} md={4} key={pattern.id}>
                <PatternCard 
                  pattern={pattern} 
                  avgCandlesToBreakout={avgCandlesToBreakout}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>
      
      <TabPanel value={activeTab} index={2}>
        {isLoading && activeScanner === 'golden' ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : goldenScannerResults.length === 0 ? (
          <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              No Golden Scanner Patterns Found
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Run the scanner to find high-confidence multi-timeframe opportunities.
            </Typography>
            <Button 
              variant="contained" 
              color="primary"
              onClick={() => onRunScanner('golden', selectedTimeframe)}
            >
              Run Golden Scanner
            </Button>
          </Paper>
        ) : currentResults.length === 0 ? (
          <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              No Results Match Your Filters
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Try adjusting your filter criteria.
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {currentResults.map(pattern => (
              <Grid item xs={12} sm={6} md={4} key={pattern.id}>
                <PatternCard 
                  pattern={pattern} 
                  avgCandlesToBreakout={avgCandlesToBreakout}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>
      
      <Box sx={{ mt: 3 }}>
        <Paper elevation={3} sx={{ p: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Scanner Statistics
          </Typography>
          <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
            <Chip 
              label={`Total Patterns: ${
                activeTab === 0 
                  ? dayTradingResults.length 
                  : activeTab === 1 
                    ? swingTradingResults.length 
                    : goldenScannerResults.length
              }`} 
              color="primary" 
            />
            <Chip 
              label={`Filtered Results: ${currentResults.length}`} 
              color="secondary" 
            />
            <Chip 
              label={`Bullish: ${currentResults.filter(r => r.direction === 'bullish').length}`} 
              color="success" 
            />
            <Chip 
              label={`Bearish: ${currentResults.filter(r => r.direction === 'bearish').length}`} 
              color="error" 
            />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Last updated: {new Date().toLocaleString()}
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
};

export default ScannerDashboard;
