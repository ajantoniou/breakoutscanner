import { PatternData } from '../types/patternTypes';

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface ValidationOptions {
  strictMode?: boolean;
  validateRiskReward?: boolean;
  minConfidenceScore?: number;
  maxAllowedAgeInDays?: number;
}

/**
 * Service for validating pattern data before processing
 */
export class DataValidationService {
  private defaultOptions: ValidationOptions = {
    strictMode: false,
    validateRiskReward: true,
    minConfidenceScore: 60,
    maxAllowedAgeInDays: 30
  };

  /**
   * Validate a single pattern against defined rules
   */
  validatePattern(
    pattern: PatternData, 
    options: ValidationOptions = {}
  ): ValidationResult {
    const opts = { ...this.defaultOptions, ...options };
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Required fields validation
    this.validateRequiredFields(pattern, errors);
    
    // Type validation
    this.validateFieldTypes(pattern, errors);
    
    // Business rules validation
    this.validateBusinessRules(pattern, errors, warnings, opts);
    
    // Price validation
    this.validatePrices(pattern, errors, warnings);
    
    // Risk/reward validation
    if (opts.validateRiskReward) {
      this.validateRiskReward(pattern, errors, warnings);
    }
    
    // Age validation
    this.validatePatternAge(pattern, warnings, opts.maxAllowedAgeInDays);
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate a batch of patterns and return valid ones
   */
  validatePatterns(
    patterns: PatternData[], 
    options: ValidationOptions = {}
  ): {
    validPatterns: PatternData[];
    invalidPatterns: PatternData[];
    validationResults: Map<string, ValidationResult>;
  } {
    const validPatterns: PatternData[] = [];
    const invalidPatterns: PatternData[] = [];
    const validationResults = new Map<string, ValidationResult>();
    
    patterns.forEach(pattern => {
      const result = this.validatePattern(pattern, options);
      validationResults.set(pattern.id, result);
      
      if (result.isValid) {
        validPatterns.push(pattern);
      } else {
        invalidPatterns.push(pattern);
      }
    });
    
    return {
      validPatterns,
      invalidPatterns,
      validationResults
    };
  }

  /**
   * Validate required fields
   */
  private validateRequiredFields(pattern: PatternData, errors: ValidationError[]): void {
    const requiredFields = [
      'id', 'symbol', 'pattern_type', 'direction', 'timeframe', 
      'entry_price', 'target_price', 'stop_loss', 'created_at'
    ];
    
    requiredFields.forEach(field => {
      if (pattern[field as keyof PatternData] === undefined || 
          pattern[field as keyof PatternData] === null ||
          pattern[field as keyof PatternData] === '') {
        errors.push({
          field,
          message: `Missing required field: ${field}`,
          code: 'REQUIRED_FIELD_MISSING'
        });
      }
    });
  }

  /**
   * Validate field types
   */
  private validateFieldTypes(pattern: PatternData, errors: ValidationError[]): void {
    // Validate numeric fields
    const numericFields = ['entry_price', 'target_price', 'stop_loss', 'confidence_score', 'risk_reward_ratio'];
    numericFields.forEach(field => {
      if (pattern[field as keyof PatternData] !== undefined && 
          pattern[field as keyof PatternData] !== null && 
          typeof pattern[field as keyof PatternData] !== 'number') {
        errors.push({
          field,
          message: `Field ${field} must be a number`,
          code: 'INVALID_TYPE'
        });
      }
    });
    
    // Validate string fields
    const stringFields = ['id', 'symbol', 'pattern_type', 'direction', 'timeframe', 'status', 'channel_type'];
    stringFields.forEach(field => {
      if (pattern[field as keyof PatternData] !== undefined && 
          pattern[field as keyof PatternData] !== null && 
          typeof pattern[field as keyof PatternData] !== 'string') {
        errors.push({
          field,
          message: `Field ${field} must be a string`,
          code: 'INVALID_TYPE'
        });
      }
    });
    
    // Validate date fields
    if (pattern.created_at !== undefined && pattern.created_at !== null) {
      const date = new Date(pattern.created_at);
      if (date.toString() === 'Invalid Date') {
        errors.push({
          field: 'created_at',
          message: 'Invalid date format for created_at',
          code: 'INVALID_DATE'
        });
      }
    }
  }

  /**
   * Validate business rules
   */
  private validateBusinessRules(
    pattern: PatternData, 
    errors: ValidationError[], 
    warnings: ValidationError[],
    options: ValidationOptions
  ): void {
    // Validate symbol format (typically uppercase letters)
    if (pattern.symbol && !/^[A-Z]+$/.test(pattern.symbol)) {
      warnings.push({
        field: 'symbol',
        message: 'Symbol should be uppercase letters only',
        code: 'INVALID_SYMBOL_FORMAT'
      });
      
      if (options.strictMode) {
        errors.push({
          field: 'symbol',
          message: 'Symbol must be uppercase letters only in strict mode',
          code: 'STRICT_SYMBOL_VALIDATION'
        });
      }
    }
    
    // Validate pattern type
    const validPatternTypes = [
      'double_top', 'double_bottom', 'head_and_shoulders', 
      'inverse_head_and_shoulders', 'triangle', 'flag', 
      'pennant', 'rectangle', 'cup_and_handle', 'wedge'
    ];
    
    if (pattern.pattern_type && !validPatternTypes.includes(pattern.pattern_type.toLowerCase())) {
      warnings.push({
        field: 'pattern_type',
        message: `Unknown pattern type: ${pattern.pattern_type}`,
        code: 'UNKNOWN_PATTERN_TYPE'
      });
    }
    
    // Validate direction
    if (pattern.direction && !['bullish', 'bearish'].includes(pattern.direction.toLowerCase())) {
      errors.push({
        field: 'direction',
        message: 'Direction must be either "bullish" or "bearish"',
        code: 'INVALID_DIRECTION'
      });
    }
    
    // Validate timeframe
    const validTimeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'];
    if (pattern.timeframe && !validTimeframes.includes(pattern.timeframe)) {
      errors.push({
        field: 'timeframe',
        message: `Invalid timeframe: ${pattern.timeframe}. Must be one of: ${validTimeframes.join(', ')}`,
        code: 'INVALID_TIMEFRAME'
      });
    }
    
    // Validate confidence score
    if (typeof pattern.confidence_score === 'number') {
      if (pattern.confidence_score < 0 || pattern.confidence_score > 100) {
        errors.push({
          field: 'confidence_score',
          message: 'Confidence score must be between 0 and 100',
          code: 'INVALID_CONFIDENCE_RANGE'
        });
      } else if (pattern.confidence_score < options.minConfidenceScore!) {
        warnings.push({
          field: 'confidence_score',
          message: `Low confidence score: ${pattern.confidence_score}. Minimum recommended: ${options.minConfidenceScore}`,
          code: 'LOW_CONFIDENCE'
        });
      }
    }
    
    // Validate status
    const validStatuses = ['active', 'completed', 'failed', 'pending', 'expired'];
    if (pattern.status && !validStatuses.includes(pattern.status.toLowerCase())) {
      warnings.push({
        field: 'status',
        message: `Unknown status: ${pattern.status}`,
        code: 'UNKNOWN_STATUS'
      });
    }
  }

  /**
   * Validate price values
   */
  private validatePrices(
    pattern: PatternData, 
    errors: ValidationError[], 
    warnings: ValidationError[]
  ): void {
    // Ensure prices are positive
    const priceFields = ['entry_price', 'target_price', 'stop_loss'];
    priceFields.forEach(field => {
      const price = pattern[field as keyof PatternData] as number;
      if (typeof price === 'number' && price <= 0) {
        errors.push({
          field,
          message: `${field} must be positive`,
          code: 'NEGATIVE_PRICE'
        });
      }
    });
    
    // Check if trade direction matches price targets
    if (
      typeof pattern.entry_price === 'number' && 
      typeof pattern.target_price === 'number' && 
      typeof pattern.stop_loss === 'number' && 
      pattern.direction
    ) {
      const isBullish = pattern.direction.toLowerCase() === 'bullish';
      
      if (isBullish) {
        // For bullish patterns, target should be higher than entry
        if (pattern.target_price <= pattern.entry_price) {
          errors.push({
            field: 'target_price',
            message: 'Target price must be higher than entry price for bullish patterns',
            code: 'INVALID_TARGET'
          });
        }
        
        // For bullish patterns, stop should be lower than entry
        if (pattern.stop_loss >= pattern.entry_price) {
          errors.push({
            field: 'stop_loss',
            message: 'Stop loss must be lower than entry price for bullish patterns',
            code: 'INVALID_STOP'
          });
        }
      } else {
        // For bearish patterns, target should be lower than entry
        if (pattern.target_price >= pattern.entry_price) {
          errors.push({
            field: 'target_price',
            message: 'Target price must be lower than entry price for bearish patterns',
            code: 'INVALID_TARGET'
          });
        }
        
        // For bearish patterns, stop should be higher than entry
        if (pattern.stop_loss <= pattern.entry_price) {
          errors.push({
            field: 'stop_loss',
            message: 'Stop loss must be higher than entry price for bearish patterns',
            code: 'INVALID_STOP'
          });
        }
      }
    }
  }

  /**
   * Validate risk/reward ratio
   */
  private validateRiskReward(
    pattern: PatternData, 
    errors: ValidationError[], 
    warnings: ValidationError[]
  ): void {
    if (
      typeof pattern.entry_price === 'number' && 
      typeof pattern.target_price === 'number' && 
      typeof pattern.stop_loss === 'number'
    ) {
      const isBullish = pattern.direction?.toLowerCase() === 'bullish';
      
      let reward: number;
      let risk: number;
      
      if (isBullish) {
        reward = pattern.target_price - pattern.entry_price;
        risk = pattern.entry_price - pattern.stop_loss;
      } else {
        reward = pattern.entry_price - pattern.target_price;
        risk = pattern.stop_loss - pattern.entry_price;
      }
      
      if (risk <= 0) {
        errors.push({
          field: 'stop_loss',
          message: 'Risk calculation invalid due to stop loss placement',
          code: 'INVALID_RISK'
        });
        return;
      }
      
      const calculatedRatio = reward / risk;
      
      // Verify provided risk/reward matches calculated
      if (
        typeof pattern.risk_reward_ratio === 'number' && 
        Math.abs(calculatedRatio - pattern.risk_reward_ratio) > 0.1
      ) {
        warnings.push({
          field: 'risk_reward_ratio',
          message: `Provided risk/reward ratio (${pattern.risk_reward_ratio.toFixed(2)}) doesn't match calculated value (${calculatedRatio.toFixed(2)})`,
          code: 'INCONSISTENT_RISK_REWARD'
        });
      }
      
      // Check if risk/reward is favorable
      if (calculatedRatio < 1) {
        warnings.push({
          field: 'risk_reward_ratio',
          message: `Risk/reward ratio (${calculatedRatio.toFixed(2)}) is less than 1:1`,
          code: 'UNFAVORABLE_RISK_REWARD'
        });
      } else if (calculatedRatio < 2) {
        warnings.push({
          field: 'risk_reward_ratio',
          message: `Risk/reward ratio (${calculatedRatio.toFixed(2)}) is less than recommended 2:1`,
          code: 'LOW_RISK_REWARD'
        });
      }
    }
  }

  /**
   * Validate pattern age
   */
  private validatePatternAge(
    pattern: PatternData, 
    warnings: ValidationError[],
    maxAgeInDays: number = 30
  ): void {
    if (pattern.created_at) {
      const patternDate = new Date(pattern.created_at);
      const currentDate = new Date();
      const diffTime = Math.abs(currentDate.getTime() - patternDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > maxAgeInDays) {
        warnings.push({
          field: 'created_at',
          message: `Pattern is ${diffDays} days old, which exceeds the recommended maximum age of ${maxAgeInDays} days`,
          code: 'PATTERN_TOO_OLD'
        });
      }
    }
  }
} 