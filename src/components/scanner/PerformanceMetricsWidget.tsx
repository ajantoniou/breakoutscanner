import React from 'react';
import { Box, Card, CardContent, Grid, Typography, Tooltip } from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import { PerformanceMetrics } from '../../services/backtesting/performanceAnalysis';

interface MetricCardProps {
  title: string;
  value: string | number;
  tooltip?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, tooltip }) => (
  <Tooltip title={tooltip || ''} arrow>
    <Card sx={{ height: '100%', backgroundColor: 'background.paper' }}>
      <CardContent>
        <Typography variant="subtitle2" color="textSecondary" gutterBottom>
          {title}
        </Typography>
        <Typography variant="h5" component="div">
          {typeof value === 'number' ? value.toFixed(2) : value}
        </Typography>
      </CardContent>
    </Card>
  </Tooltip>
);

interface PerformanceMetricsWidgetProps {
  metrics: PerformanceMetrics;
  historicalMetrics?: { date: string; winRate: number; profitFactor: number }[];
}

const COLORS = ['#4caf50', '#f44336'];

export const PerformanceMetricsWidget: React.FC<PerformanceMetricsWidgetProps> = ({ metrics, historicalMetrics = [] }) => {
  const winLossData = [
    { name: 'Winning', value: metrics.winningTrades },
    { name: 'Losing', value: metrics.losingTrades }
  ];

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Performance Metrics
      </Typography>
      <Grid container spacing={2}>
        {/* Win/Loss Distribution */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', minHeight: 300 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Win/Loss Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={winLossData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {winLossData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Historical Performance */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%', minHeight: 300 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Historical Performance
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={historicalMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <RechartsTooltip />
                  <Line yAxisId="left" type="monotone" dataKey="winRate" stroke="#4caf50" name="Win Rate" />
                  <Line yAxisId="right" type="monotone" dataKey="profitFactor" stroke="#2196f3" name="Profit Factor" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Key Metrics */}
        <Grid item xs={12}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Win Rate"
                value={`${(metrics.winRate * 100).toFixed(1)}%`}
                tooltip="Percentage of winning trades"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Profit Factor"
                value={metrics.profitFactor}
                tooltip="Ratio of gross profits to gross losses"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Avg Profit/Loss"
                value={`${(metrics.averageProfitLoss * 100).toFixed(1)}%`}
                tooltip="Average profit/loss percentage per trade"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Consistency Score"
                value={metrics.consistencyScore}
                tooltip="Score indicating trading consistency (0-100)"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Risk/Reward"
                value={metrics.riskRewardRatio}
                tooltip="Average risk/reward ratio across all trades"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Max Drawdown"
                value={`${(metrics.maxDrawdown * 100).toFixed(1)}%`}
                tooltip="Maximum peak-to-trough decline"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Target Hit Rate"
                value={`${(metrics.targetHitRate * 100).toFixed(1)}%`}
                tooltip="Percentage of trades that hit their target price"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Total Trades"
                value={metrics.totalTrades}
                tooltip="Total number of completed trades"
              />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
}; 