/**
 * Backtesting Dashboard Component
 * Allows users to run and view backtest results
 */

import React, { useEffect, useState, useMemo } from 'react';
import { Box, Card, CardContent, Typography, Grid, Tabs, Tab, CircularProgress, Alert, Chip, Button, Divider, Paper, TextField, FormControl, InputLabel, Select, MenuItem, Stack } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { fetchBacktestResults, fetchHistoricalPerformance, calculateBacktestStatistics } from '../../services/backtesting/supabaseBacktestService';
import { BacktestResult, BacktestStatistics, BacktestFilter, HistoricalPerformance } from '../../services/types/backtestTypes';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Bar, BarChart } from 'recharts';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import BacktestResultsFilter from './BacktestResultsFilter';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import BacktestResultsTable from './BacktestResultsTable';
import BacktestStatisticsDisplay from './BacktestStatisticsDisplay';
import BacktestChart from './BacktestChart';
import PatternPerformanceTable from './PatternPerformanceTable';
import TimeframePerformanceTable from './TimeframePerformanceTable';
import SymbolPerformanceTable from './SymbolPerformanceTable';

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
      id={`backtest-tabpanel-${index}`}
      aria-labelledby={`backtest-tab-${index}`}
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

function a11yProps(index: number) {
  return {
    id: `backtest-tab-${index}`,
    'aria-controls': `backtest-tabpanel-${index}`,
  };
}

