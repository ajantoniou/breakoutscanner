import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Grid, Card, CardContent, Chip, Button, CircularProgress, Alert } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import MarketHoursService from '@/services/api/marketData/marketHoursService';

// Mock data for high confidence predictions
const HIGH_CONFIDENCE_PREDICTIONS = [
  {
    symbol: 'AAPL',
    currentPrice: 233.50,
    entryPrice: 235.80,
    targetPrice: 247.00,
    stopLoss: 228.00,
    potentialProfit: 4.8,
    timeframe: '1d',
    pattern: 'Ascending Triangle',
    direction: 'Bullish',
    confidence: 85,
    expectedBreakout: '3-4 trading days'
  },
  {
    symbol: 'MSFT',
    currentPrice: 442.30,
    entryPrice: 445.00,
    targetPrice: 467.00,
    stopLoss: 435.00,
    potentialProfit: 4.9,
    timeframe: '4h',
    pattern: 'Bull Flag',
    direction: 'Bullish',
    confidence: 82,
    expectedBreakout: '2-3 trading days'
  },
  {
    symbol: 'NVDA',
    currentPrice: 110.00,
    entryPrice: 111.50,
    targetPrice: 118.00,
    stopLoss: 106.00,
    potentialProfit: 5.8,
    timeframe: '1d',
    pattern: 'Bull Flag',
    direction: 'Bullish',
    confidence: 90,
    expectedBreakout: '2-3 trading days'
  },
  {
    symbol: 'AMZN',
    currentPrice: 182.75,
    entryPrice: 184.50,
    targetPrice: 195.00,
    stopLoss: 178.00,
    potentialProfit: 5.7,
    timeframe: '1d',
    pattern: 'Cup and Handle',
    direction: 'Bullish',
    confidence: 87,
    expectedBreakout: '4-5 trading days'
  },
  {
    symbol: 'TSLA',
    currentPrice: 172.30,
    entryPrice: 174.00,
    targetPrice: 185.00,
    stopLoss: 168.00,
    potentialProfit: 6.3,
    timeframe: '4h',
    pattern: 'Ascending Triangle',
    direction: 'Bullish',
    confidence: 83,
    expectedBreakout: '2-3 trading days'
  }
];

const GoldenScannerDashboard = () => {
  const { user } = useAuth();
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [marketStatus, setMarketStatus] = useState('');
  const [dataTimestamp, setDataTimestamp] = useState('');
  
  const marketHoursService = new MarketHoursService();
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // In a real implementation, this would fetch from the API
        // For now, use mock data with a slight delay to simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        setPredictions(HIGH_CONFIDENCE_PREDICTIONS);
        setDataTimestamp(new Date().toISOString());
        
        const status = marketHoursService.getCurrentMarketStatus();
        setMarketStatus(status);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching predictions:', err);
        setError('Failed to load predictions. Please try again.');
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
  
  const getConfidenceColor = (confidence) => {
    if (confidence >= 90) return '#4caf50';
    if (confidence >= 80) return '#8bc34a';
    if (confidence >= 70) return '#ffeb3b';
    if (confidence >= 60) return '#ff9800';
    return '#f44336';
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
          
          <Grid container spacing={3}>
            {predictions.map((prediction, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Card 
                  elevation={3}
                  sx={{ 
                    height: '100%',
                    borderLeft: `6px solid ${getConfidenceColor(prediction.confidence)}`,
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 6
                    }
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h5" component="div">
                        {prediction.symbol}
                      </Typography>
                      <Chip 
                        label={`${prediction.confidence}% Confidence`}
                        sx={{ 
                          bgcolor: getConfidenceColor(prediction.confidence),
                          color: 'white',
                          fontWeight: 'bold'
                        }}
                      />
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Pattern:
                      </Typography>
                      <Typography variant="body1">
                        {prediction.pattern}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Direction:
                      </Typography>
                      <Typography 
                        variant="body1"
                        sx={{ 
                          color: prediction.direction === 'Bullish' ? '#4caf50' : '#f44336',
                          fontWeight: 'bold'
                        }}
                      >
                        {prediction.direction}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Timeframe:
                      </Typography>
                      <Typography variant="body1">
                        {prediction.timeframe}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Current Price:
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        ${prediction.currentPrice.toFixed(2)}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Entry Price:
                      </Typography>
                      <Typography variant="body1">
                        ${prediction.entryPrice.toFixed(2)}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Target Price:
                      </Typography>
                      <Typography variant="body1" color="#4caf50" fontWeight="bold">
                        ${prediction.targetPrice.toFixed(2)}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Stop Loss:
                      </Typography>
                      <Typography variant="body1" color="#f44336">
                        ${prediction.stopLoss.toFixed(2)}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Potential Profit:
                      </Typography>
                      <Typography variant="body1" color="#4caf50" fontWeight="bold">
                        {prediction.potentialProfit.toFixed(1)}%
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Expected Breakout:
                      </Typography>
                      <Typography variant="body1">
                        {prediction.expectedBreakout}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
          
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
