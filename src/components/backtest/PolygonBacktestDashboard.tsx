import React, { useState, useEffect, useMemo } from 'react';
import { Button, FormControl, InputLabel, MenuItem, Select, CircularProgress, Snackbar, Alert, Typography, Box, Stack, Chip, Paper, ButtonGroup, Tooltip } from '@mui/material';
import { PatternData } from '@/services/types/patternTypes';
import { BacktestResult } from '@/services/types/backtestTypes';
import { backtestPatternsWithPolygon, getBacktestStatistics } from '@/services/backtesting/polygonBacktestService';
import { stockRecommendationService } from '@/services/api/stockRecommendationService';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import AssessmentIcon from '@mui/icons-material/Assessment';
import TableChartIcon from '@mui/icons-material/TableChart';
import { fetchPatterns } from '@/services/api/apiService';

// Add visualization components
const PatternPerformanceChart: React.FC<{ backtestResults: BacktestResult[] }> = ({ backtestResults }) => {
  // Calculate performance metrics by pattern type
  const patternMetrics = useMemo(() => {
    const metrics: Record<string, { total: number, wins: number, winRate: number, avgReturn: number }> = {};
    
    // Group results by pattern type and calculate metrics
    backtestResults.forEach(result => {
      const patternType = result.pattern_type;
      
      if (!metrics[patternType]) {
        metrics[patternType] = { total: 0, wins: 0, winRate: 0, avgReturn: 0 };
      }
      
      metrics[patternType].total += 1;
      if (result.result === 'win') {
        metrics[patternType].wins += 1;
      }
      metrics[patternType].avgReturn += result.profit_loss_percent;
    });
    
    // Calculate win rates and average returns
    Object.keys(metrics).forEach(pattern => {
      metrics[pattern].winRate = (metrics[pattern].wins / metrics[pattern].total) * 100;
      metrics[pattern].avgReturn = metrics[pattern].avgReturn / metrics[pattern].total;
    });
    
    return metrics;
  }, [backtestResults]);
  
  // Skip rendering if no data
  if (backtestResults.length === 0 || Object.keys(patternMetrics).length === 0) {
    return null;
  }

  // Sort pattern types by win rate for better visualization
  const sortedPatterns = Object.keys(patternMetrics).sort(
    (a, b) => patternMetrics[b].winRate - patternMetrics[a].winRate
  );
  
  return (
    <Paper className="p-4 mt-6 mb-6">
      <Typography variant="h6" gutterBottom>Pattern Performance Analysis</Typography>
      
      <div className="overflow-x-auto">
        <div style={{ minWidth: '600px' }}>
          {sortedPatterns.map(pattern => (
            <div key={pattern} className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium w-48 truncate">{pattern}</span>
                <span className="text-sm text-gray-600">
                  {patternMetrics[pattern].wins}/{patternMetrics[pattern].total} trades
                </span>
                <span className="font-medium w-20 text-right">
                  {patternMetrics[pattern].winRate.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 relative">
                <div 
                  className={`h-4 rounded-full ${patternMetrics[pattern].avgReturn >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(Math.max(patternMetrics[pattern].winRate, 0), 100)}%` }}
                ></div>
                <div 
                  className="absolute top-0 h-full"
                  style={{ 
                    left: '50%', 
                    width: '2px', 
                    backgroundColor: 'rgba(0,0,0,0.3)' 
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
        <div className="flex items-center justify-between">
          <span>Lower Win Rate</span>
          <span>Higher Win Rate</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>
    </Paper>
  );
};

// Direction Distribution Chart
const DirectionDistributionChart: React.FC<{ backtestResults: BacktestResult[] }> = ({ backtestResults }) => {
  // Calculate performance metrics by direction
  const directionMetrics = useMemo(() => {
    const bullish = { total: 0, wins: 0, winRate: 0, avgReturn: 0 };
    const bearish = { total: 0, wins: 0, winRate: 0, avgReturn: 0 };
    
    // Group results by direction and calculate metrics
    backtestResults.forEach(result => {
      const direction = result.direction;
      
      if (direction === 'bullish') {
        bullish.total += 1;
        if (result.result === 'win') {
          bullish.wins += 1;
        }
        bullish.avgReturn += result.profit_loss_percent || 0;
      } else if (direction === 'bearish') {
        bearish.total += 1;
        if (result.result === 'win') {
          bearish.wins += 1;
        }
        bearish.avgReturn += result.profit_loss_percent || 0;
      }
    });
    
    // Calculate win rates and average returns
    if (bullish.total > 0) {
      bullish.winRate = (bullish.wins / bullish.total) * 100;
      bullish.avgReturn = bullish.avgReturn / bullish.total;
    }
    
    if (bearish.total > 0) {
      bearish.winRate = (bearish.wins / bearish.total) * 100;
      bearish.avgReturn = bearish.avgReturn / bearish.total;
    }
    
    return { bullish, bearish };
  }, [backtestResults]);
  
  // Skip rendering if no data
  if (backtestResults.length === 0) {
    return null;
  }

  return (
    <Paper className="p-4 mt-6 mb-6">
      <Typography variant="h6" gutterBottom>Direction Performance</Typography>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bullish Performance */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium">Bullish Patterns</span>
            <span className="text-sm text-gray-600">
              {directionMetrics.bullish.wins}/{directionMetrics.bullish.total} trades
            </span>
            <span className="font-medium">
              {directionMetrics.bullish.winRate.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-6 relative">
            <div 
              className={`h-6 rounded-full ${directionMetrics.bullish.avgReturn >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
              style={{ width: `${Math.min(Math.max(directionMetrics.bullish.winRate, 0), 100)}%` }}
            >
              <span className="text-white text-xs font-medium flex items-center justify-center h-full">
                {directionMetrics.bullish.avgReturn.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
        
        {/* Bearish Performance */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium">Bearish Patterns</span>
            <span className="text-sm text-gray-600">
              {directionMetrics.bearish.wins}/{directionMetrics.bearish.total} trades
            </span>
            <span className="font-medium">
              {directionMetrics.bearish.winRate.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-6 relative">
            <div 
              className={`h-6 rounded-full ${directionMetrics.bearish.avgReturn >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
              style={{ width: `${Math.min(Math.max(directionMetrics.bearish.winRate, 0), 100)}%` }}
            >
              <span className="text-white text-xs font-medium flex items-center justify-center h-full">
                {directionMetrics.bearish.avgReturn.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </Paper>
  );
};

// Pattern Metrics Table
const PatternMetricsTable: React.FC<{ backtestResults: BacktestResult[] }> = ({ backtestResults }) => {
  // Group results by pattern type
  const patternMetrics = useMemo(() => {
    const metrics: Record<string, {
      totalTrades: number,
      winningTrades: number,
      losingTrades: number,
      winRate: number,
      avgProfitLoss: number,
      avgWinAmount: number,
      avgLossAmount: number,
      maxWin: number,
      maxLoss: number,
      avgCandlesToBreakout: number,
      profitFactor: number
    }> = {};
    
    // Process each result to build metrics
    backtestResults.forEach(result => {
      const patternType = result.pattern_type;
      
      // Initialize pattern metrics if not exists
      if (!metrics[patternType]) {
        metrics[patternType] = {
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          winRate: 0,
          avgProfitLoss: 0,
          avgWinAmount: 0,
          avgLossAmount: 0,
          maxWin: 0,
          maxLoss: 0,
          avgCandlesToBreakout: 0,
          profitFactor: 0
        };
      }
      
      // Update metrics
      metrics[patternType].totalTrades += 1;
      if (result.result === 'win') {
        metrics[patternType].winningTrades += 1;
        metrics[patternType].avgWinAmount += result.profit_loss_percent;
        metrics[patternType].maxWin = Math.max(metrics[patternType].maxWin, result.profit_loss_percent);
      } else {
        metrics[patternType].losingTrades += 1;
        metrics[patternType].avgLossAmount += result.profit_loss_percent;
        metrics[patternType].maxLoss = Math.min(metrics[patternType].maxLoss, result.profit_loss_percent);
      }
      
      metrics[patternType].avgProfitLoss += result.profit_loss_percent;
      metrics[patternType].avgCandlesToBreakout += 0; // Default value since candlesToBreakout is not in the interface
    });
    
    // Calculate averages and ratios
    Object.keys(metrics).forEach(pattern => {
      const m = metrics[pattern];
      
      // Calculate win rate
      m.winRate = (m.winningTrades / m.totalTrades) * 100;
      
      // Calculate averages
      m.avgProfitLoss = m.avgProfitLoss / m.totalTrades;
      m.avgCandlesToBreakout = m.avgCandlesToBreakout / m.totalTrades;
      
      // Calculate average win and loss amounts
      if (m.winningTrades > 0) {
        m.avgWinAmount = m.avgWinAmount / m.winningTrades;
      }
      
      if (m.losingTrades > 0) {
        m.avgLossAmount = m.avgLossAmount / m.losingTrades;
      }
      
      // Calculate profit factor
      const totalWins = m.avgWinAmount * m.winningTrades;
      const totalLosses = Math.abs(m.avgLossAmount * m.losingTrades);
      m.profitFactor = totalLosses !== 0 ? totalWins / totalLosses : m.winningTrades > 0 ? 999 : 0;
    });
    
    return metrics;
  }, [backtestResults]);
  
  // Sort pattern types by win rate
  const sortedPatterns = useMemo(() => {
    return Object.keys(patternMetrics).sort(
      (a, b) => patternMetrics[b].winRate - patternMetrics[a].winRate
    );
  }, [patternMetrics]);
  
  if (backtestResults.length === 0) {
    return null;
  }
  
  return (
    <Paper className="p-4 mt-6 mb-6">
      <Typography variant="h6" gutterBottom>Pattern Type Performance Metrics</Typography>
      
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 text-left">Pattern Type</th>
              <th className="px-4 py-2 text-right">Trades</th>
              <th className="px-4 py-2 text-right">Win Rate</th>
              <th className="px-4 py-2 text-right">Avg P/L</th>
              <th className="px-4 py-2 text-right">Avg Win</th>
              <th className="px-4 py-2 text-right">Avg Loss</th>
              <th className="px-4 py-2 text-right">Profit Factor</th>
              <th className="px-4 py-2 text-right">Candles to BK</th>
            </tr>
          </thead>
          <tbody>
            {sortedPatterns.map(pattern => (
              <tr key={pattern} className="border-t">
                <td className="px-4 py-2 font-medium">{pattern}</td>
                <td className="px-4 py-2 text-right">{patternMetrics[pattern].totalTrades}</td>
                <td className="px-4 py-2 text-right font-semibold" style={{ 
                  color: patternMetrics[pattern].winRate >= 60 ? '#16a34a' : 
                          patternMetrics[pattern].winRate >= 45 ? '#ca8a04' : '#dc2626' 
                }}>
                  {patternMetrics[pattern].winRate.toFixed(1)}%
                </td>
                <td className="px-4 py-2 text-right" style={{ 
                  color: patternMetrics[pattern].avgProfitLoss >= 0 ? '#16a34a' : '#dc2626' 
                }}>
                  {patternMetrics[pattern].avgProfitLoss.toFixed(2)}%
                </td>
                <td className="px-4 py-2 text-right text-green-600">
                  +{patternMetrics[pattern].avgWinAmount.toFixed(2)}%
                </td>
                <td className="px-4 py-2 text-right text-red-600">
                  {patternMetrics[pattern].avgLossAmount.toFixed(2)}%
                </td>
                <td className="px-4 py-2 text-right">
                  {patternMetrics[pattern].profitFactor.toFixed(2)}
                </td>
                <td className="px-4 py-2 text-right">
                  {patternMetrics[pattern].avgCandlesToBreakout.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Paper>
  );
};

/**
 * Dashboard component for backtesting with Polygon.io data
 */
const PolygonBacktestDashboard: React.FC = () => {
  const [patterns, setPatterns] = useState<PatternData[]>([]);
  const [backtestResults, setBacktestResults] = useState<BacktestResult[]>([]);
  const [statistics, setStatistics] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [backtestLoading, setBacktestLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('all');
  const [selectedDirection, setSelectedDirection] = useState<string>('all');
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

  // Load patterns from API
  const loadPatterns = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch real patterns from the API
      const dayPatterns = await fetchPatterns('day');
      const swingPatterns = await fetchPatterns('swing');
      
      // Combine all patterns
      const allPatterns = [...dayPatterns, ...swingPatterns];
      
      // Remove duplicates (same symbol and timeframe)
      const uniquePatterns = allPatterns.filter((pattern, index, self) =>
        index === self.findIndex(p => (
          p.symbol === pattern.symbol && p.timeframe === pattern.timeframe
        ))
      );
      
      setPatterns(uniquePatterns);
      setLoading(false);
      setNotification({
        message: `Loaded ${uniquePatterns.length} real patterns for backtesting`,
        type: 'info'
      });
    } catch (err) {
      console.error('Error loading patterns for backtesting:', err);
      setError(`Error loading patterns: ${err instanceof Error ? err.message : String(err)}`);
      setLoading(false);
    }
  };

  // Run backtest on loaded patterns
  const runBacktest = async () => {
    try {
      setBacktestLoading(true);
      setError(null);
      
      // Filter patterns based on selected timeframe and direction
      let patternsToTest = [...patterns];
      
      if (selectedTimeframe !== 'all') {
        patternsToTest = patternsToTest.filter(pattern => pattern.timeframe === selectedTimeframe);
      }
      
      if (selectedDirection !== 'all') {
        patternsToTest = patternsToTest.filter(pattern => pattern.direction === selectedDirection);
      }
      
      if (patternsToTest.length === 0) {
        setError("No patterns available to backtest with selected filters.");
        setBacktestLoading(false);
        return;
      }
      
      // Run backtest with Polygon.io data
      const results = await backtestPatternsWithPolygon(patternsToTest, true);
      
      // Calculate statistics
      const stats = getBacktestStatistics(results);
      
      setBacktestResults(results);
      setStatistics(stats);
      setBacktestLoading(false);
      setNotification({
        message: `Backtest completed for ${results.length} patterns using real Polygon.io data`,
        type: 'success'
      });
    } catch (err) {
      console.error('Error running backtest:', err);
      setError(`Error running backtest: ${err instanceof Error ? err.message : String(err)}`);
      setBacktestLoading(false);
    }
  };

  // Export backtest results to CSV
  const exportToCSV = () => {
    try {
      if (backtestResults.length === 0) {
        setNotification({
          message: 'No backtest results to export',
          type: 'error'
        });
        return;
      }
      
      // Create CSV header
      const headers = [
        'Symbol', 
        'Pattern Type', 
        'Timeframe', 
        'Direction',
        'Entry Price', 
        'Exit Price', 
        'Target Price',
        'Stop Loss',
        'P/L %', 
        'Result',
        'Candles to Breakout',
        'Entry Date',
        'Exit Date'
      ].join(',');
      
      // Create CSV rows
      const rows = backtestResults.map(result => [
        result.symbol,
        result.pattern_type,
        result.timeframe,
        result.direction,
        result.entry_price,
        result.exit_price || 0,
        '-',
        '-',
        result.profit_loss_percent ? result.profit_loss_percent.toFixed(2) : '0.00',
        result.result === 'win' ? 'Win' : result.result === 'loss' ? 'Loss' : 'Pending',
        '---', // Since candles_to_breakout is not in the interface
        result.entry_date,
        result.exit_date || 'N/A'
      ].join(','));
      
      // Combine header and rows
      const csvContent = `data:text/csv;charset=utf-8,${headers}\n${rows.join('\n')}`;
      
      // Create download link
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `polygon_backtest_results_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      
      // Trigger download
      link.click();
      document.body.removeChild(link);
      
      setNotification({
        message: `Exported ${backtestResults.length} backtest results to CSV`,
        type: 'success'
      });
    } catch (err) {
      console.error('Error exporting to CSV:', err);
      setError(`Error exporting to CSV: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Export backtest results to JSON
  const exportToJSON = () => {
    try {
      if (backtestResults.length === 0) {
        setNotification({
          message: 'No backtest results to export',
          type: 'error'
        });
        return;
      }
      
      // Create complete report object
      const report = {
        generatedAt: new Date().toISOString(),
        summary: statistics,
        filterSettings: {
          timeframe: selectedTimeframe,
          direction: selectedDirection
        },
        totalPatternsEvaluated: patterns.length,
        totalBacktestResults: backtestResults.length,
        results: backtestResults
      };
      
      // Create JSON content
      const jsonContent = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(report, null, 2))}`;
      
      // Create download link
      const link = document.createElement('a');
      link.setAttribute('href', jsonContent);
      link.setAttribute('download', `polygon_backtest_report_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      
      // Trigger download
      link.click();
      document.body.removeChild(link);
      
      setNotification({
        message: 'Exported backtest report to JSON',
        type: 'success'
      });
    } catch (err) {
      console.error('Error exporting to JSON:', err);
      setError(`Error exporting to JSON: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Load patterns on component mount
  useEffect(() => {
    loadPatterns();
  }, []);

  // Close notification
  const handleCloseNotification = () => {
    setNotification(null);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Backtest with Polygon.io Data</h2>
      
      {error && (
        <div className="p-4 mb-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <div className="mb-6 bg-white p-4 rounded shadow">
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Backtest Configuration</h3>
          <div className="flex flex-wrap gap-4">
            <Box sx={{ minWidth: 200 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Timeframe</InputLabel>
                <Select
                  value={selectedTimeframe}
                  label="Timeframe"
                  onChange={(e) => setSelectedTimeframe(e.target.value)}
                >
                  <MenuItem value="all">All Timeframes</MenuItem>
                  <MenuItem value="15m">15 Minutes</MenuItem>
                  <MenuItem value="30m">30 Minutes</MenuItem>
                  <MenuItem value="1h">1 Hour</MenuItem>
                  <MenuItem value="4h">4 Hours</MenuItem>
                  <MenuItem value="1d">Daily</MenuItem>
                </Select>
              </FormControl>
            </Box>
            
            <Box sx={{ minWidth: 200 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Direction</InputLabel>
                <Select
                  value={selectedDirection}
                  label="Direction"
                  onChange={(e) => setSelectedDirection(e.target.value)}
                >
                  <MenuItem value="all">All Directions</MenuItem>
                  <MenuItem value="bullish">Bullish</MenuItem>
                  <MenuItem value="bearish">Bearish</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <Button 
            variant="contained" 
            color="primary"
            onClick={runBacktest}
            disabled={backtestLoading || patterns.length === 0}
            startIcon={backtestLoading ? <CircularProgress size={20} /> : null}
          >
            {backtestLoading ? 'Running...' : 'Run Backtest with Real Data'}
          </Button>
          
          <Button
            variant="outlined"
            color="secondary"
            onClick={loadPatterns}
            startIcon={<AddIcon />}
          >
            Refresh Patterns
          </Button>

          {/* Export Button Group */}
          {backtestResults.length > 0 && (
            <ButtonGroup variant="outlined" color="info">
              <Tooltip title="Export results to CSV">
                <Button
                  onClick={exportToCSV}
                  startIcon={<TableChartIcon />}
                >
                  CSV
                </Button>
              </Tooltip>
              <Tooltip title="Export complete report to JSON">
                <Button
                  onClick={exportToJSON}
                  startIcon={<AssessmentIcon />}
                >
                  JSON
                </Button>
              </Tooltip>
            </ButtonGroup>
          )}
        </div>
      </div>
      
      {/* Pattern Summary */}
      <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
        <Chip 
          label={`Patterns: ${patterns.length}`} 
          color="primary" 
          variant="outlined" 
        />
        
        {selectedTimeframe !== 'all' && (
          <Chip 
            label={`Timeframe: ${selectedTimeframe}`} 
            color="primary" 
            variant="outlined"
            onDelete={() => setSelectedTimeframe('all')}
          />
        )}
        
        {selectedDirection !== 'all' && (
          <Chip 
            label={`Direction: ${selectedDirection}`} 
            color="primary" 
            variant="outlined"
            onDelete={() => setSelectedDirection('all')}
          />
        )}
      </Stack>
      
      {/* Results Summary */}
      {backtestResults.length > 0 && (
        <div className="bg-white p-4 rounded shadow mb-6">
          <h3 className="text-lg font-semibold mb-2">Backtest Results Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="border rounded p-3">
              <div className="text-sm text-gray-600">Total Patterns</div>
              <div className="text-2xl font-bold">{backtestResults.length}</div>
            </div>
            
            <div className="border rounded p-3">
              <div className="text-sm text-gray-600">Win Rate</div>
              <div className="text-2xl font-bold text-green-600">
                {statistics.overall ? (statistics.overall.winRate * 100).toFixed(1) + '%' : 'N/A'}
              </div>
            </div>
            
            <div className="border rounded p-3">
              <div className="text-sm text-gray-600">Avg. Profit/Loss</div>
              <div className={`text-2xl font-bold ${statistics.overall && statistics.overall.averageProfitLoss > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {statistics.overall ? statistics.overall.averageProfitLoss.toFixed(2) + '%' : 'N/A'}
              </div>
            </div>
            
            <div className="border rounded p-3">
              <div className="text-sm text-gray-600">Profit Factor</div>
              <div className="text-2xl font-bold text-blue-600">
                {statistics.overall ? statistics.overall.profitFactor.toFixed(2) : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Visualization Components */}
      {backtestResults.length > 0 && (
        <>
          <PatternPerformanceChart backtestResults={backtestResults} />
          <DirectionDistributionChart backtestResults={backtestResults} />
          <PatternMetricsTable backtestResults={backtestResults} />
        </>
      )}
      
      {/* Backtest Results Table */}
      {backtestResults.length > 0 && (
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-lg font-semibold mb-4">Backtest Results</h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 text-left">Symbol</th>
                  <th className="px-4 py-2 text-left">Pattern</th>
                  <th className="px-4 py-2 text-left">Timeframe</th>
                  <th className="px-4 py-2 text-right">Entry</th>
                  <th className="px-4 py-2 text-right">Exit</th>
                  <th className="px-4 py-2 text-right">P/L %</th>
                  <th className="px-4 py-2 text-center">Result</th>
                  <th className="px-4 py-2 text-right">Candles</th>
                </tr>
              </thead>
              <tbody>
                {backtestResults.map((result, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-2 font-medium">{result.symbol}</td>
                    <td className="px-4 py-2">{result.pattern_type}</td>
                    <td className="px-4 py-2">{result.timeframe}</td>
                    <td className="px-4 py-2 text-right">${result.entry_price.toFixed(2)}</td>
                    <td className="px-4 py-2 text-right">${result.exit_price ? result.exit_price.toFixed(2) : 'N/A'}</td>
                    <td className={`px-4 py-2 text-right font-medium ${result.profit_loss_percent && result.profit_loss_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {result.profit_loss_percent ? (result.profit_loss_percent >= 0 ? '+' : '') + result.profit_loss_percent.toFixed(2) + '%' : 'N/A'}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        result.result === 'win' ? 'bg-green-100 text-green-800' : 
                        result.result === 'loss' ? 'bg-red-100 text-red-800' : 
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {result.result === 'win' ? 'WIN' : result.result === 'loss' ? 'LOSS' : 'PENDING'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">---</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {notification && (
        <Snackbar open={true} autoHideDuration={6000} onClose={handleCloseNotification}>
          <Alert onClose={handleCloseNotification} severity={notification.type} sx={{ width: '100%' }}>
            {notification.message}
          </Alert>
        </Snackbar>
      )}
    </div>
  );
};

export default PolygonBacktestDashboard; 