/**
 * User Settings Component
 * Allows users to manage their settings
 */

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Chip,
  OutlinedInput,
  SelectChangeEvent
} from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import { UserSettings } from '@/services/auth/authService';

const UserSettingsComponent: React.FC = () => {
  // Get auth context
  const { userSettings, updateSettings } = useAuth();
  
  // State for form fields
  const [defaultScannerMode, setDefaultScannerMode] = useState<'day' | 'swing' | 'golden'>('day');
  const [minConfidenceThreshold, setMinConfidenceThreshold] = useState<number>(60);
  const [preferredPatterns, setPreferredPatterns] = useState<string[]>([]);
  const [preferredTimeframes, setPreferredTimeframes] = useState<string[]>([]);
  const [enableNotifications, setEnableNotifications] = useState<boolean>(false);
  const [notificationEmail, setNotificationEmail] = useState<string>('');
  
  // State for loading and alerts
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);
  
  // Available pattern types
  const availablePatternTypes = [
    'Bull Flag',
    'Bear Flag',
    'Ascending Triangle',
    'Descending Triangle',
    'Horizontal Channel Breakout',
    'Ascending Channel Breakout',
    'Descending Channel Breakout'
  ];
  
  // Available timeframes
  const availableTimeframes = [
    '1m',
    '5m',
    '15m',
    '30m',
    '1h',
    '4h',
    '1d',
    'weekly'
  ];
  
  // Initialize form with user settings
  useEffect(() => {
    if (userSettings) {
      setDefaultScannerMode(userSettings.defaultScannerMode);
      setMinConfidenceThreshold(userSettings.minConfidenceThreshold);
      setPreferredPatterns(userSettings.preferredPatterns);
      setPreferredTimeframes(userSettings.preferredTimeframes);
      setEnableNotifications(userSettings.enableNotifications);
      setNotificationEmail(userSettings.notificationEmail);
    }
  }, [userSettings]);
  
  // Handle scanner mode change
  const handleScannerModeChange = (event: SelectChangeEvent) => {
    setDefaultScannerMode(event.target.value as 'day' | 'swing' | 'golden');
  };
  
  // Handle confidence threshold change
  const handleConfidenceChange = (event: Event, newValue: number | number[]) => {
    setMinConfidenceThreshold(newValue as number);
  };
  
  // Handle pattern selection change
  const handlePatternChange = (event: SelectChangeEvent<typeof preferredPatterns>) => {
    const {
      target: { value },
    } = event;
    setPreferredPatterns(typeof value === 'string' ? value.split(',') : value);
  };
  
  // Handle timeframe selection change
  const handleTimeframeChange = (event: SelectChangeEvent<typeof preferredTimeframes>) => {
    const {
      target: { value },
    } = event;
    setPreferredTimeframes(typeof value === 'string' ? value.split(',') : value);
  };
  
  // Handle notifications toggle
  const handleNotificationsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEnableNotifications(event.target.checked);
  };
  
  // Handle notification email change
  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNotificationEmail(event.target.value);
  };
  
  // Handle save settings
  const handleSaveSettings = async () => {
    if (!userSettings) {
      return;
    }
    
    setIsLoading(true);
    setError('');
    setSuccess(false);
    
    try {
      // Create updated settings object
      const updatedSettings: UserSettings = {
        ...userSettings,
        defaultScannerMode,
        minConfidenceThreshold,
        preferredPatterns,
        preferredTimeframes,
        enableNotifications,
        notificationEmail
      };
      
      // Update settings
      const { error } = await updateSettings(updatedSettings);
      
      if (error) {
        throw error;
      }
      
      // Show success message
      setSuccess(true);
    } catch (error) {
      console.error('Error updating settings:', error);
      setError('Failed to update settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // If no user settings, show loading
  if (!userSettings) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h5" component="h1" gutterBottom>
        User Settings
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Settings updated successfully!
        </Alert>
      )}
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Scanner Preferences
        </Typography>
        
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="scanner-mode-label">Default Scanner Mode</InputLabel>
          <Select
            labelId="scanner-mode-label"
            id="scanner-mode"
            value={defaultScannerMode}
            label="Default Scanner Mode"
            onChange={handleScannerModeChange}
          >
            <MenuItem value="day">Day Trading</MenuItem>
            <MenuItem value="swing">Swing Trading</MenuItem>
            <MenuItem value="golden">Golden Scanner</MenuItem>
          </Select>
        </FormControl>
        
        <Box sx={{ mb: 2 }}>
          <Typography id="confidence-slider" gutterBottom>
            Minimum Confidence Threshold: {minConfidenceThreshold}%
          </Typography>
          <Slider
            value={minConfidenceThreshold}
            onChange={handleConfidenceChange}
            aria-labelledby="confidence-slider"
            valueLabelDisplay="auto"
            step={5}
            marks
            min={50}
            max={100}
          />
        </Box>
      </Box>
      
      <Divider sx={{ my: 2 }} />
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Pattern Preferences
        </Typography>
        
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="pattern-label">Preferred Patterns</InputLabel>
          <Select
            labelId="pattern-label"
            id="pattern-select"
            multiple
            value={preferredPatterns}
            onChange={handlePatternChange}
            input={<OutlinedInput id="select-multiple-chip" label="Preferred Patterns" />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => (
                  <Chip key={value} label={value} />
                ))}
              </Box>
            )}
          >
            {availablePatternTypes.map((pattern) => (
              <MenuItem key={pattern} value={pattern}>
                {pattern}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="timeframe-label">Preferred Timeframes</InputLabel>
          <Select
            labelId="timeframe-label"
            id="timeframe-select"
            multiple
            value={preferredTimeframes}
            onChange={handleTimeframeChange}
            input={<OutlinedInput id="select-multiple-chip" label="Preferred Timeframes" />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => (
                  <Chip key={value} label={value} />
                ))}
              </Box>
            )}
          >
            {availableTimeframes.map((timeframe) => (
              <MenuItem key={timeframe} value={timeframe}>
                {timeframe}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      
      <Divider sx={{ my: 2 }} />
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Notification Settings
        </Typography>
        
        <FormControlLabel
          control={
            <Switch
              checked={enableNotifications}
              onChange={handleNotificationsChange}
              color="primary"
            />
          }
          label="Enable Email Notifications"
          sx={{ mb: 2 }}
        />
        
        {enableNotifications && (
          <TextField
            fullWidth
            label="Notification Email"
            value={notificationEmail}
            onChange={handleEmailChange}
            type="email"
          />
        )}
      </Box>
      
      <Button
        variant="contained"
        color="primary"
        onClick={handleSaveSettings}
        disabled={isLoading}
        startIcon={isLoading ? <CircularProgress size={20} /> : null}
        fullWidth
      >
        {isLoading ? 'Saving...' : 'Save Settings'}
      </Button>
    </Paper>
  );
};

export default UserSettingsComponent;
