import React from 'react';
import { 
  Box, 
  Typography, 
  Card,
  CardContent,
  CardActions,
  Button,
  Divider,
  Chip,
  Grid
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { formatDistanceToNowStrict } from 'date-fns';

interface PatternCardProps {
  pattern: {
    id: string;
    symbol: string;
    pattern_type: string;
    timeframe: string;
    entry_price: number;
    target_price: number;
    stop_loss?: number;
    confidence_score: number;
    created_at: string;
    channel_type?: string;
    volume_confirmation?: boolean;
    trendline_break?: boolean;
    ema_pattern?: string;
    status: string;
    risk_reward_ratio?: number;
  };
  avgCandlesToBreakout?: number;
}

const PatternCard: React.FC<PatternCardProps> = ({ pattern, avgCandlesToBreakout }) => {
  // Format entry, target, and stop loss prices
  const formatPrice = (price: number) => {
    return price < 10 ? price.toFixed(3) : price.toFixed(2);
  };
  
  // Calculate potential profit percentage
  const potentialProfit = ((pattern.target_price - pattern.entry_price) / pattern.entry_price) * 100;
  
  // Format risk/reward ratio
  const formatRiskReward = (ratio: number | undefined) => {
    if (ratio === undefined || ratio === null || !isFinite(ratio)) return 'N/A';
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
    if (score >= 80) return 'High';
    if (score >= 60) return 'Medium';
    return 'Low';
  };
  
  // Determine if the pattern is bullish based on pattern_type
  const isBullish = pattern.pattern_type.includes('Bull') || 
                   pattern.pattern_type.includes('Cup') || 
                   pattern.pattern_type.includes('Bottom') ||
                   pattern.pattern_type.includes('Ascending');
  
  const direction = isBullish ? 'bullish' : 'bearish';
  
  // Format the time since creation
  const timeAgo = formatDistanceToNowStrict(new Date(pattern.created_at), { addSuffix: true });
  
  // Calculate expected breakout time based on average candles to breakout
  const getExpectedBreakoutTime = () => {
    if (!avgCandlesToBreakout) return 'N/A';
    
    const createdAt = new Date(pattern.created_at);
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
    const expectedBreakoutTime = new Date(createdAt.getTime() + (avgCandlesToBreakout * timeframeInMinutes * 60 * 1000));
    
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
            icon={isBullish ? <TrendingUpIcon /> : <TrendingDownIcon />}
            label={isBullish ? 'Bullish' : 'Bearish'}
            color={isBullish ? 'success' : 'error'}
            size="small"
          />
        </Box>
        
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          {pattern.pattern_type} ({pattern.timeframe})
        </Typography>
        
        <Divider sx={{ my: 1.5 }} />
        
        <Grid container spacing={1} sx={{ mb: 1.5 }}>
          <Grid item xs={4}>
            <Typography variant="caption" color="text.secondary">
              Detected
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {timeAgo}
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="caption" color="text.secondary">
              Confidence
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {pattern.confidence_score}% ({getConfidenceText(pattern.confidence_score)})
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="caption" color="text.secondary">
              Status
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {pattern.status}
            </Typography>
          </Grid>
        </Grid>
        
        <Grid container spacing={1} sx={{ mb: 1.5 }}>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              Entry
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              ${formatPrice(pattern.entry_price)}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              Target
            </Typography>
            <Typography variant="body2" fontWeight="bold" color="success.main">
              ${formatPrice(pattern.target_price)} (+{potentialProfit.toFixed(1)}%)
            </Typography>
          </Grid>
        </Grid>
        
        <Grid container spacing={1} sx={{ mb: 1.5 }}>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              Stop Loss
            </Typography>
            <Typography variant="body2" fontWeight="bold" color="error.main">
              ${pattern.stop_loss ? formatPrice(pattern.stop_loss) : 'N/A'}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">Channel Type</Typography>
            <Typography variant="body2" fontWeight="bold">
              {pattern.channel_type || 'N/A'}
            </Typography>
          </Grid>
        </Grid>
        
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Risk/Reward</span>
            <span>{formatRiskReward(pattern.risk_reward_ratio)}</span>
          </Typography>
        </Box>
        
        {pattern.volume_confirmation && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
            <CheckCircleIcon color="success" fontSize="small" sx={{ mr: 0.5 }} />
            <Typography variant="body2" color="success.main">
              Volume Confirmation
            </Typography>
          </Box>
        )}
        
        {pattern.trendline_break && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
            <CheckCircleIcon color="success" fontSize="small" sx={{ mr: 0.5 }} />
            <Typography variant="body2" color="success.main">
              Trendline Break
            </Typography>
          </Box>
        )}
        
        {avgCandlesToBreakout && (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AccessTimeIcon color="info" fontSize="small" sx={{ mr: 0.5 }} />
            <Typography variant="body2" color="info.main">
              Expected Breakout: {getExpectedBreakoutTime()}
            </Typography>
          </Box>
        )}
        
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
          Created: {new Date(pattern.created_at).toLocaleString()}
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
