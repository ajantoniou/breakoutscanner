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
  Grid,
  alpha,
  Stack,
  IconButton
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import BarChartIcon from '@mui/icons-material/BarChart';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import ArchiveIcon from '@mui/icons-material/Archive';
import TimelineIcon from '@mui/icons-material/Timeline';
import { formatDistanceToNowStrict } from 'date-fns';
import { PatternData } from '../../services/types/patternTypes';

interface PatternCardProps {
  pattern: PatternData;
  avgCandlesToBreakout?: number;
  onViewChart?: (pattern: PatternData) => void;
  onArchive?: (pattern: PatternData) => void;
  onSetExitAlert?: (pattern: PatternData) => void;
}

const PatternCard: React.FC<PatternCardProps> = ({ 
  pattern, 
  avgCandlesToBreakout, 
  onViewChart, 
  onArchive,
  onSetExitAlert
}) => {
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

  // Format percentage with + sign for positive values
  const formatPercentage = (value: number): string => {
    return value > 0 ? `+${value.toFixed(2)}%` : `${value.toFixed(2)}%`;
  };

  // Determine status color
  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'active') return 'success';
    if (statusLower === 'completed') return 'info';
    if (statusLower === 'failed') return 'error';
    return 'default';
  };

  return (
    <Card 
      elevation={3} 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        borderRadius: 3,
        position: 'relative',
        overflow: 'visible',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        borderTop: `4px solid ${isBullish ? 'success.main' : 'error.main'}`,
        '&:hover': {
          transform: 'translateY(-8px)',
          boxShadow: '0 16px 30px rgba(0, 0, 0, 0.1), 0 6px 12px rgba(0, 0, 0, 0.05)',
        }
      }}
    >
      <CardContent sx={{ flexGrow: 1, p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="h5" component="div" sx={{ fontWeight: 'bold', mr: 1 }}>
              {pattern.symbol}
            </Typography>
            <Chip 
              icon={isBullish ? <TrendingUpIcon /> : <TrendingDownIcon />}
              label={isBullish ? 'Bullish' : 'Bearish'}
              color={isBullish ? 'success' : 'error'}
              size="small"
              sx={{
                fontWeight: 'bold',
                borderRadius: 1.5,
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}
            />
          </Box>
          <Chip 
            label={pattern.timeframe}
            color="primary"
            size="small"
            variant="outlined"
            sx={{ borderRadius: 1, fontWeight: 'medium' }}
          />
        </Box>
        
        <Typography 
          variant="subtitle2" 
          color="text.secondary" 
          gutterBottom
          sx={{ 
            display: 'flex', 
            alignItems: 'center',
            background: theme => alpha(theme.palette.primary.main, 0.08),
            py: 0.5,
            px: 1,
            borderRadius: 1,
            mb: 2
          }}
        >
          <BarChartIcon sx={{ fontSize: 16, mr: 0.5 }} />
          {pattern.pattern_type}
        </Typography>
        
        <Divider sx={{ my: 2 }} />
        
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={4}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Detected
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {timeAgo}
            </Typography>
          </Grid>
          <Grid size={4}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Confidence
            </Typography>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              p: 0.5, 
              borderRadius: 1,
              background: theme => alpha(getConfidenceColor(pattern.confidence_score), 0.1)
            }}>
              <Typography 
                variant="body2" 
                fontWeight="bold" 
                sx={{ color: getConfidenceColor(pattern.confidence_score) }}
              >
                {pattern.confidence_score}% 
                <Typography 
                  component="span" 
                  variant="caption" 
                  sx={{ ml: 0.5, color: 'inherit', opacity: 0.8 }}
                >
                  ({getConfidenceText(pattern.confidence_score)})
                </Typography>
              </Typography>
            </Box>
          </Grid>
          <Grid size={4}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Status
            </Typography>
            <Chip
              label={pattern.status}
              size="small"
              color={getStatusColor(pattern.status)}
              sx={{ fontWeight: 'medium', fontSize: '0.75rem', height: 24 }}
            />
          </Grid>
        </Grid>
        
        <Box sx={{ 
          p: 2, 
          borderRadius: 2, 
          mb: 2, 
          background: theme => alpha(theme.palette.background.default, 0.6) 
        }}>
          <Grid container spacing={2} sx={{ mb: 1 }}>
            <Grid size={6}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Entry
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                ${formatPrice(pattern.entry_price)}
              </Typography>
            </Grid>
            <Grid size={6}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Target
              </Typography>
              <Typography variant="body1" fontWeight="bold" color="success.main">
                ${formatPrice(pattern.target_price)} 
                <Typography 
                  component="span" 
                  variant="caption" 
                  color="success.main" 
                  sx={{ ml: 0.5, fontWeight: 'medium' }}
                >
                  (+{potentialProfit.toFixed(1)}%)
                </Typography>
              </Typography>
            </Grid>
          </Grid>
          
          <Grid container spacing={2}>
            <Grid size={6}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Stop Loss
              </Typography>
              <Typography variant="body1" fontWeight="bold" color="error.main">
                ${pattern.stop_loss ? formatPrice(pattern.stop_loss) : 'N/A'}
              </Typography>
            </Grid>
            <Grid size={6}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Channel Type
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {pattern.channel_type || 'N/A'}
              </Typography>
            </Grid>
          </Grid>
        </Box>
        
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 2,
          p: 1,
          borderRadius: 1,
          border: '1px dashed',
          borderColor: 'divider'
        }}>
          <Typography variant="caption" color="text.secondary">
            Risk/Reward
          </Typography>
          <Typography variant="body2" fontWeight="bold" color="primary.main">
            {formatRiskReward(pattern.risk_reward_ratio)}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {pattern.volume_confirmation && (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              p: 0.75, 
              borderRadius: 1,
              background: theme => alpha(theme.palette.success.main, 0.1)
            }}>
              <CheckCircleIcon color="success" fontSize="small" sx={{ mr: 1 }} />
              <Typography variant="body2" color="success.main" fontWeight="medium">
                Volume Confirmation
              </Typography>
            </Box>
          )}
          
          {pattern.trendline_break && (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              p: 0.75, 
              borderRadius: 1,
              background: theme => alpha(theme.palette.success.main, 0.1)
            }}>
              <CheckCircleIcon color="success" fontSize="small" sx={{ mr: 1 }} />
              <Typography variant="body2" color="success.main" fontWeight="medium">
                Trendline Break
              </Typography>
            </Box>
          )}
          
          {avgCandlesToBreakout && (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              p: 0.75, 
              borderRadius: 1,
              background: theme => alpha(theme.palette.info.main, 0.1)
            }}>
              <AccessTimeIcon color="info" fontSize="small" sx={{ mr: 1 }} />
              <Typography variant="body2" color="info.main" fontWeight="medium">
                Expected Breakout: {getExpectedBreakoutTime()}
              </Typography>
            </Box>
          )}
        </Box>
        
        <Typography 
          variant="caption" 
          color="text.secondary" 
          sx={{ 
            display: 'block', 
            mt: 2, 
            textAlign: 'right', 
            fontStyle: 'italic', 
            opacity: 0.7 
          }}
        >
          Created: {new Date(pattern.created_at).toLocaleString()}
        </Typography>
      </CardContent>
      
      <CardActions sx={{ p: 2, pt: 0, display: 'flex', gap: 1 }}>
        <Stack direction="row" spacing={1}>
          {onViewChart && (
            <Button 
              size="small" 
              variant="outlined" 
              startIcon={<TimelineIcon />}
              onClick={() => onViewChart(pattern)}
            >
              View Chart
            </Button>
          )}
          
          <Box>
            {onSetExitAlert && (
              <IconButton 
                size="small" 
                color="warning"
                onClick={() => onSetExitAlert(pattern)}
                title="Set Exit Alert"
              >
                <ExitToAppIcon />
              </IconButton>
            )}
            
            {onArchive && (
              <IconButton 
                size="small" 
                color="default"
                onClick={() => onArchive(pattern)}
                title="Archive Pattern"
              >
                <ArchiveIcon />
              </IconButton>
            )}
          </Box>
        </Stack>
      </CardActions>
    </Card>
  );
};

export default PatternCard; 