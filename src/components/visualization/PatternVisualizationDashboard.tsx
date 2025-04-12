/**
 * Pattern Visualization Dashboard Component
 * Displays visualizations for multiple patterns
 */

import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Paper, 
  Tabs, 
  Tab, 
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Button,
  CircularProgress
} from '@mui/material';
import ChartVisualization from './ChartVisualization';
import { PatternData } from '@/services/types/patternTypes';
import { BreakoutData } from '@/services/api/marketData/patternDetection/breakoutDetector';

// Define the tab panel interface
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// Tab panel component
const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`visualization-tabpanel-${index}`}
      aria-labelledby={`visualization-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

interface PatternVisualizationDashboardProps {
  patterns: (PatternData | BreakoutData)[];
  isLoading?: boolean;
}

const PatternVisualizationDashboard: React.FC<PatternVisualizationDashboardProps> = ({ 
  patterns, 
  isLoading = false 
}) => {
  // State for active tab
  const [activeTab, setActiveTab] = useState(0);
  
  // State for selected pattern
  const [selectedPattern, setSelectedPattern] = useState<string | null>(
    patterns.length > 0 ? patterns[0].id : null
  );
  
  // Function to handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  
  // Function to handle pattern selection change
  const handlePatternChange = (event: SelectChangeEvent) => {
    setSelectedPattern(event.target.value);
  };
  
  // Get selected pattern
  const getSelectedPattern = () => {
    return patterns.find(pattern => pattern.id === selectedPattern) || null;
  };
  
  // Group patterns by type
  const bullishPatterns = patterns.filter(pattern => pattern.direction === 'bullish');
  const bearishPatterns = patterns.filter(pattern => pattern.direction === 'bearish');
  
  // Get patterns for current tab
  const getCurrentPatterns = () => {
    if (activeTab === 0) {
      return patterns;
    } else if (activeTab === 1) {
      return bullishPatterns;
    } else {
      return bearishPatterns;
    }
  };
  
  const currentPatterns = getCurrentPatterns();
  const selectedPatternObj = getSelectedPattern();
  
  return (
    <Box sx={{ width: '100%' }}>
      <Paper elevation={3} sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          aria-label="pattern visualization tabs"
          centered
        >
          <Tab label={`All Patterns (${patterns.length})`} />
          <Tab label={`Bullish (${bullishPatterns.length})`} />
          <Tab label={`Bearish (${bearishPatterns.length})`} />
        </Tabs>
      </Paper>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Pattern Selection
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="pattern-select-label">Select Pattern</InputLabel>
              <Select
                labelId="pattern-select-label"
                id="pattern-select"
                value={selectedPattern || ''}
                label="Select Pattern"
                onChange={handlePatternChange}
                disabled={isLoading || currentPatterns.length === 0}
              >
                {currentPatterns.map((pattern) => (
                  <MenuItem key={pattern.id} value={pattern.id}>
                    {pattern.symbol} - {
                      'patternType' in pattern ? pattern.patternType : pattern.breakoutType
                    } ({pattern.confidenceScore}%)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {selectedPatternObj && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Pattern Details
                </Typography>
                
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2">
                    <strong>Symbol:</strong> {selectedPatternObj.symbol}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Type:</strong> {
                      'patternType' in selectedPatternObj 
                        ? selectedPatternObj.patternType 
                        : selectedPatternObj.breakoutType
                    }
                  </Typography>
                  <Typography variant="body2">
                    <strong>Direction:</strong> {selectedPatternObj.direction}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Timeframe:</strong> {selectedPatternObj.timeframe}
                  </Typography>
                </Box>
                
                <Typography variant="subtitle1" gutterBottom>
                  Price Levels
                </Typography>
                
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2">
                    <strong>Entry:</strong> ${selectedPatternObj.entryPrice.toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="success.main">
                    <strong>Target:</strong> ${selectedPatternObj.targetPrice.toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="error.main">
                    <strong>Stop Loss:</strong> ${selectedPatternObj.stopLoss.toFixed(2)}
                  </Typography>
                </Box>
                
                <Typography variant="subtitle1" gutterBottom>
                  Performance Metrics
                </Typography>
                
                <Box>
                  <Typography variant="body2">
                    <strong>Confidence:</strong> {selectedPatternObj.confidenceScore}%
                  </Typography>
                  <Typography variant="body2">
                    <strong>Risk/Reward:</strong> 1:{
                      (Math.abs(selectedPatternObj.targetPrice - selectedPatternObj.entryPrice) / 
                      Math.abs(selectedPatternObj.stopLoss - selectedPatternObj.entryPrice)).toFixed(2)
                    }
                  </Typography>
                  <Typography variant="body2">
                    <strong>Potential Profit:</strong> {
                      (Math.abs(selectedPatternObj.targetPrice - selectedPatternObj.entryPrice) / 
                      selectedPatternObj.entryPrice * 100).toFixed(2)
                    }%
                  </Typography>
                </Box>
                
                {'multiTimeframeConfirmed' in selectedPatternObj && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>Multi-Timeframe Confirmed:</strong> {
                        selectedPatternObj.multiTimeframeConfirmed ? 'Yes' : 'No'
                      }
                    </Typography>
                  </Box>
                )}
                
                {'volumeConfirmation' in selectedPatternObj && (
                  <Box>
                    <Typography variant="body2">
                      <strong>Volume Confirmation:</strong> {
                        selectedPatternObj.volumeConfirmation ? 'Yes' : 'No'
                      }
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={8}>
          <TabPanel value={activeTab} index={0}>
            {selectedPatternObj ? (
              <ChartVisualization pattern={selectedPatternObj} />
            ) : (
              <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body1">
                  {isLoading 
                    ? 'Loading patterns...' 
                    : 'No patterns available. Run a scan to find trading opportunities.'}
                </Typography>
                {isLoading && <CircularProgress sx={{ mt: 2 }} />}
              </Paper>
            )}
          </TabPanel>
          
          <TabPanel value={activeTab} index={1}>
            {selectedPatternObj && selectedPatternObj.direction === 'bullish' ? (
              <ChartVisualization pattern={selectedPatternObj} />
            ) : (
              <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body1">
                  {isLoading 
                    ? 'Loading patterns...' 
                    : bullishPatterns.length === 0 
                      ? 'No bullish patterns available. Run a scan to find trading opportunities.' 
                      : 'Please select a bullish pattern from the dropdown.'}
                </Typography>
                {isLoading && <CircularProgress sx={{ mt: 2 }} />}
              </Paper>
            )}
          </TabPanel>
          
          <TabPanel value={activeTab} index={2}>
            {selectedPatternObj && selectedPatternObj.direction === 'bearish' ? (
              <ChartVisualization pattern={selectedPatternObj} />
            ) : (
              <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body1">
                  {isLoading 
                    ? 'Loading patterns...' 
                    : bearishPatterns.length === 0 
                      ? 'No bearish patterns available. Run a scan to find trading opportunities.' 
                      : 'Please select a bearish pattern from the dropdown.'}
                </Typography>
                {isLoading && <CircularProgress sx={{ mt: 2 }} />}
              </Paper>
            )}
          </TabPanel>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PatternVisualizationDashboard;
