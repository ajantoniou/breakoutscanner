import { PatternData } from '../types/patternTypes';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

export enum LogCategory {
  API = 'api',
  PATTERN = 'pattern',
  BACKTEST = 'backtest',
  VALIDATION = 'validation',
  REALTIME = 'realtime',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  SYSTEM = 'system',
  WEBSOCKET = 'websocket'
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  metadata?: Record<string, any>;
  patternId?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
}

export interface LoggingOptions {
  enableConsole?: boolean;
  enableRemote?: boolean;
  minimumLevel?: LogLevel;
  includeMetadata?: boolean;
  remoteEndpoint?: string;
  batchSize?: number;
}

/**
 * Service for centralized logging and monitoring
 */
export class LoggingService {
  private static instance: LoggingService;
  private logs: LogEntry[] = [];
  private options: LoggingOptions = {
    enableConsole: true,
    enableRemote: false,
    minimumLevel: LogLevel.INFO,
    includeMetadata: true,
    batchSize: 50
  };
  private flushTimeout: NodeJS.Timeout | null = null;
  private sessionId: string;
  
  private constructor() {
    this.sessionId = this.generateSessionId();
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }
  
  /**
   * Configure logging options
   */
  public configure(options: LoggingOptions): void {
    this.options = { ...this.options, ...options };
    
    // Start flush timer if remote logging is enabled
    if (this.options.enableRemote && !this.flushTimeout) {
      this.flushTimeout = setInterval(() => this.flushLogs(), 30000); // Flush every 30 seconds
    } else if (!this.options.enableRemote && this.flushTimeout) {
      clearInterval(this.flushTimeout);
      this.flushTimeout = null;
    }
  }
  
