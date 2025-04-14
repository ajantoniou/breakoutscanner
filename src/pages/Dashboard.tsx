import React, { useState } from 'react';
import { 
  Container, 
  Grid, 
  Paper, 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  CardHeader,
  Divider,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  CircularProgress,
  LinearProgress,
  Tabs,
  Tab
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import WarningIcon from '@mui/icons-material/Warning';
import StarIcon from '@mui/icons-material/Star';
import BarChartIcon from '@mui/icons-material/BarChart';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import HistoryIcon from '@mui/icons-material/History';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import TimerIcon from '@mui/icons-material/Timer';
import { Link as RouterLink } from 'react-router-dom';

// Mock data for dashboard
const scannerStatus = [
  { id: 1, name: 'Golden Scanner', active: true, status: 'Available', icon: <StarIcon />, lastUpdate: '10 minutes ago', count: 7 },
  { id: 2, name: 'Day Scanner', active: false, status: 'No Data', icon: <ShowChartIcon />, lastUpdate: '2 hours ago', count: 0 },
  { id: 3, name: 'Swing Scanner', active: true, status: 'Available', icon: <TrendingUpIcon />, lastUpdate: '45 minutes ago', count: 12 },
  { id: 4, name: 'Backtest Engine', active: true, status: 'Available', icon: <HistoryIcon />, lastUpdate: '1 hour ago', count: 83 }
];

const recentPatterns = [
  { 
    id: 'pat-123', 
    symbol: 'AAPL', 
    pattern: 'Bull Flag', 
    timeframe: '1h',
    confidence: 92,
    type: 'bullish',
    status: 'active',
    created: '2 hours ago',
    expectedBreakout: '2 hours from now'
  },
  { 
    id: 'pat-124', 
    symbol: 'MSFT', 
    pattern: 'Ascending Triangle', 
    timeframe: '4h',
    confidence: 87,
    type: 'bullish',
    status: 'active',
    created: '3 hours ago',
    expectedBreakout: 'In 5 hours'
  },
  { 
    id: 'pat-125', 
    symbol: 'TSLA', 
    pattern: 'Descending Triangle', 
    timeframe: '30m',
    confidence: 78,
    type: 'bearish',
    status: 'pending',
    created: '30 minutes ago',
    expectedBreakout: '1 hour from now'
  },
  { 
    id: 'pat-126', 
    symbol: 'AMZN', 
    pattern: 'Bull Flag', 
    timeframe: '15m',
    confidence: 81,
    type: 'bullish',
    status: 'completed',
    created: '4 hours ago',
    expectedBreakout: 'Complete (2.3% gain)'
  },
  { 
    id: 'pat-127', 
    symbol: 'META', 
    pattern: 'Bear Flag', 
    timeframe: '1h',
    confidence: 74,
    type: 'bearish',
    status: 'failed',
    created: '5 hours ago',
    expectedBreakout: 'Failed (1.1% loss)'
  }
];

const performanceMetrics = {
  totalPatterns: 83,
  successRate: 69.88,
  avgGain: 2.26,
  avgLoss: 0.02,
  riskRewardRatio: 99.29,
  consistencyScore: 91.2
};

const Dashboard = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Function to get the status color
  const getStatusColor = (status: string) => {
    switch(status.toLowerCase()) {
      case 'available':
        return 'success';
      case 'no data':
        return 'error';
      case 'updating':
        return 'warning';
      default:
        return 'default';
    }
  };

  // Function to get pattern status color
  const getPatternStatusColor = (status: string) => {
    switch(status.toLowerCase()) {
      case 'active':
        return 'primary';
      case 'pending':
        return 'warning';
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  // Function to get pattern status icon
  const getPatternStatusIcon = (status: string) => {
    switch(status.toLowerCase()) {
      case 'active':
        return <CheckCircleIcon fontSize="small" color="primary" />;
      case 'pending':
        return <HourglassEmptyIcon fontSize="small" color="warning" />;
      case 'completed':
        return <CheckCircleIcon fontSize="small" color="success" />;
      case 'failed':
        return <ErrorIcon fontSize="small" color="error" />;
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Scanner overview and activity
        </Typography>
      </Box>
      
      <Grid container spacing={3}>
        {/* Scanner Status Section */}
        <Grid item xs={12} md={8}>
          <Paper 
            sx={{ 
              p: 3, 
              height: '100%',
              borderRadius: 2,
              boxShadow: 2
            }}
          >
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Scanner Status
            </Typography>
            <Grid container spacing={2}>
              {scannerStatus.map((scanner) => (
                <Grid item xs={12} sm={6} key={scanner.id}>
                  <Card 
                    variant="outlined" 
                    sx={{ 
                      borderRadius: 2,
                      transition: 'transform 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 2
                      }
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Avatar 
                          sx={{ 
                            bgcolor: scanner.active ? 'primary.main' : 'grey.300',
                            mr: 1
                          }}
                        >
                          {scanner.icon}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {scanner.name}
                          </Typography>
                          <Chip 
                            label={scanner.status}
                            size="small"
                            color={getStatusColor(scanner.status)}
                          />
                        </Box>
                      </Box>
                      
                      <Divider sx={{ my: 1.5 }} />
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                          Last updated: {scanner.lastUpdate}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography variant="body2" fontWeight="medium" sx={{ mr: 1 }}>
                            {scanner.count} patterns
                          </Typography>
                          <Button 
                            size="small" 
                            component={RouterLink} 
                            to={scanner.name.toLowerCase().replace(' ', '-')}
                            variant="contained"
                            disabled={!scanner.active}
                          >
                            View
                          </Button>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
        
        {/* Performance Metrics */}
        <Grid item xs={12} md={4}>
          <Paper 
            sx={{ 
              p: 3, 
              height: '100%',
              borderRadius: 2,
              boxShadow: 2,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Performance Metrics
            </Typography>
            
            <Box sx={{ 
              mt: 2, 
              display: 'flex', 
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              flex: 1
            }}>
              <Box sx={{ position: 'relative', width: 180, height: 180, mb: 3 }}>
                <CircularProgress 
                  variant="determinate" 
                  value={performanceMetrics.successRate} 
                  size={180}
                  thickness={5}
                  sx={{ color: 'success.main' }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography variant="h4" component="div" fontWeight="bold" color="success.main">
                    {performanceMetrics.successRate.toFixed(1)}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Success Rate
                  </Typography>
                </Box>
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" fontWeight="bold" color="success.main">
                      {performanceMetrics.avgGain.toFixed(2)}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Avg Win
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" fontWeight="bold" color="error.main">
                      {performanceMetrics.avgLoss.toFixed(2)}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Avg Loss
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" fontWeight="bold">
                      {performanceMetrics.riskRewardRatio.toFixed(2)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Risk/Reward
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" fontWeight="bold">
                      {performanceMetrics.consistencyScore.toFixed(1)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Consistency
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
              
              <Button 
                variant="outlined" 
                component={RouterLink} 
                to="/backtest"
                sx={{ mt: 3 }}
              >
                View Full Analytics
              </Button>
            </Box>
          </Paper>
        </Grid>
        
        {/* Recent Patterns */}
        <Grid item xs={12}>
          <Paper 
            sx={{ 
              p: 3,
              borderRadius: 2,
              boxShadow: 2
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight="bold">
                Recent Patterns
              </Typography>
              <Tabs 
                value={tabValue} 
                onChange={handleTabChange} 
                aria-label="pattern tabs"
                indicatorColor="primary"
                textColor="primary"
              >
                <Tab label="All" />
                <Tab label="Bullish" />
                <Tab label="Bearish" />
              </Tabs>
            </Box>
            
            <List>
              {recentPatterns
                .filter(pattern => tabValue === 0 || 
                  (tabValue === 1 && pattern.type === 'bullish') || 
                  (tabValue === 2 && pattern.type === 'bearish'))
                .map((pattern) => (
                <React.Fragment key={pattern.id}>
                  <ListItem 
                    sx={{ 
                      py: 1.5,
                      borderRadius: 1,
                      '&:hover': {
                        backgroundColor: 'background.default'
                      }
                    }}
                    secondaryAction={
                      <Button 
                        variant="outlined" 
                        size="small"
                        component={RouterLink}
                        to={`/pattern/${pattern.id}`}
                      >
                        View
                      </Button>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ 
                        bgcolor: pattern.type === 'bullish' ? 'success.lighter' : 'error.lighter',
                        color: pattern.type === 'bullish' ? 'success.main' : 'error.main'
                      }}>
                        {pattern.type === 'bullish' ? <TrendingUpIcon /> : <TrendingDownIcon />}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography variant="subtitle1" fontWeight="medium" sx={{ mr: 1 }}>
                            {pattern.symbol}
                          </Typography>
                          <Chip 
                            label={pattern.pattern}
                            size="small"
                            variant="outlined"
                            sx={{ mr: 1 }}
                          />
                          <Chip 
                            label={pattern.timeframe}
                            size="small"
                            sx={{ mr: 1 }}
                          />
                          <Chip 
                            label={`${pattern.confidence}% confidence`}
                            size="small"
                            color={pattern.confidence >= 85 ? 'success' : pattern.confidence >= 75 ? 'primary' : 'default'}
                          />
                        </Box>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                          {getPatternStatusIcon(pattern.status)}
                          <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5, mr: 2 }}>
                            {pattern.status.charAt(0).toUpperCase() + pattern.status.slice(1)}
                          </Typography>
                          <TimerIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">
                            Created {pattern.created}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mx: 1 }}>
                            •
                          </Typography>
                          <Typography 
                            variant="body2" 
                            color={pattern.status === 'active' || pattern.status === 'pending' ? 'primary.main' : 'text.secondary'}
                          >
                            {pattern.expectedBreakout}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  <Divider component="li" />
                </React.Fragment>
              ))}
            </List>
            
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Button 
                variant="contained" 
                component={RouterLink} 
                to="/golden-scanner"
              >
                View All Patterns
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard; 