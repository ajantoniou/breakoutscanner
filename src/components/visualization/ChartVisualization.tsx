/**
 * Chart Visualization Component
 * Provides visualization for breakout patterns and signals
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Button,
  Chip
} from '@mui/material';
import { createChart, IChartApi, ISeriesApi, CandlestickData, LineData, Time } from 'lightweight-charts';
import { PatternData } from '@/services/types/patternTypes';
import { BreakoutData } from '@/services/api/marketData/patternDetection/breakoutDetector';

interface ChartVisualizationProps {
  pattern: PatternData | BreakoutData;
}

const ChartVisualization: React.FC<ChartVisualizationProps> = ({ pattern }) => {
  // Refs for chart container and chart instance
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  
  // State for chart data
  const [candlestickData, setCandlestickData] = useState<CandlestickData[]>([]);
  const [volumeData, setVolumeData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [timeframe, setTimeframe] = useState<string>(pattern.timeframe);
  
  // Initialize chart on component mount
  useEffect(() => {
    if (chartContainerRef.current) {
      // Create chart
      const chart = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: 500,
        layout: {
          background: { color: '#ffffff' },
          textColor: '#333',
        },
        grid: {
          vertLines: { color: '#f0f0f0' },
          horzLines: { color: '#f0f0f0' },
        },
        crosshair: {
          mode: 0,
        },
        rightPriceScale: {
          borderColor: '#d1d4dc',
        },
        timeScale: {
          borderColor: '#d1d4dc',
        },
      });
      
      // Create candlestick series
      const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      });
      
      // Create volume series
      const volumeSeries = chart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: '',
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });
      
      // Save refs
      chartRef.current = chart;
      candlestickSeriesRef.current = candlestickSeries;
      volumeSeriesRef.current = volumeSeries;
      
      // Fetch data
      fetchChartData(pattern.symbol, timeframe);
      
      // Handle resize
      const handleResize = () => {
        if (chartRef.current && chartContainerRef.current) {
          chartRef.current.applyOptions({ 
            width: chartContainerRef.current.clientWidth 
          });
        }
      };
      
      window.addEventListener('resize', handleResize);
      
      // Cleanup
      return () => {
        window.removeEventListener('resize', handleResize);
        if (chartRef.current) {
          chartRef.current.remove();
        }
      };
    }
  }, []);
  
  // Update chart when timeframe changes
  useEffect(() => {
    fetchChartData(pattern.symbol, timeframe);
  }, [timeframe]);
  
  // Fetch chart data
  const fetchChartData = async (symbol: string, timeframe: string) => {
    setIsLoading(true);
    
    try {
      // Import data service
      const { fetchHistoricalData } = await import('@/services/api/marketData/dataService');
      
      // Fetch data
      const data = await fetchHistoricalData(symbol, timeframe, 100);
      
      // Format data for chart
      const candlesticks = data.map((bar: any) => ({
        time: bar.timestamp as Time,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
      }));
      
      const volumes = data.map((bar: any) => ({
        time: bar.timestamp as Time,
        value: bar.volume,
        color: bar.close >= bar.open ? '#26a69a' : '#ef5350',
      }));
      
      // Update state
      setCandlestickData(candlesticks);
      setVolumeData(volumes);
      
      // Update chart
      if (candlestickSeriesRef.current && volumeSeriesRef.current) {
        candlestickSeriesRef.current.setData(candlesticks);
        volumeSeriesRef.current.setData(volumes);
      }
      
      // Add pattern visualization
      addPatternVisualization(pattern, candlesticks);
      
      // Fit content
      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Add pattern visualization
  const addPatternVisualization = (pattern: PatternData | BreakoutData, candlesticks: CandlestickData[]) => {
    if (!chartRef.current) return;
    
    // Get pattern type
    const patternType = 'patternType' in pattern ? pattern.patternType : pattern.breakoutType;
    
    // Find pattern start and end indices
    const entryIndex = candlesticks.findIndex(candle => 
      Math.abs(candle.close - pattern.entryPrice) / pattern.entryPrice < 0.005
    );
    
    if (entryIndex === -1) return;
    
    // Add entry marker
    const entrySeries = chartRef.current.addLineSeries({
      color: '#2196F3',
      lineWidth: 2,
      lineStyle: 0,
      title: 'Entry',
      lastValueVisible: false,
    });
    
    entrySeries.setData([
      { time: candlesticks[Math.max(0, entryIndex - 10)].time, value: pattern.entryPrice },
      { time: candlesticks[Math.min(candlesticks.length - 1, entryIndex + 10)].time, value: pattern.entryPrice },
    ]);
    
    // Add target marker
    const targetSeries = chartRef.current.addLineSeries({
      color: '#4CAF50',
      lineWidth: 2,
      lineStyle: 2,
      title: 'Target',
      lastValueVisible: false,
    });
    
    targetSeries.setData([
      { time: candlesticks[Math.max(0, entryIndex - 10)].time, value: pattern.targetPrice },
      { time: candlesticks[Math.min(candlesticks.length - 1, entryIndex + 10)].time, value: pattern.targetPrice },
    ]);
    
    // Add stop loss marker
    const stopSeries = chartRef.current.addLineSeries({
      color: '#F44336',
      lineWidth: 2,
      lineStyle: 2,
      title: 'Stop Loss',
      lastValueVisible: false,
    });
    
    stopSeries.setData([
      { time: candlesticks[Math.max(0, entryIndex - 10)].time, value: pattern.stopLoss },
      { time: candlesticks[Math.min(candlesticks.length - 1, entryIndex + 10)].time, value: pattern.stopLoss },
    ]);
    
    // Add pattern-specific visualization
    if (patternType.includes('Flag')) {
      addFlagVisualization(pattern, candlesticks, entryIndex);
    } else if (patternType.includes('Triangle')) {
      addTriangleVisualization(pattern, candlesticks, entryIndex);
    } else if (patternType.includes('Channel')) {
      addChannelVisualization(pattern, candlesticks, entryIndex);
    }
  };
  
  // Add flag pattern visualization
  const addFlagVisualization = (pattern: PatternData | BreakoutData, candlesticks: CandlestickData[], entryIndex: number) => {
    if (!chartRef.current) return;
    
    // Create pole and flag lines
    const poleStart = entryIndex - 15;
    const flagStart = entryIndex - 10;
    const flagEnd = entryIndex;
    
    if (poleStart < 0) return;
    
    // Add pole line
    const poleSeries = chartRef.current.addLineSeries({
      color: pattern.direction === 'bullish' ? '#4CAF50' : '#F44336',
      lineWidth: 2,
      lineStyle: 0,
      title: 'Pole',
      lastValueVisible: false,
    });
    
    // Add flag lines
    const upperFlagSeries = chartRef.current.addLineSeries({
      color: '#FF9800',
      lineWidth: 2,
      lineStyle: 0,
      title: 'Upper Flag',
      lastValueVisible: false,
    });
    
    const lowerFlagSeries = chartRef.current.addLineSeries({
      color: '#FF9800',
      lineWidth: 2,
      lineStyle: 0,
      title: 'Lower Flag',
      lastValueVisible: false,
    });
    
    if (pattern.direction === 'bullish') {
      // Bullish flag
      const poleBottom = candlesticks[poleStart].low;
      const poleTop = candlesticks[flagStart].high;
      
      poleSeries.setData([
        { time: candlesticks[poleStart].time, value: poleBottom },
        { time: candlesticks[flagStart].time, value: poleTop },
      ]);
      
      // Calculate flag channel
      const upperFlagData: LineData[] = [];
      const lowerFlagData: LineData[] = [];
      
      for (let i = flagStart; i <= flagEnd; i++) {
        upperFlagData.push({
          time: candlesticks[i].time,
          value: poleTop - (i - flagStart) * (poleTop - poleBottom) / 15,
        });
        
        lowerFlagData.push({
          time: candlesticks[i].time,
          value: poleTop - (i - flagStart) * (poleTop - poleBottom) / 15 - (poleTop - poleBottom) / 3,
        });
      }
      
      upperFlagSeries.setData(upperFlagData);
      lowerFlagSeries.setData(lowerFlagData);
    } else {
      // Bearish flag
      const poleTop = candlesticks[poleStart].high;
      const poleBottom = candlesticks[flagStart].low;
      
      poleSeries.setData([
        { time: candlesticks[poleStart].time, value: poleTop },
        { time: candlesticks[flagStart].time, value: poleBottom },
      ]);
      
      // Calculate flag channel
      const upperFlagData: LineData[] = [];
      const lowerFlagData: LineData[] = [];
      
      for (let i = flagStart; i <= flagEnd; i++) {
        upperFlagData.push({
          time: candlesticks[i].time,
          value: poleBottom + (i - flagStart) * (poleTop - poleBottom) / 15 + (poleTop - poleBottom) / 3,
        });
        
        lowerFlagData.push({
          time: candlesticks[i].time,
          value: poleBottom + (i - flagStart) * (poleTop - poleBottom) / 15,
        });
      }
      
      upperFlagSeries.setData(upperFlagData);
      lowerFlagSeries.setData(lowerFlagData);
    }
  };
  
  // Add triangle pattern visualization
  const addTriangleVisualization = (pattern: PatternData | BreakoutData, candlesticks: CandlestickData[], entryIndex: number) => {
    if (!chartRef.current) return;
    
    const triangleStart = entryIndex - 20;
    const triangleEnd = entryIndex;
    
    if (triangleStart < 0) return;
    
    // Add triangle lines
    const upperTriangleSeries = chartRef.current.addLineSeries({
      color: '#FF9800',
      lineWidth: 2,
      lineStyle: 0,
      title: 'Upper Triangle',
      lastValueVisible: false,
    });
    
    const lowerTriangleSeries = chartRef.current.addLineSeries({
      color: '#FF9800',
      lineWidth: 2,
      lineStyle: 0,
      title: 'Lower Triangle',
      lastValueVisible: false,
    });
    
    if ('patternType' in pattern && pattern.patternType.includes('Ascending')) {
      // Ascending triangle
      const resistance = Math.max(...candlesticks.slice(triangleStart, triangleEnd).map(c => c.high));
      const supportStart = candlesticks[triangleStart].low;
      const supportEnd = candlesticks[triangleEnd].low;
      
      // Upper line (horizontal resistance)
      upperTriangleSeries.setData([
        { time: candlesticks[triangleStart].time, value: resistance },
        { time: candlesticks[triangleEnd].time, value: resistance },
      ]);
      
      // Lower line (ascending support)
      lowerTriangleSeries.setData([
        { time: candlesticks[triangleStart].time, value: supportStart },
        { time: candlesticks[triangleEnd].time, value: supportEnd },
      ]);
    } else {
      // Descending triangle
      const support = Math.min(...candlesticks.slice(triangleStart, triangleEnd).map(c => c.low));
      const resistanceStart = candlesticks[triangleStart].high;
      const resistanceEnd = candlesticks[triangleEnd].high;
      
      // Upper line (descending resistance)
      upperTriangleSeries.setData([
        { time: candlesticks[triangleStart].time, value: resistanceStart },
        { time: candlesticks[triangleEnd].time, value: resistanceEnd },
      ]);
      
      // Lower line (horizontal support)
      lowerTriangleSeries.setData([
        { time: candlesticks[triangleStart].time, value: support },
        { time: candlesticks[triangleEnd].time, value: support },
      ]);
    }
  };
  
  // Add channel pattern visualization
  const addChannelVisualization = (pattern: PatternData | BreakoutData, candlesticks: CandlestickData[], entryIndex: number) => {
    if (!chartRef.current) return;
    
    const channelStart = entryIndex - 20;
    const channelEnd = entryIndex;
    
    if (channelStart < 0) return;
    
    // Add channel lines
    const upperChannelSeries = chartRef.current.addLineSeries({
      color: '#FF9800',
      lineWidth: 2,
      lineStyle: 0,
      title: 'Upper Channel',
      lastValueVisible: false,
    });
    
    const lowerChannelSeries = chartRef.current.addLineSeries({
      color: '#FF9800',
      lineWidth: 2,
      lineStyle: 0,
      title: 'Lower Channel',
      lastValueVisible: false,
    });
    
    if ('breakoutType' in pattern) {
      if (pattern.breakoutType.includes('Horizontal')) {
        // Horizontal channel
        const resistance = Math.max(...candlesticks.slice(channelStart, channelEnd).map(c => c.high));
        const support = Math.min(...candlesticks.slice(channelStart, channelEnd).map(c => c.low));
        
        upperChannelSeries.setData([
          { time: candlesticks[channelStart].time, value: resistance },
          { time: candlesticks[channelEnd].time, value: resistance },
        ]);
        
        lowerChannelSeries.setData([
          { time: candlesticks[channelStart].time, value: support },
          { time: candlesticks[channelEnd].time, value: support },
        ]);
      } else if (pattern.breakoutType.includes('Ascending')) {
        // Ascending channel
        const upperStart = candlesticks[channelStart].high;
        const upperEnd = candlesticks[channelEnd].high;
        const lowerStart = candlesticks[channelStart].low;
        const lowerEnd = candlesticks[channelEnd].low;
        
        upperChannelSeries.setData([
          { time: candlesticks[channelStart].time, value: upperStart },
          { time: candlesticks[channelEnd].time, value: upperEnd },
        ]);
        
        lowerChannelSeries.setData([
          { time: candlesticks[channelStart].time, value: lowerStart },
          { time: candlesticks[channelEnd].time, value: lowerEnd },
        ]);
      } else if (pattern.breakoutType.includes('Descending')) {
        // Descending channel
        const upperStart = candlesticks[channelStart].high;
        const upperEnd = candlesticks[channelEnd].high;
        const lowerStart = candlesticks[channelStart].low;
        const lowerEnd = candlesticks[channelEnd].low;
        
        upperChannelSeries.setData([
          { time: candlesticks[channelStart].time, value: upperStart },
          { time: candlesticks[channelEnd].time, value: upperEnd },
        ]);
        
        lowerChannelSeries.setData([
          { time: candlesticks[channelStart].time, value: lowerStart },
          { time: candlesticks[channelEnd].time, value: lowerEnd },
        ]);
      }
    }
  };
  
  // Handle timeframe change
  const handleTimeframeChange = (event: SelectChangeEvent) => {
    setTimeframe(event.target.value);
  };
  
  return (
    <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          {pattern.symbol} - {
            'patternType' in pattern ? pattern.patternType : pattern.breakoutType
          }
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Chip 
            label={pattern.direction === 'bullish' ? 'Bullish' : 'Bearish'} 
            color={pattern.direction === 'bullish' ? 'success' : 'error'}
            sx={{ mr: 1 }}
          />
          
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel id="timeframe-select-label">Timeframe</InputLabel>
            <Select
              labelId="timeframe-select-label"
              id="timeframe-select"
              value={timeframe}
              label="Timeframe"
              onChange={handleTimeframeChange}
              size="small"
            >
              <MenuItem value="1m">1 Minute</MenuItem>
              <MenuItem value="5m">5 Minutes</MenuItem>
              <MenuItem value="15m">15 Minutes</MenuItem>
              <MenuItem value="30m">30 Minutes</MenuItem>
              <MenuItem value="1h">1 Hour</MenuItem>
              <MenuItem value="4h">4 Hours</MenuItem>
              <MenuItem value="1d">Daily</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>
      
      <Box 
        ref={chartContainerRef} 
        sx={{ 
          width: '100%', 
          height: 500,
          position: 'relative',
          '.tv-lightweight-charts': {
            width: '100% !important',
          }
        }}
      >
        {isLoading && (
          <Box sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            zIndex: 1
          }}>
            <CircularProgress />
          </Box>
        )}
      </Box>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
        <Box>
          <Typography variant="body2">
            Entry: <strong>${pattern.entryPrice.toFixed(2)}</strong>
          </Typography>
          <Typography variant="body2" color="success.main">
            Target: <strong>${pattern.targetPrice.toFixed(2)}</strong>
          </Typography>
          <Typography variant="body2" color="error.main">
            Stop Loss: <strong>${pattern.stopLoss.toFixed(2)}</strong>
          </Typography>
        </Box>
        
        <Box>
          <Typography variant="body2">
            Confidence: <strong>{pattern.confidenceScore}%</strong>
          </Typography>
          <Typography variant="body2">
            Risk/Reward: <strong>
              1:{(Math.abs(pattern.targetPrice - pattern.entryPrice) / Math.abs(pattern.stopLoss - pattern.entryPrice)).toFixed(2)}
            </strong>
          </Typography>
          <Typography variant="body2">
            Potential Profit: <strong>
              {(Math.abs(pattern.targetPrice - pattern.entryPrice) / pattern.entryPrice * 100).toFixed(2)}%
            </strong>
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default ChartVisualization;