const BacktestDashboard: React.FC = () => {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backtestResults, setBacktestResults] = useState<BacktestResult[]>([]);
  const [historicalPerformance, setHistoricalPerformance] = useState<HistoricalPerformance[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<BacktestFilter>({});
  const [activeTab, setActiveTab] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalResults, setTotalResults] = useState(0);
  
  const statistics = useMemo(() => {
    return calculateBacktestStatistics(backtestResults);
  }, [backtestResults]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [results, history] = await Promise.all([
          fetchBacktestResults(filters),
          fetchHistoricalPerformance()
        ]);
        setBacktestResults(results);
        setHistoricalPerformance(history);
        setError(null);
      } catch (err) {
        console.error('Error loading backtest data:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [filters]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleApplyFilters = (newFilters: BacktestFilter) => {
    setFilters(newFilters);
    setShowFilters(false);
  };

  const columns: GridColDef[] = [
    { field: 'symbol', headerName: 'Symbol', width: 100 },
    { field: 'patternType', headerName: 'Pattern', width: 150 },
    { field: 'direction', headerName: 'Direction', width: 110, 
      renderCell: (params) => (
        <Chip 
          icon={params.value === 'bullish' ? <TrendingUpIcon /> : <TrendingDownIcon />}
          label={params.value}
          color={params.value === 'bullish' ? 'success' : 'error'}
          size="small"
        />
      )
    },
    { field: 'timeframe', headerName: 'Timeframe', width: 120 },
    { field: 'confidenceScore', headerName: 'Confidence', width: 110,
      renderCell: (params) => (
        <Chip 
          label={`${params.value}%`}
          color={
            params.value >= 75 ? 'success' :
            params.value >= 50 ? 'primary' :
            params.value >= 25 ? 'warning' : 'error'
          }
          size="small"
        />
      )
    },
    { field: 'entryPrice', headerName: 'Entry', width: 100, type: 'number',
      valueFormatter: (params) => {
        return params.value ? `$${params.value.toFixed(2)}` : 'N/A';
      }
    },
    { field: 'targetPrice', headerName: 'Target', width: 100, type: 'number',
      valueFormatter: (params) => {
        return params.value ? `$${params.value.toFixed(2)}` : 'N/A';
      }
    },
    { field: 'stopLossPrice', headerName: 'Stop Loss', width: 100, type: 'number',
      valueFormatter: (params) => {
        return params.value ? `$${params.value.toFixed(2)}` : 'N/A';
      }
    },
    { field: 'hitTarget', headerName: 'Hit Target', width: 110, type: 'boolean' },
    { field: 'hitStopLoss', headerName: 'Hit SL', width: 110, type: 'boolean' },
    { field: 'profitLossPercent', headerName: 'P/L %', width: 100, type: 'number',
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{
            color: params.value > 0 ? 'success.main' : params.value < 0 ? 'error.main' : 'text.primary',
            fontWeight: 'bold'
          }}
        >
          {params.value ? `${params.value > 0 ? '+' : ''}${params.value.toFixed(2)}%` : 'N/A'}
        </Typography>
      )
    },
    { field: 'candlesToBreakout', headerName: 'Candles to BO', width: 140, type: 'number' },
    { field: 'createdAt', headerName: 'Date', width: 180, type: 'dateTime',
      valueFormatter: (params) => {
        return params.value ? new Date(params.value).toLocaleString() : 'N/A';
      }
    },
  ];

  const renderStatisticsCard = (title: string, stats: any) => {
    return (
      <Card variant="outlined" sx={{ height: '100%' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>{title}</Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="text.secondary">Total Trades</Typography>
              <Typography variant="h6">{stats.totalTrades}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="text.secondary">Win Rate</Typography>
              <Typography variant="h6" color={stats.winRate >= 0.5 ? 'success.main' : 'inherit'}>
                {(stats.winRate * 100).toFixed(1)}%
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="text.secondary">Profit Factor</Typography>
              <Typography variant="h6" color={stats.profitFactor >= 1.5 ? 'success.main' : 'inherit'}>
                {stats.profitFactor.toFixed(2)}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="text.secondary">Avg. Candles to BO</Typography>
              <Typography variant="h6">{stats.avgCandlesToBreakout.toFixed(1)}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="text.secondary">Avg. Profit %</Typography>
              <Typography variant="h6" color="success.main">
                {stats.avgProfitPercent.toFixed(2)}%
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="text.secondary">Avg. Loss %</Typography>
              <Typography variant="h6" color="error.main">
                {stats.avgLossPercent.toFixed(2)}%
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };

  const renderPerformanceCharts = () => {
    const patternTypeData = Object.entries(statistics.byPatternType).map(([key, value]) => ({
      name: key,
      winRate: Number((value.winRate * 100).toFixed(1)),
      profitFactor: Number(value.profitFactor.toFixed(2)),
      trades: value.totalTrades,
    }));

    const timeframeData = Object.entries(statistics.byTimeframe).map(([key, value]) => ({
      name: key,
      winRate: Number((value.winRate * 100).toFixed(1)),
      profitFactor: Number(value.profitFactor.toFixed(2)),
      trades: value.totalTrades,
    }));

    const formattedHistoricalData = historicalPerformance.map(item => ({
      date: new Date(item.date).toLocaleDateString(),
      winRate: Number((item.winRate * 100).toFixed(1)),
      profitFactor: Number(item.profitFactor.toFixed(2)),
      trades: item.totalTrades,
    }));

    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>Historical Performance</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={formattedHistoricalData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="winRate" stroke="#8884d8" name="Win Rate %" />
              <Line yAxisId="right" type="monotone" dataKey="profitFactor" stroke="#82ca9d" name="Profit Factor" />
            </LineChart>
          </ResponsiveContainer>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>Performance by Pattern Type</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={patternTypeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="winRate" name="Win Rate %" fill="#8884d8" />
              <Bar dataKey="profitFactor" name="Profit Factor" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>Performance by Timeframe</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={timeframeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="winRate" name="Win Rate %" fill="#8884d8" />
              <Bar dataKey="profitFactor" name="Profit Factor" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </Grid>
      </Grid>
    );
  };

  const loadResults = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { results, total } = await fetchBacktestResults(
        filters,
        page,
        rowsPerPage
      );
      
      setBacktestResults(results);
      setTotalResults(total);
      
      // Also load statistics
      const stats = await calculateBacktestStatistics(results);
      setStatistics(stats);
      
      // If on analytics tab, also load full analytics
      if (activeTab !== 0) {
        loadAnalytics();
      }
    } catch (err) {
      console.error('Error loading backtest results:', err);
      setError('Failed to load backtest results. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const analyticsData = await fetchBacktestAnalytics(filters);
      setAnalytics(analyticsData);
    } catch (err) {
      console.error('Error loading backtest analytics:', err);
      setError('Failed to load backtest analytics. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const applyFilters = () => {
    const newFilters: BacktestFilter = {};
    
    if (symbol) newFilters.symbol = symbol;
    if (patternType) newFilters.patternType = patternType;
    if (direction) newFilters.direction = direction;
    if (timeframe) newFilters.timeframe = timeframe;
    if (dateStart) newFilters.dateStart = dateStart;
    if (dateEnd) newFilters.dateEnd = dateEnd;
    if (minConfidence !== '') newFilters.minConfidence = Number(minConfidence);
    if (result) newFilters.result = result;
    
    setFilters(newFilters);
    setPage(0); // Reset to first page
    loadResults();
  };
  
  const clearFilters = () => {
    setSymbol('');
    setPatternType('');
    setDirection('');
    setTimeframe('');
    setDateStart(null);
    setDateEnd(null);
    setMinConfidence('');
    setResult('');
    setFilters({});
    loadResults();
  };
  
  const handleTabSwitch = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    
    // Load analytics if switching to analytics tab and not already loaded
    if (newValue !== 0 && !analytics) {
      loadAnalytics();
    }
  };
  
  const handlePageChange = (_event: unknown, newPage: number) => {
    setPage(newPage);
    loadResults();
  };
  
  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
    loadResults();
  };
  
  const removeFilter = (filterName: string) => {
    switch (filterName) {
      case 'symbol':
        setSymbol('');
        break;
      case 'patternType':
        setPatternType('');
        break;
      case 'direction':
        setDirection('');
        break;
      case 'timeframe':
        setTimeframe('');
        break;
      case 'dateStart':
        setDateStart(null);
        break;
      case 'dateEnd':
        setDateEnd(null);
        break;
      case 'minConfidence':
        setMinConfidence('');
        break;
      case 'result':
        setResult('');
        break;
      default:
        break;
    }
    
    // Update filters
    const newFilters = { ...filters };
    delete newFilters[filterName as keyof BacktestFilter];
    setFilters(newFilters);
    loadResults();
  };
  
  const renderFilterChips = () => {
  return (
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
        {symbol && (
          <Chip 
            label={`Symbol: ${symbol}`} 
            onDelete={() => removeFilter('symbol')} 
            color="primary" 
            variant="outlined" 
            size="small"
          />
        )}
        
        {patternType && (
          <Chip 
            label={`Pattern: ${patternType}`} 
            onDelete={() => removeFilter('patternType')} 
            color="primary" 
            variant="outlined" 
            size="small"
          />
        )}
        
        {direction && (
          <Chip 
            label={`Direction: ${direction}`} 
            onDelete={() => removeFilter('direction')} 
            color="primary" 
            variant="outlined" 
            size="small"
          />
        )}
        
        {timeframe && (
          <Chip 
            label={`Timeframe: ${timeframe}`} 
            onDelete={() => removeFilter('timeframe')} 
            color="primary" 
            variant="outlined" 
            size="small"
          />
        )}
        
        {dateStart && (
          <Chip 
            label={`From: ${dateStart.toLocaleDateString()}`} 
            onDelete={() => removeFilter('dateStart')} 
            color="primary" 
            variant="outlined" 
            size="small"
          />
        )}
        
        {dateEnd && (
          <Chip 
            label={`To: ${dateEnd.toLocaleDateString()}`} 
            onDelete={() => removeFilter('dateEnd')} 
            color="primary" 
            variant="outlined" 
            size="small"
          />
        )}
        
        {minConfidence !== '' && (
          <Chip 
            label={`Min Confidence: ${minConfidence}%`} 
            onDelete={() => removeFilter('minConfidence')} 
            color="primary" 
            variant="outlined" 
            size="small"
          />
        )}
        
        {result && (
          <Chip 
            label={`Result: ${result}`} 
            onDelete={() => removeFilter('result')} 
            color="primary" 
            variant="outlined" 
            size="small"
          />
        )}
      </Stack>
    );
  };
  
  const renderFilterSection = () => {
    return (
      <Paper sx={{ p: 2, mb: 2 }}>
      <Grid container spacing={2}>
          <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
              Filters
              </Typography>
          </Grid>
              
          <Grid item xs={12} sm={6} md={3}>
                <TextField
              label="Symbol"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
                  fullWidth
              placeholder="e.g. AAPL"
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Pattern Type</InputLabel>
              <Select
                value={patternType}
                onChange={(e) => setPatternType(e.target.value)}
                label="Pattern Type"
              >
                <MenuItem value="">All</MenuItem>
                {patternTypes.map((pattern) => (
                  <MenuItem key={pattern} value={pattern}>
                    {pattern}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Direction</InputLabel>
              <Select
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
                label="Direction"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="bullish">Bullish</MenuItem>
                <MenuItem value="bearish">Bearish</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
              <InputLabel>Timeframe</InputLabel>
                  <Select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                label="Timeframe"
              >
                <MenuItem value="">All</MenuItem>
                {timeframes.map((tf) => (
                  <MenuItem key={tf} value={tf}>
                    {tf}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
          </Grid>
          
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Grid item xs={12} sm={6} md={3}>
              <DatePicker
                label="From Date"
                value={dateStart}
                onChange={(date) => setDateStart(date)}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <DatePicker
                label="To Date"
                value={dateEnd}
                onChange={(date) => setDateEnd(date)}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
          </LocalizationProvider>
          
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              label="Min Confidence %"
              type="number"
              value={minConfidence}
              onChange={(e) => {
                const value = e.target.value;
                setMinConfidence(value === '' ? '' : Number(value));
              }}
              fullWidth
              inputProps={{ min: 0, max: 100 }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Result</InputLabel>
              <Select
                value={result}
                onChange={(e) => setResult(e.target.value)}
                label="Result"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="win">Win</MenuItem>
                <MenuItem value="loss">Loss</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
              <Button 
                variant="contained" 
                color="primary" 
              onClick={applyFilters}
              fullWidth
              sx={{ height: '100%' }}
            >
              Apply Filters
            </Button>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <Button 
              variant="outlined" 
              onClick={clearFilters}
                fullWidth
              sx={{ height: '100%' }}
              disabled={activeFilterCount === 0}
              >
              Clear Filters
              </Button>
          </Grid>
          
          {activeFilterCount > 0 && (
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Active Filters:
              </Typography>
              {renderFilterChips()}
            </Grid>
          )}
        </Grid>
      </Paper>
    );
  };

  if (loading && backtestResults.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
        <CircularProgress />
                  </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Backtest Results Dashboard
                    </Typography>
      
      {renderFilterSection()}
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabSwitch}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="Results" />
          <Tab label="Analytics" />
          <Tab label="Patterns" />
          <Tab label="Timeframes" />
          <Tab label="Symbols" />
        </Tabs>
        
        <Box sx={{ p: 2 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {activeTab === 0 && (
                <>
                  {statistics && (
                    <Box sx={{ mb: 3 }}>
                      <BacktestStatisticsDisplay statistics={statistics} />
                  </Box>
                  )}
                  
                  <BacktestResultsTable
                    results={backtestResults}
                    page={page}
                    rowsPerPage={rowsPerPage}
                    totalResults={totalResults}
                    onPageChange={handlePageChange}
                    onRowsPerPageChange={handleRowsPerPageChange}
                  />
                </>
              )}
              
              {activeTab === 1 && analytics && (
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      Performance Over Time
                    </Typography>
                    <BacktestChart
                      data={analytics.historicalPerformance}
                      type="equity"
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      Drawdown
                    </Typography>
                    <BacktestChart
                      data={analytics.historicalPerformance}
                      type="drawdown"
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      Monthly Win Rate
                    </Typography>
                    <BacktestChart
                      data={analytics.performanceTrend}
                      type="winRate"
                    />
                  </Grid>
                </Grid>
              )}
              
              {activeTab === 2 && analytics && (
                <PatternPerformanceTable
                  data={analytics.patternPerformance}
                />
              )}
              
              {activeTab === 3 && analytics && (
                <TimeframePerformanceTable
                  data={analytics.timeframePerformance}
                />
              )}
              
              {activeTab === 4 && analytics && (
                <SymbolPerformanceTable
                  data={analytics.symbolPerformance}
                />
              )}
            </>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default BacktestDashboard;
