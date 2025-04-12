import { PatternData } from '@/services/types/patternTypes';

/**
 * Service for managing real-time alerts and notifications
 */
class NotificationService {
  private subscribers: Map<string, (notification: Notification) => void> = new Map();
  private notificationHistory: Notification[] = [];
  private maxHistorySize: number = 100;
  private alertSettings: AlertSettings = {
    minConfidence: 80,
    enabledPatternTypes: ['Bull Flag', 'Bear Flag', 'Ascending Triangle', 'Descending Triangle'],
    enabledTimeframes: ['15m', '30m', '1h', '4h', '1d', '1w'],
    requireMultiTimeframeConfirmation: true,
    enableDesktopNotifications: true,
    enableSoundAlerts: true,
    enableEmailAlerts: false,
    emailAddress: ''
  };

  /**
   * Create a notification from a pattern
   * @param pattern Pattern that triggered the notification
   * @returns Notification object
   */
  createNotificationFromPattern(pattern: PatternData): Notification {
    const notification: Notification = {
      id: `${pattern.symbol}-${pattern.timeframe}-${Date.now()}`,
      type: 'pattern_detected',
      title: `${pattern.patternType} Detected: ${pattern.symbol}`,
      message: `${pattern.direction.charAt(0).toUpperCase() + pattern.direction.slice(1)} ${pattern.patternType} detected on ${pattern.symbol} (${pattern.timeframe})`,
      timestamp: new Date().toISOString(),
      data: {
        symbol: pattern.symbol,
        patternType: pattern.patternType,
        timeframe: pattern.timeframe,
        direction: pattern.direction,
        confidenceScore: pattern.confidenceScore,
        entry: pattern.entry,
        target: pattern.target,
        stopLoss: pattern.stopLoss,
        potentialProfit: pattern.potentialProfit
      },
      read: false,
      priority: this.getPriorityFromConfidence(pattern.confidenceScore)
    };

    return notification;
  }

  /**
   * Determine notification priority based on confidence score
   * @param confidenceScore Pattern confidence score
   * @returns Notification priority
   */
  private getPriorityFromConfidence(confidenceScore: number): 'low' | 'medium' | 'high' {
    if (confidenceScore >= 90) return 'high';
    if (confidenceScore >= 80) return 'medium';
    return 'low';
  }

  /**
   * Send a notification to all subscribers
   * @param notification Notification to send
   */
  sendNotification(notification: Notification): void {
    // Add to history
    this.notificationHistory.unshift(notification);
    
    // Trim history if needed
    if (this.notificationHistory.length > this.maxHistorySize) {
      this.notificationHistory = this.notificationHistory.slice(0, this.maxHistorySize);
    }
    
    // Notify all subscribers
    this.subscribers.forEach(callback => {
      try {
        callback(notification);
      } catch (error) {
        console.error('Error in notification subscriber:', error);
      }
    });
    
    // Show desktop notification if enabled
    if (this.alertSettings.enableDesktopNotifications) {
      this.showDesktopNotification(notification);
    }
    
    // Play sound alert if enabled
    if (this.alertSettings.enableSoundAlerts) {
      this.playSoundAlert(notification.priority);
    }
    
    // Send email alert if enabled
    if (this.alertSettings.enableEmailAlerts && this.alertSettings.emailAddress) {
      this.sendEmailAlert(notification);
    }
  }

  /**
   * Show desktop notification
   * @param notification Notification to display
   */
  private showDesktopNotification(notification: Notification): void {
    // Check if browser supports notifications
    if ('Notification' in window) {
      // Check if permission is granted
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/notification-icon.png'
        });
      } else if (Notification.permission !== 'denied') {
        // Request permission
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification(notification.title, {
              body: notification.message,
              icon: '/notification-icon.png'
            });
          }
        });
      }
    }
  }

  /**
   * Play sound alert based on priority
   * @param priority Notification priority
   */
  private playSoundAlert(priority: 'low' | 'medium' | 'high'): void {
    try {
      const audio = new Audio();
      
      switch (priority) {
        case 'high':
          audio.src = '/sounds/high-priority.mp3';
          break;
        case 'medium':
          audio.src = '/sounds/medium-priority.mp3';
          break;
        case 'low':
          audio.src = '/sounds/low-priority.mp3';
          break;
      }
      
      audio.play();
    } catch (error) {
      console.error('Error playing sound alert:', error);
    }
  }

  /**
   * Send email alert (placeholder - would require backend implementation)
   * @param notification Notification to send via email
   */
  private sendEmailAlert(notification: Notification): void {
    // This would typically be implemented on the backend
    console.log(`Email alert would be sent to ${this.alertSettings.emailAddress} for ${notification.title}`);
  }

  /**
   * Subscribe to notifications
   * @param id Subscriber ID
   * @param callback Function to call when notification is received
   */
  subscribe(id: string, callback: (notification: Notification) => void): void {
    this.subscribers.set(id, callback);
  }

  /**
   * Unsubscribe from notifications
   * @param id Subscriber ID
   */
  unsubscribe(id: string): void {
    this.subscribers.delete(id);
  }

  /**
   * Get notification history
   * @returns Array of notifications
   */
  getNotificationHistory(): Notification[] {
    return [...this.notificationHistory];
  }

  /**
   * Mark notification as read
   * @param notificationId ID of notification to mark as read
   */
  markAsRead(notificationId: string): void {
    const notification = this.notificationHistory.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
    }
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): void {
    this.notificationHistory.forEach(notification => {
      notification.read = true;
    });
  }

  /**
   * Get alert settings
   * @returns Current alert settings
   */
  getAlertSettings(): AlertSettings {
    return { ...this.alertSettings };
  }

  /**
   * Update alert settings
   * @param settings New alert settings
   */
  updateAlertSettings(settings: Partial<AlertSettings>): void {
    this.alertSettings = {
      ...this.alertSettings,
      ...settings
    };
  }

  /**
   * Check if a pattern should trigger an alert based on current settings
   * @param pattern Pattern to check
   * @returns Whether the pattern should trigger an alert
   */
  shouldAlertForPattern(pattern: PatternData): boolean {
    // Check confidence threshold
    if (pattern.confidenceScore < this.alertSettings.minConfidence) {
      return false;
    }
    
    // Check pattern type
    if (!this.alertSettings.enabledPatternTypes.includes(pattern.patternType)) {
      return false;
    }
    
    // Check timeframe
    if (!this.alertSettings.enabledTimeframes.includes(pattern.timeframe)) {
      return false;
    }
    
    // Check multi-timeframe confirmation if required
    if (this.alertSettings.requireMultiTimeframeConfirmation && !pattern.multiTimeframeConfirmation) {
      return false;
    }
    
    return true;
  }

  /**
   * Process new patterns and send notifications for those that meet alert criteria
   * @param patterns Array of patterns to process
   */
  processPatterns(patterns: PatternData[]): void {
    patterns.forEach(pattern => {
      if (this.shouldAlertForPattern(pattern)) {
        const notification = this.createNotificationFromPattern(pattern);
        this.sendNotification(notification);
      }
    });
  }
}

/**
 * Alert settings interface
 */
export interface AlertSettings {
  minConfidence: number;
  enabledPatternTypes: string[];
  enabledTimeframes: string[];
  requireMultiTimeframeConfirmation: boolean;
  enableDesktopNotifications: boolean;
  enableSoundAlerts: boolean;
  enableEmailAlerts: boolean;
  emailAddress: string;
}

/**
 * Notification interface
 */
export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  data: any;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
}

// Export singleton instance
export const notificationService = new NotificationService();

// Export types
export type { NotificationService };
