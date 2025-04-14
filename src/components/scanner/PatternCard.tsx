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
  Stack
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { format, formatDistanceToNow } from 'date-fns';

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
  const timeAgo = formatDistanceToNow(new Date(pattern.created_at), { addSuffix: true });
  
  // Format created date for display
  const formattedCreatedDate = format(new Date(pattern.created_at), 'MMM d, yyyy h:mm a');
  
  // Check if the expected breakout date is in the past
  const getExpectedBreakoutTime = () => {
    if (!avgCandlesToBreakout) return { text: 'N/A', isPast: false };
    
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
    
    // Check if the expected breakout time is in the past
    const isPast = expectedBreakoutTime < new Date();
    
    // Format date for display
    const formattedDate = format(expectedBreakoutTime, 'MMM d, yyyy h:mm a');
    
    return { 
      text: formattedDate,
      isPast
    };
  };

  const breakoutInfo = getExpectedBreakoutTime();

  return (
    <Card 
      elevation={3} 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        borderTop: '4px solid',
        borderColor: isBullish ? 'success.main' : 'error.main',
        transition: 'transform 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 6
        }
      }}
    >
      <CardContent sx={{ flexGrow: 1, padding: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" component="div" fontWeight="bold">
            {pattern.symbol}
          </Typography>
          <Chip 
            icon={isBullish ? <TrendingUpIcon /> : <TrendingDownIcon />}
            label={isBullish ? 'Bullish' : 'Bearish'}
            color={isBullish ? 'success' : 'error'}
            size="small"
            sx={{ fontWeight: 'bold' }}
          />
        </Box>
        
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          {pattern.pattern_type} ({pattern.timeframe})
        </Typography>
        
        <Divider sx={{ my: 1.5 }} />
        
        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <Box sx={{ width: '33%' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>
              Detected
            </Typography>
            <Typography variant="body2">
              {timeAgo}
            </Typography>
          </Box>
          <Box sx={{ width: '33%' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>
              Confidence
            </Typography>
            <Typography variant="body2" sx={{ color: getConfidenceColor(pattern.confidence_score) }}>
              {pattern.confidence_score}% ({getConfidenceText(pattern.confidence_score)})
            </Typography>
          </Box>
          <Box sx={{ width: '33%' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>
              Status
            </Typography>
            <Typography variant="body2" sx={{ 
              color: pattern.status === 'Active' ? 'success.main' : 
                     pattern.status === 'Pending' ? 'info.main' : 
                     pattern.status === 'Completed' ? 'text.primary' : 'error.main'
            }}>
              {pattern.status}
            </Typography>
          </Box>
        </Stack>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>
              Entry
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              ${formatPrice(pattern.entry_price)}
            </Typography>
          </Box>
          <Box textAlign="center">
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>
              Risk/Reward
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {formatRiskReward(pattern.risk_reward_ratio)}
            </Typography>
          </Box>
          <Box textAlign="right">
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>
              Target
            </Typography>
            <Typography variant="body2" fontWeight="bold" color="success.main">
              ${formatPrice(pattern.target_price)}
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>
              Stop Loss
            </Typography>
            <Typography variant="body2" color="error.main">
              ${pattern.stop_loss ? formatPrice(pattern.stop_loss) : 'N/A'}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>
              Profit %
            </Typography>
            <Typography variant="body2" color="success.main">
              +{potentialProfit.toFixed(1)}%
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>
              Channel
            </Typography>
            <Typography variant="body2">
              {pattern.channel_type || 'N/A'}
            </Typography>
          </Box>
        </Box>
        
        {pattern.volume_confirmation && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <CheckCircleIcon color="success" fontSize="small" sx={{ mr: 0.5 }} />
            <Typography variant="body2" color="success.main">
              Volume Confirmation
            </Typography>
          </Box>
        )}
        
        {pattern.trendline_break && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <CheckCircleIcon color="success" fontSize="small" sx={{ mr: 0.5 }} />
            <Typography variant="body2" color="success.main">
              Trendline Break
            </Typography>
          </Box>
        )}
        
        {avgCandlesToBreakout && (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            p: 1, 
            mb: 1, 
            bgcolor: breakoutInfo.isPast ? 'error.lightest' : 'info.lightest', 
            borderRadius: 1,
            border: 1,
            borderColor: breakoutInfo.isPast ? 'error.light' : 'info.light'
          }}>
            <AccessTimeIcon color={breakoutInfo.isPast ? "error" : "info"} fontSize="small" sx={{ mr: 0.5 }} />
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>
                Expected Breakout
              </Typography>
              <Typography variant="body2" color={breakoutInfo.isPast ? "error" : "info.main"}>
                {breakoutInfo.text} {breakoutInfo.isPast && '(Past)'}
              </Typography>
            </Box>
          </Box>
        )}
        
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
          Created: {formattedCreatedDate}
        </Typography>
      </CardContent>
      
      <CardActions sx={{ padding: '8px 16px 16px 16px', justifyContent: 'space-between' }}>
        <Button 
          size="small" 
          color="primary" 
          variant="contained" 
          sx={{ flex: 1, mr: 1 }}
        >
          View Chart
        </Button>
        <Button 
          size="small" 
          color="secondary" 
          variant="outlined"
          sx={{ flex: 1 }}
        >
          Backtest
        </Button>
      </CardActions>
    </Card>
  );
};

export default PatternCard;
