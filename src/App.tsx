import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProviderWrapper as AuthProvider } from '@/services/auth/AuthProviderWrapper';
// We no longer need ProtectedRoute or Login component for this simplified access
// import ProtectedRoute from '@/components/auth/ProtectedRoute';
// import Login from '@/components/auth/Login'; 
import Navbar from '@/components/layout/Navbar';
import ScannerDashboard from '@/components/scanner/ScannerDashboard';
import GoldenScannerDashboard from '@/components/scanner/GoldenScannerDashboard';
import BacktestDashboard from '@/components/backtest/BacktestDashboard';
import YahooBacktestDashboard from '@/components/backtest/YahooBacktestDashboard';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box } from '@mui/material';
import { PatternData } from '@/services/types/patternTypes';
import { BreakoutData } from '@/services/api/marketData/patternDetection/breakoutDetector';
import { 
  runScanner, 
  getBacktestStats, 
  fetchDayTradingResults, 
  fetchSwingTradingResults, 
  fetchGoldenScannerResults 
} from '@/services/api/apiService';
import { toast } from "sonner";

// Create theme
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#3f51b5',
    },
    secondary: {
      main: '#f50057',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
});

function App() {
  // State for scanner results
  const [dayTradingResults, setDayTradingResults] = useState<(PatternData | BreakoutData)[]>([]);
  const [swingTradingResults, setSwingTradingResults] = useState<(PatternData | BreakoutData)[]>([]);
  const [goldenScannerResults, setGoldenScannerResults] = useState<(PatternData | BreakoutData)[]>([]);
  
  // State for backtest stats
  const [backtestStats, setBacktestStats] = useState({
    avgCandlesToBreakout: {},
    winRateByTimeframe: {},
    profitFactorByTimeframe: {},
  });
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [activeScanner, setActiveScanner] = useState<'day' | 'swing' | 'golden' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch initial data
  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('Fetching initial data...');
      // Fetch backtest stats first
      const stats = await getBacktestStats();
      setBacktestStats(stats);
      console.log('Backtest stats fetched:', stats);

      // Fetch golden scanner results by default (or based on last used timeframe)
      // Using '1h' as a default initial timeframe
      setActiveScanner('golden');
      const initialGoldenResults = await fetchGoldenScannerResults('1h');
      setGoldenScannerResults(initialGoldenResults);
      console.log('Initial golden results fetched:', initialGoldenResults.length);
      
      // Optionally pre-fetch day/swing results if needed, or fetch on tab click
      // const initialDayResults = await fetchDayTradingResults('1h');
      // setDayTradingResults(initialDayResults);
      // const initialSwingResults = await fetchSwingTradingResults('1h');
      // setSwingTradingResults(initialSwingResults);

    } catch (err) {
      console.error('Error fetching initial data:', err);
      setError('Failed to load initial scanner data.');
      toast.error('Failed to load initial scanner data.');
    } finally {
      setIsLoading(false);
      setActiveScanner(null);
    }
  }, []);

  // Fetch initial data on component mount
  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Function to handle running a specific scanner
  const handleRunScanner = useCallback(async (mode: 'day' | 'swing' | 'golden', timeframe: string) => {
    setIsLoading(true);
    setActiveScanner(mode);
    setError(null);
    console.log(`Triggering ${mode} scanner for timeframe ${timeframe}...`);
    try {
      const results = await runScanner(mode, timeframe);
      
      if (mode === 'day') {
        setDayTradingResults(results);
        console.log('Day trading results updated:', results.length);
        toast.success(`Day Trading scan for ${timeframe} complete! Found ${results.length} patterns.`);
      } else if (mode === 'swing') {
        setSwingTradingResults(results);
        console.log('Swing trading results updated:', results.length);
        toast.success(`Swing Trading scan for ${timeframe} complete! Found ${results.length} patterns.`);
      } else {
        setGoldenScannerResults(results);
        console.log('Golden scanner results updated:', results.length);
        toast.success(`Golden Scanner scan for ${timeframe} complete! Found ${results.length} patterns.`);
      }
    } catch (err) {
      console.error(`Error running ${mode} scanner:`, err);
      setError(`Failed to run ${mode} scanner.`);
      toast.error(`Failed to run ${mode} scanner.`);
    } finally {
      setIsLoading(false);
      setActiveScanner(null);
    }
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider> {/* Keep AuthProvider for potential context needs, though login isn't enforced */}
        <Router>
          <Navbar />
          <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, padding: 2 }}>
            {/* Optional: Display global error messages */}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Routes>
              {/* Login route now redirects immediately */}
              <Route path="/login" element={<Navigate to="/golden-scanner" replace />} />
              
              {/* Pass REAL props to ScannerDashboard */}
              <Route 
                path="/scanner" 
                element={(
                  <ScannerDashboard 
                    dayTradingResults={dayTradingResults} 
                    swingTradingResults={swingTradingResults} 
                    goldenScannerResults={goldenScannerResults}
                    backtestStats={backtestStats}
                    isLoading={isLoading}
                    activeScanner={activeScanner}
                    onRunScanner={handleRunScanner}
                  />
                )}
              />
              <Route 
                path="/golden-scanner" 
                element={(
                  <ScannerDashboard 
                    dayTradingResults={dayTradingResults} 
                    swingTradingResults={swingTradingResults} 
                    goldenScannerResults={goldenScannerResults}
                    backtestStats={backtestStats}
                    isLoading={isLoading}
                    activeScanner={activeScanner}
                    onRunScanner={handleRunScanner}
                  />
                )}
              />
              <Route path="/backtest" element={<BacktestDashboard />} />
              <Route path="/yahoo-backtest" element={<YahooBacktestDashboard />} />
              <Route path="/notifications" element={<NotificationCenter />} />
              
              {/* Keep redirects for root and catch-all */}
              <Route path="/" element={<Navigate to="/golden-scanner" replace />} />
              <Route path="*" element={<Navigate to="/golden-scanner" replace />} />
            </Routes>
          </Box>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
