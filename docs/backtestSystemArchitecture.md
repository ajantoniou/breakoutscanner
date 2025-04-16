# Backtest System Architecture

## Overview

The backtesting system in Pattern-Scan-Ninja is designed to evaluate the historical performance of detected chart patterns. It provides traders with valuable insights into which patterns, timeframes, and strategies have been most effective based on real market data.

## Core Components

```
┌───────────────────┐      ┌───────────────────┐      ┌─────────────────────┐
│                   │      │                   │      │                     │
│ Pattern Detection │──────▶   Backtest Core   │──────▶ Performance Analysis │
│                   │      │                   │      │                     │
└───────────────────┘      └───────────────────┘      └─────────────────────┘
                                    │
                                    │
                                    ▼
                           ┌───────────────────┐
                           │                   │
                           │  Data Providers   │
                           │   (Polygon.io)    │
                           │                   │
                           └───────────────────┘
```

### 1. Pattern Detection

* **Pattern Recognition**: Identifies chart patterns in historical price data
* **Parameters**: Sets entry, target, and stop-loss prices based on pattern characteristics
* **Interfaces**: `PatternData` containing key details including symbol, timeframe, pattern_type, direction

### 2. Backtest Core

* **Key Files**: 
  - `polygonBacktestService.ts` - Main implementation using Polygon.io data
  - `performBacktest()` - Core function that executes the backtest logic

* **Process Flow**:
  1. Collect patterns to test
  2. Fetch historical price data from Polygon.io
  3. Identify entry points in the historical data
  4. Simulate trades based on pattern parameters
  5. Track exits (target hit, stop-loss hit, or timeout)
  6. Calculate profit/loss and performance metrics

* **Key Implementation Details**:
  ```typescript
  const performBacktest = (
    pattern: PatternData,
    candles: any[],
    entryPointIndex: number
  ): BacktestResult => {
    // Extract pattern information
    const entryPrice = pattern.entryPrice;
    const targetPrice = pattern.targetPrice;
    const stopLoss = pattern.stopLoss;
    const direction = pattern.direction;
    
    // Setup tracking variables
    let exitIndex = -1;
    let exitPrice = entryPrice;
    let successful = false;
    let maxDrawdown = 0;
    
    // Loop through data starting from entry point
    for (let i = entryPointIndex + 1; i < candles.length; i++) {
      const candle = candles[i];
      
      // Check for target hit
      if (direction === "bullish" && candle.high >= targetPrice) {
        exitIndex = i;
        exitPrice = targetPrice;
        successful = true;
        break;
      }
      
      // Check for stop loss hit
      if (direction === "bullish" && candle.low <= stopLoss) {
        exitIndex = i;
        exitPrice = stopLoss;
        break;
      }
      
      // Force exit after 30 bars if no target/stop hit
      if (i - entryPointIndex >= 30) {
        exitIndex = i;
        exitPrice = candle.close;
        successful = direction === "bullish" ? 
          candle.close > entryPrice : 
          candle.close < entryPrice;
        break;
      }
    }
    
    // Calculate profit/loss
    const profitLoss = direction === "bullish" ? 
      exitPrice - entryPrice : 
      entryPrice - exitPrice;
    
    const profitLossPercent = (profitLoss / entryPrice) * 100;
    
    return {
      // Backtest result details
      successful,
      profitLossPercent,
      // Additional metrics
    };
  };
  ```

### 3. Data Providers

* **Polygon.io API**:
  - Used to fetch historical price data for backtesting
  - Provides OHLCV data with flexible timeframes
  - Provides higher data accuracy and reliability

* **Data Conversion**:
  - `convertTimeframe()` - Maps application timeframes to Polygon API parameters
  - `getAggregates()` - Retrieves aggregate bar data with specific timeframe multipliers

### 4. Performance Analysis

* **Key Files**:
  - `getBacktestStatistics()` - Calculates comprehensive statistics from backtest results
  
* **Key Metrics**:
  - Win Rate: Percentage of successful trades
  - Profit Factor: Gross profit divided by gross loss
  - Average R-Multiple: Average risk-to-reward ratio
  - Expectancy: Expected return per trade
  - Performance by Pattern Type: Analysis of which patterns performed best
  - Performance by Timeframe: Analysis of which timeframes performed best

## Data Flow

1. **Pattern Collection**:
   - Patterns are collected from real-time detection or mock generation
   - Each pattern includes entry, target, and stop-loss prices

2. **Historical Data Retrieval**:
   - Data is fetched from Polygon.io API with proper authentication
   - Rate limiting and retries are handled automatically
   - Data is converted to internal candle format

3. **Backtest Execution**:
   - Each pattern is tested individually
   - Entry point is identified in historical data
   - Trade simulation follows pattern parameters
   - Exit is recorded when target, stop-loss is hit, or timeout occurs

4. **Statistics Calculation**:
   - Results from all patterns are aggregated
   - Performance metrics are calculated
   - Patterns and timeframes are ranked by performance

5. **Results Visualization**:
   - Data is displayed in tables and charts
   - Interactive filtering allows detailed analysis

## Technical Details

### Interfaces

**PatternData**:
```typescript
export interface PatternData {
  id: string;
  symbol: string;
  timeframe: string;
  pattern_type: string;
  direction: 'bullish' | 'bearish';
  entry_price: number;
  target_price: number;
  stop_loss: number;
  risk_reward_ratio: number;
  confidence_score: number;
  created_at: string;
  status: 'active' | 'completed' | 'failed';
  // Additional properties
}
```

**BacktestResult**:
```typescript
export interface BacktestResult {
  patternId: string;
  symbol: string;
  patternType: string;
  timeframe: string;
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  entryDate: string;
  exitDate: string;
  actualExitPrice: number;
  profitLossPercent: number;
  candlesToBreakout: number;
  successful: boolean;
  predictedDirection: string;
  actualDirection: string;
  profitLoss: number;
  maxDrawdown: number;
  dataSource: string;
  // Additional metrics
}
```

### Performance Optimization

1. **Selective Data Fetching**:
   - Fetches only the timeframe needed for each pattern
   - Limits historical data to 6 months for swing tests and 1-2 years for standard accounts

2. **Batch Processing**:
   - Processes patterns in batches to manage memory usage
   - Implements retry logic with exponential backoff for API requests

3. **API Rate Limiting**:
   - Respects Polygon.io API rate limits based on subscription plan
   - Implements queuing system for API requests
   - Caches responses to minimize redundant API calls

## UI Components

1. **PolygonBacktestDashboard**:
   - Main interface for running and viewing backtests
   - Provides controls for pattern selection and filtering

2. **BacktestResultsTable**:
   - Displays detailed results of individual trades
   - Supports sorting and filtering

3. **BacktestAnalytics**:
   - Shows aggregate performance metrics
   - Presents visual charts for pattern and timeframe analysis

## Future Enhancements

1. **Multiple Data Sources**:
   - Integration with additional data providers beyond Polygon.io
   - Support for alternative data sources (IEX, Alpha Vantage, etc.)

2. **Advanced Pattern Detection**:
   - Machine learning-based pattern recognition
   - Integration with external technical analysis libraries

3. **Portfolio-Level Backtesting**:
   - Simulate portfolio allocation strategies
   - Calculate portfolio-level metrics (drawdown, Sharpe ratio, etc.)

4. **Custom Strategy Backtesting**:
   - Allow users to define custom entry/exit rules
   - Support for complex multi-condition strategies 