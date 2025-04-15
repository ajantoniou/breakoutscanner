import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Tabs, 
  Tab, 
  CircularProgress, 
  Alert 
} from '@mui/material';
import { PatternData } from '../services/types/patternTypes';
import { stockRecommendationService } from '../services/api/stockRecommendationService';
import YahooBacktestDashboard from '../components/backtest/YahooBacktestDashboard';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`backtest-tabpanel-${index}`}
      aria-labelledby={`backtest-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const BacktestPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [patterns, setPatterns] = useState<PatternData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPatterns();
  }, []);

  const loadPatterns = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await stockRecommendationService.getPatterns();
      setPatterns(response.data);
    } catch (err) {
      setError('Failed to load patterns. Please try again later.');
      console.error('Error loading patterns:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const updatePatterns = (updatedPatterns: PatternData[]) => {
    setPatterns(updatedPatterns);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" gutterBottom component="h1">
          Pattern Backtesting
        </Typography>
        
        <Paper sx={{ mb: 4 }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="backtest tabs"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="Yahoo Finance" id="backtest-tab-0" aria-controls="backtest-tabpanel-0" />
            <Tab label="Trade History" id="backtest-tab-1" aria-controls="backtest-tabpanel-1" disabled />
            <Tab label="Custom Data" id="backtest-tab-2" aria-controls="backtest-tabpanel-2" disabled />
          </Tabs>
          
          {error && (
            <Alert severity="error" sx={{ m: 2 }}>
              {error}
            </Alert>
          )}
          
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          )}
          
          {!loading && (
            <>
              <TabPanel value={tabValue} index={0}>
                <YahooBacktestDashboard 
                  patterns={patterns} 
                  onPatternLoad={loadPatterns}
                  onUpdatePatterns={updatePatterns} 
                />
              </TabPanel>
              
              <TabPanel value={tabValue} index={1}>
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body1" color="text.secondary">
                    Trade history backtest feature coming soon.
                  </Typography>
                </Box>
              </TabPanel>
              
              <TabPanel value={tabValue} index={2}>
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body1" color="text.secondary">
                    Custom data backtest feature coming soon.
                  </Typography>
                </Box>
              </TabPanel>
            </>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default BacktestPage; 