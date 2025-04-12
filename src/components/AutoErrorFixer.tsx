import React, { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';

interface ErrorReport {
  message: string;
  timestamp: Date;
  file?: string;
  line?: number;
  column?: number;
  type?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

type ConsoleErrorFunction = (...data: any[]) => void;

/**
 * This component monitors for errors and automatically attempts to fix them
 * by refreshing data sources and clearing caches when appropriate.
 * It runs indefinitely to provide continuous error monitoring and recovery.
 */
const AutoErrorFixer: React.FC = () => {
  const [errors, setErrors] = useState<ErrorReport[]>([]);
  const [isFixing, setIsFixing] = useState(false);
  const [lastFixAttempt, setLastFixAttempt] = useState<Date | null>(null);
  const [fixCounter, setFixCounter] = useState(0);
  const [corsErrorDetected, setCorsErrorDetected] = useState(false);
  const [networkErrors, setNetworkErrors] = useState(0);
  const consoleErrorRef = useRef<ConsoleErrorFunction | null>(null);
  const windowErrorRef = useRef<OnErrorEventHandler | null>(null);
  const errorCountRef = useRef<Record<string, number>>({});
  
  // Check if we're in production environment
  const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost';
  
  // Determine error severity based on message and type
  const getErrorSeverity = (message: string, type?: string): ErrorReport['severity'] => {
    if (
      message.includes('SecurityError') ||
      message.includes('crash') ||
      message.includes('fatal') ||
      message.includes('corrupt')
    ) {
      return 'critical';
    }
    
    if (
      message.includes('TypeError') ||
      message.includes('ReferenceError') ||
      message.includes('SyntaxError')
    ) {
      return 'high';
    }
    
    if (
      message.includes('NetworkError') ||
      message.includes('Failed to fetch') ||
      message.includes('timeout')
    ) {
      return 'medium';
    }
    
    return 'low';
  };
  
  // Capture JS errors
  useEffect(() => {
    // Store original console methods only once
    if (!consoleErrorRef.current) {
      consoleErrorRef.current = console.error;
    }
    if (!windowErrorRef.current) {
      windowErrorRef.current = window.onerror;
    }
    
    // Access the stored references
    const originalConsoleError = consoleErrorRef.current as ConsoleErrorFunction;
    const originalWindowError = windowErrorRef.current as OnErrorEventHandler;
    
    // Override console.error to capture errors
    console.error = (...args) => {
      originalConsoleError(...args);
      
      // Add error to our list
      const errorMessage = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      // Check for CORS-related errors
      if (
        errorMessage.includes('CORS') || 
        errorMessage.includes('cross-origin') || 
        errorMessage.includes('Access-Control-Allow-Origin')
      ) {
        setCorsErrorDetected(true);
        console.warn('CORS error detected. Will not attempt auto-fix to avoid refresh loops.');
        
        // Show CORS error toast only once
        if (!corsErrorDetected) {
          toast.error('CORS Error Detected', {
            description: 'API requests are being blocked by CORS policy. This requires server-side configuration.',
            duration: 10000
          });
        }
        
        // Don't add CORS errors to the list to prevent refresh loops
        return;
      }
      
      // Track error frequency
      const errorKey = errorMessage.substring(0, 100); // Use first 100 chars as key
      errorCountRef.current[errorKey] = (errorCountRef.current[errorKey] || 0) + 1;
      
      // Filter out refresh loop related errors in production
      const isRefreshLoopError = 
        errorMessage.includes('refresh loop') || 
        errorMessage.includes('too many requests') ||
        errorMessage.includes('rate limit') ||
        errorMessage.includes('API call limit');
      
      // Don't log the capture itself to avoid noise
      setErrors(prev => [
        ...prev, 
        { 
          message: errorMessage,
          timestamp: new Date(),
          severity: getErrorSeverity(errorMessage)
        }
      ]);
    };
    
    // Capture window errors
    window.onerror = (message, source, lineno, colno, error) => {
      if (originalWindowError) {
        originalWindowError(message, source, lineno, colno, error);
      }
      
      // Add to our error list
      const errorMessage = error?.message || String(message);
      const fileName = source?.split('/').pop() || '';
      
      // Check for CORS-related errors
      if (
        errorMessage.includes('CORS') || 
        errorMessage.includes('cross-origin') || 
        errorMessage.includes('Access-Control-Allow-Origin')
      ) {
        setCorsErrorDetected(true);
        console.warn('CORS error detected. Will not attempt auto-fix to avoid refresh loops.');
        return false;
      }
      
      // Track error frequency
      const errorKey = errorMessage.substring(0, 100);
      errorCountRef.current[errorKey] = (errorCountRef.current[errorKey] || 0) + 1;
      
      setErrors(prev => [
        ...prev, 
        { 
          message: errorMessage,
          file: fileName,
          line: lineno,
          column: colno,
          timestamp: new Date(),
          severity: getErrorSeverity(errorMessage, error?.name)
        }
      ]);
      
      return false; // Let default error handler run
    };
    
    return () => {
      // Restore original handlers
      console.error = originalConsoleError;
      window.onerror = originalWindowError;
    };
  }, [corsErrorDetected]);
  
  // Try fixing errors automatically when they appear
  useEffect(() => {
    // Significantly reduce automatic fix attempts in production
    const attemptFix = async () => {
      // Skip fixes when CORS errors are detected to avoid refresh loops
      if (corsErrorDetected || errors.length === 0 || isFixing) return;
      
      // Get the most recent error
      const latestError = errors[errors.length - 1];
      
      // Check if this error is occurring too frequently
      const errorKey = latestError.message.substring(0, 100);
      const errorCount = errorCountRef.current[errorKey] || 0;
      
      // In production, be much more conservative with automatic fixes
      if (isProduction) {
        // Wait even longer between fix attempts in production
        if (lastFixAttempt && (new Date().getTime() - lastFixAttempt.getTime() < 60000)) {
          return; // Wait at least 60 seconds between fix attempts in production
        }
        
        // Only attempt fixes for critical errors in production
        if (latestError.severity !== 'critical' && errorCount < 3) {
          // Just report non-critical errors without attempting automatic fix
          if (errors.length % 5 === 0) { // Only notify every 5 errors to reduce noise
            toast.info('Error detected in production', {
              description: 'Monitoring but not automatically fixing to prevent refresh loops',
              duration: 5000
            });
          }
          return;
        }
      } else {
        // In development, don't attempt fixes too frequently
        if (lastFixAttempt && (new Date().getTime() - lastFixAttempt.getTime() < 30000)) {
          return; // Wait at least 30 seconds between fix attempts in development
        }
        
        // In development, be more aggressive with fixes but still respect error frequency
        if (errorCount > 10) {
          toast.warning('Error occurring too frequently', {
            description: 'This error is happening too often. Manual intervention may be needed.',
            duration: 10000
          });
          return;
        }
      }
      
      setIsFixing(true);
      setLastFixAttempt(new Date());
      setFixCounter(prev => prev + 1);
      
      try {
        // Notify user
        toast.info('Auto-fixing detected error', {
          description: `Attempting to fix: ${latestError.message.substring(0, 100)}...`,
          duration: 5000
        });
        
        // Handle different types of errors
        switch (latestError.severity) {
          case 'critical':
            // For critical errors, clear all caches and reload
            localStorage.clear();
            sessionStorage.clear();
            toast.success('Cleared all caches', { 
              description: 'Application will reload to recover from critical error.' 
            });
            window.location.reload();
            break;
            
          case 'high':
            // For high severity errors, clear pattern and backtest caches
            const cacheKeys = Object.keys(localStorage).filter(key => 
              key.startsWith('data_cache_') || 
              key.startsWith('pattern_') ||
              key.startsWith('backtest_')
            );
            
            cacheKeys.forEach(key => localStorage.removeItem(key));
            toast.success('Cleared pattern data', { 
              description: `Removed ${cacheKeys.length} cached items. Please refresh manually if needed.` 
            });
            break;
            
          case 'medium':
            // For medium severity errors (like network issues), just clear API response caches
            const apiCacheKeys = Object.keys(localStorage).filter(key => 
              key.startsWith('api_response_')
            );
            
            apiCacheKeys.forEach(key => localStorage.removeItem(key));
            toast.success('Cleared API cache', { 
              description: `Removed ${apiCacheKeys.length} cached API responses.` 
            });
            break;
            
          case 'low':
          default:
            // For low severity errors, just log and continue
            console.warn('Low severity error detected:', latestError.message);
            break;
        }
      } catch (error) {
        console.error('Error during auto-fix:', error);
        toast.error('Auto-fix failed', {
          description: 'The automatic fix attempt failed. Manual intervention may be needed.',
          duration: 10000
        });
      } finally {
        setIsFixing(false);
      }
    };
    
    // Attempt to fix errors when they occur
    if (errors.length > 0) {
      attemptFix();
    }
  }, [errors, isFixing, lastFixAttempt, corsErrorDetected, isProduction]);
  
  return null; // This is a utility component, no UI needed
};

export default AutoErrorFixer;
