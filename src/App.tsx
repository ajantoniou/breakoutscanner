import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProviderWrapper as AuthProvider } from '@/services/auth/AuthProviderWrapper';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import VercelProtectedRoute from '@/components/auth/VercelProtectedRoute';
import Login from '@/components/auth/Login';
import ScannerDashboard from '@/components/scanner/ScannerDashboard';
import GoldenScannerDashboard from '@/components/scanner/GoldenScannerDashboard';
import BacktestDashboard from '@/components/backtest/BacktestDashboard';
import YahooBacktestDashboard from '@/components/backtest/YahooBacktestDashboard';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box } from '@mui/material';

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
  const [useVercelAuth, setUseVercelAuth] = useState(false);
  
  // Check if Vercel authentication is available
  useEffect(() => {
    const checkVercelAuth = async () => {
      try {
        const response = await fetch('/.well-known/vercel-user-meta');
        if (response.status === 200) {
          setUseVercelAuth(true);
        }
      } catch (error) {
        console.log('Vercel auth not available, using fallback auth');
      }
    };
    
    checkVercelAuth();
  }, []);
  
  // Choose the appropriate protected route component
  const SecureRoute = useVercelAuth ? VercelProtectedRoute : ProtectedRoute;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Routes>
              <Route path="/login" element={<Login />} />
              
              <Route path="/scanner" element={
                <SecureRoute>
                  <ScannerDashboard />
                </SecureRoute>
              } />
              
              <Route path="/golden-scanner" element={
                <SecureRoute>
                  <GoldenScannerDashboard />
                </SecureRoute>
              } />
              
              <Route path="/backtest" element={
                <SecureRoute>
                  <BacktestDashboard />
                </SecureRoute>
              } />
              
              <Route path="/yahoo-backtest" element={
                <SecureRoute>
                  <YahooBacktestDashboard />
                </SecureRoute>
              } />
              
              <Route path="/notifications" element={
                <SecureRoute>
                  <NotificationCenter />
                </SecureRoute>
              } />
              
              {/* Redirect root to golden scanner */}
              <Route path="/" element={<Navigate to="/golden-scanner" replace />} />
              
              {/* Catch all other routes and redirect to golden scanner */}
              <Route path="*" element={<Navigate to="/golden-scanner" replace />} />
            </Routes>
          </Box>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
