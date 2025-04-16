import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader,
  Divider, 
  Typography, 
  Box, 
  Grid, 
  Chip, 
  LinearProgress, 
  Tabs, 
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import { RealTimeDataManager } from '@/services/api/marketData/realTimeDataManager';

interface PerformanceMetricsWidgetProps {
  title?: string;
}

const PerformanceMetricsWidget: React.FC<PerformanceMetricsWidgetProps> = ({ title = "Live Performance Metrics" }) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [tabValue, setTabValue] = useState<number>(0);
  const [dataManager] = useState<RealTimeDataManager>(RealTimeDataManager.getInstance());

  useEffect(() => {
    // Initial fetch of metrics
    fetchMetrics();
    
    // Setup periodic refresh of metrics
    const intervalId = setInterval(fetchMetrics, 60000); // Update every minute
    
    return () => clearInterval(intervalId);
  }, []);

  const fetchMetrics = () => {
    try {
      const performanceMetrics = dataManager.getPatternPerformanceMetrics();
      setMetrics(performanceMetrics);
    } catch (error) {
      console.error("Error fetching performance metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const formatRatio = (value: number) => {
    return value.toFixed(2);
  };

  const getWinRateColor = (winRate: number) => {
    if (winRate >= 70) return 'success';
    if (winRate >= 50) return 'warning';
    return 'error';
  };

  const getRiskRewardColor = (ratio: number) => {
    if (ratio >= 2) return 'success';
    if (ratio >= 1) return 'warning';
    return 'error';
  };

  if (loading) {
    return (
      <Card elevation={3} sx={{ height: '100%', borderRadius: 2 }}>
        <CardHeader title={title} />
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <LinearProgress sx={{ width: '80%' }} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (!metrics || metrics.totalPatterns === 0) {
    return (
      <Card elevation={3} sx={{ height: '100%', borderRadius: 2 }}>
        <CardHeader title={title} />
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <Typography variant="body1" color="text.secondary">
              No pattern performance data available yet. Patterns will be tracked as they are detected.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card elevation={3} sx={{ height: '100%', borderRadius: 2 }}>
      <CardHeader 
        title={title} 
        action={
          <Chip 
            label={`${metrics.totalPatterns} Patterns`} 
            color="primary" 
            size="small" 
            sx={{ fontWeight: 'bold' }}
          />
        }
      />
      <Divider />
      
      <Tabs 
        value={tabValue} 
        onChange={handleTabChange} 
        aria-label="performance tabs"
        variant="fullWidth"
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Overview" />
        <Tab label="By Pattern Type" />
        <Tab label="Performance Data" />
      </Tabs>
      
      <CardContent>
        {tabValue === 0 && (
          <Box>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={4}>
                <Box sx={{ textAlign: 'center', p: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Win Rate
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color={getWinRateColor(metrics.winRate)}>
                    {formatPercentage(metrics.winRate)}
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.min(metrics.winRate, 100)} 
                    color={getWinRateColor(metrics.winRate) as "success" | "warning" | "error"}
                    sx={{ mt: 1, height: 6, borderRadius: 1 }}
                  />
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <Box sx={{ textAlign: 'center', p: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Risk/Reward Ratio
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color={getRiskRewardColor(metrics.riskRewardRatio)}>
                    {formatRatio(metrics.riskRewardRatio)}
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.min(metrics.riskRewardRatio * 25, 100)} 
                    color={getRiskRewardColor(metrics.riskRewardRatio) as "success" | "warning" | "error"}
                    sx={{ mt: 1, height: 6, borderRadius: 1 }}
                  />
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <Box sx={{ textAlign: 'center', p: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Profit Factor
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="primary">
                    {formatRatio(metrics.profitFactor)}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
            
            <Divider sx={{ my: 2 }} />
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ textAlign: 'center', p: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Average Win
                  </Typography>
                  <Typography variant="h6" fontWeight="bold" color="success.main">
                    {formatPercentage(metrics.averageProfit)}
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Box sx={{ textAlign: 'center', p: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Average Loss
                  </Typography>
                  <Typography variant="h6" fontWeight="bold" color="error.main">
                    {formatPercentage(metrics.averageLoss)}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                Pattern Status
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Chip 
                    label={`${metrics.pendingPatterns} Active`} 
                    color="primary" 
                    variant="outlined"
                    size="small"
                    sx={{ width: '100%' }}
                  />
                </Grid>
                <Grid item xs={4}>
                  <Chip 
                    label={`${metrics.successfulPatterns} Successful`} 
                    color="success" 
                    variant="outlined"
                    size="small"
                    sx={{ width: '100%' }}
                  />
                </Grid>
                <Grid item xs={4}>
                  <Chip 
                    label={`${metrics.failedPatterns} Failed`} 
                    color="error" 
                    variant="outlined"
                    size="small"
                    sx={{ width: '100%' }}
                  />
                </Grid>
              </Grid>
            </Box>
          </Box>
        )}
        
        {tabValue === 1 && (
          <TableContainer component={Paper} sx={{ maxHeight: 300, overflow: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Pattern Type</TableCell>
                  <TableCell align="right">Count</TableCell>
                  <TableCell align="right">Win Rate</TableCell>
                  <TableCell align="right">Avg. Profit</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {metrics.byPatternType && Object.entries(metrics.byPatternType).map(([patternType, typeMetrics]: [string, any]) => (
                  <TableRow key={patternType}>
                    <TableCell component="th" scope="row">
                      {patternType}
                    </TableCell>
                    <TableCell align="right">{typeMetrics.total}</TableCell>
                    <TableCell align="right">
                      <Typography 
                        color={getWinRateColor(typeMetrics.winRate)}
                        fontWeight="medium"
                      >
                        {formatPercentage(typeMetrics.winRate)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography 
                        color={typeMetrics.averageProfit > 0 ? 'success.main' : 'error.main'}
                        fontWeight="medium"
                      >
                        {formatPercentage(typeMetrics.averageProfit)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
                {(!metrics.byPatternType || Object.keys(metrics.byPatternType).length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      No pattern type data available yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        
        {tabValue === 2 && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Best Performance
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Max Profit:</strong> {formatPercentage(metrics.maxProfit)}
              </Typography>
              <Typography variant="body2">
                <strong>Strongest Pattern:</strong> {
                  metrics.byPatternType ? 
                  Object.entries(metrics.byPatternType)
                    .filter(([, m]: [string, any]) => m.completed > 0)
                    .sort(([, a]: [string, any], [, b]: [string, any]) => b.winRate - a.winRate)[0]?.[0] || 'N/A' 
                  : 'N/A'
                }
              </Typography>
            </Box>
            
            <Typography variant="subtitle2" gutterBottom>
              Metrics Breakdown
            </Typography>
            <TableContainer component={Paper} sx={{ maxHeight: 200 }}>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell>Total Patterns</TableCell>
                    <TableCell align="right">{metrics.totalPatterns}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Completed Patterns</TableCell>
                    <TableCell align="right">{metrics.completedPatterns}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Success Rate</TableCell>
                    <TableCell align="right">{formatPercentage(metrics.winRate)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Risk/Reward</TableCell>
                    <TableCell align="right">{formatRatio(metrics.riskRewardRatio)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Profit Factor</TableCell>
                    <TableCell align="right">{formatRatio(metrics.profitFactor)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
            
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
              Performance metrics based on real market data from Polygon.io
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default PerformanceMetricsWidget; 