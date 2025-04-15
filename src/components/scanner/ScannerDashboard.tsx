import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Tabs, 
  Tab, 
  Button, 
  Grid, 
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  Alert,
  Switch,
  FormControlLabel,
  Snackbar,
  IconButton,
  Tooltip,
  Menu,
  ListItemIcon,
  ListItemText,
  Badge,
  Popover,
  Divider,
  TextField
} from '@mui/material';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import RefreshIcon from '@mui/icons-material/Refresh';
import PatternCard from './PatternCard';
import { TIMEFRAMES } from '@/services/api/marketData/dataService';
import { getAllowedTimeframes } from '@/services/api/marketData/stockUniverses';
import { differenceInHours, differenceInDays } from 'date-fns';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import TuneIcon from '@mui/icons-material/Tune';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import PatternUpdateService, { 
  PatternUpdateEventType, 
  PatternUpdateEvent,
  ConnectionStatus,
  PatternUpdatedEvent,
  NewPatternEvent,
  StatusChangeEvent,
  ConnectionStatusEvent
} from '@/services/realtime/patternUpdateService';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import SignalWifiStatusbar4BarIcon from '@mui/icons-material/SignalWifiStatusbar4Bar';
import SignalWifiStatusbarConnectedNoInternet4Icon from '@mui/icons-material/SignalWifiStatusbarConnectedNoInternet4';
import SignalWifiStatusbarNullIcon from '@mui/icons-material/SignalWifiStatusbarNull';
import AddIcon from '@mui/icons-material/Add';
import MarketDataService, { DataFreshnessStatus, DataMetadata } from '@/services/api/marketData/dataService';
import configService from '@/utils/configService';
import ErrorIcon from '@mui/icons-material/Error';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CachedIcon from '@mui/icons-material/Cached';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import type { PatternData } from '../../services/types/patternTypes';
import type { PatternFilter } from './filters/types';

// Define the tab panel interface
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// Define BreakoutData interface extending PatternData for any additional properties
interface BreakoutData extends PatternData {
  breakout_confirmed?: boolean;
  breakout_time?: string;
  actual_breakout_price?: number;
}

// Only keep PatternCardData interface which adapts the imported PatternData
interface PatternCardData {
  id: string;
  symbol: string;
  pattern_type: string;
  timeframe: string;
  entry_price: number;
  target_price: number;
  stop_loss: number;
  confidence_score: number;
  created_at: string;
  direction: 'bullish' | 'bearish';
  status: 'active' | 'completed' | 'failed';
  risk_reward_ratio: number;
  channel_type?: string;
  volume_confirmation?: boolean;
  trendline_break?: boolean;
  ema_pattern?: string;
}

// Define filter preset interface
interface FilterPreset {
  id: string;
  name: string;
  confidenceFilter: number;
  directionFilter: string;
  hideExpired: boolean;
  hideOld: boolean;
}

// Tab panel component
const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`scanner-tabpanel-${index}`}
      aria-labelledby={`scanner-tab-${index}`}
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

interface ScannerDashboardProps {
  dayTradingResults: (PatternData | BreakoutData)[];
  swingTradingResults: (PatternData | BreakoutData)[];
  backtestStats: {
    avgCandlesToBreakout: Record<string, number>;
    winRateByTimeframe: Record<string, number>;
    profitFactorByTimeframe: Record<string, number>;
  };
  isLoading: boolean;
  activeScanner: 'day' | 'swing' | null;
  onRunScanner: (mode: 'day' | 'swing', timeframe: string) => void;
  onArchivePattern?: (id: string) => Promise<void>;
}

