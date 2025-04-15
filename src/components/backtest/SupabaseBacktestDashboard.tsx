import React, { useEffect, useState, useMemo } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Grid, 
  CircularProgress, 
  Tabs, 
  Tab, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Chip, 
  Stack, 
  Alert
} from '@mui/material';
import { 
  fetchBacktestResults, 
  calculateBacktestStatistics,
  generateHistoricalPerformance 
} from '../../services/backtesting/supabaseBacktestService';
import { 
  BacktestResult, 
  BacktestStatistics, 
  BacktestFilter, 
  HistoricalPerformance 
} from '../../services/types/backtestTypes';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const SupabaseBacktestDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<BacktestResult[]>([]);
  const [statistics, setStatistics] = useState<BacktestStatistics | null>(null);
  const [historicalPerformance, setHistoricalPerformance] = useState<HistoricalPerformance[]>([]);
  const [tabValue, setTabValue] = useState(0);
  const [filters, setFilters] = useState<BacktestFilter>({});

  // Available filter options
  const timeframes = useMemo(() => 
    [...new Set(results.map(r => r.timeframe))], [results]);
  
  const directions = useMemo(() => 
    [...new Set(results.map(r => r.direction))], [results]);
  
  const patternTypes = useMemo(() => 
    [...new Set(results.map(r => r.patternType))], [results]);

  // Load backtest data
  useEffect(() => {
    const loadBacktestData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const backtestResults = await fetchBacktestResults(filters);
        setResults(backtestResults);
        
        const stats = calculateBacktestStatistics(backtestResults);
        setStatistics(stats);
        
        const historicalData = generateHistoricalPerformance(backtestResults);
        setHistoricalPerformance(historicalData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    loadBacktestData();
  }, [filters]);

  // Handle tab changes
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Handle filter changes
  const handleFilterChange = (filterType: keyof BacktestFilter, value: any) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value === 'all' ? undefined : value
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({});
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Error loading backtest data: {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Backtest Results Dashboard
      </Typography>
      
      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Filters
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel id="timeframe-label">Timeframe</InputLabel>
                <Select
                  labelId="timeframe-label"
                  value={filters.timeframe || 'all'}
                  label="Timeframe"
                  onChange={(e) => handleFilterChange('timeframe', e.target.value)}
                >
                  <MenuItem value="all">All Timeframes</MenuItem>
                  {timeframes.map(tf => (
                    <MenuItem key={tf} value={tf}>{tf}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel id="direction-label">Direction</InputLabel>
                <Select
                  labelId="direction-label"
                  value={filters.direction || 'all'}
                  label="Direction"
                  onChange={(e) => handleFilterChange('direction', e.target.value)}
                >
                  <MenuItem value="all">All Directions</MenuItem>
                  {directions.map(dir => (
                    <MenuItem key={dir} value={dir}>{dir}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel id="patternType-label">Pattern Type</InputLabel>
                <Select
                  labelId="patternType-label"
                  value={filters.patternType || 'all'}
                  label="Pattern Type"
                  onChange={(e) => handleFilterChange('patternType', e.target.value)}
                >
                  <MenuItem value="all">All Patterns</MenuItem>
                  {patternTypes.map(pt => (
                    <MenuItem key={pt} value={pt}>{pt}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={3}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Chip 
                  label="Clear Filters" 
                  onClick={clearFilters}
                  color="primary"
                  variant="outlined"
                />
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      
      {/* Stats Summary */}
      {statistics && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Summary Statistics
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" color="text.secondary">
                  Total Trades
                </Typography>
                <Typography variant="h5">
                  {statistics.overall.totalTrades}
                </Typography>
              </Grid>
              
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" color="text.secondary">
                  Win Rate
                </Typography>
                <Typography variant="h5">
                  {(statistics.overall.winRate * 100).toFixed(1)}%
                </Typography>
              </Grid>
              
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" color="text.secondary">
                  Profit Factor
                </Typography>
                <Typography variant="h5">
                  {statistics.overall.profitFactor.toFixed(2)}
                </Typography>
              </Grid>
              
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" color="text.secondary">
                  Avg. Candles to Breakout
                </Typography>
                <Typography variant="h5">
                  {statistics.overall.avgCandlesToBreakout.toFixed(1)}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}
      
      {/* Tabs for different views */}
      <Box sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="backtest tabs">
            <Tab label="Historical Performance" />
            <Tab label="Pattern Type Analysis" />
            <Tab label="Timeframe Analysis" />
            <Tab label="Direction Analysis" />
            <Tab label="Confidence Analysis" />
          </Tabs>
        </Box>
        
        {/* Historical Performance */}
        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom>
            Historical Performance
          </Typography>
          
          {historicalPerformance.length > 0 ? (
            <Box sx={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={historicalPerformance}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" orientation="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="winRate"
                    name="Win Rate"
                    stroke="#8884d8"
                    activeDot={{ r: 8 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="profitFactor"
                    name="Profit Factor"
                    stroke="#82ca9d"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          ) : (
            <Alert severity="info">
              No historical data available for the selected filters.
            </Alert>
          )}
        </TabPanel>
        
        {/* Pattern Type Analysis */}
        <TabPanel value={tabValue} index={1}>
          {statistics && Object.keys(statistics.byPatternType).length > 0 ? (
            <>
              <Typography variant="h6" gutterBottom>
                Performance by Pattern Type
              </Typography>
              
              <Box sx={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={Object.entries(statistics.byPatternType).map(([type, stats]) => ({
                      name: type,
                      winRate: +(stats.winRate * 100).toFixed(1),
                      profitFactor: +stats.profitFactor.toFixed(2),
                      trades: stats.totalTrades
                    }))}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="winRate" name="Win Rate (%)" fill="#8884d8" />
                    <Bar dataKey="profitFactor" name="Profit Factor" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Detailed Statistics by Pattern Type
                </Typography>
                <Grid container spacing={2}>
                  {Object.entries(statistics.byPatternType).map(([type, stats]) => (
                    <Grid item xs={12} sm={6} md={4} key={type}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            {type}
                          </Typography>
                          <Stack spacing={1}>
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                Total Trades
                              </Typography>
                              <Typography variant="body1">
                                {stats.totalTrades}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                Win Rate
                              </Typography>
                              <Typography variant="body1">
                                {(stats.winRate * 100).toFixed(1)}%
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                Profit Factor
                              </Typography>
                              <Typography variant="body1">
                                {stats.profitFactor.toFixed(2)}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                Avg. Profit %
                              </Typography>
                              <Typography variant="body1">
                                {stats.avgProfitPercent.toFixed(2)}%
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                Avg. Loss %
                              </Typography>
                              <Typography variant="body1">
                                {stats.avgLossPercent.toFixed(2)}%
                              </Typography>
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </>
          ) : (
            <Alert severity="info">
              No pattern type data available for the selected filters.
            </Alert>
          )}
        </TabPanel>
        
        {/* Timeframe Analysis */}
        <TabPanel value={tabValue} index={2}>
          {statistics && Object.keys(statistics.byTimeframe).length > 0 ? (
            <>
              <Typography variant="h6" gutterBottom>
                Performance by Timeframe
              </Typography>
              
              <Box sx={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={Object.entries(statistics.byTimeframe).map(([timeframe, stats]) => ({
                      name: timeframe,
                      winRate: +(stats.winRate * 100).toFixed(1),
                      profitFactor: +stats.profitFactor.toFixed(2),
                      trades: stats.totalTrades
                    }))}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="winRate" name="Win Rate (%)" fill="#8884d8" />
                    <Bar dataKey="profitFactor" name="Profit Factor" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Detailed Statistics by Timeframe
                </Typography>
                <Grid container spacing={2}>
                  {Object.entries(statistics.byTimeframe).map(([timeframe, stats]) => (
                    <Grid item xs={12} sm={6} md={4} key={timeframe}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            {timeframe}
                          </Typography>
                          <Stack spacing={1}>
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                Total Trades
                              </Typography>
                              <Typography variant="body1">
                                {stats.totalTrades}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                Win Rate
                              </Typography>
                              <Typography variant="body1">
                                {(stats.winRate * 100).toFixed(1)}%
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                Profit Factor
                              </Typography>
                              <Typography variant="body1">
                                {stats.profitFactor.toFixed(2)}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                Avg. Candles to Breakout
                              </Typography>
                              <Typography variant="body1">
                                {stats.avgCandlesToBreakout.toFixed(1)}
                              </Typography>
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </>
          ) : (
            <Alert severity="info">
              No timeframe data available for the selected filters.
            </Alert>
          )}
        </TabPanel>
        
        {/* Direction Analysis */}
        <TabPanel value={tabValue} index={3}>
          {statistics && Object.keys(statistics.byDirection).length > 0 ? (
            <>
              <Typography variant="h6" gutterBottom>
                Performance by Direction
              </Typography>
              
              <Box sx={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={Object.entries(statistics.byDirection).map(([direction, stats]) => ({
                      name: direction,
                      winRate: +(stats.winRate * 100).toFixed(1),
                      profitFactor: +stats.profitFactor.toFixed(2),
                      trades: stats.totalTrades
                    }))}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="winRate" name="Win Rate (%)" fill="#8884d8" />
                    <Bar dataKey="profitFactor" name="Profit Factor" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Detailed Statistics by Direction
                </Typography>
                <Grid container spacing={2}>
                  {Object.entries(statistics.byDirection).map(([direction, stats]) => (
                    <Grid item xs={12} sm={6} key={direction}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            {direction}
                          </Typography>
                          <Stack spacing={1}>
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                Total Trades
                              </Typography>
                              <Typography variant="body1">
                                {stats.totalTrades}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                Win Rate
                              </Typography>
                              <Typography variant="body1">
                                {(stats.winRate * 100).toFixed(1)}%
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                Profit Factor
                              </Typography>
                              <Typography variant="body1">
                                {stats.profitFactor.toFixed(2)}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                Avg. Profit %
                              </Typography>
                              <Typography variant="body1">
                                {stats.avgProfitPercent.toFixed(2)}%
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                Avg. Loss %
                              </Typography>
                              <Typography variant="body1">
                                {stats.avgLossPercent.toFixed(2)}%
                              </Typography>
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </>
          ) : (
            <Alert severity="info">
              No direction data available for the selected filters.
            </Alert>
          )}
        </TabPanel>
        
        {/* Confidence Analysis */}
        <TabPanel value={tabValue} index={4}>
          {statistics && Object.keys(statistics.byConfidenceRange).length > 0 ? (
            <>
              <Typography variant="h6" gutterBottom>
                Performance by Confidence Score
              </Typography>
              
              <Box sx={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={Object.entries(statistics.byConfidenceRange).map(([range, stats]) => ({
                      name: range,
                      winRate: +(stats.winRate * 100).toFixed(1),
                      profitFactor: +stats.profitFactor.toFixed(2),
                      trades: stats.totalTrades
                    }))}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="winRate" name="Win Rate (%)" fill="#8884d8" />
                    <Bar dataKey="profitFactor" name="Profit Factor" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Detailed Statistics by Confidence Range
                </Typography>
                <Grid container spacing={2}>
                  {Object.entries(statistics.byConfidenceRange).map(([range, stats]) => (
                    <Grid item xs={12} sm={6} md={3} key={range}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            {range}
                          </Typography>
                          <Stack spacing={1}>
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                Total Trades
                              </Typography>
                              <Typography variant="body1">
                                {stats.totalTrades}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                Win Rate
                              </Typography>
                              <Typography variant="body1">
                                {(stats.winRate * 100).toFixed(1)}%
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                Profit Factor
                              </Typography>
                              <Typography variant="body1">
                                {stats.profitFactor.toFixed(2)}
                              </Typography>
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </>
          ) : (
            <Alert severity="info">
              No confidence score data available for the selected filters.
            </Alert>
          )}
        </TabPanel>
      </Box>
      
      {/* Results count */}
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Typography variant="body2" color="text.secondary">
          Showing {results.length} backtest results
        </Typography>
      </Box>
    </Box>
  );
};

export default SupabaseBacktestDashboard; 