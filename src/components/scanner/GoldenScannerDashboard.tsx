import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Alert, Button, Chip, Grid } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import MarketHoursService from '@/services/api/marketData/marketHoursService';
import { supabase } from '@/services/supabase/patternService';
import PatternCard from './PatternCard';

const GoldenScannerDashboard = () => {
  const { user } = useAuth();
  const [patterns, setPatterns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [marketStatus, setMarketStatus] = useState('');
  const [dataTimestamp, setDataTimestamp] = useState('');
  const [avgCandlesToBreakout, setAvgCandlesToBreakout] = useState(3.87); // Default from documentation
  
  const marketHoursService = new MarketHoursService();
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch high-confidence patterns directly from cached_patterns table
        const { data: patternsData, error: patternsError } = await supabase
          .from('cached_patterns')
          .select('*')
          .gte('confidence_score', 75) // Only high-confidence patterns (75%+)
          .order('confidence_score', { ascending: false })
          .limit(10);
        
        if (patternsError) {
          throw new Error(`Error fetching patterns: ${patternsError.message}`);
        }

        if (patternsData && patternsData.length > 0) {
          setPatterns(patternsData);
        } else {
          setPatterns([]);
          setError('No high-confidence patterns found. Try adjusting filters or check back later.');
        }
        
        // Also fetch backtest metrics to get avg candles to breakout
        const { data: backtestData, error: backtestError } = await supabase
          .from('backtest_results')
          .select('avg(days_to_breakout)')
          .single();
          
        if (!backtestError && backtestData && backtestData.avg) {
          // Ensure we're setting a number, not an object
          const avgDays = parseFloat(backtestData.avg);
          if (!isNaN(avgDays)) {
            setAvgCandlesToBreakout(avgDays);
          }
        }
        
        setDataTimestamp(new Date().toISOString());
        
        const status = marketHoursService.getCurrentMarketStatus();
        setMarketStatus(status);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching patterns:', err);
        setError('Failed to load patterns. Please try again.');
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Set up refresh interval (every 5 minutes)
    const intervalId = setInterval(fetchData, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };
  
  const getMarketStatusColor = (status) => {
    switch (status) {
      case 'open':
        return 'success';
      case 'pre-market':
      case 'after-hours':
        return 'warning';
      case 'closed':
        return 'error';
      default:
        return 'default';
    }
  };
  
  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Golden Scanner Dashboard
      </Typography>
      
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="subtitle1">
            Welcome, {user?.email || 'User'}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            <Typography variant="body2" sx={{ mr: 1 }}>
              Market Status:
            </Typography>
            <Chip 
              label={marketStatus.toUpperCase()} 
              color={getMarketStatusColor(marketStatus)}
              size="small"
            />
          </Box>
        </Box>
        
        <Box>
          {dataTimestamp && (
            <Typography variant="body2" color="text.secondary">
              Last Updated: {formatTimestamp(dataTimestamp)}
            </Typography>
          )}
          <Button 
            variant="outlined" 
            size="small" 
            onClick={() => window.location.reload()}
            sx={{ mt: 1 }}
          >
            Refresh Data
          </Button>
        </Box>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Typography variant="h6" gutterBottom>
            High Confidence Predictions
          </Typography>
          
          {patterns.length === 0 ? (
            <Alert severity="info" sx={{ mb: 3 }}>
              No patterns found. Please try again later or adjust the search criteria.
            </Alert>
          ) : (
            <Box sx={{ flexGrow: 1 }}>
              <Grid container spacing={3}>
                {patterns.map((pattern) => (
                  <Grid item xs={12} md={6} key={pattern.id?.toString() || Math.random().toString()}>
                    <PatternCard 
                      pattern={pattern}
                      avgCandlesToBreakout={avgCandlesToBreakout}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
          
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Data is refreshed automatically every 5 minutes. Last updated at {formatTimestamp(dataTimestamp)}.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Note: These are high-confidence predictions based on technical analysis patterns. Always conduct your own research before trading.
            </Typography>
          </Box>
        </>
      )}
    </Box>
  );
};

export default GoldenScannerDashboard;
