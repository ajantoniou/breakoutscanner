import { LoggingService, LogCategory } from '../logging/LoggingService';
import { PolygonService, PolygonCandle, TimeframeString } from '../api/PolygonService';

export interface BacktestConfig {
  symbol: string;
  patternType: string;
  timeframe: TimeframeString;
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  startDate: Date;
  endDate: Date;
  direction: 'bullish' | 'bearish';
  customSettings?: Record<string, any>;
}

export interface BacktestResult {
  success: boolean;
  symbol: string;
  patternType: string;
  timeframe: string;
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  direction: string;
  outcome: 'win' | 'loss' | 'timeout' | 'error';
  entryTime: Date | null;
  exitTime: Date | null;
  exitPrice: number | null;
  pnlAmount: number | null;
  pnlPercent: number | null;
  maxFavorableExcursion: number | null; // Maximum unrealized profit
  maxAdverseExcursion: number | null;   // Maximum unrealized loss
  candlesElapsed: number | null;        // How many candles until exit
  durationMs: number | null;            // How long in milliseconds until exit
  error?: string;
  metrics?: {
    [key: string]: number | string | boolean;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Service for running backtests on historical price data
 */
export class BacktestService {
  private static instance: BacktestService;
  private polygonService: PolygonService;
  private logger: LoggingService;

  private constructor() {
    this.logger = LoggingService.getInstance();
    
    try {
      this.polygonService = PolygonService.getInstance();
    } catch (error) {
      this.logger.warn(
        'PolygonService not initialized, backtesting will require manual API configuration',
        LogCategory.BACKTEST
      );
    }
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): BacktestService {
    if (!BacktestService.instance) {
      BacktestService.instance = new BacktestService();
    }
    return BacktestService.instance;
  }

  /**
   * Initialize polygon service if not already done
   */
  public initializePolygonService(apiKey: string, options?: { baseUrl?: string, maxRetries?: number }): void {
    try {
      this.polygonService = PolygonService.getInstance({
        apiKey,
        ...options
      });
      
      this.logger.info(
        'PolygonService initialized for backtesting',
        LogCategory.BACKTEST
      );
    } catch (error) {
      this.logger.error(
        'Failed to initialize PolygonService',
        LogCategory.BACKTEST,
        { error: (error as Error).message }
      );
      throw error;
    }
  }

  /**
   * Run a backtest on historical data for a pattern
   */
  public async runBacktest(config: BacktestConfig): Promise<BacktestResult> {
    const startTime = Date.now();
    const validation = this.validateConfig(config);
    
    if (!validation.isValid) {
      const errorMessage = `Invalid backtest configuration: ${validation.errors.join(', ')}`;
      
      this.logger.error(
        errorMessage,
        LogCategory.VALIDATION,
        { config, errors: validation.errors }
      );
      
      return {
        success: false,
        symbol: config.symbol,
        patternType: config.patternType,
        timeframe: config.timeframe,
        entryPrice: config.entryPrice,
        targetPrice: config.targetPrice,
        stopLoss: config.stopLoss,
        direction: config.direction,
        outcome: 'error',
        entryTime: null,
        exitTime: null,
        exitPrice: null,
        pnlAmount: null,
        pnlPercent: null,
        maxFavorableExcursion: null,
        maxAdverseExcursion: null,
        candlesElapsed: null,
        durationMs: null,
        error: errorMessage
      };
    }

    // Log warnings if any
    if (validation.warnings.length > 0) {
      this.logger.warn(
        `Backtest configuration has warnings: ${validation.warnings.join(', ')}`,
        LogCategory.VALIDATION,
        { config, warnings: validation.warnings }
      );
    }

    try {
      // Ensure polygon service is initialized
      if (!this.polygonService) {
        throw new Error('PolygonService not initialized. Call initializePolygonService first.');
      }

      // Fetch historical data
      this.logger.info(
        `Starting backtest for ${config.symbol} ${config.patternType} pattern`,
        LogCategory.BACKTEST,
        { symbol: config.symbol, patternType: config.patternType, timeframe: config.timeframe }
      );

      const candles = await this.polygonService.getAggregates(
        config.symbol,
        config.timeframe,
        config.startDate,
        config.endDate,
        { adjusted: true, sort: 'asc' }
      );

      if (!candles || candles.length === 0) {
        throw new Error(`No historical data found for ${config.symbol} in the specified date range`);
      }

      this.logger.info(
        `Fetched ${candles.length} candles for backtest`,
        LogCategory.BACKTEST,
        { 
          symbol: config.symbol, 
          candleCount: candles.length,
          firstCandleTime: new Date(candles[0].t).toISOString(),
          lastCandleTime: new Date(candles[candles.length - 1].t).toISOString()
        }
      );

      // Execute backtest logic
      const result = this.executeBacktest(config, candles);
      
      // Log backtest completion
      const duration = Date.now() - startTime;
      this.logger.logBacktestResult(
        result.symbol,
        result.patternType,
        result.outcome === 'win',
        result.pnlPercent || 0,
        duration,
        {
          timeframe: result.timeframe,
          direction: result.direction,
          candlesElapsed: result.candlesElapsed,
          entryPrice: result.entryPrice,
          exitPrice: result.exitPrice,
          customMetrics: result.metrics
        }
      );

      return result;
    } catch (error) {
      const errorMsg = (error as Error).message;
      this.logger.error(
        `Backtest failed: ${errorMsg}`,
        LogCategory.BACKTEST,
        { 
          symbol: config.symbol, 
          patternType: config.patternType,
          timeframe: config.timeframe,
          error: errorMsg 
        }
      );

      return {
        success: false,
        symbol: config.symbol,
        patternType: config.patternType,
        timeframe: config.timeframe,
        entryPrice: config.entryPrice,
        targetPrice: config.targetPrice,
        stopLoss: config.stopLoss,
        direction: config.direction,
        outcome: 'error',
        entryTime: null,
        exitTime: null,
        exitPrice: null,
        pnlAmount: null,
        pnlPercent: null,
        maxFavorableExcursion: null,
        maxAdverseExcursion: null,
        candlesElapsed: null,
        durationMs: null,
        error: errorMsg
      };
    }
  }

  /**
   * Execute backtest logic on candle data
   */
  private executeBacktest(config: BacktestConfig, candles: PolygonCandle[]): BacktestResult {
    // Find entry point (first candle after config.startDate where price crosses entry)
    let entryIndex = -1;
    let entryTime: Date | null = null;
    let exitIndex = -1;
    let exitTime: Date | null = null;
    let exitPrice: number | null = null;
    let maxFavorableExcursion = 0;
    let maxAdverseExcursion = 0;
    let outcome: 'win' | 'loss' | 'timeout' = 'timeout';

    // Determine first candle after pattern identification (entry signal)
    for (let i = 0; i < candles.length; i++) {
      const candle = candles[i];
      const candleTime = new Date(candle.t);
      
      // Skip candles before the start date
      if (candleTime < config.startDate) {
        continue;
      }
      
      // First candle on or after start date is our entry candle
      entryIndex = i;
      entryTime = candleTime;
      break;
    }

    if (entryIndex === -1 || !entryTime) {
      return {
        success: false,
        symbol: config.symbol,
        patternType: config.patternType,
        timeframe: config.timeframe,
        entryPrice: config.entryPrice,
        targetPrice: config.targetPrice,
        stopLoss: config.stopLoss,
        direction: config.direction,
        outcome: 'error',
        entryTime: null,
        exitTime: null,
        exitPrice: null,
        pnlAmount: null,
        pnlPercent: null,
        maxFavorableExcursion: null,
        maxAdverseExcursion: null,
        candlesElapsed: null,
        durationMs: null,
        error: 'Could not find valid entry candle in the provided data'
      };
    }

    // Simulate trading from entry candle
    for (let i = entryIndex + 1; i < candles.length; i++) {
      const candle = candles[i];
      const candleTime = new Date(candle.t);
      
      // Check if end date is reached
      if (candleTime > config.endDate) {
        exitIndex = i - 1; // Last valid candle
        exitTime = new Date(candles[exitIndex].t);
        exitPrice = candles[exitIndex].c;
        outcome = 'timeout';
        break;
      }
      
      // Calculate MFE and MAE based on direction
      if (config.direction === 'bullish') {
        // For bullish trades, high price represents maximum potential profit
        const unrealizedProfit = (candle.h - config.entryPrice) / config.entryPrice;
        maxFavorableExcursion = Math.max(maxFavorableExcursion, unrealizedProfit);
        
        // For bullish trades, low price represents maximum potential loss
        const unrealizedLoss = (candle.l - config.entryPrice) / config.entryPrice;
        maxAdverseExcursion = Math.min(maxAdverseExcursion, unrealizedLoss);
        
        // Check if target hit during this candle
        if (candle.h >= config.targetPrice) {
          exitIndex = i;
          exitTime = candleTime;
          exitPrice = config.targetPrice; // Assume we exit exactly at the target
          outcome = 'win';
          break;
        }
        
        // Check if stop loss hit during this candle
        if (candle.l <= config.stopLoss) {
          exitIndex = i;
          exitTime = candleTime;
          exitPrice = config.stopLoss; // Assume we exit exactly at the stop
          outcome = 'loss';
          break;
        }
      } else {
        // For bearish trades, low price represents maximum potential profit
        const unrealizedProfit = (config.entryPrice - candle.l) / config.entryPrice;
        maxFavorableExcursion = Math.max(maxFavorableExcursion, unrealizedProfit);
        
        // For bearish trades, high price represents maximum potential loss
        const unrealizedLoss = (config.entryPrice - candle.h) / config.entryPrice;
        maxAdverseExcursion = Math.min(maxAdverseExcursion, unrealizedLoss);
        
        // Check if target hit during this candle
        if (candle.l <= config.targetPrice) {
          exitIndex = i;
          exitTime = candleTime;
          exitPrice = config.targetPrice; // Assume we exit exactly at the target
          outcome = 'win';
          break;
        }
        
        // Check if stop loss hit during this candle
        if (candle.h >= config.stopLoss) {
          exitIndex = i;
          exitTime = candleTime;
          exitPrice = config.stopLoss; // Assume we exit exactly at the stop
          outcome = 'loss';
          break;
        }
      }
      
      // If we reach the end without hitting target or stop
      if (i === candles.length - 1) {
        exitIndex = i;
        exitTime = candleTime;
        exitPrice = candle.c;
        outcome = 'timeout';
      }
    }

    // If no exit was found, use the last candle
    if (exitIndex === -1) {
      exitIndex = candles.length - 1;
      exitTime = new Date(candles[exitIndex].t);
      exitPrice = candles[exitIndex].c;
    }

    // Calculate P&L
    let pnlAmount: number | null = null;
    let pnlPercent: number | null = null;
    
    if (exitPrice !== null) {
      if (config.direction === 'bullish') {
        pnlAmount = exitPrice - config.entryPrice;
      } else {
        pnlAmount = config.entryPrice - exitPrice;
      }
      pnlPercent = (pnlAmount / config.entryPrice) * 100;
    }

    // Calculate elapsed time
    const candlesElapsed = exitIndex - entryIndex;
    const durationMs = exitTime ? exitTime.getTime() - entryTime.getTime() : null;

    return {
      success: true,
      symbol: config.symbol,
      patternType: config.patternType,
      timeframe: config.timeframe,
      entryPrice: config.entryPrice,
      targetPrice: config.targetPrice,
      stopLoss: config.stopLoss,
      direction: config.direction,
      outcome,
      entryTime,
      exitTime,
      exitPrice,
      pnlAmount,
      pnlPercent,
      maxFavorableExcursion,
      maxAdverseExcursion,
      candlesElapsed,
      durationMs,
      metrics: {
        riskRewardRatio: Math.abs((config.targetPrice - config.entryPrice) / (config.entryPrice - config.stopLoss)),
        winRate: outcome === 'win' ? 1 : 0,
        profitFactor: outcome === 'win' ? Math.abs(pnlAmount || 0) / Math.abs(config.entryPrice - config.stopLoss) : 0
      }
    };
  }

  /**
   * Validate backtest configuration
   */
  private validateConfig(config: BacktestConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!config.symbol) {
      errors.push('Symbol is required');
    }

    if (!config.patternType) {
      errors.push('Pattern type is required');
    }

    if (!config.timeframe) {
      errors.push('Timeframe is required');
    } else {
      const validTimeframes: TimeframeString[] = ['1min', '5min', '15min', '30min', '1h', '2h', '4h', '1day'];
      if (!validTimeframes.includes(config.timeframe)) {
        errors.push(`Timeframe must be one of: ${validTimeframes.join(', ')}`);
      }
    }

    if (!config.direction || !['bullish', 'bearish'].includes(config.direction)) {
      errors.push('Direction must be either "bullish" or "bearish"');
    }

    // Price validation
    if (isNaN(config.entryPrice) || config.entryPrice <= 0) {
      errors.push('Entry price must be a positive number');
    }

    if (isNaN(config.targetPrice) || config.targetPrice <= 0) {
      errors.push('Target price must be a positive number');
    }

    if (isNaN(config.stopLoss) || config.stopLoss <= 0) {
      errors.push('Stop loss must be a positive number');
    }

    // Price logic based on direction
    if (config.direction === 'bullish') {
      if (config.targetPrice <= config.entryPrice) {
        errors.push('Target price must be higher than entry price for bullish patterns');
      }
      
      if (config.stopLoss >= config.entryPrice) {
        errors.push('Stop loss must be lower than entry price for bullish patterns');
      }
    } else if (config.direction === 'bearish') {
      if (config.targetPrice >= config.entryPrice) {
        errors.push('Target price must be lower than entry price for bearish patterns');
      }
      
      if (config.stopLoss <= config.entryPrice) {
        errors.push('Stop loss must be higher than entry price for bearish patterns');
      }
    }

    // Date validation
    if (!config.startDate || !(config.startDate instanceof Date)) {
      errors.push('Start date must be a valid Date object');
    }

    if (!config.endDate || !(config.endDate instanceof Date)) {
      errors.push('End date must be a valid Date object');
    }

    if (config.startDate && config.endDate && config.startDate >= config.endDate) {
      errors.push('Start date must be before end date');
    }

    // Business logic warnings
    if (config.startDate && config.endDate) {
      const diffDays = Math.ceil((config.endDate.getTime() - config.startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays < 1) {
        warnings.push('Test duration is less than 1 day, which may not provide meaningful results');
      }
      
      if (diffDays > 365) {
        warnings.push('Test duration exceeds 1 year, which may introduce market regime bias');
      }
    }

    // Risk/reward ratio warning
    const riskRewardRatio = Math.abs(
      (config.targetPrice - config.entryPrice) / (config.entryPrice - config.stopLoss)
    );
    
    if (riskRewardRatio < 1) {
      warnings.push(`Risk-reward ratio (${riskRewardRatio.toFixed(2)}) is less than 1:1`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Run batch of backtests for different configurations
   */
  public async runBatchBacktests(configs: BacktestConfig[]): Promise<BacktestResult[]> {
    this.logger.info(
      `Starting batch backtest for ${configs.length} configurations`,
      LogCategory.BACKTEST,
      { configCount: configs.length }
    );

    const results: BacktestResult[] = [];
    const startTime = Date.now();

    for (const config of configs) {
      try {
        const result = await this.runBacktest(config);
        results.push(result);
      } catch (error) {
        this.logger.error(
          `Batch backtest error for ${config.symbol}`,
          LogCategory.BACKTEST,
          { 
            symbol: config.symbol, 
            patternType: config.patternType,
            error: (error as Error).message 
          }
        );
        
        results.push({
          success: false,
          symbol: config.symbol,
          patternType: config.patternType,
          timeframe: config.timeframe,
          entryPrice: config.entryPrice,
          targetPrice: config.targetPrice,
          stopLoss: config.stopLoss,
          direction: config.direction,
          outcome: 'error',
          entryTime: null,
          exitTime: null,
          exitPrice: null,
          pnlAmount: null,
          pnlPercent: null,
          maxFavorableExcursion: null,
          maxAdverseExcursion: null,
          candlesElapsed: null,
          durationMs: null,
          error: (error as Error).message
        });
      }
    }

    const totalDuration = Date.now() - startTime;
    const successCount = results.filter(r => r.success).length;
    const winCount = results.filter(r => r.outcome === 'win').length;
    const winRate = successCount > 0 ? (winCount / successCount) * 100 : 0;

    this.logger.info(
      `Batch backtest completed: ${successCount}/${configs.length} successful, ${winRate.toFixed(2)}% win rate`,
      LogCategory.BACKTEST,
      { 
        configCount: configs.length,
        successCount,
        winCount,
        winRate,
        totalDurationMs: totalDuration
      }
    );

    return results;
  }
} 