import { PatternData } from '../types/patternTypes';
import { supabase } from '../../integrations/supabase/client';

/**
 * PatternBacktester - Tracks and analyzes the performance of detected patterns against actual market outcomes
 * using real market data from Polygon.io
 */
export class PatternBacktester {
  private static instance: PatternBacktester;
  private patternRecords: Map<string, PatternPerformance> = new Map();
  private isInitialized = false;

  // Performance metrics
  private metrics = {
    totalPatterns: 0,
    completedPatterns: 0,
    successfulPatterns: 0,
    failedPatterns: 0,
    pendingPatterns: 0,
    averageProfit: 0,
    averageLoss: 0,
    maxProfit: 0,
    maxLoss: 0,
    riskRewardRatio: 0,
    winRate: 0,
    profitFactor: 0,
  };

  // Pattern type specific metrics
  private patternTypeMetrics: Map<string, TypeMetrics> = new Map();

  private constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): PatternBacktester {
    if (!PatternBacktester.instance) {
      PatternBacktester.instance = new PatternBacktester();
    }
    return PatternBacktester.instance;
  }

  /**
   * Initialize the backtester by loading existing patterns from the database
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load patterns from database
      const { data, error } = await supabase
        .from('patterns')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500); // Load last 500 patterns for analysis

      if (error) throw error;

      if (data && data.length > 0) {
        console.log(`Loaded ${data.length} patterns for backtesting analysis`);
        
        // Process each pattern
        data.forEach((pattern: PatternData) => {
          this.trackPattern(pattern);
        });

        // Calculate initial metrics
        this.calculateMetrics();
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing pattern backtester:', error);
    }
  }

  /**
   * Track a new pattern or update an existing one
   */
  public trackPattern(pattern: PatternData): void {
    const patternId = pattern.id;
    
    // Initialize pattern performance record if it doesn't exist
    if (!this.patternRecords.has(patternId)) {
      this.patternRecords.set(patternId, {
        pattern,
        entryDate: new Date(pattern.created_at),
        entryPrice: pattern.entry_price,
        targetPrice: pattern.target_price,
        stopLoss: pattern.stop_loss,
        status: pattern.status,
        outcome: 'pending',
        maxPrice: pattern.entry_price,
        minPrice: pattern.entry_price,
        exitDate: null,
        exitPrice: null,
        profit: 0,
        profitPercentage: 0,
        daysToCompletion: 0,
        trades: []
      });
      
      this.metrics.totalPatterns++;
      this.metrics.pendingPatterns++;
    } else {
      // Update existing pattern
      const existingRecord = this.patternRecords.get(patternId)!;
      
      // Only update if status has changed
      if (existingRecord.status !== pattern.status) {
        if (pattern.status === 'completed' || pattern.status === 'failed') {
          this.metrics.pendingPatterns--;
          this.metrics.completedPatterns++;
          
          // Finalize the pattern performance record
          const exitDate = new Date();
          const daysToCompletion = Math.floor((exitDate.getTime() - existingRecord.entryDate.getTime()) / (1000 * 60 * 60 * 24));
          
          // Determine if pattern was successful
          const isSuccessful = pattern.status === 'completed';
          const exitPrice = isSuccessful ? pattern.target_price : (pattern.stop_loss || pattern.entry_price * 0.95);
          const profit = isSuccessful ? 
            (pattern.target_price - pattern.entry_price) : 
            (pattern.stop_loss ? (pattern.stop_loss - pattern.entry_price) : -(pattern.entry_price * 0.05));
          const profitPercentage = (profit / pattern.entry_price) * 100;
          
          // Update the record
          existingRecord.status = pattern.status;
          existingRecord.outcome = isSuccessful ? 'success' : 'failure';
          existingRecord.exitDate = exitDate;
          existingRecord.exitPrice = exitPrice;
          existingRecord.profit = profit;
          existingRecord.profitPercentage = profitPercentage;
          existingRecord.daysToCompletion = daysToCompletion;
          
          // Update metrics
          if (isSuccessful) {
            this.metrics.successfulPatterns++;
            if (profitPercentage > this.metrics.maxProfit) {
              this.metrics.maxProfit = profitPercentage;
            }
          } else {
            this.metrics.failedPatterns++;
            if (profitPercentage < this.metrics.maxLoss) {
              this.metrics.maxLoss = profitPercentage;
            }
          }
          
          // Store the updated record
          this.patternRecords.set(patternId, existingRecord);
        }
      }
    }

    // Update type-specific metrics
    this.updatePatternTypeMetrics(pattern);
  }

  /**
   * Update price data for a pattern based on real-time market data
   */
  public updatePatternPriceData(symbol: string, price: number, timestamp: Date): void {
    // Find all patterns for this symbol
    this.patternRecords.forEach((record, patternId) => {
      if (record.pattern.symbol === symbol && record.status === 'active') {
        // Update max/min price
        if (price > record.maxPrice) {
          record.maxPrice = price;
        }
        if (price < record.minPrice) {
          record.minPrice = price;
        }
        
        // Check if target price has been hit
        if (price >= record.targetPrice) {
          // Pattern completed successfully
          record.status = 'completed';
          record.outcome = 'success';
          record.exitDate = timestamp;
          record.exitPrice = price;
          record.profit = price - record.entryPrice;
          record.profitPercentage = (record.profit / record.entryPrice) * 100;
          record.daysToCompletion = Math.floor((timestamp.getTime() - record.entryDate.getTime()) / (1000 * 60 * 60 * 24));
          
          // Update metrics
          this.metrics.pendingPatterns--;
          this.metrics.completedPatterns++;
          this.metrics.successfulPatterns++;
          
          // Update in database
          this.updatePatternInDatabase(patternId, 'completed', price);
        }
        
        // Check if stop loss has been hit
        else if (record.stopLoss && price <= record.stopLoss) {
          // Pattern failed
          record.status = 'failed';
          record.outcome = 'failure';
          record.exitDate = timestamp;
          record.exitPrice = price;
          record.profit = price - record.entryPrice;
          record.profitPercentage = (record.profit / record.entryPrice) * 100;
          record.daysToCompletion = Math.floor((timestamp.getTime() - record.entryDate.getTime()) / (1000 * 60 * 60 * 24));
          
          // Update metrics
          this.metrics.pendingPatterns--;
          this.metrics.completedPatterns++;
          this.metrics.failedPatterns++;
          
          // Update in database
          this.updatePatternInDatabase(patternId, 'failed', price);
        }
        
        // Add price point to trade history
        record.trades.push({
          timestamp,
          price,
          isEntry: false,
          isExit: record.status !== 'active'
        });
        
        // Store the updated record
        this.patternRecords.set(patternId, record);
      }
    });
    
    // Recalculate metrics
    this.calculateMetrics();
  }

  /**
   * Calculate overall performance metrics
   */
  private calculateMetrics(): void {
    const patterns = Array.from(this.patternRecords.values());
    const completedPatterns = patterns.filter(p => p.status !== 'active');
    
    if (completedPatterns.length === 0) return;
    
    // Calculate win rate
    this.metrics.winRate = (this.metrics.successfulPatterns / this.metrics.completedPatterns) * 100;
    
    // Calculate average profit and loss
    const successfulPatterns = patterns.filter(p => p.outcome === 'success');
    const failedPatterns = patterns.filter(p => p.outcome === 'failure');
    
    this.metrics.averageProfit = successfulPatterns.length > 0 
      ? successfulPatterns.reduce((sum, p) => sum + p.profitPercentage, 0) / successfulPatterns.length 
      : 0;
      
    this.metrics.averageLoss = failedPatterns.length > 0 
      ? Math.abs(failedPatterns.reduce((sum, p) => sum + p.profitPercentage, 0) / failedPatterns.length)
      : 0;
    
    // Calculate risk-reward ratio
    this.metrics.riskRewardRatio = this.metrics.averageLoss > 0 
      ? this.metrics.averageProfit / this.metrics.averageLoss 
      : 0;
    
    // Calculate profit factor
    const totalProfit = successfulPatterns.reduce((sum, p) => sum + p.profit, 0);
    const totalLoss = Math.abs(failedPatterns.reduce((sum, p) => sum + p.profit, 0));
    this.metrics.profitFactor = totalLoss > 0 ? totalProfit / totalLoss : 0;
  }

  /**
   * Update pattern type specific metrics
   */
  private updatePatternTypeMetrics(pattern: PatternData): void {
    const patternType = pattern.pattern_type;
    
    if (!this.patternTypeMetrics.has(patternType)) {
      // Initialize metrics for this pattern type
      this.patternTypeMetrics.set(patternType, {
        total: 0,
        active: 0,
        completed: 0,
        success: 0,
        failure: 0,
        winRate: 0,
        averageProfit: 0,
        averageLoss: 0,
        riskRewardRatio: 0
      });
    }
    
    const metrics = this.patternTypeMetrics.get(patternType)!;
    
    // Update counts
    metrics.total++;
    
    if (pattern.status === 'active') {
      metrics.active++;
    } else if (pattern.status === 'completed') {
      metrics.completed++;
      metrics.success++;
    } else if (pattern.status === 'failed') {
      metrics.completed++;
      metrics.failure++;
    }
    
    // Update win rate
    metrics.winRate = metrics.completed > 0 ? (metrics.success / metrics.completed) * 100 : 0;
    
    // Store updated metrics
    this.patternTypeMetrics.set(patternType, metrics);
  }

  /**
   * Update pattern status in the database
   */
  private async updatePatternInDatabase(patternId: string, status: string, exitPrice: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('patterns')
        .update({ 
          status,
          exit_price: exitPrice,
          updated_at: new Date().toISOString()
        })
        .eq('id', patternId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating pattern in database:', error);
    }
  }

  /**
   * Get performance metrics for all patterns
   */
  public getPerformanceMetrics(): PerformanceMetrics {
    return {
      ...this.metrics,
      byPatternType: Object.fromEntries(this.patternTypeMetrics)
    };
  }

  /**
   * Get performance data for a specific pattern
   */
  public getPatternPerformance(patternId: string): PatternPerformance | null {
    return this.patternRecords.has(patternId) ? this.patternRecords.get(patternId)! : null;
  }

  /**
   * Export performance data for analysis
   */
  public exportPerformanceData(): PatternPerformanceExport {
    return {
      metrics: this.metrics,
      patternTypeMetrics: Object.fromEntries(this.patternTypeMetrics),
      patterns: Array.from(this.patternRecords.values())
    };
  }
}

