import React, { useEffect, useState } from 'react';
import { notificationService, Notification, AlertSettings } from '@/services/notifications/notificationService';

/**
 * Component for displaying and managing notifications
 */
const NotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [alertSettings, setAlertSettings] = useState<AlertSettings>(notificationService.getAlertSettings());
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Subscribe to notifications on component mount
  useEffect(() => {
    const handleNotification = (notification: Notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    };

    // Subscribe to notification service
    notificationService.subscribe('notification-center', handleNotification);
    
    // Load initial notification history
    setNotifications(notificationService.getNotificationHistory());
    setUnreadCount(notificationService.getNotificationHistory().filter(n => !n.read).length);
    
    // Cleanup on unmount
    return () => {
      notificationService.unsubscribe('notification-center');
    };
  }, []);

  // Handle marking notification as read
  const handleMarkAsRead = (id: string) => {
    notificationService.markAsRead(id);
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  // Handle marking all notifications as read
  const handleMarkAllAsRead = () => {
    notificationService.markAllAsRead();
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
    setUnreadCount(0);
  };

  // Handle updating alert settings
  const handleUpdateSettings = () => {
    notificationService.updateAlertSettings(alertSettings);
    setShowSettings(false);
  };

  // Get color for notification priority
  const getPriorityColor = (priority: 'low' | 'medium' | 'high'): string => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 border-red-500';
      case 'medium':
        return 'bg-yellow-100 border-yellow-500';
      case 'low':
        return 'bg-blue-100 border-blue-500';
      default:
        return 'bg-gray-100 border-gray-500';
    }
  };

  return (
    <div className="relative">
      {/* Notification Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full bg-gray-200 hover:bg-gray-300 focus:outline-none"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>
      
      {/* Notification Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg z-50 overflow-hidden">
          <div className="p-3 bg-gray-100 border-b flex justify-between items-center">
            <h3 className="font-medium">Notifications</h3>
            <div className="flex space-x-2">
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Mark all as read
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="text-xs text-gray-600 hover:text-gray-800"
              >
                Settings
              </button>
            </div>
          </div>
          
          {/* Settings Panel */}
          {showSettings ? (
            <div className="p-3">
              <h4 className="font-medium mb-2">Alert Settings</h4>
              
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Minimum Confidence</label>
                <select
                  value={alertSettings.minConfidence}
                  onChange={(e) => setAlertSettings(prev => ({ ...prev, minConfidence: Number(e.target.value) }))}
                  className="w-full p-2 border rounded"
                >
                  <option value={60}>60%</option>
                  <option value={70}>70%</option>
                  <option value={80}>80%</option>
                  <option value={90}>90%</option>
                </select>
              </div>
              
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Pattern Types</label>
                <div className="space-y-1">
                  {['Bull Flag', 'Bear Flag', 'Ascending Triangle', 'Descending Triangle'].map(type => (
                    <label key={type} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={alertSettings.enabledPatternTypes.includes(type)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAlertSettings(prev => ({
                              ...prev,
                              enabledPatternTypes: [...prev.enabledPatternTypes, type]
                            }));
                          } else {
                            setAlertSettings(prev => ({
                              ...prev,
                              enabledPatternTypes: prev.enabledPatternTypes.filter(t => t !== type)
                            }));
                          }
                        }}
                        className="mr-2"
                      />
                      {type}
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Timeframes</label>
                <div className="grid grid-cols-3 gap-1">
                  {['15m', '30m', '1h', '4h', '1d', '1w'].map(timeframe => (
                    <label key={timeframe} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={alertSettings.enabledTimeframes.includes(timeframe)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAlertSettings(prev => ({
                              ...prev,
                              enabledTimeframes: [...prev.enabledTimeframes, timeframe]
                            }));
                          } else {
                            setAlertSettings(prev => ({
                              ...prev,
                              enabledTimeframes: prev.enabledTimeframes.filter(t => t !== timeframe)
                            }));
                          }
                        }}
                        className="mr-1"
                      />
                      {timeframe}
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="mb-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={alertSettings.requireMultiTimeframeConfirmation}
                    onChange={(e) => setAlertSettings(prev => ({ 
                      ...prev, 
                      requireMultiTimeframeConfirmation: e.target.checked 
                    }))}
                    className="mr-2"
                  />
                  Require Multi-Timeframe Confirmation
                </label>
              </div>
              
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Notification Methods</label>
                <div className="space-y-1">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={alertSettings.enableDesktopNotifications}
                      onChange={(e) => setAlertSettings(prev => ({ 
                        ...prev, 
                        enableDesktopNotifications: e.target.checked 
                      }))}
                      className="mr-2"
                    />
                    Desktop Notifications
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={alertSettings.enableSoundAlerts}
                      onChange={(e) => setAlertSettings(prev => ({ 
                        ...prev, 
                        enableSoundAlerts: e.target.checked 
                      }))}
                      className="mr-2"
                    />
                    Sound Alerts
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={alertSettings.enableEmailAlerts}
                      onChange={(e) => setAlertSettings(prev => ({ 
                        ...prev, 
                        enableEmailAlerts: e.target.checked 
                      }))}
                      className="mr-2"
                    />
                    Email Alerts
                  </label>
                </div>
              </div>
              
              {alertSettings.enableEmailAlerts && (
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1">Email Address</label>
                  <input
                    type="email"
                    value={alertSettings.emailAddress}
                    onChange={(e) => setAlertSettings(prev => ({ 
                      ...prev, 
                      emailAddress: e.target.value 
                    }))}
                    className="w-full p-2 border rounded"
                    placeholder="your@email.com"
                  />
                </div>
              )}
              
              <div className="flex justify-end space-x-2 mt-4">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateSettings}
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Save Settings
                </button>
              </div>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No notifications yet
                </div>
              ) : (
                <div>
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 border-l-4 ${notification.read ? 'bg-white' : getPriorityColor(notification.priority)} border-b`}
                      onClick={() => handleMarkAsRead(notification.id)}
                    >
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium">{notification.title}</h4>
                        <span className="text-xs text-gray-500">
                          {new Date(notification.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{notification.message}</p>
                      
                      {notification.data && notification.data.symbol && (
                        <div className="mt-2 text-xs text-gray-600">
                          <div className="flex justify-between">
                            <span>Entry: ${notification.data.entry.toFixed(2)}</span>
                            <span>Target: ${notification.data.target.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between mt-1">
                            <span>Stop: ${notification.data.stopLoss.toFixed(2)}</span>
                            <span>Profit: {notification.data.potentialProfit.toFixed(1)}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