  /**
   * Log debug message
   */
  public debug(message: string, category: LogCategory, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, category, message, metadata);
  }
  
  /**
   * Log info message
   */
  public info(message: string, category: LogCategory, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, category, message, metadata);
  }
  
  /**
   * Log warning message
   */
  public warn(message: string, category: LogCategory, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, category, message, metadata);
  }
  
  /**
   * Log error message
   */
  public error(message: string, category: LogCategory, metadata?: Record<string, any>): void {
    this.log(LogLevel.ERROR, category, message, metadata);
  }
  
  /**
   * Log fatal error message
   */
  public fatal(message: string, category: LogCategory, metadata?: Record<string, any>): void {
    this.log(LogLevel.FATAL, category, message, metadata);
  }
  
  /**
   * Log pattern validation
   */
  public logPatternValidation(
    pattern: PatternData,
    isValid: boolean,
    validationDetails: Record<string, any>
  ): void {
    this.log(
      isValid ? LogLevel.INFO : LogLevel.WARN,
      LogCategory.VALIDATION,
      `Pattern validation ${isValid ? 'succeeded' : 'failed'}: ${pattern.symbol} - ${pattern.pattern_type}`,
      {
        patternId: pattern.id,
        symbol: pattern.symbol,
        patternType: pattern.pattern_type,
        validationDetails
      }
    );
  }
  
  /**
   * Log API rate limit
   */
  public logRateLimit(
    apiName: string,
    remainingCalls: number,
    resetTime: Date,
    endpoint: string
  ): void {
    this.log(
      remainingCalls < 10 ? LogLevel.WARN : LogLevel.INFO,
      LogCategory.API,
      `API rate limit status: ${apiName}`,
      {
        apiName,
        remainingCalls,
        resetTime: resetTime.toISOString(),
        resetTimeMs: resetTime.getTime(),
        endpoint
      }
    );
  }
  
  /**
   * Log backtest result
   */
  public logBacktestResult(
    patternId: string,
    symbol: string,
    success: boolean,
    profitLoss: number,
    executionTimeMs: number,
    details?: Record<string, any>
  ): void {
    this.log(
      LogLevel.INFO,
      LogCategory.BACKTEST,
      `Backtest ${success ? 'successful' : 'failed'}: ${symbol}`,
      {
        patternId,
        symbol,
        success,
        profitLoss,
        executionTimeMs,
        ...(details || {})
      }
    );
  }
  
  /**
   * Log performance metric
   */
  public logPerformance(
    operation: string,
    durationMs: number,
    details?: Record<string, any>
  ): void {
    const level = durationMs > 5000 ? LogLevel.WARN : LogLevel.DEBUG;
    
    this.log(
      level,
      LogCategory.PERFORMANCE,
      `Performance metric: ${operation} took ${durationMs}ms`,
      {
        operation,
        durationMs,
        ...details
      }
    );
  }
  
  /**
   * Retrieve all logs
   */
  public getLogs(
    filter?: {
      level?: LogLevel,
      category?: LogCategory,
      startDate?: Date,
      endDate?: Date
    }
  ): LogEntry[] {
    let filteredLogs = [...this.logs];
    
    if (filter) {
      if (filter.level) {
        filteredLogs = filteredLogs.filter(log => log.level === filter.level);
      }
      
      if (filter.category) {
        filteredLogs = filteredLogs.filter(log => log.category === filter.category);
      }
      
      if (filter.startDate) {
        filteredLogs = filteredLogs.filter(log => 
          new Date(log.timestamp) >= filter.startDate!
        );
      }
      
      if (filter.endDate) {
        filteredLogs = filteredLogs.filter(log => 
          new Date(log.timestamp) <= filter.endDate!
        );
      }
    }
    
    return filteredLogs;
  }
  
  /**
   * Clear all logs
   */
  public clearLogs(): void {
    this.logs = [];
  }
  
  /**
   * Base log method
   */
  private log(
    level: LogLevel, 
    category: LogCategory, 
    message: string, 
    metadata?: Record<string, any>
  ): void {
    // Skip if below minimum level
    if (this.shouldSkipLogLevel(level)) {
      return;
    }
    
    const timestamp = new Date().toISOString();
    const logEntry: LogEntry = {
      timestamp,
      level,
      category,
      message,
      sessionId: this.sessionId
    };
    
    // Add metadata if enabled
    if (this.options.includeMetadata && metadata) {
      logEntry.metadata = metadata;
      
      // Extract common fields from metadata
      if (metadata.patternId) {
        logEntry.patternId = metadata.patternId;
      }
      
      if (metadata.userId) {
        logEntry.userId = metadata.userId;
      }
      
      if (metadata.requestId) {
        logEntry.requestId = metadata.requestId;
      }
    }
    
    // Store log
    this.logs.push(logEntry);
    
    // Console output if enabled
    if (this.options.enableConsole) {
      this.writeToConsole(logEntry);
    }
    
    // Auto-flush if batch size exceeded
    if (this.options.enableRemote && this.logs.length >= (this.options.batchSize || 50)) {
      this.flushLogs();
    }
  }
  
  /**
   * Write log to console with color formatting
   */
  private writeToConsole(log: LogEntry): void {
    const colors = {
      [LogLevel.DEBUG]: '\x1b[37m', // White
      [LogLevel.INFO]: '\x1b[32m',  // Green
      [LogLevel.WARN]: '\x1b[33m',  // Yellow
      [LogLevel.ERROR]: '\x1b[31m', // Red
      [LogLevel.FATAL]: '\x1b[35m'  // Magenta
    };
    
    const reset = '\x1b[0m';
    const color = colors[log.level] || reset;
    
    const timestamp = log.timestamp.split('T')[1].substring(0, 8);
    const formattedMetadata = log.metadata 
      ? ` ${JSON.stringify(log.metadata)}`
      : '';
    
    console.log(
      `${color}[${timestamp}] [${log.level.toUpperCase()}] [${log.category}] ${log.message}${formattedMetadata}${reset}`
    );
  }
  
  /**
   * Flush logs to remote endpoint
   */
  private async flushLogs(): Promise<void> {
    if (!this.options.enableRemote || this.logs.length === 0) {
      return;
    }
    
    try {
      if (this.options.remoteEndpoint) {
        // In a real implementation, you would send logs to your endpoint
        // For now, we'll just log it to console
        console.log(`[LoggingService] Would send ${this.logs.length} logs to ${this.options.remoteEndpoint}`);
        
        // In production:
        // await fetch(this.options.remoteEndpoint, {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(this.logs)
        // });
      }
      
      // Clear sent logs
      this.logs = [];
    } catch (error) {
      console.error('[LoggingService] Failed to flush logs:', error);
    }
  }
  
  /**
   * Check if log level should be skipped
   */
  private shouldSkipLogLevel(level: LogLevel): boolean {
    const levels = [
      LogLevel.DEBUG,
      LogLevel.INFO,
      LogLevel.WARN,
      LogLevel.ERROR,
      LogLevel.FATAL
    ];
    
    const minimumLevelIndex = levels.indexOf(this.options.minimumLevel || LogLevel.INFO);
    const currentLevelIndex = levels.indexOf(level);
    
    return currentLevelIndex < minimumLevelIndex;
  }
  
  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
} 