/**
 * Interface definitions
 */
interface PatternPerformance {
  pattern: PatternData;
  entryDate: Date;
  entryPrice: number;
  targetPrice: number;
  stopLoss: number | null;
  status: string;
  outcome: 'pending' | 'success' | 'failure';
  maxPrice: number;
  minPrice: number;
  exitDate: Date | null;
  exitPrice: number | null;
  profit: number;
  profitPercentage: number;
  daysToCompletion: number;
  trades: {
    timestamp: Date;
    price: number;
    isEntry: boolean;
    isExit: boolean;
  }[];
}

interface TypeMetrics {
  total: number;
  active: number;
  completed: number;
  success: number;
  failure: number;
  winRate: number;
  averageProfit: number;
  averageLoss: number;
  riskRewardRatio: number;
}

interface PerformanceMetrics {
  totalPatterns: number;
  completedPatterns: number;
  successfulPatterns: number;
  failedPatterns: number;
  pendingPatterns: number;
  averageProfit: number;
  averageLoss: number;
  maxProfit: number;
  maxLoss: number;
  riskRewardRatio: number;
  winRate: number;
  profitFactor: number;
  byPatternType: Record<string, TypeMetrics>;
}

interface PatternPerformanceExport {
  metrics: {
    totalPatterns: number;
    completedPatterns: number;
    successfulPatterns: number;
    failedPatterns: number;
    pendingPatterns: number;
    averageProfit: number;
    averageLoss: number;
    maxProfit: number;
    maxLoss: number;
    riskRewardRatio: number;
    winRate: number;
    profitFactor: number;
  };
  patternTypeMetrics: Record<string, TypeMetrics>;
  patterns: PatternPerformance[];
}

export default PatternBacktester; 