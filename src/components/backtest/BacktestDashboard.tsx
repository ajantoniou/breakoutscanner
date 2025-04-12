/**
 * Backtesting Dashboard Component
 * Allows users to run and view backtest results
 */

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  CircularProgress, 
  Grid, 
  Card, 
  CardContent, 
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField
} from '@mui/material';
import { 
  fetchBacktestResults, 
  runBacktest, 
  fetchPerformanceMetrics, 
  generatePerformanceSummary 
} from '@/services/api/apiService';
import { BacktestResult } from '@/services/backtesting/backtestingFramework';
import { PerformanceMetrics } from '@/services/backtesting/performanceAnalysis';
import { PatternData } from '@/services/types/patternTypes';
import { BreakoutData } from '@/services/api/marketData/patternDetection/breakoutDetector';

interface BacktestDashboardProps {
  signals: (PatternData | BreakoutData)[];
}

const BacktestDashboard: React.FC<BacktestDashboardProps> = ({ signals }) => {
  // State for backtest results
  const [backtestResults, setBacktestResults] = useState<BacktestResult[]>([]);
  
  // State for performance metrics
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  
  // State for performance summary
  const [performanceSummary, setPerformanceSummary] = useState<string>('');
  
  // State for loading status
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // State for backtest parameters
  const [maxDaysToHold, setMaxDaysToHold] = useState<number>(30);
  const [selectedSignals, setSelectedSignals] = useState<(PatternData | BreakoutData)[]>([]);
  
  // Fetch initial backtest results on component mount
  useEffect(() => {
    fetchInitialData();
  }, []);
  
  // Function to fetch initial data
  const fetchInitialData = async () => {
    setIsLoading(true);
    
    try {
      // Fetch backtest results
      const results = await fetchBacktestResults();
      setBacktestResults(results);
      
      // Fetch performance metrics
      const metrics = await fetchPerformanceMetrics();
      setPerformanceMetrics(metrics);
      
      // Generate performance summary
      const summary = await generatePerformanceSummary();
      setPerformanceSummary(summary);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to run backtest
  const handleRunBacktest = async () => {
    setIsLoading(true);
    
    try {
      // Run backtest on selected signals or all signals if none selected
      const signalsToTest = selectedSignals.length > 0 ? selectedSignals : signals;
      
      // Run backtest
      const results = await runBacktest(signalsToTest, maxDaysToHold);
      setBacktestResults(results);
      
      // Fetch updated performance metrics
      const metrics = await fetchPerformanceMetrics();
      setPerformanceMetrics(metrics);
      
      // Generate updated performance summary
      const summary = await generatePerformanceSummary();
      setPerformanceSummary(summary);
    } catch (error) {
      console.error('Error running backtest:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to handle max days to hold change
  const handleMaxDaysChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value);
    if (!isNaN(value) && value > 0) {
      setMaxDaysToHold(value);
    }
  };
  
  // Function to handle signal selection change
  const handleSignalSelectionChange = (event: any) => {
    const selectedIds = event.target.value as string[];
    const selected = signals.filter(signal => selectedIds.includes(signal.id));
    setSelectedSignals(selected);
  };
  
  return (
    <Box sx={{ width: '100%', p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Backtesting Dashboard
      </Typography>
      
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Backtest Parameters
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <TextField
                  label="Max Days to Hold"
                  type="number"
                  value={maxDaysToHold}
                  onChange={handleMaxDaysChange}
                  fullWidth
                  InputProps={{ inputProps: { min: 1 } }}
                />
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <FormControl fullWidth>
                  <InputLabel id="signal-select-label">Signals to Test</InputLabel>
                  <Select
                    labelId="signal-select-label"
                    id="signal-select"
                    multiple
                    value={selectedSignals.map(signal => signal.id)}
                    onChange={handleSignalSelectionChange}
                    renderValue={(selected) => `${selected.length} signals selected`}
                  >
                    {signals.map((signal) => (
                      <MenuItem key={signal.id} value={signal.id}>
                        {signal.symbol} - {
                          'patternType' in signal ? signal.patternType : signal.breakoutType
                        } ({signal.timeframe})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleRunBacktest}
                disabled={isLoading}
                fullWidth
                startIcon={isLoading ? <CircularProgress size={20} /> : null}
              >
                {isLoading ? 'Running Backtest...' : 'Run Backtest'}
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance Metrics
              </Typography>
              
              {performanceMetrics ? (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Total Trades:</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {performanceMetrics.totalTrades}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Win Rate:</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {(performanceMetrics.winRate * 100).toFixed(2)}%
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Avg Profit/Loss:</Typography>
                    <Typography 
                      variant="body2" 
                      fontWeight="bold"
                      color={performanceMetrics.averageProfitLoss >= 0 ? 'success.main' : 'error.main'}
                    >
                      {performanceMetrics.averageProfitLoss.toFixed(2)}%
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Profit Factor:</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {performanceMetrics.profitFactor.toFixed(2)}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Max Drawdown:</Typography>
                    <Typography variant="body2" fontWeight="bold" color="error.main">
                      {performanceMetrics.maxDrawdown.toFixed(2)}%
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Avg Holding Period:</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {performanceMetrics.averageHoldingPeriod.toFixed(1)} days
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Risk/Reward Ratio:</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      1:{performanceMetrics.riskRewardRatio.toFixed(2)}
                    </Typography>
                  </Box>
                </Box>
              ) : (
                <Typography variant="body2" align="center" sx={{ p: 2 }}>
                  No performance metrics available. Run a backtest to generate metrics.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Backtest Results
              </Typography>
              
              {backtestResults.length > 0 ? (
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Symbol</TableCell>
                        <TableCell>Pattern</TableCell>
                        <TableCell>Direction</TableCell>
                        <TableCell>Entry</TableCell>
                        <TableCell>Exit</TableCell>
                        <TableCell>P/L %</TableCell>
                        <TableCell>Days</TableCell>
                        <TableCell>Result</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {backtestResults.slice(0, 10).map((result) => (
                        <TableRow key={result.id}>
                          <TableCell>{result.symbol}</TableCell>
                          <TableCell>{result.signalType}</TableCell>
                          <TableCell>
                            <Chip 
                              label={result.direction} 
                              color={result.direction === 'bullish' ? 'success' : 'error'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>${result.entryPrice.toFixed(2)}</TableCell>
                          <TableCell>${result.exitPrice.toFixed(2)}</TableCell>
                          <TableCell 
                            sx={{ 
                              color: result.profitLossPercent >= 0 ? 'success.main' : 'error.main',
                              fontWeight: 'bold'
                            }}
                          >
                            {result.profitLossPercent.toFixed(2)}%
                          </TableCell>
                          <TableCell>{result.daysToExit}</TableCell>
                          <TableCell>
                            <Chip 
                              label={result.successful ? 'Win' : 'Loss'} 
                              color={result.successful ? 'success' : 'error'}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" align="center" sx={{ p: 2 }}>
                  No backtest results available. Run a backtest to see results.
                </Typography>
              )}
              
              {backtestResults.length > 10 && (
                <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                  Showing 10 of {backtestResults.length} results
                </Typography>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance Summary
              </Typography>
              
              {performanceSummary ? (
                <Box sx={{ whiteSpace: 'pre-line', maxHeight: '400px', overflow: 'auto' }}>
                  <Typography variant="body2">
                    {performanceSummary}
                  </Typography>
                </Box>
              ) : (
                <Typography variant="body2" align="center" sx={{ p: 2 }}>
                  No performance summary available. Run a backtest to generate a summary.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default BacktestDashboard;
