import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProviderWrapper as AuthProvider } from '@/services/auth/AuthProviderWrapper';
import Layout from '@/components/layout/Layout';
import ScannerDashboard from '@/components/scanner/ScannerDashboard';
import BacktestDashboard from '@/components/backtest/BacktestDashboard';
import YahooBacktestDashboard from '@/components/backtest/YahooBacktestDashboard';
import PolygonBacktestDashboard from '@/components/backtest/PolygonBacktestDashboard';
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

  // Add missing state for performance metrics
  const [performanceMetrics, setPerformanceMetrics] = useState({
    winRate: 0,
    profitFactor: 0,
    avgProfit: 0,
    avgLoss: 0,
    consistencyScore: 0,
    riskRewardRatio: 0,
    maxDrawdown: 0,
    targetHitRate: 0,
    totalTrades: 0,
    historicalPerformance: [],
    winLossDistribution: { wins: 0, losses: 0 }
  });

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

  // Add archive pattern handler
  const handleArchivePattern = useCallback((pattern: PatternData) => {
    // TODO: Implement archive functionality
    console.log('Archiving pattern:', pattern);
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            {/* Dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={
              <Layout>
                <ScannerDashboard 
                  dayTradingResults={dayTradingResults}
                  swingTradingResults={swingTradingResults}
                  isLoading={isLoading}
                  activeScanner={activeScanner}
                  onRunScanner={() => handleRunScanner('day', '1h')}
                  onArchivePattern={handleArchivePattern}
                  backtestStats={backtestStats}
                  performanceMetrics={performanceMetrics}
                />
              </Layout>
            } />

            {/* Scanner Routes */}
            <Route path="/golden-scanner" element={
              <Layout>
                <GoldenScanner />
              </Layout>
            } />
            <Route path="/day-scanner" element={
              <Layout>
                <ScannerDashboard 
                  dayTradingResults={dayTradingResults}
                  swingTradingResults={[]}
                  isLoading={isLoading}
                  activeScanner={activeScanner}
                  onRunScanner={() => handleRunScanner('day', '1h')}
                  onArchivePattern={handleArchivePattern}
                  backtestStats={backtestStats}
                  performanceMetrics={performanceMetrics}
                  mode="day"
                />
              </Layout>
            } />
            <Route path="/swing-scanner" element={
              <Layout>
                <ScannerDashboard 
                  dayTradingResults={[]}
                  swingTradingResults={swingTradingResults}
                  isLoading={isLoading}
                  activeScanner={activeScanner}
                  onRunScanner={() => handleRunScanner('swing', '1d')}
                  onArchivePattern={handleArchivePattern}
                  backtestStats={backtestStats}
                  performanceMetrics={performanceMetrics}
                  mode="swing"
                />
              </Layout>
            } />

            {/* Backtest Routes */}
            <Route path="/backtest" element={
              <Layout>
                <BacktestDashboard />
              </Layout>
            } />
            <Route path="/backtest/results" element={
              <Layout>
                <PolygonBacktestDashboard />
              </Layout>
            } />
            <Route path="/backtest/analytics" element={
              <Layout>
                <BacktestDashboard />
              </Layout>
            } />

            {/* Other Routes */}
            <Route path="/notifications" element={
              <Layout>
                <NotificationCenter />
              </Layout>
            } />
            <Route path="/settings" element={
              <Layout>
                <div>Settings Page</div>
              </Layout>
            } />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
