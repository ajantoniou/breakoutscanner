import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, Chip } from '@mui/material';
import PatternBacktester from '@/services/analytics/patternBacktester';

// Use the actual interface from the PatternBacktester
interface TypeMetrics {
  total: number;
  active: number;
  completed: number;
  success: number;
  failure: number;
  winRate: number;
  averageProfit: number;
  averageLoss: number;
  riskRewardRatio: number;
}

interface PerformanceMetrics {
  totalPatterns: number;
  completedPatterns: number;
  successfulPatterns: number;
  failedPatterns: number;
  pendingPatterns: number;
  averageProfit: number;
  averageLoss: number;
  maxProfit: number;
  maxLoss: number;
  riskRewardRatio: number;
  winRate: number;
  profitFactor: number;
  byPatternType: Record<string, TypeMetrics>;
}

const BacktestResults: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBacktestData = async () => {
      try {
        setLoading(true);
        // Get real data from the PatternBacktester
        const backtester = PatternBacktester.getInstance();
        const realBacktestMetrics = backtester.getPerformanceMetrics();
        
        setMetrics(realBacktestMetrics);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching backtest data:', err);
        setError('Failed to load backtest results. Please try again.');
        setLoading(false);
      }
    };

    fetchBacktestData();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (!metrics) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>No backtest data available. Run a backtest to see results.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>
        Real Backtest Results
      </Typography>
      
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Overall Performance</Typography>
        <TableContainer>
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell component="th" scope="row">Total Patterns</TableCell>
                <TableCell align="right">{metrics.totalPatterns}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row">Completed Patterns</TableCell>
                <TableCell align="right">{metrics.completedPatterns}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row">Win Rate</TableCell>
                <TableCell align="right">
                  <Chip 
                    label={`${(metrics.winRate * 100).toFixed(2)}%`} 
                    color={metrics.winRate > 0.6 ? "success" : metrics.winRate > 0.5 ? "warning" : "error"}
                    size="small"
                  />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row">Average Profit</TableCell>
                <TableCell align="right">{metrics.averageProfit.toFixed(2)}%</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row">Average Loss</TableCell>
                <TableCell align="right">{metrics.averageLoss.toFixed(2)}%</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row">Risk/Reward Ratio</TableCell>
                <TableCell align="right">{metrics.riskRewardRatio.toFixed(2)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row">Profit Factor</TableCell>
                <TableCell align="right">{metrics.profitFactor.toFixed(2)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row">Max Profit</TableCell>
                <TableCell align="right">{metrics.maxProfit.toFixed(2)}%</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row">Max Loss</TableCell>
                <TableCell align="right">{metrics.maxLoss.toFixed(2)}%</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {metrics.byPatternType && (
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Performance by Pattern Type</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Pattern Type</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="right">Completed</TableCell>
                  <TableCell align="right">Success</TableCell>
                  <TableCell align="right">Win Rate</TableCell>
                  <TableCell align="right">Avg. Profit</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(metrics.byPatternType).map(([patternType, data]) => (
                  <TableRow key={patternType}>
                    <TableCell component="th" scope="row">
                      {patternType.charAt(0).toUpperCase() + patternType.slice(1)}
                    </TableCell>
                    <TableCell align="right">{data.total}</TableCell>
                    <TableCell align="right">{data.completed}</TableCell>
                    <TableCell align="right">{data.success}</TableCell>
                    <TableCell align="right">
                      <Chip 
                        label={`${(data.winRate * 100).toFixed(2)}%`} 
                        color={data.winRate > 0.6 ? "success" : data.winRate > 0.5 ? "warning" : "error"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">{data.averageProfit.toFixed(2)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
};

export default BacktestResults; 