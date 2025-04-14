import React, { useState, useEffect, useCallback } from 'react';
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
  Alert,
  Switch,
  FormControlLabel,
  Snackbar,
  IconButton,
  Tooltip
} from '@mui/material';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import RefreshIcon from '@mui/icons-material/Refresh';
import PatternCard from './PatternCard';
import { PatternData } from '@/services/types/patternTypes';
import { BreakoutData } from '@/services/api/marketData/patternDetection/breakoutDetector';
import { TIMEFRAMES } from '@/services/api/marketData/dataService';
import { getAllowedTimeframes } from '@/services/api/marketData/stockUniverses';
import { differenceInHours, differenceInDays } from 'date-fns';

// Define the tab panel interface
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// Define adapter interface for PatternCard props
interface PatternCardData {
  id: string;
  symbol: string;
  pattern_type: string;
  timeframe: string;
  entry_price: number;
  target_price: number;
  stop_loss?: number;
  confidence_score: number;
  created_at: string;
  channel_type?: string;
  volume_confirmation?: boolean;
  trendline_break?: boolean;
  ema_pattern?: string;
  status: string;
  risk_reward_ratio?: number;
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
  onArchivePattern?: (id: string) => Promise<void>;
}

const ScannerDashboard: React.FC<ScannerDashboardProps> = ({ 
  dayTradingResults, 
  swingTradingResults,
  backtestStats,
  isLoading,
  activeScanner,
  onRunScanner,
  onArchivePattern
}) => {
  // State for active tab
  const [activeTab, setActiveTab] = useState(0);
  
  // State for filters
  const [confidenceFilter, setConfidenceFilter] = useState<number>(0);
  const [directionFilter, setDirectionFilter] = useState<string>('all');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('1h');
  const [hideExpired, setHideExpired] = useState<boolean>(true);
  const [hideOld, setHideOld] = useState<boolean>(true);
  
  // State for snackbar notifications
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  // Adapter function to map data to PatternCard format
  const adaptToPatternCardData = (pattern: PatternData | BreakoutData): PatternCardData => {
    return {
      id: pattern.id,
      symbol: pattern.symbol,
      pattern_type: pattern.patternType,
      timeframe: pattern.timeframe,
      entry_price: pattern.entryPrice,
      target_price: pattern.targetPrice,
      stop_loss: pattern.stopLoss,
      confidence_score: pattern.confidenceScore,
      created_at: pattern.createdAt,
      channel_type: pattern.channelType || undefined,
      volume_confirmation: pattern.volumeConfirmation || false,
      trendline_break: pattern.trendlineBreak || false,
      ema_pattern: pattern.emaPattern || undefined,
      status: pattern.status,
      risk_reward_ratio: pattern.riskRewardRatio || undefined
    };
  };
  
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
  
  // Function to handle expired patterns filter change
  const handleHideExpiredChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setHideExpired(event.target.checked);
  };
  
  // Function to handle old patterns filter change
  const handleHideOldChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setHideOld(event.target.checked);
  };
  
  // Function to check if a pattern is expired (past expected breakout time by > 24 hours)
  const isPatternExpired = (pattern: PatternData | BreakoutData) => {
    if (!backtestStats.avgCandlesToBreakout[pattern.timeframe]) return false;
    
    const createdAt = new Date(pattern.createdAt);
    let timeframeInMinutes = 0;
    
    // Convert timeframe to minutes
    switch (pattern.timeframe) {
      case '1m': timeframeInMinutes = 1; break;
      case '5m': timeframeInMinutes = 5; break;
      case '15m': timeframeInMinutes = 15; break;
      case '30m': timeframeInMinutes = 30; break;
      case '1h': timeframeInMinutes = 60; break;
      case '4h': timeframeInMinutes = 240; break;
      case '1d': timeframeInMinutes = 1440; break;
      case '1w': timeframeInMinutes = 10080; break;
      default: timeframeInMinutes = 60;
    }
    
    // Calculate expected breakout time
    const avgCandlesToBreakout = backtestStats.avgCandlesToBreakout[pattern.timeframe];
    const expectedBreakoutTime = new Date(createdAt.getTime() + (avgCandlesToBreakout * timeframeInMinutes * 60 * 1000));
    
    // Check if more than 24 hours past expected breakout
    return differenceInHours(new Date(), expectedBreakoutTime) > 24 && expectedBreakoutTime < new Date();
  };
  
  // Function to check if a pattern is old (created > 7 days ago)
  const isPatternOld = (pattern: PatternData | BreakoutData) => {
    return differenceInDays(new Date(), new Date(pattern.createdAt)) > 7;
  };
  
  // Function to filter results
  const filterResults = (results: (PatternData | BreakoutData)[]) => {
    return results.filter(result => {
      // Filter by confidence
      if (result.confidenceScore < confidenceFilter) {
        return false;
      }
      
      // Filter by direction
      if (directionFilter !== 'all') {
        const isBullish = result.patternType.includes('Bull') || 
                        result.patternType.includes('Cup') || 
                        result.patternType.includes('Bottom') ||
                        result.patternType.includes('Ascending');
        
        const direction = isBullish ? 'bullish' : 'bearish';
        if (direction !== directionFilter) {
          return false;
        }
      }
      
      // Filter expired patterns if hideExpired is true
      if (hideExpired && isPatternExpired(result)) {
        return false;
      }
      
      // Filter old patterns if hideOld is true
      if (hideOld && isPatternOld(result)) {
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
  
  // Handle archiving a pattern
  const handleArchivePattern = useCallback(async (id: string) => {
    if (onArchivePattern) {
      try {
        await onArchivePattern(id);
        setSnackbarMessage('Pattern archived successfully');
        setSnackbarOpen(true);
      } catch (error) {
        setSnackbarMessage('Error archiving pattern');
        setSnackbarOpen(true);
      }
    }
  }, [onArchivePattern]);
  
  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };
  
  // Get current results
  const currentResults = getCurrentResults();

  // Get average candles to breakout for current timeframe
  const avgCandlesToBreakout = backtestStats.avgCandlesToBreakout[selectedTimeframe] || 0;
  const winRate = backtestStats.winRateByTimeframe[selectedTimeframe] || 0;
  const profitFactor = backtestStats.profitFactorByTimeframe[selectedTimeframe] || 0;
  
  // Count expired and old patterns
  const countExpiredPatterns = (results: (PatternData | BreakoutData)[]) => {
    return results.filter(pattern => isPatternExpired(pattern)).length;
  };
  
  const countOldPatterns = (results: (PatternData | BreakoutData)[]) => {
    return results.filter(pattern => isPatternOld(pattern)).length;
  };
  
  const expiredDayPatterns = countExpiredPatterns(dayTradingResults);
  const expiredSwingPatterns = countExpiredPatterns(swingTradingResults);
  const oldDayPatterns = countOldPatterns(dayTradingResults);
  const oldSwingPatterns = countOldPatterns(swingTradingResults);
  
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
        <Paper elevation={2} sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <FilterAltIcon sx={{ mr: 1 }} /> Filters
          </Typography>
          
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
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
            
            <Grid item xs={12} sm={6} md={3}>
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
            
            <Grid item xs={12} sm={6} md={3}>
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
            
            <Grid item xs={12} sm={6} md={3}>
              <Button 
                variant="contained" 
                color="primary" 
                fullWidth
                onClick={() => onRunScanner(currentMode, selectedTimeframe)}
                disabled={isLoading}
                startIcon={isLoading && activeScanner === currentMode ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
              >
                {isLoading && activeScanner === currentMode ? 'Scanning...' : 'Run Scanner'}
              </Button>
            </Grid>
            
            <Grid item xs={12} sm={6} md={6}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={hideExpired}
                      onChange={handleHideExpiredChange}
                      color="warning"
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ mr: 1 }}>Hide Expired</Typography>
                      <Tooltip title="Patterns that are more than 24 hours past their expected breakout time">
                        <Chip 
                          size="small" 
                          color="warning" 
                          label={activeTab === 0 ? expiredDayPatterns : expiredSwingPatterns} 
                        />
                      </Tooltip>
                    </Box>
                  }
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={hideOld}
                      onChange={handleHideOldChange}
                      color="info"
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ mr: 1 }}>Hide Old</Typography>
                      <Tooltip title="Patterns created more than 7 days ago">
                        <Chip 
                          size="small" 
                          color="info" 
                          label={activeTab === 0 ? oldDayPatterns : oldSwingPatterns} 
                        />
                      </Tooltip>
                    </Box>
                  }
                />
              </Box>
            </Grid>
          </Grid>
        </Paper>
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
        ) : currentResults.length === 0 ? (
          <Alert severity="warning">
            No patterns match your current filters. Try adjusting your filter settings.
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
                label={`Filtered: ${currentResults.length}`} 
                color="secondary" 
              />
              {(expiredDayPatterns > 0 || oldDayPatterns > 0) && (
                <Chip 
                  label={`Hidden: ${dayTradingResults.length - currentResults.length}`} 
                  color="default" 
                  variant="outlined" 
                />
              )}
            </Stack>
            
            <Grid container spacing={3}>
              {currentResults.map((pattern, index) => (
                <Grid item xs={12} md={6} lg={4} key={index}>
                  <PatternCard 
                    pattern={adaptToPatternCardData(pattern)}
                    avgCandlesToBreakout={backtestStats.avgCandlesToBreakout[pattern.timeframe]}
                    onArchive={handleArchivePattern}
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
        ) : currentResults.length === 0 ? (
          <Alert severity="warning">
            No patterns match your current filters. Try adjusting your filter settings.
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
                label={`Filtered: ${currentResults.length}`} 
                color="secondary" 
              />
              {(expiredSwingPatterns > 0 || oldSwingPatterns > 0) && (
                <Chip 
                  label={`Hidden: ${swingTradingResults.length - currentResults.length}`} 
                  color="default" 
                  variant="outlined" 
                />
              )}
            </Stack>
            
            <Grid container spacing={3}>
              {currentResults.map((pattern, index) => (
                <Grid item xs={12} md={6} lg={4} key={index}>
                  <PatternCard 
                    pattern={adaptToPatternCardData(pattern)}
                    avgCandlesToBreakout={backtestStats.avgCandlesToBreakout[pattern.timeframe]}
                    onArchive={handleArchivePattern}
                  />
                </Grid>
              ))}
            </Grid>
          </>
        )}
      </TabPanel>
      
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        message={snackbarMessage}
      />
    </Box>
  );
};

export default ScannerDashboard;
