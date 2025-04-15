import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Grid, 
  Tab, 
  Tabs, 
  Divider,
  CircularProgress,
  Chip
} from '@mui/material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { BacktestStatistics, HistoricalPerformance } from '../../services/types/backtestTypes';

interface StatisticsDisplayProps {
  statistics: BacktestStatistics | null;
  historicalData: HistoricalPerformance[] | null;
  loading: boolean;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#FF6B6B'];

const BacktestStatisticsDisplay: React.FC<StatisticsDisplayProps> = ({ 
  statistics, 
  historicalData,
  loading 
}) => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress />
      </Box>
    );
  }

  if (!statistics) {
    return (
      <Box p={2} textAlign="center">
        <Typography variant="body1" color="textSecondary">
          No statistics available. Run a backtest to see results.
        </Typography>
      </Box>
    );
  }

  // Format data for the pattern type chart
  const patternTypeData = Object.entries(statistics.byPatternType).map(([type, stats]) => ({
    name: type,
    winRate: Math.round(stats.winRate * 100),
    totalTrades: stats.totalTrades
  }));

  // Format data for the timeframe chart
  const timeframeData = Object.entries(statistics.byTimeframe).map(([timeframe, stats]) => ({
    name: timeframe,
    winRate: Math.round(stats.winRate * 100),
    profitFactor: Number(stats.profitFactor.toFixed(2)),
    totalTrades: stats.totalTrades
  }));

  // Format data for the direction pie chart
  const directionData = Object.entries(statistics.byDirection).map(([direction, stats]) => ({
    name: direction,
    value: stats.totalTrades
  }));

  // Summary metrics
  const renderSummaryMetrics = () => (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6} md={3}>
        <Card variant="outlined" sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="subtitle2" color="textSecondary">Total Trades</Typography>
            <Typography variant="h4">{statistics.overall.totalTrades}</Typography>
            <Box display="flex" mt={1}>
              <Chip 
                label={`${statistics.overall.wins} Wins`} 
                size="small" 
                sx={{ mr: 1, backgroundColor: '#00C49F', color: 'white' }}
              />
              <Chip 
                label={`${statistics.overall.losses} Losses`} 
                size="small" 
                sx={{ backgroundColor: '#FF8042', color: 'white' }}
              />
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card variant="outlined" sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="subtitle2" color="textSecondary">Win Rate</Typography>
            <Typography variant="h4">{(statistics.overall.winRate * 100).toFixed(1)}%</Typography>
            <Typography variant="body2" color="textSecondary">
              Avg. Profit: {statistics.overall.avgProfitPercent.toFixed(2)}% / 
              Loss: {statistics.overall.avgLossPercent.toFixed(2)}%
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card variant="outlined" sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="subtitle2" color="textSecondary">Profit Factor</Typography>
            <Typography variant="h4">{statistics.overall.profitFactor.toFixed(2)}</Typography>
            <Typography variant="body2" color="textSecondary">
              Higher values indicate better risk-adjusted returns
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card variant="outlined" sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="subtitle2" color="textSecondary">Avg. Candles to Breakout</Typography>
            <Typography variant="h4">{statistics.overall.avgCandlesToBreakout.toFixed(1)}</Typography>
            <Typography variant="body2" color="textSecondary">
              Average waiting time until breakout
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  return (
    <Box>
      {renderSummaryMetrics()}
      
      <Box mt={4}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          indicatorColor="primary"
          textColor="primary"
          centered
        >
          <Tab label="By Pattern Type" />
          <Tab label="By Timeframe" />
          <Tab label="By Direction" />
          {historicalData && historicalData.length > 0 && <Tab label="Historical Performance" />}
        </Tabs>
        
        <Box mt={2}>
          {tabValue === 0 && (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>Performance by Pattern Type</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={patternTypeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" orientation="left" />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="totalTrades" fill="#8884d8" name="Total Trades" />
                    <Bar yAxisId="right" dataKey="winRate" fill="#82ca9d" name="Win Rate (%)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
          
          {tabValue === 1 && (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>Performance by Timeframe</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={timeframeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" orientation="left" />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="totalTrades" fill="#8884d8" name="Total Trades" />
                    <Bar yAxisId="right" dataKey="winRate" fill="#82ca9d" name="Win Rate (%)" />
                    <Line yAxisId="left" type="monotone" dataKey="profitFactor" stroke="#ff7300" name="Profit Factor" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
          
          {tabValue === 2 && (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>Trade Distribution by Direction</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={directionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {directionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} Trades`, 'Count']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
          
          {tabValue === 3 && historicalData && (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>Historical Performance Over Time</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString()} 
                    />
                    <YAxis yAxisId="left" orientation="left" />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <Legend />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="winRate" 
                      stroke="#82ca9d" 
                      name="Win Rate (%)"
                      dot={false}
                    />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="profitFactor" 
                      stroke="#8884d8" 
                      name="Profit Factor"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default BacktestStatisticsDisplay; 