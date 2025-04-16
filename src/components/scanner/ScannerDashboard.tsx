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
  TextField,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell
} from '@mui/material';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import RefreshIcon from '@mui/icons-material/Refresh';
import PatternCard from './PatternCard';
import { PerformanceMetricsWidget } from './PerformanceMetricsWidget';
import { TIMEFRAMES } from '@/services/api/marketData/dataService';
import { getAllowedTimeframes } from '@/services/api/marketData/stockUniverses';
import { differenceInHours, differenceInDays, formatDistanceToNowStrict } from 'date-fns';
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
import { PatternData, PatternDirection, PatternTimeframe, PatternType } from '@/services/types/patternTypes';
import { PatternFilter } from './filters/types';
import { useSnackbar } from 'notistack';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import BacktestResults from './BacktestResults';
import ExitAlertsList, { ExitAlert } from './ExitAlertsList';
import { v4 as uuidv4 } from 'uuid';
import PatternTableContent from './table/PatternTableContent';

// Define the tab panel interface
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// Define filter preset interface
interface FilterPreset {
  id: string;
  name: string;
  confidenceFilter: number;
  directionFilter: PatternDirection | 'all';
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
  dayTradingResults: PatternData[];
  swingTradingResults: PatternData[];
  backtestStats: any;
  isLoading: boolean;
  activeScanner: string;
  onRunScanner: () => void;
  onArchivePattern: (pattern: PatternData) => void;
  performanceMetrics: {
    winRate: number;
    profitFactor: number;
    avgProfit: number;
    avgLoss: number;
    consistencyScore: number;
    riskRewardRatio: number;
    maxDrawdown: number;
    targetHitRate: number;
    totalTrades: number;
    historicalPerformance: Array<{ date: string; value: number }>;
    winLossDistribution: { wins: number; losses: number };
  };
  onViewChart?: (pattern: PatternData) => void;
}

