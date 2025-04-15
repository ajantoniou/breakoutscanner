import React, { useState, useEffect } from 'react';
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
  Tab,
  IconButton,
  Tooltip,
  Alert,
  Stack,
  useTheme,
  Badge,
  CardActions,
  useMediaQuery,
  Theme
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import {
  Refresh as RefreshIcon,
  TrendingUp,
  Warning,
  CheckCircle,
  Error as ErrorIcon,
  Notifications,
  Settings,
} from '@mui/icons-material';

// Mock data for dashboard
const scannerStatus = [
  { 
    id: 1, 
    name: 'Golden Scanner', 
    active: true, 
    status: 'Available', 
    icon: <StarIcon />, 
    lastUpdate: '10 minutes ago', 
    count: 7,
    description: 'High-confidence patterns only',
    nextRun: '5 minutes',
    apiStatus: 'Healthy',
    responsiveness: 98
  },
  { 
    id: 2, 
    name: 'Day Scanner', 
    active: false, 
    status: 'No Data', 
    icon: <ShowChartIcon />, 
    lastUpdate: '2 hours ago', 
    count: 0,
    description: 'Intraday trading signals',
    nextRun: 'Manual start required',
    apiStatus: 'Limited',
    responsiveness: 45
  },
  { 
    id: 3, 
    name: 'Swing Scanner', 
    active: true, 
    status: 'Available', 
    icon: <TrendingUpIcon />, 
    lastUpdate: '45 minutes ago', 
    count: 12,
    description: 'Position trading signals',
    nextRun: '15 minutes',
    apiStatus: 'Healthy',
    responsiveness: 92
  },
  { 
    id: 4, 
    name: 'Backtest Engine', 
    active: true, 
    status: 'Available', 
    icon: <HistoryIcon />, 
    lastUpdate: '1 hour ago', 
    count: 83,
    description: 'Historical pattern validation',
    nextRun: 'On-demand only',
    apiStatus: 'Healthy',
    responsiveness: 99
  }
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
    expectedBreakout: '2 hours from now',
    profitPotential: 2.4,
    stopLoss: 1.1,
    potentialRisk: 'Low',
    volume: 'High'
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
    expectedBreakout: 'In 5 hours',
    profitPotential: 3.2,
    stopLoss: 1.5,
    potentialRisk: 'Medium',
    volume: 'Medium'
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
    expectedBreakout: '1 hour from now',
    profitPotential: 2.8,
    stopLoss: 1.3,
    potentialRisk: 'Medium',
    volume: 'Low'
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
    expectedBreakout: 'Complete (2.3% gain)',
    profitPotential: 2.3,
    stopLoss: 0,
    potentialRisk: 'None',
    volume: 'High'
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
    expectedBreakout: 'Failed (1.1% loss)',
    profitPotential: 0,
    stopLoss: 1.1,
    potentialRisk: 'Realized',
    volume: 'Medium'
  }
];

const performanceMetrics = {
  totalPatterns: 83,
  successRate: 69.88,
  avgGain: 2.26,
  avgLoss: 0.02,
  riskRewardRatio: 99.29,
  consistencyScore: 91.2,
  activePatterns: 19,
  pendingPatterns: 7,
  completedPatterns: 58,
  failedPatterns: 18,
  dayTrading: {
    winRate: 72.4,
    count: 36
  },
  swingTrading: {
    winRate: 67.8,
    count: 47
  }
};

const systemHealth = {
  apiStatus: 'Healthy',
  dataFreshness: 92,
  responseTime: 248,
  databaseSize: '1.2 GB',
  patternAccuracy: 84.3,
  lastSystemUpdate: '2 days ago',
  uptime: '18 days',
  scheduledMaintenance: 'None'
};

