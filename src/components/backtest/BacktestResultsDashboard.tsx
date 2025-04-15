import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Alert,
  Divider
} from '@mui/material';
import {
  Timeline as TimelineIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  ShowChart as ShowChartIcon
} from '@mui/icons-material';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import {
  getBacktestResultsFromSupabase,
  calculateBacktestStatistics,
  getHistoricalPerformanceData
} from '../../services/backtesting/supabaseBacktestService';
import { BacktestResult, BacktestStatistics, HistoricalPerformance } from '../../services/types/backtestTypes';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const timeframeOptions = ['1m', '5m', '15m', '30m', '1h', '4h', 'Daily', 'Weekly'];
const directionOptions = ['Bullish', 'Bearish'];
const patternTypeOptions = [
  'Double Top', 'Double Bottom', 'Head And Shoulders', 'Inverse Head And Shoulders',
  'Cup And Handle', 'Inverse Cup And Handle', 'Bull Flag', 'Bear Flag'
];

const BacktestResultsDashboard: React.FC = () => {
  // State
  const [results, setResults] = useState<BacktestResult[]>([]);
  const [statistics, setStatistics] = useState<BacktestStatistics | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalPerformance[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [selectedTimeframes, setSelectedTimeframes] = useState<string[]>([]);
  const [selectedDirections, setSelectedDirections] = useState<string[]>([]);
  const [selectedPatternTypes, setSelectedPatternTypes] = useState<string[]>([]);
  
  // Handle filter changes
  const handleTimeframeChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value as string[];
    setSelectedTimeframes(value);
  };
  
  const handleDirectionChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value as string[];
    setSelectedDirections(value);
  };
  
  const handlePatternTypeChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value as string[];
    setSelectedPatternTypes(value);
  };

  // Fetch backtest results and historical data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch backtest results with filters
        const resultsData = await getBacktestResultsFromSupabase(
          500,
          selectedTimeframes.length > 0 ? selectedTimeframes : undefined,
          selectedDirections.length > 0 ? selectedDirections : undefined,
          selectedPatternTypes.length > 0 ? selectedPatternTypes : undefined
        );
        
        setResults(resultsData);
        
        // Calculate statistics from results
        const calculatedStats = calculateBacktestStatistics(resultsData);
        setStatistics(calculatedStats);
        
        // Fetch historical performance data
        const historicalPerformance = await getHistoricalPerformanceData(30);
        setHistoricalData(historicalPerformance);
      } catch (err) {
        console.error('Error fetching backtest data:', err);
        setError('Failed to load backtest data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [selectedTimeframes, selectedDirections, selectedPatternTypes]);
  
  // Historical performance chart data
  const chartData = useMemo(() => {
    return {
      labels: historicalData.map(point => new Date(point.date).toLocaleDateString()),
      datasets: [
        {
          label: 'Win Rate (%)',
          data: historicalData.map(point => point.winRate),
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          yAxisID: 'y',
        },
        {
          label: 'Profit Factor',
          data: historicalData.map(point => point.profitFactor),
          borderColor: 'rgba(153, 102, 255, 1)',
          backgroundColor: 'rgba(153, 102, 255, 0.2)',
          yAxisID: 'y1',
        }
      ]
    };
  }, [historicalData]);
  
  const chartOptions = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Win Rate (%)'
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: {
          drawOnChartArea: false,
        },
        title: {
          display: true,
          text: 'Profit Factor'
        }
      },
    },
  };
  
  // Format percentage values
  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };
  
  // Format decimal values
  const formatDecimal = (value: number) => {
    return value.toFixed(2);
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="70vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box m={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Backtest Results Dashboard
      </Typography>
      
      {/* Filters */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel id="timeframe-filter-label">Timeframe</InputLabel>
            <Select
              labelId="timeframe-filter-label"
              id="timeframe-filter"
              multiple
              value={selectedTimeframes}
              onChange={handleTimeframeChange}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} />
                  ))}
                </Box>
              )}
            >
              {timeframeOptions.map((timeframe) => (
                <MenuItem key={timeframe} value={timeframe}>
                  {timeframe}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel id="direction-filter-label">Direction</InputLabel>
            <Select
              labelId="direction-filter-label"
              id="direction-filter"
              multiple
              value={selectedDirections}
              onChange={handleDirectionChange}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip 
                      key={value} 
                      label={value} 
                      icon={value === 'Bullish' ? <TrendingUpIcon /> : <TrendingDownIcon />}
                    />
                  ))}
                </Box>
              )}
            >
              {directionOptions.map((direction) => (
                <MenuItem key={direction} value={direction}>
                  {direction}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel id="pattern-filter-label">Pattern Type</InputLabel>
            <Select
              labelId="pattern-filter-label"
              id="pattern-filter"
              multiple
              value={selectedPatternTypes}
              onChange={handlePatternTypeChange}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} />
                  ))}
                </Box>
              )}
            >
              {patternTypeOptions.map((pattern) => (
                <MenuItem key={pattern} value={pattern}>
                  {pattern}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>
      
      {/* Statistics */}
      {statistics && (
        <>
          <Typography variant="h5" gutterBottom>
            Overall Statistics
          </Typography>
          
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Trades
                  </Typography>
                  <Typography variant="h4">
                    {statistics.overall.totalTrades}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Win Rate
                  </Typography>
                  <Typography variant="h4" color={statistics.overall.winRate >= 50 ? 'success.main' : 'error.main'}>
                    {formatPercent(statistics.overall.winRate)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {statistics.overall.wins} wins / {statistics.overall.losses} losses
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Profit Factor
                  </Typography>
                  <Typography variant="h4" color={statistics.overall.profitFactor >= 1 ? 'success.main' : 'error.main'}>
                    {formatDecimal(statistics.overall.profitFactor)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Avg. Candles to Breakout
                  </Typography>
                  <Typography variant="h4">
                    {formatDecimal(statistics.overall.avgCandlesToBreakout)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          {/* Historical Performance Chart */}
          <Typography variant="h5" gutterBottom>
            Historical Performance
          </Typography>
          
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Line data={chartData} options={chartOptions} />
            </CardContent>
          </Card>
          
          {/* Results by Category */}
          <Typography variant="h5" gutterBottom>
            Performance by Category
          </Typography>
          
          <Grid container spacing={3} mb={3}>
            {/* Timeframe Statistics */}
            <Grid item xs={12} lg={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    <TimelineIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                    By Timeframe
                  </Typography>
                  <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Timeframe</TableCell>
                          <TableCell align="right">Trades</TableCell>
                          <TableCell align="right">Win Rate</TableCell>
                          <TableCell align="right">P/F</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.entries(statistics.byTimeframe).map(([timeframe, stats]) => (
                          <TableRow key={timeframe}>
                            <TableCell component="th" scope="row">{timeframe}</TableCell>
                            <TableCell align="right">{stats.totalTrades}</TableCell>
                            <TableCell 
                              align="right" 
                              sx={{ color: stats.winRate >= 50 ? 'success.main' : 'error.main' }}
                            >
                              {formatPercent(stats.winRate)}
                            </TableCell>
                            <TableCell 
                              align="right"
                              sx={{ color: stats.profitFactor >= 1 ? 'success.main' : 'error.main' }}
                            >
                              {formatDecimal(stats.profitFactor)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
            
            {/* Direction Statistics */}
            <Grid item xs={12} lg={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    <ShowChartIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                    By Direction
                  </Typography>
                  <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Direction</TableCell>
                          <TableCell align="right">Trades</TableCell>
                          <TableCell align="right">Win Rate</TableCell>
                          <TableCell align="right">P/F</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.entries(statistics.byDirection).map(([direction, stats]) => (
                          <TableRow key={direction}>
                            <TableCell component="th" scope="row">
                              {direction === 'Bullish' ? (
                                <><TrendingUpIcon fontSize="small" color="success" /> Bullish</>
                              ) : (
                                <><TrendingDownIcon fontSize="small" color="error" /> Bearish</>
                              )}
                            </TableCell>
                            <TableCell align="right">{stats.totalTrades}</TableCell>
                            <TableCell 
                              align="right" 
                              sx={{ color: stats.winRate >= 50 ? 'success.main' : 'error.main' }}
                            >
                              {formatPercent(stats.winRate)}
                            </TableCell>
                            <TableCell 
                              align="right"
                              sx={{ color: stats.profitFactor >= 1 ? 'success.main' : 'error.main' }}
                            >
                              {formatDecimal(stats.profitFactor)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
            
            {/* Pattern Type Statistics */}
            <Grid item xs={12} lg={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    By Pattern Type
                  </Typography>
                  <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Pattern</TableCell>
                          <TableCell align="right">Trades</TableCell>
                          <TableCell align="right">Win Rate</TableCell>
                          <TableCell align="right">P/F</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.entries(statistics.byPatternType).map(([pattern, stats]) => (
                          <TableRow key={pattern}>
                            <TableCell component="th" scope="row">{pattern}</TableCell>
                            <TableCell align="right">{stats.totalTrades}</TableCell>
                            <TableCell 
                              align="right" 
                              sx={{ color: stats.winRate >= 50 ? 'success.main' : 'error.main' }}
                            >
                              {formatPercent(stats.winRate)}
                            </TableCell>
                            <TableCell 
                              align="right"
                              sx={{ color: stats.profitFactor >= 1 ? 'success.main' : 'error.main' }}
                            >
                              {formatDecimal(stats.profitFactor)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          {/* Recent Results Table */}
          <Typography variant="h5" gutterBottom>
            Recent Results
          </Typography>
          
          <TableContainer component={Paper} sx={{ mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Symbol</TableCell>
                  <TableCell>Pattern</TableCell>
                  <TableCell>Direction</TableCell>
                  <TableCell>Timeframe</TableCell>
                  <TableCell align="right">Entry</TableCell>
                  <TableCell align="right">Exit</TableCell>
                  <TableCell align="right">P/L %</TableCell>
                  <TableCell align="right">R:R</TableCell>
                  <TableCell>Result</TableCell>
                  <TableCell>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {results.slice(0, 50).map((result) => (
                  <TableRow key={result.patternId}>
                    <TableCell component="th" scope="row">
                      {result.symbol}
                    </TableCell>
                    <TableCell>{result.patternType}</TableCell>
                    <TableCell>
                      {result.predictedDirection === 'Bullish' ? (
                        <Chip 
                          icon={<TrendingUpIcon />}
                          label="Bullish" 
                          size="small" 
                          color="success" 
                          variant="outlined" 
                        />
                      ) : (
                        <Chip 
                          icon={<TrendingDownIcon />}
                          label="Bearish" 
                          size="small" 
                          color="error" 
                          variant="outlined" 
                        />
                      )}
                    </TableCell>
                    <TableCell>{result.timeframe}</TableCell>
                    <TableCell align="right">${result.entryPrice.toFixed(2)}</TableCell>
                    <TableCell align="right">${result.actualExitPrice.toFixed(2)}</TableCell>
                    <TableCell 
                      align="right"
                      sx={{ 
                        color: result.profitLossPercent > 0 
                          ? 'success.main' 
                          : 'error.main'
                      }}
                    >
                      {result.profitLossPercent > 0 ? '+' : ''}{result.profitLossPercent.toFixed(2)}%
                    </TableCell>
                    <TableCell align="right">{result.riskRewardRatio.toFixed(2)}</TableCell>
                    <TableCell>
                      <Chip 
                        label={result.successful ? 'Win' : 'Loss'} 
                        size="small"
                        color={result.successful ? 'success' : 'error'} 
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(result.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
};

export default BacktestResultsDashboard; 