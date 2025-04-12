import React, { useState, useEffect } from 'react';
import { 
  Box, 
  CircularProgress, 
  Alert, 
  Snackbar,
  Button,
  Typography,
  Paper,
  Grid
} from '@mui/material';
import ScannerDashboard from '../../scanner/ScannerDashboard';
import { 
  fetchDayTradingResults, 
  fetchSwingTradingResults, 
  fetchGoldenScannerResults,
  runScanner,
  getBacktestStats,
  runBacktest
} from '@/services/api/apiService';
import { PatternData } from '@/services/types/patternTypes';
import { BreakoutData } from '@/services/api/marketData/patternDetection/breakoutDetector';

const ScannerContainer: React.FC = () => {
  // State for scanner results
  const [dayTradingResults, setDayTradingResults] = useState<(PatternData | BreakoutData)[]>([]);
  const [swingTradingResults, setSwingTradingResults] = useState<(PatternData | BreakoutData)[]>([]);
  const [goldenScannerResults, setGoldenScannerResults] = useState<(PatternData | BreakoutData)[]>([]);
  
  // State for backtest statistics
  const [backtestStats, setBacktestStats] = useState({
    avgCandlesToBreakout: {},
    winRateByTimeframe: {},
    profitFactorByTimeframe: {}
  });
  
  // State for loading status
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeScanner, setActiveScanner] = useState<'day' | 'swing' | 'golden' | null>(null);
  const [isBacktesting, setIsBacktesting] = useState<boolean>(false);
  
  // State for error handling
  const [error, setError] = useState<string | null>(null);
  const [showError, setShowError] = useState<boolean>(false);
  
  // State for last backtest date
  const [lastBacktestDate, setLastBacktestDate] = useState<string | null>(null);
  
  // Fetch initial data on component mount
  useEffect(() => {
    fetchInitialData();
  }, []);
  
  // Function to fetch initial data
  const fetchInitialData = async () => {
    setIsLoading(true);
    
    try {
      // Get backtest statistics
      const stats = await getBacktestStats();
      setBacktestStats(stats);
      
      // Set last backtest date
      const today = new Date();
      setLastBacktestDate(today.toISOString());
      
      // Fetch day trading results
      const dayResults = await fetchDayTradingResults('15m');
      setDayTradingResults(dayResults);
      
      // Fetch swing trading results
      const swingResults = await fetchSwingTradingResults('4h');
      setSwingTradingResults(swingResults);
      
      // Fetch golden scanner results
      const goldenResults = await fetchGoldenScannerResults('1d');
      setGoldenScannerResults(goldenResults);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      setError('Failed to fetch scanner results. Please try again later.');
      setShowError(true);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to run scanner
  const handleRunScanner = async (mode: 'day' | 'swing' | 'golden', timeframe: string) => {
    setActiveScanner(mode);
    setIsLoading(true);
    
    try {
      const results = await runScanner(mode, timeframe);
      
      // Update appropriate state based on mode
      if (mode === 'day') {
        setDayTradingResults(results);
      } else if (mode === 'swing') {
        setSwingTradingResults(results);
      } else {
        setGoldenScannerResults(results);
      }
    } catch (error) {
      console.error(`Error running ${mode} scanner:`, error);
      setError(`Failed to run ${mode} scanner. Please try again later.`);
      setShowError(true);
    } finally {
      setIsLoading(false);
      setActiveScanner(null);
    }
  };
  
  // Function to run backtest
  const handleRunBacktest = async () => {
    setIsBacktesting(true);
    
    try {
      // Run backtest
      const success = await runBacktest();
      
      if (success) {
        // Get updated backtest statistics
        const stats = await getBacktestStats();
        setBacktestStats(stats);
        
        // Set last backtest date
        const today = new Date();
        setLastBacktestDate(today.toISOString());
        
        // Show success message
        setError('Backtest completed successfully.');
        setShowError(true);
      } else {
        // Show error message
        setError('Backtest was run recently. Skipping to prevent unnecessary processing.');
        setShowError(true);
      }
    } catch (error) {
      console.error('Error running backtest:', error);
      setError('Failed to run backtest. Please try again later.');
      setShowError(true);
    } finally {
      setIsBacktesting(false);
    }
  };
  
  // Function to handle error close
  const handleErrorClose = () => {
    setShowError(false);
  };
  
  // If initial loading, show loading spinner
  if (isLoading && !activeScanner) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // Format last backtest date
  const formattedLastBacktestDate = lastBacktestDate 
    ? new Date(lastBacktestDate).toLocaleDateString() + ' ' + new Date(lastBacktestDate).toLocaleTimeString() 
    : 'Never';
  
  return (
    <Box>
      <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <Typography variant="h6">
              Breakout Scanner
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Scan for breakout opportunities in day trading and swing trading timeframes.
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Button 
              variant="outlined" 
              color="primary" 
              fullWidth
              onClick={handleRunBacktest}
              disabled={isBacktesting}
              startIcon={isBacktesting ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {isBacktesting ? 'Running Backtest...' : 'Run Backtest'}
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Last backtest: {formattedLastBacktestDate}
            </Typography>
          </Grid>
        </Grid>
      </Paper>
      
      <ScannerDashboard 
        dayTradingResults={dayTradingResults}
        swingTradingResults={swingTradingResults}
        goldenScannerResults={goldenScannerResults}
        backtestStats={backtestStats}
        isLoading={isLoading}
        activeScanner={activeScanner}
        onRunScanner={handleRunScanner}
      />
      
      <Snackbar open={showError} autoHideDuration={6000} onClose={handleErrorClose}>
        <Alert onClose={handleErrorClose} severity={error?.includes('Failed') ? 'error' : 'success'} sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ScannerContainer;