const recentAlerts = [
  { id: 1, type: 'warning', message: 'Day scanner requires data refresh', timestamp: '25 minutes ago' },
  { id: 2, type: 'success', message: 'AAPL pattern breakout confirmed', timestamp: '1 hour ago' },
  { id: 3, type: 'info', message: 'System update scheduled for tomorrow', timestamp: '3 hours ago' },
  { id: 4, type: 'error', message: 'TSLA pattern failed to breakout', timestamp: '5 hours ago' }
];

const Dashboard = () => {
  const [tabValue, setTabValue] = useState(0);
  const [activeAlerts, setActiveAlerts] = useState(recentAlerts);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // Function to refresh dashboard data
  const refreshData = () => {
    setIsRefreshing(true);
    // Simulate a refresh
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1500);
  };
  
  // Function to dismiss an alert
  const dismissAlert = (alertId: number) => {
    setActiveAlerts(alerts => alerts.filter(alert => alert.id !== alertId));
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
  
  // Function to get alert type icon
  const getAlertTypeIcon = (type: string) => {
    switch(type.toLowerCase()) {
      case 'success':
        return <CheckCircleIcon color="success" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'info':
      default:
        return <NotificationsIcon color="info" />;
    }
  };

  return (
    <Container 
      maxWidth="xl" 
      sx={{ 
        mt: { xs: 1, sm: 2 }, 
        mb: { xs: 2, sm: 4 },
        px: { xs: 1, sm: 2 } // Smaller padding on mobile
      }}
    >
      <Box sx={{ 
        mb: { xs: 2, sm: 3 }, 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        gap: { xs: 1, sm: 0 },
        justifyContent: 'space-between', 
        alignItems: { xs: 'stretch', sm: 'center' }
      }}>
        <Box>
          <Typography 
            variant="h4" 
            component="h1" 
            fontWeight="bold" 
            gutterBottom
            sx={{ 
              fontSize: { xs: '1.5rem', sm: '2rem' },
              lineHeight: { xs: 1.3, sm: 1.4 }
            }}
          >
            Dashboard
          </Typography>
          <Typography 
            variant="subtitle1" 
            color="text.secondary"
            sx={{ 
              fontSize: { xs: '0.875rem', sm: '1rem' }
            }}
          >
            Scanner overview and activity
          </Typography>
        </Box>
        <Box sx={{ 
          display: 'flex', 
          gap: 1,
          justifyContent: { xs: 'flex-start', sm: 'flex-end' }
        }}>
          <Tooltip title="Refresh dashboard">
            <IconButton 
              onClick={refreshData} 
              disabled={isRefreshing}
              sx={{ 
                bgcolor: 'background.paper',
                '&:hover': { bgcolor: 'action.hover' }
              }}
            >
              {isRefreshing ? <CircularProgress size={24} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Dashboard settings">
            <IconButton 
              component={RouterLink} 
              to="/settings/dashboard"
              sx={{ 
                bgcolor: 'background.paper',
                '&:hover': { bgcolor: 'action.hover' }
              }}
            >
              <TuneIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {/* Alerts section */}
      {activeAlerts.length > 0 && (
        <Box sx={{ mb: { xs: 2, sm: 3 } }}>
          <Stack spacing={1}>
            {activeAlerts.map(alert => (
              <Alert 
                key={alert.id} 
                severity={alert.type as 'success' | 'info' | 'warning' | 'error'}
                onClose={() => dismissAlert(alert.id)}
                icon={getAlertTypeIcon(alert.type)}
                sx={{ 
                  borderRadius: 2,
                  '& .MuiAlert-icon': {
                    alignItems: 'center'
                  },
                  '& .MuiAlert-message': {
                    width: '100%'
                  }
                }}
              >
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: { xs: 0.5, sm: 0 },
                  justifyContent: 'space-between', 
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  width: '100%'
                }}>
                  <Typography variant="body2">{alert.message}</Typography>
                  <Typography 
                    variant="caption" 
                    color="text.secondary"
                    sx={{ 
                      minWidth: { sm: '100px' },
                      textAlign: { sm: 'right' }
                    }}
                  >
                    {alert.timestamp}
                  </Typography>
                </Box>
              </Alert>
            ))}
          </Stack>
        </Box>
      )}
      
      {/* Quick Stats Row */}
      <Grid container spacing={{ xs: 1, sm: 2 }} sx={{ mb: { xs: 2, sm: 3 } }}>
        <Grid item xs={6} md={3}>
          <Card sx={{ 
            borderRadius: 2, 
            boxShadow: 2,
            height: '100%'
          }}>
            <CardContent sx={{ 
              py: { xs: 1.5, sm: 2 },
              px: { xs: 1.5, sm: 2 },
              '&:last-child': { pb: { xs: 1.5, sm: 2 } }
            }}>
              <Typography 
                variant="overline" 
                color="text.secondary"
                sx={{ 
                  fontSize: { xs: '0.625rem', sm: '0.75rem' }
                }}
              >
                Active Patterns
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                <Typography 
                  variant="h4" 
                  component="div" 
                  fontWeight="bold" 
                  sx={{ 
                    mr: 1,
                    fontSize: { xs: '1.5rem', sm: '2rem' }
                  }}
                >
                  {performanceMetrics.activePatterns}
                </Typography>
                <Chip 
                  label={`+${Math.round(performanceMetrics.activePatterns * 0.15)} today`} 
                  color="success" 
                  size="small"
                  sx={{ 
                    height: { xs: 20, sm: 24 },
                    '& .MuiChip-label': {
                      px: { xs: 1, sm: 1.5 },
                      fontSize: { xs: '0.625rem', sm: '0.75rem' }
                    }
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ 
            borderRadius: 2, 
            boxShadow: 2,
            height: '100%'
          }}>
            <CardContent sx={{ 
              py: { xs: 1.5, sm: 2 },
              px: { xs: 1.5, sm: 2 },
              '&:last-child': { pb: { xs: 1.5, sm: 2 } }
            }}>
              <Typography 
                variant="overline" 
                color="text.secondary"
                sx={{ 
                  fontSize: { xs: '0.625rem', sm: '0.75rem' }
                }}
              >
                Win Rate
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                <Typography 
                  variant="h4" 
                  component="div" 
                  fontWeight="bold" 
                  color="success.main" 
                  sx={{ 
                    mr: 1,
                    fontSize: { xs: '1.5rem', sm: '2rem' }
                  }}
                >
                  {performanceMetrics.successRate.toFixed(1)}%
                </Typography>
                <TrendingUpIcon color="success" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ 
            borderRadius: 2, 
            boxShadow: 2,
            height: '100%'
          }}>
            <CardContent sx={{ 
              py: { xs: 1.5, sm: 2 },
              px: { xs: 1.5, sm: 2 },
              '&:last-child': { pb: { xs: 1.5, sm: 2 } }
            }}>
              <Typography 
                variant="overline" 
                color="text.secondary"
                sx={{ 
                  fontSize: { xs: '0.625rem', sm: '0.75rem' }
                }}
              >
                System Health
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                <Typography 
                  variant="h4" 
                  component="div" 
                  fontWeight="bold" 
                  sx={{ 
                    mr: 1,
                    fontSize: { xs: '1.5rem', sm: '2rem' }
                  }}
                >
                  {systemHealth.apiStatus === 'Healthy' ? 'Good' : 'Check'}
                </Typography>
                <Chip 
                  label={systemHealth.apiStatus} 
                  color={systemHealth.apiStatus === 'Healthy' ? 'success' : 'warning'} 
                  size="small"
                  sx={{ 
                    height: { xs: 20, sm: 24 },
                    '& .MuiChip-label': {
                      px: { xs: 1, sm: 1.5 },
                      fontSize: { xs: '0.625rem', sm: '0.75rem' }
                    }
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ 
            borderRadius: 2, 
            boxShadow: 2,
            height: '100%'
          }}>
            <CardContent sx={{ 
              py: { xs: 1.5, sm: 2 },
              px: { xs: 1.5, sm: 2 },
              '&:last-child': { pb: { xs: 1.5, sm: 2 } }
            }}>
              <Typography 
                variant="overline" 
                color="text.secondary"
                sx={{ 
                  fontSize: { xs: '0.625rem', sm: '0.75rem' }
                }}
              >
                Next Pattern
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                <Typography 
                  variant="h4" 
                  component="div" 
                  fontWeight="bold" 
                  sx={{ 
                    mr: 1,
                    fontSize: { xs: '1.5rem', sm: '2rem' }
                  }}
                >
                  ~24 min
                </Typography>
                <TimerIcon color="primary" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      <Grid container spacing={3}>
        {/* Scanner Status Section - Left Column */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ 
            p: { xs: 2, sm: 3 }, 
            height: '100%',
            borderRadius: 2,
            boxShadow: 2
          }}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 1, sm: 0 },
              justifyContent: 'space-between', 
              alignItems: { xs: 'flex-start', sm: 'center' }, 
              mb: 2 
            }}>
              <Typography variant="h6" fontWeight="bold">
                Scanner Status
              </Typography>
              <Button 
                size={isMobile ? "small" : "medium"}
                variant="outlined" 
                startIcon={<AssessmentIcon />}
                component={RouterLink}
                to="/reports/scanners"
              >
                Scanner Report
              </Button>
            </Box>
            
            <Grid container spacing={{ xs: 1, sm: 2 }}>
              {scannerStatus.map((scanner) => (
                <Grid item xs={12} sm={6} key={scanner.id}>
                  <Card 
                    variant="outlined" 
                    sx={{ 
                      borderRadius: 2,
                      borderLeft: '4px solid',
                      borderLeftColor: scanner.active ? 'primary.main' : 'grey.300',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 3
                      }
                    }}
                  >
                    <CardContent sx={{ 
                      p: { xs: 1.5, sm: 2 },
                      '&:last-child': { pb: { xs: 1.5, sm: 2 } }
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Avatar 
                          sx={{ 
                            bgcolor: scanner.active ? 'primary.lighter' : 'grey.200',
                            color: scanner.active ? 'primary.main' : 'text.secondary',
                            mr: 1.5
                          }}
                        >
                          {scanner.icon}
                        </Avatar>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {scanner.name}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Chip 
                              label={scanner.status}
                              size="small"
                              color={getStatusColor(scanner.status)}
                              sx={{ mr: 1 }}
                            />
                            <Typography variant="caption" color="text.secondary">
                              {scanner.count} patterns
                            </Typography>
                          </Box>
                        </Box>
                        <Tooltip title={scanner.active ? "Running" : "Paused"}>
                          <IconButton 
                            size="small" 
                            color={scanner.active ? "primary" : "default"}
                            sx={{ 
                              bgcolor: scanner.active ? 'primary.lighter' : 'grey.100',
                              '&:hover': {
                                bgcolor: scanner.active ? 'primary.light' : 'grey.200',
                              }
                            }}
                          >
                            {scanner.active ? <PlayArrowIcon /> : <PauseIcon />}
                          </IconButton>
                        </Tooltip>
                      </Box>
                      
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                        {scanner.description}
                      </Typography>
                      
                      <Divider sx={{ my: 1.5 }} />
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            Last update: {scanner.lastUpdate}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            Next run: {scanner.nextRun}
                          </Typography>
                        </Box>
                        
                        <Button 
                          size="small" 
                          component={RouterLink} 
                          to={`/${scanner.name.toLowerCase().replace(' ', '-')}`}
                          variant="contained"
                          disabled={!scanner.active}
                          startIcon={<VisibilityIcon />}
                          sx={{ ml: 2 }}
                        >
                          View
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
        
        {/* Performance Metrics - Right Column */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ 
            p: { xs: 2, sm: 3 }, 
            height: '100%',
            borderRadius: 2,
            boxShadow: 2,
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight="bold">
                Performance Metrics
              </Typography>
              <Chip 
                icon={<SpeedIcon fontSize="small" />} 
                label={`Score: ${performanceMetrics.consistencyScore.toFixed(1)}`} 
                color="primary"
              />
            </Box>
            
            <Box sx={{ 
              mt: 1, 
              display: 'flex', 
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              flex: 1
            }}>
              <Box sx={{ position: 'relative', width: 160, height: 160, mb: 3 }}>
                <CircularProgress 
                  variant="determinate" 
                  value={100} 
                  size={160}
                  thickness={4}
                  sx={{ color: theme.palette.mode === 'dark' ? 'grey.800' : 'grey.200' }}
                />
                <CircularProgress 
                  variant="determinate" 
                  value={performanceMetrics.successRate} 
                  size={160}
                  thickness={4}
                  sx={{ 
                    color: 'success.main',
                    position: 'absolute',
                    top: 0,
                    left: 0
                  }}
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
              
              <Box sx={{ width: '100%', mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Pattern Status Breakdown
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Box sx={{ bgcolor: 'primary.lighter', p: 1, borderRadius: 1 }}>
                      <Typography variant="h5" color="primary.main" fontWeight="bold" align="center">
                        {performanceMetrics.activePatterns}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" align="center" sx={{ display: 'block' }}>
                        Active
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ bgcolor: 'warning.lighter', p: 1, borderRadius: 1 }}>
                      <Typography variant="h5" color="warning.main" fontWeight="bold" align="center">
                        {performanceMetrics.pendingPatterns}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" align="center" sx={{ display: 'block' }}>
                        Pending
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ bgcolor: 'success.lighter', p: 1, borderRadius: 1, mt: 1 }}>
                      <Typography variant="h5" color="success.main" fontWeight="bold" align="center">
                        {performanceMetrics.completedPatterns}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" align="center" sx={{ display: 'block' }}>
                        Completed
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ bgcolor: 'error.lighter', p: 1, borderRadius: 1, mt: 1 }}>
                      <Typography variant="h5" color="error.main" fontWeight="bold" align="center">
                        {performanceMetrics.failedPatterns}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" align="center" sx={{ display: 'block' }}>
                        Failed
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
              
              <Divider sx={{ width: '100%', my: 2 }} />
              
              <Box sx={{ width: '100%' }}>
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
                        {performanceMetrics.totalPatterns}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Total Patterns
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
              
              <Button 
                variant="outlined" 
                component={RouterLink} 
                to="/backtest"
                sx={{ mt: 3 }}
                startIcon={<AssessmentIcon />}
              >
                View Full Analytics
              </Button>
            </Box>
          </Paper>
        </Grid>
        
        {/* Recent Patterns - Full Width */}
        <Grid item xs={12}>
          <Paper sx={{ 
            p: { xs: 2, sm: 3 },
            borderRadius: 2,
            boxShadow: 2
          }}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 1, sm: 0 },
              justifyContent: 'space-between', 
              alignItems: { xs: 'flex-start', sm: 'center' }, 
              mb: 2 
            }}>
              <Typography variant="h6" fontWeight="bold">
                Recent Patterns
              </Typography>
              <Box sx={{ width: { xs: '100%', sm: 'auto' } }}>
                <Tabs 
                  value={tabValue} 
                  onChange={handleTabChange} 
                  aria-label="pattern tabs"
                  indicatorColor="primary"
                  textColor="primary"
                  variant={isMobile ? "fullWidth" : "standard"}
                  sx={{
                    minHeight: { xs: 36, sm: 48 },
                    '& .MuiTab-root': {
                      minHeight: { xs: 36, sm: 48 },
                      fontSize: { xs: '0.75rem', sm: '0.875rem' }
                    }
                  }}
                >
                  <Tab label="All" />
                  <Tab label="Bullish" />
                  <Tab label="Bearish" />
                </Tabs>
              </Box>
            </Box>
            
            <List sx={{ 
              '& .MuiListItem-root': {
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'flex-start', sm: 'center' },
                gap: { xs: 1, sm: 0 },
                py: { xs: 1, sm: 1.5 }
              }
            }}>
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
                      transition: 'background-color 0.2s',
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
                        startIcon={<VisibilityIcon />}
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
                        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}>
                          <Typography variant="subtitle1" fontWeight="medium">
                            {pattern.symbol}
                          </Typography>
                          <Chip 
                            label={pattern.pattern}
                            size="small"
                            variant="outlined"
                          />
                          <Chip 
                            label={pattern.timeframe}
                            size="small"
                          />
                          <Chip 
                            label={`${pattern.confidence}% confidence`}
                            size="small"
                            color={pattern.confidence >= 85 ? 'success' : pattern.confidence >= 75 ? 'primary' : 'default'}
                          />
                          {pattern.status && (
                            <Chip
                              icon={getPatternStatusIcon(pattern.status)}
                              label={pattern.status.charAt(0).toUpperCase() + pattern.status.slice(1)}
                              size="small"
                              color={getPatternStatusColor(pattern.status) as "primary" | "secondary" | "error" | "info" | "success" | "warning" | undefined}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5, flexWrap: 'wrap' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                            <TimerIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                              Created {pattern.created}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <UpdateIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                            <Typography 
                              variant="body2" 
                              color={pattern.status === 'active' || pattern.status === 'pending' ? 'primary.main' : 'text.secondary'}
                            >
                              {pattern.expectedBreakout}
                            </Typography>
                          </Box>
                          {pattern.profitPotential > 0 && (
                            <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
                              <TrendingUpIcon fontSize="small" sx={{ mr: 0.5, color: 'success.main' }} />
                              <Typography variant="body2" color="success.main">
                                Target: +{pattern.profitPotential.toFixed(1)}%
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                  <Divider component="li" />
                </React.Fragment>
              ))}
            </List>
            
            <Box sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 1, sm: 2 },
              justifyContent: 'center', 
              mt: 2 
            }}>
              <Button 
                variant="contained" 
                component={RouterLink} 
                to="/golden-scanner"
                fullWidth={isMobile}
                size={isMobile ? "small" : "medium"}
              >
                View All Patterns
              </Button>
              <Button 
                variant="outlined"
                component={RouterLink}
                to="/patterns/completed"
                fullWidth={isMobile}
                size={isMobile ? "small" : "medium"}
              >
                View Trade History
              </Button>
            </Box>
          </Paper>
        </Grid>
        
        {/* System Health */}
        <Grid item xs={12}>
          <Paper sx={{ 
            p: { xs: 2, sm: 3 },
            borderRadius: 2,
            boxShadow: 2
          }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              System Health
            </Typography>
            
            <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mt: { xs: 0.5, sm: 1 } }}>
              <Grid item xs={6} md={3}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    API Status
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body1" fontWeight="medium">
                      {systemHealth.apiStatus}
                    </Typography>
                    <Box 
                      sx={{ 
                        width: 10, 
                        height: 10, 
                        borderRadius: '50%',
                        bgcolor: systemHealth.apiStatus === 'Healthy' ? 'success.main' : 'warning.main',
                        ml: 1
                      }} 
                    />
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Data Freshness
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body1" fontWeight="medium">
                      {systemHealth.dataFreshness}%
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={systemHealth.dataFreshness} 
                      sx={{ ml: 1, flexGrow: 1, height: 6, borderRadius: 3 }}
                    />
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Response Time
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {systemHealth.responseTime} ms
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Pattern Accuracy
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {systemHealth.patternAccuracy}%
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard; 