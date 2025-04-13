import React from 'react';
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
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider> {/* Keep AuthProvider for potential context needs, though login isn't enforced */}
        <Router>
          <Navbar />
          <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, padding: 2 }}>
            <Routes>
              {/* Login route now redirects immediately */}
              <Route path="/login" element={<Navigate to="/golden-scanner" replace />} />
              
              {/* Remove ProtectedRoute wrappers */}
              <Route path="/scanner" element={<ScannerDashboard />} />
              <Route path="/golden-scanner" element={<GoldenScannerDashboard />} />
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
