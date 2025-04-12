import React from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Chip,
  Card,
  CardContent,
  CardActions,
  Button,
  Divider,
  Stack,
  LinearProgress
} from '@mui/material';
import { PatternData } from '@/services/types/patternTypes';
import { BreakoutData } from '@/services/api/marketData/patternDetection/breakoutDetector';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

interface PatternCardProps {
  pattern: PatternData | BreakoutData;
  avgCandlesToBreakout: number;
}

const PatternCard: React.FC<PatternCardProps> = ({ pattern, avgCandlesToBreakout }) => {
  // Determine if pattern is a breakout
  const isBreakout = 'breakoutType' in pattern;
  
  // Format entry, target, and stop loss prices
  const formatPrice = (price: number) => {
    return price < 10 ? price.toFixed(3) : price.toFixed(2);
  };
  
  // Format potential profit
  const formatProfit = (profit: number) => {
    return profit.toFixed(2) + '%';
  };
  
  // Format risk/reward ratio
  const formatRiskReward = (ratio: number) => {
    return ratio.toFixed(2);
  };
  
  // Determine confidence color
  const getConfidenceColor = (score: number) => {
    if (score >= 90) return 'success.main';
    if (score >= 80) return 'success.light';
    if (score >= 70) return 'warning.light';
    if (score >= 60) return 'warning.main';
    return 'error.main';
  };
  
  // Determine confidence level text
  const getConfidenceText = (score: number) => {
    if (score >= 90) return 'Very High';
    if (score >= 80) return 'High';
    if (score >= 70) return 'Moderate';
    if (score >= 60) return 'Low';
    return 'Very Low';
  };
  
  // Determine pattern type display
  const getPatternTypeDisplay = () => {
    if (isBreakout) {
      return (pattern as BreakoutData).breakoutType;
    } else {
      return (pattern as PatternData).patternType;
    }
  };
  
  // Calculate expected breakout time based on average candles to breakout
  const getExpectedBreakoutTime = () => {
    const detectedAt = new Date(pattern.detectedAt);
    let timeframeInMinutes = 0;
    
    // Convert timeframe to minutes
    switch (pattern.timeframe) {
      case '1m':
        timeframeInMinutes = 1;
        break;
      case '5m':
        timeframeInMinutes = 5;
        break;
      case '15m':
        timeframeInMinutes = 15;
        break;
      case '30m':
        timeframeInMinutes = 30;
        break;
      case '1h':
        timeframeInMinutes = 60;
        break;
      case '4h':
        timeframeInMinutes = 240;
        break;
      case '1d':
        timeframeInMinutes = 1440;
        break;
      case '1w':
        timeframeInMinutes = 10080;
        break;
      default:
        timeframeInMinutes = 60;
    }
    
    // Calculate expected breakout time
    const expectedBreakoutTime = new Date(detectedAt.getTime() + (avgCandlesToBreakout * timeframeInMinutes * 60 * 1000));
    
    // Format date for display
    return expectedBreakoutTime.toLocaleString();
  };
  
  return (
    <Card elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="div">
            {pattern.symbol}
          </Typography>
          <Chip 
            icon={pattern.direction === 'bullish' ? <TrendingUpIcon /> : <TrendingDownIcon />}
            label={pattern.direction === 'bullish' ? 'Bullish' : 'Bearish'}
            color={pattern.direction === 'bullish' ? 'success' : 'error'}
            size="small"
          />
        </Box>
        
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          {getPatternTypeDisplay()} ({pattern.timeframe})
        </Typography>
        
        <Divider sx={{ my: 1.5 }} />
        
        <Grid container spacing={1} sx={{ mb: 1.5 }}>
          <Grid item xs={4}>
            <Typography variant="caption" color="text.secondary">
              Entry
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              ${formatPrice(pattern.entry)}
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="caption" color="text.secondary">
              Target
            </Typography>
            <Typography variant="body2" fontWeight="bold" color="success.main">
              ${formatPrice(pattern.target)}
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="caption" color="text.secondary">
              Stop Loss
            </Typography>
            <Typography variant="body2" fontWeight="bold" color="error.main">
              ${formatPrice(pattern.stopLoss)}
            </Typography>
          </Grid>
        </Grid>
        
        <Grid container spacing={1} sx={{ mb: 1.5 }}>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              Risk/Reward
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {formatRiskReward(pattern.riskRewardRatio)}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              Potential Profit
            </Typography>
            <Typography variant="body2" fontWeight="bold" color="success.main">
              {formatProfit(pattern.potentialProfit)}
            </Typography>
          </Grid>
        </Grid>
        
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Confidence Score</span>
            <span>{pattern.confidenceScore}% ({getConfidenceText(pattern.confidenceScore)})</span>
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={pattern.confidenceScore} 
            color={
              pattern.confidenceScore >= 80 ? 'success' : 
              pattern.confidenceScore >= 60 ? 'warning' : 
              'error'
            }
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>
        
        {pattern.multiTimeframeConfirmation && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
            <CheckCircleIcon color="success" fontSize="small" sx={{ mr: 0.5 }} />
            <Typography variant="body2" color="success.main">
              Multi-Timeframe Confirmation
            </Typography>
          </Box>
        )}
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <AccessTimeIcon color="info" fontSize="small" sx={{ mr: 0.5 }} />
          <Typography variant="body2" color="info.main">
            Expected Breakout: {getExpectedBreakoutTime()}
          </Typography>
        </Box>
        
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
          Detected: {new Date(pattern.detectedAt).toLocaleString()}
        </Typography>
      </CardContent>
      
      <CardActions>
        <Button size="small" color="primary">
          View Chart
        </Button>
        <Button size="small" color="secondary">
          Backtest History
        </Button>
      </CardActions>
    </Card>
  );
};

export default PatternCard;