const ScannerDashboard: React.FC<ScannerDashboardProps> = ({ 
  dayTradingResults, 
  swingTradingResults,
  backtestStats,
  isLoading,
  activeScanner,
  onRunScanner,
  onArchivePattern
}) => {
  // State for active tab
  const [activeTab, setActiveTab] = useState(0);
  
  // State for filters
  const [confidenceFilter, setConfidenceFilter] = useState<number>(0);
  const [directionFilter, setDirectionFilter] = useState<string>('all');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('1h');
  const [hideExpired, setHideExpired] = useState<boolean>(true);
  const [hideOld, setHideOld] = useState<boolean>(false);
  
  // State for snackbar notifications
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  // State for filter presets
  const [filterPresets, setFilterPresets] = useState<FilterPreset[]>([
    {
      id: 'high-confidence',
      name: 'High Confidence',
      confidenceFilter: 80,
      directionFilter: 'all',
      hideExpired: true,
      hideOld: true
    },
    {
      id: 'bullish-only',
      name: 'Bullish Only',
      confidenceFilter: 60,
      directionFilter: 'bullish',
      hideExpired: true,
      hideOld: false
    },
    {
      id: 'bearish-only',
      name: 'Bearish Only',
      confidenceFilter: 60,
      directionFilter: 'bearish',
      hideExpired: true,
      hideOld: false
    }
  ]);
  
  // Preset menu state
  const [presetMenuAnchorEl, setPresetMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [savePresetAnchorEl, setSavePresetAnchorEl] = useState<null | HTMLElement>(null);
  const [newPresetName, setNewPresetName] = useState('');
  
  // State for real-time updates
  const [realtimeEnabled, setRealtimeEnabled] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [notifications, setNotifications] = useState<PatternUpdateEvent[]>([]);
  const [notificationOpen, setNotificationOpen] = useState<boolean>(false);
  
  // Local state for pattern data (for demo/development)
  const [localDayPatterns, setLocalDayPatterns] = useState<PatternData[]>([]);
  const [localSwingPatterns, setLocalSwingPatterns] = useState<PatternData[]>([]);
  
  // Combined patterns (props + local state)
  const combinedDayPatterns = useMemo(() => 
    [...dayTradingResults, ...localDayPatterns] as PatternData[], 
    [dayTradingResults, localDayPatterns]
  );
  
  const combinedSwingPatterns = useMemo(() => 
    [...swingTradingResults, ...localSwingPatterns] as PatternData[],
    [swingTradingResults, localSwingPatterns]
  );
  
  // State for real-time data updates
  const [useRealData, setUseRealData] = useState<boolean>(false);
  const [dataStatus, setDataStatus] = useState<{
    status: DataFreshnessStatus,
    message: string,
    details: {
      age: string,
      source: string,
      fetchTime: string,
      marketStatus: string
    }
  } | null>(null);
  
  // Initialize market data service
  const marketDataService = useMemo(() => new MarketDataService(), []);
  
  // Add test symbols for testing real data
  const dayTradingSymbols = useMemo(() => ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META'], []);
  const swingTradingSymbols = useMemo(() => ['SPY', 'QQQ', 'NVDA', 'TSLA', 'AMD'], []);
  
  // Get current scanner mode
  const getCurrentScannerMode = () => {
    if (activeTab === 0) {
      return 'day';
    } else {
      return 'swing';
    }
  };
  
  // Get current mode
  const currentMode = getCurrentScannerMode();
  
  // Get allowed timeframes for current mode
  const allowedTimeframes = getAllowedTimeframes(currentMode);
  
  // Update selected timeframe when tab changes to ensure it's valid for the current mode
  useEffect(() => {
    // If current timeframe is not allowed for this mode, select the first allowed timeframe
    if (!allowedTimeframes.includes(selectedTimeframe)) {
      setSelectedTimeframe(allowedTimeframes[0]);
    }
  }, [activeTab, allowedTimeframes, selectedTimeframe]);
  
  // Function to handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  
  // Function to handle confidence filter change
  const handleConfidenceFilterChange = (event: any) => {
    setConfidenceFilter(event.target.value);
  };
  
  // Function to handle direction filter change
  const handleDirectionFilterChange = (event: any) => {
    setDirectionFilter(event.target.value);
  };

  // Function to handle timeframe change
  const handleTimeframeChange = (event: any) => {
    setSelectedTimeframe(event.target.value);
  };
  
  // Function to handle expired patterns filter change
  const handleHideExpiredChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setHideExpired(event.target.checked);
  };
  
  // Function to handle old patterns filter change
  const handleHideOldChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setHideOld(event.target.checked);
  };
  
  // Function to check if a pattern is expired (past expected breakout time by > 24 hours)
  const isPatternExpired = (pattern: PatternData | BreakoutData) => {
    if (!backtestStats.avgCandlesToBreakout[pattern.timeframe]) return false;
    
    const createdAt = new Date(pattern.created_at);
    const timeframeInMinutes = (() => {
      switch (pattern.timeframe) {
        case '1m': return 1;
        case '5m': return 5;
        case '15m': return 15;
        case '30m': return 30;
        case '1h': return 60;
        case '4h': return 240;
        case '1d': return 1440;
        default: return 0;
      }
    })();
    
    const avgCandlesToBreakout = backtestStats.avgCandlesToBreakout[pattern.timeframe];
    const expectedBreakoutTime = new Date(pattern.created_at);
    expectedBreakoutTime.setMinutes(expectedBreakoutTime.getMinutes() + (avgCandlesToBreakout * timeframeInMinutes));
    
    return differenceInHours(new Date(), expectedBreakoutTime) > 24 && expectedBreakoutTime < new Date();
  };
  
  // Function to check if a pattern is old (created > 7 days ago)
  const isPatternOld = (pattern: PatternData) => {
    const createdAt = new Date(pattern.created_at);
    const now = new Date();
    return now.getTime() - createdAt.getTime() > 7 * 24 * 60 * 60 * 1000;
  };
  
  // Function to filter results based on current filters
  const filterResults = (patterns: (PatternData | BreakoutData)[]) => {
    return patterns.filter(pattern => {
      // Apply confidence filter
      if (confidenceFilter > 0 && pattern.confidence_score < confidenceFilter) return false;
      
      // Apply direction filter
      if (directionFilter !== 'all' && pattern.direction && directionFilter !== pattern.direction) {
        return false;
      }
      
      // Apply expired filter
      if (hideExpired && isPatternExpired(pattern)) return false;
      
      // Apply old filter
      if (hideOld && isPatternOld(pattern)) return false;
      
      return true;
    });
  };
  
  // Get current results based on active tab and filters
  const getCurrentResults = () => {
    const results = activeTab === 0 ? combinedDayPatterns : combinedSwingPatterns;
    return filterResults(results);
  };
  
  // Handle archiving a pattern
  const handleArchivePattern = useCallback(async (id: string) => {
    if (onArchivePattern) {
      try {
        await onArchivePattern(id);
        setSnackbarMessage('Pattern archived successfully');
        setSnackbarOpen(true);
      } catch (error) {
        setSnackbarMessage('Error archiving pattern');
        setSnackbarOpen(true);
      }
    }
  }, [onArchivePattern]);
  
  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };
  
  // Get current results
  const currentResults = getCurrentResults();

  // Get average candles to breakout for current timeframe
  const avgCandlesToBreakout = backtestStats.avgCandlesToBreakout[selectedTimeframe] || 0;
  const winRate = backtestStats.winRateByTimeframe[selectedTimeframe] || 0;
  const profitFactor = backtestStats.profitFactorByTimeframe[selectedTimeframe] || 0;
  
  // Count expired and old patterns
  const countExpiredPatterns = (results: (PatternData | BreakoutData)[]) => {
    return results.filter(pattern => isPatternExpired(pattern)).length;
  };
  
  const countOldPatterns = (results: (PatternData | BreakoutData)[]) => {
    return results.filter(pattern => isPatternOld(pattern as PatternData)).length;
  };
  
  const expiredDayPatterns = countExpiredPatterns(dayTradingResults);
  const expiredSwingPatterns = countExpiredPatterns(swingTradingResults);
  const oldDayPatterns = countOldPatterns(dayTradingResults);
  const oldSwingPatterns = countOldPatterns(swingTradingResults);
  
  // Handle preset menu open
  const handlePresetMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setPresetMenuAnchorEl(event.currentTarget);
  };
  
  // Handle preset menu close
  const handlePresetMenuClose = () => {
    setPresetMenuAnchorEl(null);
  };
  
  // Handle save preset menu open
  const handleSavePresetOpen = (event: React.MouseEvent<HTMLElement>) => {
    setSavePresetAnchorEl(event.currentTarget);
    setNewPresetName(`${directionFilter !== 'all' ? directionFilter + ' ' : ''}${confidenceFilter > 0 ? confidenceFilter + '% ' : ''}Preset`);
    handlePresetMenuClose();
  };
  
  // Handle save preset menu close
  const handleSavePresetClose = () => {
    setSavePresetAnchorEl(null);
  };
  
  // Handle applying a preset
  const applyPreset = (preset: FilterPreset) => {
    setConfidenceFilter(preset.confidenceFilter);
    setDirectionFilter(preset.directionFilter);
    setHideExpired(preset.hideExpired);
    setHideOld(preset.hideOld);
    handlePresetMenuClose();
  };
  
  // Handle saving a new preset
  const saveNewPreset = () => {
    if (newPresetName.trim() === '') return;
    
    const newPreset: FilterPreset = {
      id: `preset-${Date.now()}`,
      name: newPresetName,
      confidenceFilter,
      directionFilter,
      hideExpired,
      hideOld
    };
    
    setFilterPresets([...filterPresets, newPreset]);
    handleSavePresetClose();
  };
  
  // Handle deleting a preset
  const deletePreset = (presetId: string) => {
    setFilterPresets(filterPresets.filter(preset => preset.id !== presetId));
  };
  
  // Get active filter count
  const getActiveFilterCount = () => {
    let count = 0;
    if (confidenceFilter > 0) count++;
    if (directionFilter !== 'all') count++;
    if (hideExpired) count++;
    if (hideOld) count++;
    return count;
  };
  
  // Get pattern update service
  const patternUpdateService = useMemo(() => PatternUpdateService.getInstance(), []);
  
  // Handle toggle for real-time updates
  const handleToggleRealtime = useCallback(() => {
    if (realtimeEnabled) {
      patternUpdateService.disconnect();
      setRealtimeEnabled(false);
    } else {
      // For demo/development, use a mock WebSocket connection
      // In production, this would be your actual WebSocket endpoint
      patternUpdateService.connect('wss://api.breakoutscanner.com/ws');
      setRealtimeEnabled(true);
    }
  }, [realtimeEnabled, patternUpdateService]);
  
  // Handle new pattern event
  const handleNewPattern = useCallback((event: NewPatternEvent) => {
    const pattern = event.payload;
    const isScannerActive = activeTab === 0 ? 'day' : 'swing';
    
    // Add pattern to appropriate local state based on timeframe
    if (isScannerActive === 'day' && ['1m', '5m', '15m', '30m', '1h'].includes(pattern.timeframe)) {
      setLocalDayPatterns(prev => [pattern, ...prev]);
    } else if (isScannerActive === 'swing' && ['4h', '1d', '1w'].includes(pattern.timeframe)) {
      setLocalSwingPatterns(prev => [pattern, ...prev]);
    }
    
    // Add notification
    addNotification(event);
    setLastUpdateTime(new Date());
  }, [activeTab]);
  
  // Handle pattern update event
  const handlePatternUpdate = useCallback((event: PatternUpdatedEvent) => {
    const updatedPattern = event.payload;
    
    // Update pattern in local day trading results
    setLocalDayPatterns(prev => 
      prev.map(pattern => 
        pattern.id === updatedPattern.id ? updatedPattern : pattern
      )
    );
    
    // Update pattern in local swing trading results
    setLocalSwingPatterns(prev => 
      prev.map(pattern => 
        pattern.id === updatedPattern.id ? updatedPattern : pattern
      )
    );
    
    // Add notification
    addNotification(event);
    setLastUpdateTime(new Date());
  }, []);
  
  // Handle status change event
  const handleStatusChange = useCallback((event: StatusChangeEvent) => {
    const { patternId, newStatus } = event.payload;
    
    // Update pattern status in local day trading results
    setLocalDayPatterns(prev => 
      prev.map(pattern => 
        pattern.id === patternId ? { ...pattern, status: newStatus as any } : pattern
      )
    );
    
    // Update pattern status in local swing trading results
    setLocalSwingPatterns(prev => 
      prev.map(pattern => 
        pattern.id === patternId ? { ...pattern, status: newStatus as any } : pattern
      )
    );
    
    // Add notification
    addNotification(event);
    setLastUpdateTime(new Date());
  }, []);
  
  // Handle connection status change
  const handleConnectionStatus = useCallback((event: ConnectionStatusEvent) => {
    setConnectionStatus(event.payload.status);
    
    // Add notification for important connection events
    if (
      event.payload.status === ConnectionStatus.CONNECTED || 
      event.payload.status === ConnectionStatus.ERROR
    ) {
      addNotification(event);
    }
  }, []);
  
  // Add notification to the list
  const addNotification = useCallback((event: PatternUpdateEvent) => {
    setNotifications(prev => [event, ...prev].slice(0, 20)); // Keep only the 20 most recent notifications
  }, []);
  
  // Toggle notification panel
  const toggleNotifications = useCallback(() => {
    setNotificationOpen(prev => !prev);
  }, []);
  
  // Get connection status icon
  const getConnectionStatusIcon = useCallback(() => {
    switch (connectionStatus) {
      case ConnectionStatus.CONNECTED:
        return <SignalWifiStatusbar4BarIcon color="success" />;
      case ConnectionStatus.CONNECTING:
        return <SignalWifiStatusbarNullIcon color="warning" />;
      case ConnectionStatus.ERROR:
        return <SignalWifiStatusbarConnectedNoInternet4Icon color="error" />;
      case ConnectionStatus.DISCONNECTED:
      default:
        return <SignalWifiStatusbarNullIcon color="disabled" />;
    }
  }, [connectionStatus]);
  
  // Set up event listeners for real-time updates
  useEffect(() => {
    // Register event handlers
    patternUpdateService.on(PatternUpdateEventType.NEW_PATTERN, handleNewPattern as any);
    patternUpdateService.on(PatternUpdateEventType.PATTERN_UPDATED, handlePatternUpdate as any);
    patternUpdateService.on(PatternUpdateEventType.STATUS_CHANGE, handleStatusChange as any);
    patternUpdateService.on(PatternUpdateEventType.CONNECTION_STATUS, handleConnectionStatus as any);
    
    // Clean up event handlers
    return () => {
      patternUpdateService.off(PatternUpdateEventType.NEW_PATTERN, handleNewPattern as any);
      patternUpdateService.off(PatternUpdateEventType.PATTERN_UPDATED, handlePatternUpdate as any);
      patternUpdateService.off(PatternUpdateEventType.STATUS_CHANGE, handleStatusChange as any);
      patternUpdateService.off(PatternUpdateEventType.CONNECTION_STATUS, handleConnectionStatus as any);
      
      // Disconnect when component unmounts
      if (realtimeEnabled) {
        patternUpdateService.disconnect();
      }
    };
  }, [
    patternUpdateService, 
    handleNewPattern, 
    handlePatternUpdate, 
    handleStatusChange, 
    handleConnectionStatus,
    realtimeEnabled
  ]);
  
  // Get formatted notification message
  const getNotificationMessage = useCallback((event: PatternUpdateEvent): string => {
    switch (event.type) {
      case PatternUpdateEventType.NEW_PATTERN:
        const newPattern = (event as NewPatternEvent).payload;
        return `New ${newPattern.pattern_type} pattern detected for ${newPattern.symbol}`;
      
      case PatternUpdateEventType.PATTERN_UPDATED:
        const updatedPattern = (event as PatternUpdatedEvent).payload;
        return `${updatedPattern.symbol} pattern updated`;
      
      case PatternUpdateEventType.STATUS_CHANGE:
        const statusChange = (event as StatusChangeEvent).payload;
        return `Pattern status changed to ${statusChange.newStatus}`;
      
      case PatternUpdateEventType.CONNECTION_STATUS:
        const connectionStatus = (event as ConnectionStatusEvent).payload;
        return `Connection ${connectionStatus.status}${connectionStatus.message ? ': ' + connectionStatus.message : ''}`;
      
      default:
        return 'Pattern update';
    }
  }, []);
  
  // Function to simulate a pattern update after a delay
  const simulatePatternUpdate = useCallback((pattern: PatternData) => {
    // Only simulate updates if real-time is enabled
    if (!realtimeEnabled) return;
    
    // Schedule an update after a random delay
    const delay = 5000 + Math.random() * 20000; // 5-25 seconds
    
    setTimeout(() => {
      // Skip if real-time was turned off during the delay
      if (!realtimeEnabled) return;
      
      // 50% chance to update price, 30% chance to change status, 20% chance for both
      const updateType = Math.random();
      let updatedPattern = { ...pattern };
      
      if (updateType < 0.5 || updateType > 0.8) {
        // Update prices with small random changes
        const priceChange = (Math.random() - 0.5) * 5; // -2.5 to +2.5
        updatedPattern.entry_price = Math.max(0.01, pattern.entry_price + priceChange);
        updatedPattern.target_price = Math.max(0.01, pattern.target_price + priceChange * 1.5);
        if (pattern.stop_loss) {
          updatedPattern.stop_loss = Math.max(0.01, pattern.stop_loss + priceChange * 0.8);
        }
      }
      
      if (updateType >= 0.5) {
        // Small chance to change status
        if (pattern.status === 'active' && Math.random() > 0.7) {
          updatedPattern.status = Math.random() > 0.5 ? 'completed' : 'failed';
        }
      }
      
      // Create pattern update event
      const mockEvent: PatternUpdatedEvent = {
        type: PatternUpdateEventType.PATTERN_UPDATED,
        payload: updatedPattern,
        timestamp: Date.now()
      };
      
      // Process the update
      handlePatternUpdate(mockEvent);
      
      // Recursively schedule another update if the pattern is still active
      if (updatedPattern.status === 'active') {
        simulatePatternUpdate(updatedPattern);
      }
    }, delay);
  }, [realtimeEnabled, handlePatternUpdate]);
  
  // Function to show notification
  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    console.log(`[${type.toUpperCase()}] ${message}`);
    // You could implement a custom notification UI here if needed
  }, []);
  
  // Update generateMockPattern to create a valid PatternData object
  const generateMockPattern = useCallback(() => {
    if (!realtimeEnabled) {
      return;
    }

    const symbols = ['AAPL', 'TSLA', 'AMZN', 'MSFT', 'GOOGL', 'META', 'NFLX', 'NVDA', 'AMD', 'INTC'];
    const patternTypes = ['Bull Flag', 'Cup & Handle', 'Ascending Triangle', 'Descending Triangle', 'Double Bottom', 'Head & Shoulders'];
    const timeframes = ['1min', '5min', '15min', '30min', '1h', '4h', 'Daily'];
    const directions = ['bullish', 'bearish'] as const;
    const channelTypes = ['horizontal', 'ascending', 'descending'] as const;

    const currentSymbol = symbols[Math.floor(Math.random() * symbols.length)];
    const currentPattern = patternTypes[Math.floor(Math.random() * patternTypes.length)];
    const currentTimeframe = timeframes[Math.floor(Math.random() * timeframes.length)];
    const direction = directions[Math.floor(Math.random() * directions.length)];
    const confidence = Math.floor(Math.random() * 50) + 50; // 50-100
    const entryPrice = Math.round((Math.random() * 200 + 50) * 100) / 100; // 50-250 with 2 decimal places
    const targetPricePercent = Math.round((Math.random() * 10 + 2) * 100) / 100; // 2-12% with 2 decimal places
    const stopLossPercent = Math.round((Math.random() * 3 + 1) * 100) / 100; // 1-4% with 2 decimal places
    
    const targetPrice = direction === 'bullish' 
      ? Math.round((entryPrice * (1 + targetPricePercent / 100)) * 100) / 100 
      : Math.round((entryPrice * (1 - targetPricePercent / 100)) * 100) / 100;
    
    const stopLoss = direction === 'bullish' 
      ? Math.round((entryPrice * (1 - stopLossPercent / 100)) * 100) / 100 
      : Math.round((entryPrice * (1 + stopLossPercent / 100)) * 100) / 100;
    
    const riskRewardRatio = targetPricePercent / stopLossPercent;

    const now = new Date();
    // Create a new pattern with all required fields
    const mockPattern: PatternData = {
      id: `mock-${Date.now()}`,
      symbol: currentSymbol,
      pattern_type: currentPattern,
      timeframe: currentTimeframe,
      entry_price: entryPrice,
      target_price: targetPrice,
      stop_loss: stopLoss, // Required field
      confidence_score: confidence,
      created_at: now.toISOString(),
      direction: direction,
      status: 'active',
      risk_reward_ratio: parseFloat(riskRewardRatio.toFixed(2)),
      channel_type: Math.random() > 0.6 ? channelTypes[Math.floor(Math.random() * channelTypes.length)] : undefined,
      volume_confirmation: Math.random() > 0.5,
      trendline_break: Math.random() > 0.5,
      ema_pattern: Math.random() > 0.7 ? 'EMA9 cross EMA20' : undefined,
      detected_at: now.toISOString()
    };

    // Trigger the mock pattern update simulation
    const mockEvent: NewPatternEvent = {
      type: PatternUpdateEventType.NEW_PATTERN,
      payload: mockPattern,
      timestamp: now.getTime()
    };

    handleNewPattern(mockEvent);
    simulatePatternUpdate(mockPattern);

    // Show notification for generated pattern
    showNotification(`Generated demo pattern for ${mockPattern.symbol} (${mockPattern.pattern_type})`, 'success');

  }, [realtimeEnabled, handleNewPattern, simulatePatternUpdate, showNotification]);
  
  // Add an effect to handle toggling real-time updates
  useEffect(() => {
    if (realtimeEnabled) {
      // When real-time is enabled, schedule updates for all active patterns
      const allPatterns = [...localDayPatterns, ...localSwingPatterns];
      allPatterns.forEach(pattern => {
        if (pattern.status === 'active') {
          simulatePatternUpdate(pattern);
        }
      });
    }
  }, [realtimeEnabled, localDayPatterns, localSwingPatterns, simulatePatternUpdate]);
  
  // Function to fetch real market data
  const fetchMarketData = useCallback(async (symbols: string[], timeframe: string) => {
    if (!useRealData) return;
    
    try {
      // Show loading state
      setSnackbarMessage(`Fetching ${timeframe} data for ${symbols.join(', ')}...`);
      setSnackbarOpen(true);
      
      // Fetch candles for symbols
      const result = await marketDataService.scanMultipleSymbols(
        symbols,
        timeframe,
        120, // Last 120 candles
        undefined,
        undefined,
        false // Use cache if available
      );
      
      // Update data status
      setDataStatus(marketDataService.getDataFreshnessStatus(result.scanMetadata));
      
      // Process the data to find patterns
      // This is a simplified implementation - in a real app, you'd use your pattern detection logic
      const patterns: PatternData[] = [];
      
      for (const symbol of symbols) {
        if (result.data[symbol] && result.data[symbol].length > 0) {
          const candles = result.data[symbol];
          const lastCandle = candles[candles.length - 1];
          
          // Simple "pattern" creation based on latest price
          // In a real app, you'd analyze the candles to detect actual patterns
          patterns.push({
            id: `${symbol}-${Date.now()}`,
            symbol: symbol,
            pattern_type: lastCandle.close > lastCandle.open ? 'Bull Flag' : 'Bear Flag',
            timeframe: timeframe,
            entry_price: lastCandle.close,
            target_price: lastCandle.close * 1.02, // 2% target
            stop_loss: lastCandle.close * 0.98, // 2% stop loss
            confidence_score: 70 + Math.floor(Math.random() * 20),
            created_at: new Date().toISOString(),
            direction: lastCandle.close > lastCandle.open ? 'bullish' : 'bearish',
            status: 'active',
            risk_reward_ratio: 1,
            detected_at: new Date().toISOString()
          });
        }
      }
      
      // Update local patterns based on active tab
      if (activeTab === 0) {
        setLocalDayPatterns(patterns.concat(localDayPatterns));
      } else {
        setLocalSwingPatterns(patterns.concat(localSwingPatterns));
      }
      
      // Show success message
      setSnackbarMessage(`Loaded ${patterns.length} patterns from real market data`);
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error fetching market data:', error);
      setSnackbarMessage('Error fetching market data. Check console for details.');
      setSnackbarOpen(true);
    }
  }, [useRealData, activeTab, marketDataService]);
  
  // Toggle real data usage
  const handleToggleRealData = useCallback(() => {
    const newValue = !useRealData;
    setUseRealData(newValue);
    
    if (newValue) {
      // When enabling real data, fetch immediately
      const symbols = activeTab === 0 ? dayTradingSymbols : swingTradingSymbols;
      fetchMarketData(symbols, selectedTimeframe);
    }
  }, [useRealData, activeTab, dayTradingSymbols, swingTradingSymbols, selectedTimeframe, fetchMarketData]);
  
  // Function to get icon for data freshness status
  const getDataStatusIcon = useCallback(() => {
    if (!dataStatus) return <SignalWifiStatusbarNullIcon color="disabled" />;
    
    switch (dataStatus.status) {
      case 'real-time':
        return <FiberManualRecordIcon color="success" />;
      case 'delayed':
        return <AccessTimeIcon color="warning" />;
      case 'cached':
        return <CachedIcon color="info" />;
      case 'stale':
        return <CachedIcon color="warning" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <SignalWifiStatusbarNullIcon color="disabled" />;
    }
  }, [dataStatus]);
  
  // Function to check if Polygon.io API key is configured
  const isPolygonApiConfigured = useMemo(() => {
    const apiKey = configService.getConfig().polygonApiKey;
    return apiKey && apiKey !== 'your_polygon_api_key_here';
  }, []);
  
  // Update real data when timeframe changes
  useEffect(() => {
    if (useRealData) {
      const symbols = activeTab === 0 ? dayTradingSymbols : swingTradingSymbols;
      fetchMarketData(symbols, selectedTimeframe);
    }
  }, [useRealData, selectedTimeframe, activeTab, dayTradingSymbols, swingTradingSymbols, fetchMarketData]);
  
  // Test Polygon.io connection when real data is first enabled
  useEffect(() => {
    if (useRealData && isPolygonApiConfigured) {
      const testConnection = async () => {
        try {
          const result = await marketDataService.testConnection();
          if (result.success) {
            setSnackbarMessage(`Connected to Polygon.io API: ${result.message}`);
          } else {
            setSnackbarMessage(`Connection test failed: ${result.message}`);
          }
          setSnackbarOpen(true);
        } catch (error) {
          setSnackbarMessage('Error testing connection to Polygon.io');
          setSnackbarOpen(true);
        }
      };
      
      testConnection();
    }
  }, [useRealData, marketDataService, isPolygonApiConfigured]);
  
  return (
    <Box sx={{ width: '100%' }}>
      <Paper elevation={3} sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          aria-label="pattern scanner tabs"
          centered
        >
          <Tab label="Day Trading" />
          <Tab label="Swing Trading" />
        </Tabs>
        
        {/* Add real-time updates control */}
        <Box sx={{ 
          position: 'absolute', 
          right: 16, 
          top: 8, 
          display: 'flex', 
          alignItems: 'center',
          gap: 2
        }}>
          <Tooltip title="Generate demo pattern">
            <span>
              <IconButton 
                color="primary" 
                onClick={generateMockPattern}
                size="small"
                disabled={!realtimeEnabled}
              >
                <AddIcon />
              </IconButton>
            </span>
          </Tooltip>
          
          <Tooltip title={`${notifications.length} notifications`}>
            <IconButton 
              color={notifications.length > 0 ? 'primary' : 'default'} 
              onClick={toggleNotifications}
              size="small"
            >
              <Badge badgeContent={notifications.length} color="primary">
                <NotificationsActiveIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          
          {/* Add data status indicator */}
          {dataStatus && (
            <Tooltip title={dataStatus.message}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {getDataStatusIcon()}
              </Box>
            </Tooltip>
          )}
          
          {/* Add real data toggle */}
          <Tooltip title={`Real market data: ${useRealData ? 'On' : 'Off'}`}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Switch
                checked={useRealData}
                onChange={handleToggleRealData}
                color="secondary"
                size="small"
                disabled={!isPolygonApiConfigured}
              />
            </Box>
          </Tooltip>
          
          <Tooltip title={`Real-time updates: ${realtimeEnabled ? 'On' : 'Off'}`}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {getConnectionStatusIcon()}
              <Switch
                checked={realtimeEnabled}
                onChange={handleToggleRealtime}
                color="primary"
                size="small"
              />
            </Box>
          </Tooltip>
        </Box>
      </Paper>
      
      {/* Add API key warning if not configured */}
      {!isPolygonApiConfigured && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Polygon.io API key is not configured. Please add your API key to the .env file to enable real market data.
        </Alert>
      )}
      
      {/* Notifications panel */}
      <Popover
        open={notificationOpen}
        anchorEl={document.getElementById('root')}
        onClose={() => setNotificationOpen(false)}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        sx={{ mt: 10, mr: 2 }}
      >
        <Box sx={{ width: 350, maxHeight: 400, overflow: 'auto', p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Notifications
            <IconButton 
              size="small" 
              sx={{ float: 'right' }} 
              onClick={() => setNotifications([])}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Typography>
          
          {notifications.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              No notifications
            </Typography>
          ) : (
            notifications.map((notification, index) => (
              <Box 
                key={index} 
                sx={{ 
                  py: 1, 
                  borderBottom: index < notifications.length - 1 ? '1px solid' : 'none',
                  borderColor: 'divider'
                }}
              >
                <Typography variant="body2">
                  {getNotificationMessage(notification)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(notification.timestamp).toLocaleTimeString()}
                </Typography>
              </Box>
            ))
          )}
        </Box>
      </Popover>
      
      <Box sx={{ mb: 3 }}>
        <Paper elevation={2} sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 0 }}>
              <TuneIcon sx={{ mr: 1 }} /> 
              <span>Filters</span>
              {getActiveFilterCount() > 0 && (
                <Badge
                  badgeContent={getActiveFilterCount()}
                  color="primary"
                  sx={{ ml: 1 }}
                >
                  <Box />
                </Badge>
              )}
            </Typography>
            
            <Box>
              <Tooltip title="Filter presets">
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<BookmarkIcon />}
                  onClick={handlePresetMenuOpen}
                >
                  Presets
                </Button>
              </Tooltip>
              
              <Menu
                anchorEl={presetMenuAnchorEl}
                open={Boolean(presetMenuAnchorEl)}
                onClose={handlePresetMenuClose}
              >
                {filterPresets.map(preset => (
                  <MenuItem key={preset.id} onClick={() => applyPreset(preset)}>
                    <ListItemText primary={preset.name} />
                    <IconButton size="small" edge="end" onClick={(e) => {
                      e.stopPropagation();
                      deletePreset(preset.id);
                    }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </MenuItem>
                ))}
                <Divider />
                <MenuItem onClick={handleSavePresetOpen}>
                  <ListItemIcon>
                    <SaveIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Save current filters" />
                </MenuItem>
              </Menu>
              
              <Tooltip title="Save Filter Preset">
                <Popover
                  open={Boolean(savePresetAnchorEl)}
                  anchorEl={savePresetAnchorEl}
                  onClose={handleSavePresetClose}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                >
                  <Box sx={{ p: 2, width: 300 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Save Filter Preset
                    </Typography>
                    <TextField
                      fullWidth
                      label="Preset Name"
                      value={newPresetName}
                      onChange={(e) => setNewPresetName(e.target.value)}
                      margin="normal"
                      size="small"
                      autoFocus
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                      <Button onClick={handleSavePresetClose} sx={{ mr: 1 }}>
                        Cancel
                      </Button>
                      <Button 
                        variant="contained" 
                        color="primary" 
                        onClick={saveNewPreset}
                        disabled={newPresetName.trim() === ''}
                      >
                        Save
                      </Button>
                    </Box>
                  </Box>
                </Popover>
              </Tooltip>
            </Box>
          </Box>
          
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, 
            gap: 2 
          }}>
            <Box>
            <FormControl fullWidth>
              <InputLabel id="confidence-filter-label">Min Confidence</InputLabel>
              <Select
                labelId="confidence-filter-label"
                id="confidence-filter"
                value={confidenceFilter}
                label="Min Confidence"
                onChange={handleConfidenceFilterChange}
              >
                <MenuItem value={0}>All</MenuItem>
                <MenuItem value={60}>60%+</MenuItem>
                <MenuItem value={70}>70%+</MenuItem>
                <MenuItem value={80}>80%+</MenuItem>
                <MenuItem value={90}>90%+</MenuItem>
              </Select>
            </FormControl>
            </Box>
          
            <Box>
            <FormControl fullWidth>
              <InputLabel id="direction-filter-label">Direction</InputLabel>
              <Select
                labelId="direction-filter-label"
                id="direction-filter"
                value={directionFilter}
                label="Direction"
                onChange={handleDirectionFilterChange}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="bullish">Bullish</MenuItem>
                <MenuItem value="bearish">Bearish</MenuItem>
              </Select>
            </FormControl>
            </Box>
          
            <Box>
            <FormControl fullWidth>
              <InputLabel id="timeframe-label">Timeframe</InputLabel>
              <Select
                labelId="timeframe-label"
                id="timeframe"
                value={selectedTimeframe}
                label="Timeframe"
                onChange={handleTimeframeChange}
              >
                {allowedTimeframes.map((tf) => (
                  <MenuItem key={tf} value={tf}>{tf}</MenuItem>
                ))}
              </Select>
            </FormControl>
            </Box>
          
            <Box>
            <Button 
              variant="contained" 
              color="primary" 
              fullWidth
              onClick={() => onRunScanner(currentMode, selectedTimeframe)}
              disabled={isLoading}
                startIcon={isLoading && activeScanner === currentMode ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
            >
              {isLoading && activeScanner === currentMode ? 'Scanning...' : 'Run Scanner'}
            </Button>
            </Box>
            
            <Box sx={{ gridColumn: { xs: '1 / -1', sm: '1 / 3', md: '1 / 3' } }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={hideExpired}
                      onChange={handleHideExpiredChange}
                      color="warning"
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ mr: 1 }}>Hide Expired</Typography>
                      <Tooltip title="Patterns that are more than 24 hours past their expected breakout time">
                        <Chip 
                          size="small" 
                          color="warning" 
                          label={activeTab === 0 ? expiredDayPatterns : expiredSwingPatterns} 
                        />
                      </Tooltip>
                    </Box>
                  }
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={hideOld}
                      onChange={handleHideOldChange}
                      color="info"
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ mr: 1 }}>Hide Old</Typography>
                      <Tooltip title="Patterns created more than 7 days ago">
                        <Chip 
                          size="small" 
                          color="info" 
                          label={activeTab === 0 ? oldDayPatterns : oldSwingPatterns} 
                        />
                      </Tooltip>
                    </Box>
                  }
                />
              </Box>
            </Box>
          </Box>
          
          {getActiveFilterCount() > 0 && (
            <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {confidenceFilter > 0 && (
                <Chip 
                  label={`Confidence: ${confidenceFilter}%+`} 
                  color="primary" 
                  onDelete={() => setConfidenceFilter(0)}
                  size="small"
                />
              )}
              
              {directionFilter !== 'all' && (
                <Chip 
                  label={`Direction: ${directionFilter}`} 
                  color="primary" 
                  onDelete={() => setDirectionFilter('all')}
                  size="small"
                />
              )}
              
              {hideExpired && (
                <Chip 
                  label="Hide Expired" 
                  color="warning" 
                  onDelete={() => setHideExpired(false)}
                  size="small"
                />
              )}
              
              {hideOld && (
                <Chip 
                  label="Hide Old" 
                  color="info" 
                  onDelete={() => setHideOld(false)}
                  size="small"
                />
              )}
              
              {getActiveFilterCount() > 1 && (
                <Chip 
                  label="Clear All" 
                  variant="outlined"
                  onClick={() => {
                    setConfidenceFilter(0);
                    setDirectionFilter('all');
                    setHideExpired(false);
                    setHideOld(false);
                  }}
                  size="small"
                />
              )}
            </Box>
          )}
          
          {lastUpdateTime && (
            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
              <Typography variant="caption" color="text.secondary">
                Last update: {lastUpdateTime.toLocaleTimeString()}
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>
      
      <Box sx={{ mb: 3 }}>
        <Paper elevation={3} sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Backtest Stats for {selectedTimeframe}
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
              <Box sx={{ textAlign: 'center', p: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Avg Candles to Breakout
                </Typography>
                <Typography variant="h6">
                  {avgCandlesToBreakout.toFixed(1)}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center', p: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Win Rate
                </Typography>
                <Typography variant="h6">
                  {(winRate * 100).toFixed(1)}%
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center', p: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Profit Factor
                </Typography>
                <Typography variant="h6">
                  {profitFactor.toFixed(2)}
                </Typography>
              </Box>
          </Box>
        </Paper>
      </Box>
      
      <TabPanel value={activeTab} index={0}>
        <Typography variant="h6" gutterBottom>
          Day Trading Patterns
        </Typography>
        {isLoading && activeScanner === 'day' ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : dayTradingResults.length === 0 ? (
          <Alert severity="info">
            No day trading patterns found. Try running the scanner for a different timeframe.
          </Alert>
        ) : currentResults.length === 0 ? (
          <Alert severity="warning">
            No patterns match your current filters. Try adjusting your filter settings.
          </Alert>
        ) : (
          <>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Chip 
                label={`All Patterns: ${dayTradingResults.length}`} 
                color="primary" 
                variant="outlined" 
              />
              <Chip 
                label={`Filtered: ${currentResults.length}`} 
                color="secondary" 
              />
              {(expiredDayPatterns > 0 || oldDayPatterns > 0) && (
                <Chip 
                  label={`Hidden: ${dayTradingResults.length - currentResults.length}`} 
                  color="default" 
                  variant="outlined" 
                />
              )}
            </Stack>
            
            <Box sx={{ flexGrow: 1 }}>
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { 
                  xs: '1fr', 
                  sm: 'repeat(auto-fill, minmax(300px, 1fr))', 
                  md: 'repeat(auto-fill, minmax(350px, 1fr))', 
                  lg: 'repeat(auto-fill, minmax(400px, 1fr))' 
                }, 
                gap: 3 
              }}>
                {currentResults.map((pattern, index) => (
                  <Box key={pattern.id || index}>
                  <PatternCard 
                      pattern={{
                        id: pattern.id,
                        symbol: pattern.symbol,
                        pattern_type: pattern.pattern_type,
                        timeframe: pattern.timeframe,
                        entry_price: pattern.entry_price,
                        target_price: pattern.target_price,
                        stop_loss: pattern.stop_loss,
                        confidence_score: pattern.confidence_score,
                        created_at: pattern.created_at,
                        channel_type: pattern.channel_type,
                        volume_confirmation: pattern.volume_confirmation,
                        trendline_break: pattern.trendline_break,
                        ema_pattern: pattern.ema_pattern as string,
                        status: pattern.status || 'active',
                        risk_reward_ratio: pattern.risk_reward_ratio,
                        direction: pattern.direction || (pattern.pattern_type?.toLowerCase().includes('bull') ? 'bullish' : 'bearish')
                      }} 
                      avgCandlesToBreakout={backtestStats.avgCandlesToBreakout[pattern.timeframe]}
                      onArchive={onArchivePattern ? () => handleArchivePattern(pattern.id) : undefined}
                    />
                  </Box>
                ))}
              </Box>
            </Box>
          </>
        )}
      </TabPanel>
      
      <TabPanel value={activeTab} index={1}>
        <Typography variant="h6" gutterBottom>
          Swing Trading Patterns
        </Typography>
        {isLoading && activeScanner === 'swing' ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : swingTradingResults.length === 0 ? (
          <Alert severity="info">
            No swing trading patterns found. Try running the scanner for a different timeframe.
          </Alert>
        ) : currentResults.length === 0 ? (
          <Alert severity="warning">
            No patterns match your current filters. Try adjusting your filter settings.
          </Alert>
        ) : (
          <>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Chip 
                label={`All Patterns: ${swingTradingResults.length}`} 
                color="primary" 
                variant="outlined" 
              />
              <Chip 
                label={`Filtered: ${currentResults.length}`} 
                color="secondary" 
              />
              {(expiredSwingPatterns > 0 || oldSwingPatterns > 0) && (
                <Chip 
                  label={`Hidden: ${swingTradingResults.length - currentResults.length}`} 
                  color="default" 
                  variant="outlined" 
                />
              )}
            </Stack>
            
            <Box sx={{ flexGrow: 1 }}>
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { 
                  xs: '1fr', 
                  sm: 'repeat(auto-fill, minmax(300px, 1fr))', 
                  md: 'repeat(auto-fill, minmax(350px, 1fr))', 
                  lg: 'repeat(auto-fill, minmax(400px, 1fr))' 
                }, 
                gap: 3 
              }}>
                {currentResults.map((pattern, index) => (
                  <Box key={pattern.id || index}>
                  <PatternCard 
                      pattern={{
                        id: pattern.id,
                        symbol: pattern.symbol,
                        pattern_type: pattern.pattern_type,
                        timeframe: pattern.timeframe,
                        entry_price: pattern.entry_price,
                        target_price: pattern.target_price,
                        stop_loss: pattern.stop_loss,
                        confidence_score: pattern.confidence_score,
                        created_at: pattern.created_at,
                        channel_type: pattern.channel_type,
                        volume_confirmation: pattern.volume_confirmation,
                        trendline_break: pattern.trendline_break,
                        ema_pattern: pattern.ema_pattern as string,
                        status: pattern.status || 'active',
                        risk_reward_ratio: pattern.risk_reward_ratio,
                        direction: pattern.direction || (pattern.pattern_type?.toLowerCase().includes('bull') ? 'bullish' : 'bearish')
                      }} 
                      avgCandlesToBreakout={backtestStats.avgCandlesToBreakout[pattern.timeframe]}
                      onArchive={onArchivePattern ? () => handleArchivePattern(pattern.id) : undefined}
                    />
                  </Box>
                ))}
              </Box>
            </Box>
          </>
        )}
      </TabPanel>
      
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        message={snackbarMessage}
      />
    </Box>
  );
};

export default ScannerDashboard;
