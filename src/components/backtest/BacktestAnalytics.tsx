import React from 'react';
import { Paper, Typography, Box, Divider } from '@mui/material';
import { BacktestAnalyticsData } from '../../services/types/backtestTypes';

interface BacktestAnalyticsProps {
  analytics: BacktestAnalyticsData | null;
}

const BacktestAnalytics: React.FC<BacktestAnalyticsProps> = ({ analytics }) => {
  if (!analytics) {
    return (
      <Paper sx={{ p: 3, my: 2 }}>
        <Typography variant="subtitle1" align="center">
          No analytics data available. Apply filters to see backtest analytics.
        </Typography>
      </Paper>
    );
  }

  const StatCard = ({ title, value, description = '', color = 'text.primary' }: { 
    title: string; 
    value: string | number; 
    description?: string;
    color?: string;
  }) => (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Typography variant="subtitle2" color="text.secondary">
        {title}
      </Typography>
      <Typography variant="h4" sx={{ my: 1, color }}>
        {value}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      )}
    </Paper>
  );

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Performance Summary
      </Typography>
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box sx={{ width: { xs: '100%', sm: '47%', md: '23%' } }}>
          <StatCard 
            title="Win Rate" 
            value={`${(analytics.winRate * 100).toFixed(1)}%`}
            color={analytics.winRate >= 0.5 ? 'success.main' : 'error.main'}
            description={`${analytics.totalWins} wins / ${analytics.totalTrades} trades`}
          />
        </Box>
        <Box sx={{ width: { xs: '100%', sm: '47%', md: '23%' } }}>
          <StatCard 
            title="Profit Factor" 
            value={analytics.profitFactor.toFixed(2)}
            color={analytics.profitFactor >= 1 ? 'success.main' : 'error.main'}
            description="Gross profit / gross loss"
          />
        </Box>
        <Box sx={{ width: { xs: '100%', sm: '47%', md: '23%' } }}>
          <StatCard 
            title="Avg. R Multiple" 
            value={analytics.averageRMultiple.toFixed(2)}
            color={analytics.averageRMultiple >= 0 ? 'success.main' : 'error.main'}
            description="Average risk-adjusted return"
          />
        </Box>
        <Box sx={{ width: { xs: '100%', sm: '47%', md: '23%' } }}>
          <StatCard 
            title="Expectancy" 
            value={`${(analytics.expectancy * 100).toFixed(2)}%`}
            color={analytics.expectancy >= 0 ? 'success.main' : 'error.main'}
            description="Expected return per trade"
          />
        </Box>
      </Box>
      
      <Divider sx={{ my: 3 }} />
      
      <Typography variant="h6" gutterBottom>
        Trade Statistics
      </Typography>
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ width: { xs: '100%', md: '32%' } }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Trade Distribution
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 1 }}>
              <Typography variant="body2" color="text.secondary">Total Trades:</Typography>
              <Typography variant="body2" align="right">{analytics.totalTrades}</Typography>
              
              <Typography variant="body2" color="text.secondary">Wins:</Typography>
              <Typography variant="body2" align="right" color="success.main">{analytics.totalWins}</Typography>
              
              <Typography variant="body2" color="text.secondary">Losses:</Typography>
              <Typography variant="body2" align="right" color="error.main">{analytics.totalLosses}</Typography>
              
              <Typography variant="body2" color="text.secondary">Pending:</Typography>
              <Typography variant="body2" align="right">{analytics.pendingTrades}</Typography>
            </Box>
          </Paper>
        </Box>
        
        <Box sx={{ width: { xs: '100%', md: '32%' } }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Profit/Loss
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 1 }}>
              <Typography variant="body2" color="text.secondary">Total P/L:</Typography>
              <Typography 
                variant="body2" 
                align="right" 
                color={analytics.totalProfitLossPercent >= 0 ? 'success.main' : 'error.main'}
              >
                {analytics.totalProfitLossPercent >= 0 ? '+' : ''}
                {analytics.totalProfitLossPercent.toFixed(2)}%
              </Typography>
              
              <Typography variant="body2" color="text.secondary">Avg. Win:</Typography>
              <Typography variant="body2" align="right" color="success.main">
                +{analytics.averageWinPercent.toFixed(2)}%
              </Typography>
              
              <Typography variant="body2" color="text.secondary">Avg. Loss:</Typography>
              <Typography variant="body2" align="right" color="error.main">
                {analytics.averageLossPercent.toFixed(2)}%
              </Typography>
              
              <Typography variant="body2" color="text.secondary">Win/Loss Ratio:</Typography>
              <Typography variant="body2" align="right">
                {analytics.winLossRatio.toFixed(2)}
              </Typography>
            </Box>
          </Paper>
        </Box>
        
        <Box sx={{ width: { xs: '100%', md: '32%' } }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Pattern Performance
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 1 }}>
              <Typography variant="body2" color="text.secondary">Best Pattern:</Typography>
              <Typography variant="body2" align="right">
                {analytics.bestPattern ? analytics.bestPattern : 'N/A'}
              </Typography>
              
              <Typography variant="body2" color="text.secondary">Best Win Rate:</Typography>
              <Typography variant="body2" align="right" color="success.main">
                {analytics.bestPatternWinRate ? `${(analytics.bestPatternWinRate * 100).toFixed(1)}%` : 'N/A'}
              </Typography>
              
              <Typography variant="body2" color="text.secondary">Best Timeframe:</Typography>
              <Typography variant="body2" align="right">
                {analytics.bestTimeframe ? analytics.bestTimeframe : 'N/A'}
              </Typography>
              
              <Typography variant="body2" color="text.secondary">Avg. Days Held:</Typography>
              <Typography variant="body2" align="right">
                {analytics.averageDaysHeld ? analytics.averageDaysHeld.toFixed(1) : 'N/A'}
              </Typography>
            </Box>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default BacktestAnalytics; 