import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProviderWrapper as AuthProvider } from '@/services/auth/AuthProviderWrapper';
// We no longer need ProtectedRoute or Login component for this simplified access
// import ProtectedRoute from '@/components/auth/ProtectedRoute';
// import Login from '@/components/auth/Login'; 
import Navbar from '@/components/layout/Navbar';
import ScannerDashboard from '@/components/scanner/ScannerDashboard';
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
  fetchSwingTradingResults
} from '@/services/api/apiService';
import { toast } from "sonner";
// Import our GoldenScanner page component
import GoldenScanner from '@/pages/GoldenScanner';

// Create theme
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#4A80FF', // Brighter blue for primary actions
    },
    secondary: {
      main: '#FF5C8D', // Vibrant pink for secondary actions
    },
    background: {
      default: '#111827', // Dark blue-gray background
      paper: '#1F2937', // Lighter blue-gray for cards & components
    },
    text: {
      primary: '#F9FAFB',
      secondary: '#D1D5DB',
    },
    success: {
      main: '#10B981', // Vibrant green
    },
    error: {
      main: '#EF4444', // Vibrant red
    },
    warning: {
      main: '#F59E0B', // Vibrant amber
    },
    info: {
      main: '#3B82F6', // Blue
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
    },
    h2: {
      fontWeight: 700,
      fontSize: '2rem',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.75rem',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.25rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
          backgroundImage: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          },
        },
        containedPrimary: {
          backgroundImage: 'linear-gradient(to right, #4A80FF, #3B68DF)',
          '&:hover': {
            backgroundImage: 'linear-gradient(to right, #3B68DF, #2C52C7)',
          },
        },
        containedSecondary: {
          backgroundImage: 'linear-gradient(to right, #FF5C8D, #E64C7D)',
          '&:hover': {
            backgroundImage: 'linear-gradient(to right, #E64C7D, #D04071)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          borderRadius: 12,
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
          '&:hover': {
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        },
        head: {
          fontWeight: 600,
        },
      },
    },
  },
});

function App() {
  // State for scanner results
  const [dayTradingResults, setDayTradingResults] = useState<(PatternData | BreakoutData)[]>([]);
  const [swingTradingResults, setSwingTradingResults] = useState<(PatternData | BreakoutData)[]>([]);
  
  // State for backtest stats
  const [backtestStats, setBacktestStats] = useState({
    avgCandlesToBreakout: {},
    winRateByTimeframe: {},
    profitFactorByTimeframe: {},
  });
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [activeScanner, setActiveScanner] = useState<'day' | 'swing' | null>(null);
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

      // Pre-fetch day/swing results
      const initialDayResults = await fetchDayTradingResults('1h');
      setDayTradingResults(initialDayResults);
      const initialSwingResults = await fetchSwingTradingResults('1h');
      setSwingTradingResults(initialSwingResults);

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
  const handleRunScanner = useCallback(async (mode: 'day' | 'swing', timeframe: string) => {
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
            {error && <div className="error-message">{error}</div>}
            <Routes>
              {/* Login route now redirects immediately */}
              <Route path="/login" element={<Navigate to="/golden-scanner" replace />} />
              
              {/* Scanner Dashboard */}
              <Route 
                path="/scanner" 
                element={(
                  <ScannerDashboard 
                    dayTradingResults={dayTradingResults} 
                    swingTradingResults={swingTradingResults} 
                    backtestStats={backtestStats}
                    isLoading={isLoading}
                    activeScanner={activeScanner}
                    onRunScanner={handleRunScanner}
                  />
                )}
              />
              
              {/* GoldenScanner fetches data directly from Supabase */}
              <Route 
                path="/golden-scanner" 
                element={<GoldenScanner />}
              />
              
              <Route path="/backtest" element={<BacktestDashboard signals={dayTradingResults} />} />
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