const ScannerDashboard: React.FC<ScannerDashboardProps> = ({ 
  dayTradingResults, 
  swingTradingResults,
  backtestStats,
  isLoading,
  activeScanner,
  onRunScanner,
  onArchivePattern,
  performanceMetrics,
  onViewChart
}) => {
  // State for active tab
  const [activeTab, setActiveTab] = useState<string>('day');
  
  // State for filters
  const [confidenceFilter, setConfidenceFilter] = useState<number>(0);
  const [directionFilter, setDirectionFilter] = useState<PatternDirection | 'all'>('all');
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
      directionFilter: PatternDirection.BULLISH,
      hideExpired: true,
      hideOld: false
    },
    {
      id: 'bearish-only',
      name: 'Bearish Only',
      confidenceFilter: 60,
      directionFilter: PatternDirection.BEARISH,
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
    if (activeTab === 'day') {
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
  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
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
  const isPatternExpired = (pattern: PatternData) => {
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
  const filterResults = (patterns: PatternData[]): PatternData[] => {
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
  
  // State for table sorting
  const [sortField, setSortField] = useState<keyof PatternData>('confidence_score');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Handle sort change
  const handleSort = (field: keyof PatternData) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };
  
  // Sort the results based on sort field and direction
  const sortPatterns = (patterns: PatternData[]): PatternData[] => {
    return [...patterns].sort((a, b) => {
      // Handle undefined or null values
      const aValue = a[sortField] ?? '';
      const bValue = b[sortField] ?? '';
      
      // For numeric values
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      // For string values
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      // Default comparison (for dates, booleans, etc.)
      return sortDirection === 'asc' 
        ? (aValue > bValue ? 1 : -1)
        : (bValue > aValue ? 1 : -1);
    });
  };
  
  // Get filtered and sorted results
  const getSortedAndFilteredResults = () => {
    const results = activeTab === 'day' ? combinedDayPatterns : combinedSwingPatterns;
    const filtered = filterResults(results);
    return sortPatterns(filtered);
  };
  
  // Get current filtered and sorted results
  const currentResults = getSortedAndFilteredResults();
  
  // Function to handle pattern archival
  const handleArchivePattern = (pattern: PatternData) => {
    onArchivePattern(pattern);
  };
  
  // Function to run scanner
  const handleRunScanner = () => {
    onRunScanner();
  };
  
  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };
  
  // Get average candles to breakout for current timeframe
  const avgCandlesToBreakout = backtestStats.avgCandlesToBreakout[selectedTimeframe] || 0;
  const winRate = backtestStats.winRateByTimeframe[selectedTimeframe] || 0;
  const profitFactor = backtestStats.profitFactorByTimeframe[selectedTimeframe] || 0;
  
  // Count expired and old patterns
  const countExpiredPatterns = (results: PatternData[]) => {
    return results.filter(pattern => isPatternExpired(pattern)).length;
  };
  
  const countOldPatterns = (results: PatternData[]) => {
    return results.filter(pattern => isPatternOld(pattern)).length;
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
    const isScannerActive = activeTab === 'day' ? 'day' : 'swing';
    
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
    const typedStatus = newStatus as PatternData['status'];
    
    // Update pattern status in local day trading results
    setLocalDayPatterns(prev => 
      prev.map(pattern => 
        pattern.id === patternId ? { ...pattern, status: typedStatus } : pattern
      )
    );
    
    // Update pattern status in local swing trading results
    setLocalSwingPatterns(prev => 
      prev.map(pattern => 
        pattern.id === patternId ? { ...pattern, status: typedStatus } : pattern
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
    patternUpdateService.on(PatternUpdateEventType.NEW_PATTERN, handleNewPattern);
    patternUpdateService.on(PatternUpdateEventType.PATTERN_UPDATED, handlePatternUpdate);
    patternUpdateService.on(PatternUpdateEventType.STATUS_CHANGE, handleStatusChange);
    patternUpdateService.on(PatternUpdateEventType.CONNECTION_STATUS, handleConnectionStatus);
    
    // Clean up event handlers
    return () => {
      patternUpdateService.off(PatternUpdateEventType.NEW_PATTERN, handleNewPattern);
      patternUpdateService.off(PatternUpdateEventType.PATTERN_UPDATED, handlePatternUpdate);
      patternUpdateService.off(PatternUpdateEventType.STATUS_CHANGE, handleStatusChange);
      patternUpdateService.off(PatternUpdateEventType.CONNECTION_STATUS, handleConnectionStatus);
      
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
  
  // Generate mock pattern function
  const generateMockPattern = (): PatternData => {
    const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'NVDA', 'META', 'TSLA'];
    const patternTypes = Object.values(PatternType);
    const timeframes = Object.values(PatternTimeframe);
    const directions = [PatternDirection.BULLISH, PatternDirection.BEARISH];
    
    const entryPrice = Math.random() * 1000 + 100;
    const targetPercent = Math.random() * 0.1 + 0.02; // 2-12% target
    const stopPercent = Math.random() * 0.05 + 0.01; // 1-6% stop loss
    
    const mockPattern: PatternData = {
      id: Math.random().toString(36).substring(7),
      symbol: symbols[Math.floor(Math.random() * symbols.length)],
      pattern_type: patternTypes[Math.floor(Math.random() * patternTypes.length)],
      timeframe: timeframes[Math.floor(Math.random() * timeframes.length)],
      direction: directions[Math.floor(Math.random() * directions.length)],
      entry_price: entryPrice,
      target_price: entryPrice * (1 + targetPercent),
      stop_loss: entryPrice * (1 - stopPercent),
      confidence_score: Math.floor(Math.random() * 30) + 70, // 70-100
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      detected_at: new Date().toISOString(),
      status: 'active',
      risk_reward_ratio: targetPercent / stopPercent,
      is_ai_generated: false,
      target_percent: targetPercent * 100,
      volume_confirmation: Math.random() > 0.5,
      trendline_break: Math.random() > 0.5,
      support_level: entryPrice * 0.95,
      resistance_level: entryPrice * 1.05,
      current_price: entryPrice
    };

    return mockPattern;
  };
  
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
  const fetchMarketData = useCallback(async () => {
    if (!useRealData) return;
    
    const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'NVDA'];
    const timeframe = PatternTimeframe.DAILY;
    
    try {
      // Show loading state
      setSnackbarMessage(`Fetching ${timeframe} data for ${symbols.join(', ')}...`);
      setSnackbarOpen(true);
      
      // Fetch candles for symbols
      const marketService = new MarketDataService();
      const result = await marketService.scanMultipleSymbols(
        symbols,
        timeframe,
        120 // Last 120 candles
      );
      
      // Update data status
      setDataStatus(marketService.getDataFreshnessStatus(result.scanMetadata));
      
      // Process the data to find patterns
      const patterns: PatternData[] = [];
      
      for (const symbol of symbols) {
        if (result.data[symbol] && result.data[symbol].length > 0) {
          const candles = result.data[symbol];
          const lastCandle = candles[candles.length - 1];
          const isBullish = lastCandle.close > lastCandle.open;
          
          // Create a pattern based on latest price data
          const pattern: PatternData = {
            id: `${symbol}-${Date.now()}`,
            symbol: symbol,
            pattern_type: isBullish ? PatternType.BULL_FLAG : PatternType.BEAR_FLAG,
            timeframe: timeframe,
            entry_price: lastCandle.close,
            target_price: lastCandle.close * (isBullish ? 1.02 : 0.98), // 2% target
            stop_loss: lastCandle.close * (isBullish ? 0.98 : 1.02), // 2% stop loss
            confidence_score: 70 + Math.floor(Math.random() * 20),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            detected_at: new Date().toISOString(),
            direction: isBullish ? 'bullish' : 'bearish',
            status: 'active',
            risk_reward_ratio: 1,
            is_ai_generated: false,
            target_percent: 2,
            current_price: lastCandle.close,
            support_level: Math.min(...candles.slice(-20).map(c => c.low)),
            resistance_level: Math.max(...candles.slice(-20).map(c => c.high))
          };
          
          patterns.push(pattern);
        }
      }
      
      // Update patterns based on timeframe
      if (timeframe === PatternTimeframe.DAILY) {
        setLocalSwingPatterns(prevPatterns => [...prevPatterns, ...patterns]);
      } else {
        setLocalDayPatterns(prevPatterns => [...prevPatterns, ...patterns]);
      }
      
      setSnackbarMessage(`Successfully processed ${patterns.length} patterns`);
      setSnackbarOpen(true);
      
    } catch (error) {
      console.error('Error fetching market data:', error);
      setSnackbarMessage('Error fetching market data');
      setSnackbarOpen(true);
    }
  }, [useRealData]);
  
  // Toggle real data usage
  const handleToggleRealData = useCallback(() => {
    const newValue = !useRealData;
    setUseRealData(newValue);
    
    if (newValue) {
      // When enabling real data, fetch immediately
      fetchMarketData();
    }
  }, [useRealData, fetchMarketData]);
  
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
      fetchMarketData();
    }
  }, [useRealData, fetchMarketData]);
  
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
  
  const [exitAlerts, setExitAlerts] = useState<ExitAlert[]>([]);
  
  // Handle setting exit alert
  const handleSetExitAlert = (pattern: PatternData) => {
    // Calculate exit price as 95% of the target price
    const exitPrice = pattern.target_price * 0.95;
    // Trendline price could be calculated based on pattern data
    const trendlinePrice = pattern.entry_price * 0.98;
    
    const newAlert: ExitAlert = {
      alertId: uuidv4(),
      symbol: pattern.symbol,
      exitPrice: exitPrice,
      trendlinePrice: trendlinePrice,
      status: 'active',
      createdAt: new Date(),
      pattern: pattern
    };
    
    setExitAlerts((prevAlerts) => [...prevAlerts, newAlert]);
    
    enqueueSnackbar(`Exit alert set for ${pattern.symbol}`, { 
      variant: 'success',
      autoHideDuration: 3000
    });
  };

  const handleDeleteAlert = (alertId: string) => {
    setExitAlerts((prevAlerts) => prevAlerts.filter(alert => alert.alertId !== alertId));
    
    enqueueSnackbar('Exit alert removed', { 
      variant: 'info',
      autoHideDuration: 3000
    });
  };

  const handleClearAllAlerts = () => {
    setExitAlerts([]);
    
    enqueueSnackbar('All exit alerts cleared', { 
      variant: 'info',
      autoHideDuration: 3000
    });
  };

  // Render exit alerts table
  const renderExitAlertsTable = () => {
    return (
      <Box>
        {exitAlerts.length === 0 ? (
          <Typography variant="body1" sx={{ textAlign: 'center', my: 4 }}>
            No exit alerts have been set
          </Typography>
        ) : (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">
                Active Exit Alerts ({exitAlerts.filter(a => a.status === 'active').length})
              </Typography>
              <Button 
                size="small"
                startIcon={<DeleteIcon />}
                onClick={handleClearAllAlerts}
              >
                Clear All
              </Button>
            </Box>
            
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Symbol</TableCell>
                    <TableCell>Exit Price</TableCell>
                    <TableCell>Trendline Price</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {exitAlerts.map(alert => (
                    <TableRow key={alert.alertId}>
                      <TableCell>{alert.symbol}</TableCell>
                      <TableCell>${alert.exitPrice.toFixed(2)}</TableCell>
                      <TableCell>${alert.trendlinePrice.toFixed(2)}</TableCell>
                      <TableCell>
                        <Chip 
                          label={alert.status}
                          color={alert.status === 'active' ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{formatDistanceToNowStrict(alert.createdAt, { addSuffix: true })}</TableCell>
                      <TableCell>
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => handleDeleteAlert(alert.alertId)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Box>
    );
  };

  const { enqueueSnackbar } = useSnackbar();

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* First row */}
        <Grid item xs={12} md={8}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Breakout Scanner
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" paragraph>
            Track potential breakout opportunities across multiple timeframes
          </Typography>
        </Grid>
        <Grid item xs={12} md={4} sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          {/* Filter controls already exist in the original code */}
        </Grid>
        
        {/* Scanner Tabs */}
        <Grid item xs={12}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange} 
              aria-label="scanner tabs"
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography>Day Trading</Typography>
                    {dayTradingResults.length > 0 && (
                      <Chip 
                        label={dayTradingResults.length} 
                        size="small" 
                        sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
                        color="primary"
                      />
                    )}
                  </Box>
                } 
                value="day" 
              />
              <Tab 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography>Swing Trading</Typography>
                    {swingTradingResults.length > 0 && (
                      <Chip 
                        label={swingTradingResults.length} 
                        size="small" 
                        sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
                        color="primary" 
                      />
                    )}
                  </Box>
                } 
                value="swing" 
              />
              <Tab 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography>Exit Alerts</Typography>
                    {exitAlerts.length > 0 && (
                      <Chip 
                        label={exitAlerts.length} 
                        size="small" 
                        sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
                        color="warning"
                      />
                    )}
                  </Box>
                } 
                value="exitAlerts" 
              />
            </Tabs>
          </Box>
          
          {/* Tab content */}
          <Grid container spacing={2}>
            {activeTab === 'day' && (
              <>
                {/* Day trading content */}
                <Grid item xs={12}>
                  <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>Day Trading Patterns</Typography>
                    <PatternTableContent
                      patterns={currentResults}
                      loading={isLoading}
                      sortField={sortField}
                      sortDirection={sortDirection}
                      handleSort={handleSort}
                      onAddToTradeList={(pattern) => console.log('Add to trade list:', pattern)}
                      onSetExitAlert={handleSetExitAlert}
                    />
                  </Paper>
                  <BacktestResults />
                </Grid>
              </>
            )}
            {activeTab === 'swing' && (
              <>
                {/* Swing trading content */}
                <Grid item xs={12}>
                  <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>Swing Trading Patterns</Typography>
                    <PatternTableContent
                      patterns={currentResults}
                      loading={isLoading}
                      sortField={sortField}
                      sortDirection={sortDirection}
                      handleSort={handleSort}
                      onAddToTradeList={(pattern) => console.log('Add to trade list:', pattern)}
                      onSetExitAlert={handleSetExitAlert}
                    />
                  </Paper>
                  <BacktestResults />
                </Grid>
              </>
            )}
            {activeTab === 'exitAlerts' && (
              <>
                {/* Exit alerts content */}
                {renderExitAlertsTable()}
              </>
            )}
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ScannerDashboard;
