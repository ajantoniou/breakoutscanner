import React, { useEffect, useState, useMemo } from 'react';
import { stockRecommendationService } from '@/services/api/stockRecommendationService';
import { backtestPatternsWithYahoo, getBacktestStatistics, runYahooBacktest } from '@/services/backtesting/yahooBacktestService';
import { PatternData } from '@/services/types/patternTypes';
import { BacktestResult } from '@/services/types/backtestTypes';
import { Box, Button, FormControl, InputLabel, MenuItem, Select, TextField, Typography, 
  Container, Snackbar, Alert, CircularProgress, Grid, Paper } from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import TableChartIcon from '@mui/icons-material/TableChart';
import DownloadIcon from '@mui/icons-material/Download';
import BacktestResultsTable from './BacktestResultsTable';
import BacktestAnalytics from './BacktestAnalytics';
import BacktestFilter from './BacktestFilter';
import { BacktestFilter as FilterType } from '../../services/types/backtestTypes';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { ButtonGroup, Chip, Stack, Tooltip } from '@mui/material';

/**
 * Dashboard component for backtesting with Yahoo Finance data
 */
const YahooBacktestDashboard: React.FC = () => {
  const [patterns, setPatterns] = useState<PatternData[]>([]);
  const [backtestResults, setBacktestResults] = useState<BacktestResult[]>([]);
  const [statistics, setStatistics] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [backtestLoading, setBacktestLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('all');
  const [selectedDirection, setSelectedDirection] = useState<string>('all');
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filteredResults, setFilteredResults] = useState<BacktestResult[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>({});

  // Load patterns for backtesting
  const loadPatterns = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get recommendations for all scanner modes
      const allRecommendations = await stockRecommendationService.getAllRecommendations(70);
      
      // Combine all patterns
      const allPatterns = [
        ...allRecommendations.dayTrading,
        ...allRecommendations.swingTrading,
        ...allRecommendations.golden
      ];
      
      // Remove duplicates (same symbol and timeframe)
      const uniquePatterns = allPatterns.filter((pattern, index, self) =>
        index === self.findIndex(p => (
          p.symbol === pattern.symbol && p.timeframe === pattern.timeframe
        ))
      );
      
      setPatterns(uniquePatterns);
      setLoading(false);
      setNotification({
        message: `Loaded ${uniquePatterns.length} patterns for backtesting`,
        type: 'info'
      });
    } catch (err) {
      console.error('Error loading patterns for backtesting:', err);
      setError(`Error loading patterns: ${err instanceof Error ? err.message : String(err)}`);
      setLoading(false);
    }
  };

  // Define the function to convert raw backtest results to our interface format
  const convertToBacktestResult = (rawResult: any, index: number): BacktestResult => {
    return {
      id: `result-${index}`,
      pattern_id: rawResult.patternId || `pattern-${index}`,
      symbol: rawResult.symbol,
      pattern_type: rawResult.patternType,
      direction: rawResult.direction === 'up' ? 'bullish' : 'bearish',
      timeframe: rawResult.timeframe,
      entry_date: rawResult.entryDate,
      entry_price: rawResult.entryPrice,
      exit_date: rawResult.exitDate,
      exit_price: rawResult.actualExitPrice,
      profit_loss_percent: rawResult.profitLossPercent,
      r_multiple: rawResult.rMultiple || null,
      confidence_score: rawResult.confidenceScore,
      result: rawResult.successful ? 'win' : 'loss',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  };

  // Run backtest on loaded patterns
  const runBacktest = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Filter patterns by selected timeframe and direction
      const filteredPatterns = patterns.filter(pattern => {
        if (selectedTimeframe !== 'all' && pattern.timeframe !== selectedTimeframe) {
          return false;
        }
        if (selectedDirection !== 'all' && pattern.direction !== selectedDirection) {
          return false;
        }
        return true;
      });
      
      const results = await runYahooBacktest(filteredPatterns);
      
      // Convert raw results to our interface format
      const formattedResults = results.map(convertToBacktestResult);
      
      setBacktestResults(formattedResults);
      
      // Calculate statistics
      const stats = getBacktestStatistics(formattedResults);
      setStatistics(stats);
      
      setNotification({
        message: `Backtested ${formattedResults.length} patterns successfully`,
        type: 'success'
      });
    } catch (err) {
      setError(err.message || 'An error occurred during backtesting');
      setNotification({
        message: err.message || 'An error occurred during backtesting',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate mock patterns for testing
  const generateMockPatterns = () => {
    try {
      const timeframes = ['15m', '30m', '1h', '4h', '1d'];
      const patternTypes = ['Cup and Handle', 'Double Bottom', 'Double Top', 'Head and Shoulders', 'Inverse Head and Shoulders', 'Triangle', 'Wedge', 'Flag', 'Channel Breakout'];
      const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA', 'AMD', 'INTC', 'DIS', 'JPM', 'BAC', 'WMT', 'TGT', 'NKE'];
      const channelTypes = ['horizontal', 'ascending', 'descending'];
      
      // Generate 5-15 random patterns
      const numPatterns = Math.floor(Math.random() * 11) + 5;
      const mockPatterns: PatternData[] = [];
      
      const now = new Date();
      // Generate patterns with dates in the past (1-30 days ago)
      for (let i = 0; i < numPatterns; i++) {
        const direction = Math.random() > 0.5 ? 'bullish' : 'bearish';
        const symbol = symbols[Math.floor(Math.random() * symbols.length)];
        const timeframe = timeframes[Math.floor(Math.random() * timeframes.length)];
        const patternType = patternTypes[Math.floor(Math.random() * patternTypes.length)];
        const channelType = channelTypes[Math.floor(Math.random() * channelTypes.length)] as 'horizontal' | 'ascending' | 'descending';
        
        // Generate realistic price data
        const basePrice = Math.random() * 200 + 20; // $20-$220
        const entryPrice = Number(basePrice.toFixed(2));
        
        // Target price is higher for bullish and lower for bearish
        let targetPrice;
        let stopLoss;
        
        if (direction === 'bullish') {
          targetPrice = Number((entryPrice * (1 + (Math.random() * 0.2 + 0.05))).toFixed(2)); // 5-25% higher
          stopLoss = Number((entryPrice * (1 - (Math.random() * 0.1 + 0.02))).toFixed(2)); // 2-12% lower
        } else {
          targetPrice = Number((entryPrice * (1 - (Math.random() * 0.2 + 0.05))).toFixed(2)); // 5-25% lower
          stopLoss = Number((entryPrice * (1 + (Math.random() * 0.1 + 0.02))).toFixed(2)); // 2-12% higher
        }
        
        // Calculate risk/reward ratio
        const riskRewardRatio = Number((Math.abs(targetPrice - entryPrice) / Math.abs(stopLoss - entryPrice)).toFixed(2));
        
        // Random detection date between 1-30 days ago
        const daysAgo = Math.floor(Math.random() * 30) + 1;
        const detectionDate = new Date(now);
        detectionDate.setDate(detectionDate.getDate() - daysAgo);
        
        mockPatterns.push({
          id: `MOCK-${symbol}-${timeframe}-${i}`,
          symbol,
          timeframe,
          pattern_type: patternType,
          direction,
          entry_price: entryPrice,
          target_price: targetPrice,
          stop_loss: stopLoss,
          risk_reward_ratio: riskRewardRatio,
          confidence_score: Number((Math.random() * 40 + 60).toFixed(1)), // 60-100
          created_at: detectionDate.toISOString(),
          detected_at: detectionDate.toISOString(), // For backtest compatibility
          status: 'active',
          channel_type: channelType,
          is_ai_generated: true,
          updated_at: detectionDate.toISOString(),
        });
      }
      
      // Combine with existing patterns or replace them
      const updatedPatterns = [...patterns, ...mockPatterns];
      setPatterns(updatedPatterns);
      
      // Save to localStorage
      localStorage.setItem('backtestPatterns', JSON.stringify(updatedPatterns));
      
      setNotification({
        message: `Generated ${mockPatterns.length} mock patterns for backtesting`,
        type: 'success'
      });
    } catch (err) {
      console.error('Error generating mock patterns:', err);
      setError(`Error generating mock patterns: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Clear all patterns
  const clearPatterns = () => {
    setPatterns([]);
    setBacktestResults([]);
    setStatistics({});
    localStorage.removeItem('backtestPatterns');
    setNotification({
      message: 'All patterns cleared',
      type: 'info'
    });
  };

  // Load patterns on component mount
  useEffect(() => {
    loadPatterns();
  }, []);

  // Close notification
  const handleCloseNotification = () => {
    setNotification(null);
  };

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
          bullish.avgReturn += result.profit_loss_percent;
        } else if (direction === 'bearish') {
          bearish.total += 1;
          if (result.result === 'win') {
            bearish.wins += 1;
          }
          bearish.avgReturn += result.profit_loss_percent;
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

  // Add detailed metrics component
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
        metrics[patternType].avgCandlesToBreakout += result.candlesToBreakout;
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
        result.exit_price,
        result.target_price,
        result.stop_loss,
        result.profit_loss_percent.toFixed(2),
        result.result,
        result.candlesToBreakout,
        result.entry_date,
        result.exit_date
      ].join(','));
      
      // Combine header and rows
      const csvContent = `data:text/csv;charset=utf-8,${headers}\n${rows.join('\n')}`;
      
      // Create download link
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `yahoo_backtest_results_${new Date().toISOString().split('T')[0]}.csv`);
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
      link.setAttribute('download', `yahoo_backtest_report_${new Date().toISOString().split('T')[0]}.json`);
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

  // Handle pagination
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Memo for available pattern types and timeframes
  const availablePatternTypes = useMemo(() => {
    const types = new Set<string>();
    backtestResults.forEach(result => {
      if (result.pattern_type) {
        types.add(result.pattern_type);
      }
    });
    return Array.from(types).sort();
  }, [backtestResults]);
  
  const availableTimeframes = useMemo(() => {
    const timeframes = new Set<string>();
    backtestResults.forEach(result => {
      if (result.timeframe) {
        timeframes.add(result.timeframe);
      }
    });
    return Array.from(timeframes).sort();
  }, [backtestResults]);
  
  // Filter results based on active filter
  useEffect(() => {
    if (Object.keys(activeFilter).length === 0) {
      setFilteredResults(backtestResults);
      return;
    }
    
    const filtered = backtestResults.filter(result => {
      // Check each filter criterion
      if (activeFilter.symbol && !result.symbol.toUpperCase().includes(activeFilter.symbol.toUpperCase())) {
        return false;
      }
      
      if (activeFilter.pattern_type && result.pattern_type !== activeFilter.pattern_type) {
        return false;
      }
      
      if (activeFilter.direction && result.direction !== activeFilter.direction) {
        return false;
      }
      
      if (activeFilter.timeframe && result.timeframe !== activeFilter.timeframe) {
        return false;
      }
      
      if (activeFilter.result && result.result !== activeFilter.result) {
        return false;
      }
      
      if (activeFilter.confidence_min && result.confidence_score < activeFilter.confidence_min) {
        return false;
      }
      
      if (activeFilter.confidence_max && result.confidence_score > activeFilter.confidence_max) {
        return false;
      }
      
      if (activeFilter.date_from) {
        const fromDate = new Date(activeFilter.date_from);
        const entryDate = new Date(result.entry_date);
        if (entryDate < fromDate) {
          return false;
        }
      }
      
      if (activeFilter.date_to) {
        const toDate = new Date(activeFilter.date_to);
        const entryDate = new Date(result.entry_date);
        if (entryDate > toDate) {
          return false;
        }
      }
      
      return true;
    });
    
    setFilteredResults(filtered);
    setPage(0); // Reset to first page when filter changes
  }, [activeFilter, backtestResults]);
  
  // Apply filter handler
  const handleApplyFilter = (filter: FilterType) => {
    setActiveFilter(filter);
  };

  // Add export function
  const handleExportCSV = () => {
    if (filteredResults.length === 0) {
      setNotification({
        message: 'No results to export',
        type: 'error'
      });
      return;
    }
    
    // Create CSV header
    const headers = [
      'Symbol',
      'Pattern',
      'Direction',
      'Timeframe',
      'Entry Date',
      'Entry Price',
      'Exit Date',
      'Exit Price',
      'P/L %',
      'R Multiple',
      'Confidence',
      'Result'
    ].join(',');
    
    // Map results to CSV rows
    const rows = filteredResults.map(result => [
      result.symbol,
      result.pattern_type,
      result.direction,
      result.timeframe,
      result.entry_date,
      result.entry_price,
      result.exit_date || '',
      result.exit_price || '',
      result.profit_loss_percent ? result.profit_loss_percent.toFixed(2) : '',
      result.r_multiple ? result.r_multiple.toFixed(2) : '',
      result.confidence_score,
      result.result
    ].join(','));
    
    // Combine header and rows
    const csvContent = `${headers}\n${rows.join('\n')}`;
    
    // Create a Blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `backtest-results-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setNotification({
      message: `Exported ${filteredResults.length} results to CSV`,
      type: 'success'
    });
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Backtest with Yahoo Finance Data</h2>
      
      {error && (
        <div className="p-4 mb-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <div className="mb-6 bg-white p-4 rounded shadow">
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Backtest Configuration</h3>
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Timeframe</label>
              <select 
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value)}
                className="p-2 border rounded"
              >
                <option value="all">All Timeframes</option>
                <option value="15m">15 Minutes</option>
                <option value="30m">30 Minutes</option>
                <option value="1h">1 Hour</option>
                <option value="4h">4 Hours</option>
                <option value="1d">1 Day</option>
                <option value="1w">1 Week</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Direction</label>
              <select 
                value={selectedDirection}
                onChange={(e) => setSelectedDirection(e.target.value)}
                className="p-2 border rounded"
              >
                <option value="all">All Directions</option>
                <option value="bullish">Bullish</option>
                <option value="bearish">Bearish</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <button 
            onClick={loadPatterns}
            disabled={loading}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:bg-gray-400"
          >
            {loading ? 'Loading Patterns...' : 'Refresh Patterns'}
          </button>
          
          <button 
            onClick={runBacktest}
            disabled={loading || backtestLoading || patterns.length === 0}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {backtestLoading ? 'Running Backtest...' : 'Run Backtest'}
          </button>
          
          <Button
            variant="outlined"
            color="secondary"
            onClick={generateMockPatterns}
            startIcon={<AddIcon />}
          >
            Generate Mock Patterns
          </Button>
          
          <Button
            variant="outlined"
            color="error"
            onClick={clearPatterns}
          >
            Clear All
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
        
        <div className="mt-4">
          <p className="text-sm text-gray-600">
            {patterns.length} patterns loaded for backtesting
          </p>
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
      
      {/* Visualization Components */}
      {backtestResults.length > 0 && (
        <>
          <PatternPerformanceChart backtestResults={backtestResults} />
          <DirectionDistributionChart backtestResults={backtestResults} />
          <PatternMetricsTable backtestResults={backtestResults} />
        </>
      )}
      
      {/* Backtest Statistics */}
      {Object.keys(statistics).length > 0 && (
        <div className="mb-6 bg-white p-4 rounded shadow">
          <h3 className="text-lg font-semibold mb-4">Backtest Statistics</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Overall Stats */}
            <div className="bg-gray-50 p-4 rounded">
              <h4 className="font-semibold mb-2">Overall Performance</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-gray-500">Total Trades:</p>
                  <p className="font-semibold">{statistics.overall.totalTrades}</p>
                </div>
                <div>
                  <p className="text-gray-500">Win Rate:</p>
                  <p className="font-semibold">{statistics.overall.winRate.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-gray-500">Profit Factor:</p>
                  <p className="font-semibold">{statistics.overall.profitFactor.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Avg. Profit/Loss:</p>
                  <p className={`font-semibold ${statistics.overall.averageProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {statistics.overall.averageProfitLoss.toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>
            
            {/* Timeframe Stats */}
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2 text-left">Timeframe</th>
                    <th className="px-4 py-2 text-right">Trades</th>
                    <th className="px-4 py-2 text-right">Win Rate</th>
                    <th className="px-4 py-2 text-right">Profit Factor</th>
                    <th className="px-4 py-2 text-right">Candles to BK</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(statistics.byTimeframe || {}).map(([timeframe, stats]: [string, any]) => (
                    <tr key={timeframe} className="border-t">
                      <td className="px-4 py-2 font-medium">{timeframe}</td>
                      <td className="px-4 py-2 text-right">{stats.totalTrades}</td>
                      <td className="px-4 py-2 text-right">{stats.winRate.toFixed(1)}%</td>
                      <td className="px-4 py-2 text-right">{stats.profitFactor.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right">{stats.averageCandlesToBreakout.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Analytics Dashboard */}
      {statistics && filteredResults.length > 0 && (
        <BacktestAnalytics analytics={{
          winRate: statistics.winRate,
          profitFactor: statistics.profitFactor,
          averageRMultiple: statistics.averageRMultiple,
          expectancy: statistics.expectancy,
          totalTrades: statistics.totalTrades,
          totalWins: statistics.wins,
          totalLosses: statistics.losses,
          pendingTrades: statistics.pendingTrades || 0,
          totalProfitLossPercent: statistics.totalProfitLossPercent,
          averageWinPercent: statistics.averageWinPercent,
          averageLossPercent: statistics.averageLossPercent,
          winLossRatio: statistics.winLossRatio,
          bestPattern: statistics.bestPattern,
          bestPatternWinRate: statistics.bestPatternWinRate,
          bestTimeframe: statistics.bestTimeframe,
          averageDaysHeld: statistics.averageDaysHeld
        }} />
      )}
      
      {/* Add filter component if there are results */}
      {backtestResults.length > 0 && (
        <BacktestFilter 
          onApplyFilter={handleApplyFilter}
          availablePatternTypes={availablePatternTypes}
          availableTimeframes={availableTimeframes}
        />
      )}
      
      {/* Modify results table to use filtered results */}
      {filteredResults.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Backtest Results {filteredResults.length !== backtestResults.length ? 
                `(${filteredResults.length} of ${backtestResults.length})` : ''}
            </Typography>
            <Button 
              variant="outlined" 
              size="small" 
              startIcon={<DownloadIcon />}
              onClick={handleExportCSV}
            >
              Export CSV
            </Button>
          </Box>
          <BacktestResultsTable 
            results={filteredResults.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)}
            page={page}
            rowsPerPage={rowsPerPage}
            totalResults={filteredResults.length}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Box>
      )}
      
      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h3 className="text-lg font-semibold mb-2">Backtest Information</h3>
        <p>This backtesting system uses Yahoo Finance historical data for accurate performance analysis.</p>
        <p className="mt-2">The "Average Candles to Breakout" metric shows how many candles it typically takes for a pattern to reach its target, helping you position your trades effectively.</p>
        <p className="mt-2">Win Rate and Profit Factor metrics help you identify the most reliable pattern types and timeframes for your trading strategy.</p>
        <p className="mt-2">You can generate mock patterns to test the backtesting system without real pattern data.</p>
        <p className="mt-2">Export functionality allows you to save your backtest results for further analysis in other tools.</p>
      </div>

      {/* Notification */}
      <Snackbar
        open={!!notification}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {notification && (
          <Alert onClose={handleCloseNotification} severity={notification.type} sx={{ width: '100%' }}>
            {notification.message}
          </Alert>
        )}
      </Snackbar>
    </div>
  );
};

export default YahooBacktestDashboard;
