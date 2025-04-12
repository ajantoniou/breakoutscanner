# Breakout Scanner Documentation

## Overview

The Breakout Scanner is a sophisticated trading tool designed to detect and predict breakouts from higher timeframe channels. It uses multi-timeframe analysis to identify high-probability trading opportunities with specific entry, target, and stop-loss levels.

This documentation covers the latest version with significant improvements to data accuracy, pattern detection, and backtesting capabilities.

## Key Features

- **Real-time Market Data**: Accurate, timestamped data from Polygon.io with WebSocket integration
- **Multi-timeframe Analysis**: Confirmation across multiple timeframes for higher reliability
- **Pattern Detection**: Bull Flag, Bear Flag, Ascending Triangle, Descending Triangle patterns
- **Golden Scanner**: High-confidence predictions with minimum 5% profit potential
- **Backtesting Framework**: Comprehensive historical testing with data integrity checks
- **Password Protection**: Secure access with Supabase authentication

## Data Accuracy Improvements

### Polygon API Integration

The system uses Polygon.io API with proper authentication and rate limiting:

- API key is passed as a query parameter for all requests
- Exponential backoff implemented for failed requests
- Queue system prevents API throttling
- Proper error handling with fallback mechanisms

### Timestamp Validation System

All data points include comprehensive metadata:

- `fetchedAt`: When the data was retrieved
- `isDelayed`: Whether the data has a known delay
- `source`: Data source identifier
- `lastUpdated`: Last update timestamp from the source
- `validUntil`: When the data should be considered stale
- `marketStatus`: Current market status (open, closed, pre-market, after-hours)
- `dataAge`: Age of data in milliseconds
- `requestDuration`: How long the request took
- `retryCount`: Number of retry attempts

### Supabase Caching

Efficient data storage and retrieval:

- Proper timestamp tracking for all cached data
- Batch processing for large datasets
- Cache validation based on market hours and data age
- Automatic cleanup of old data

### Real-time WebSocket Connection

Live data updates via Polygon WebSocket:

- Connection health monitoring with automatic reconnection
- Subscription management for efficient data streaming
- Event handling for trades, quotes, and aggregates
- Heartbeat mechanism to maintain connection

### Market Hours Awareness

Proper handling of market sessions:

- Detection of regular market hours, pre-market, and after-hours
- Support for market holidays and early close days
- Adjustment of data freshness expectations based on market status
- Categorization of candles by market session

## Pattern Detection

The system detects the following patterns:

### Bull Flag

A continuation pattern that forms after a strong upward movement, followed by a consolidation period:

- Steep uptrend (flag pole)
- Consolidation in a downward or sideways channel (flag)
- Breakout above the upper trendline

### Bear Flag

A continuation pattern that forms after a strong downward movement, followed by a consolidation period:

- Steep downtrend (flag pole)
- Consolidation in an upward or sideways channel (flag)
- Breakout below the lower trendline

### Ascending Triangle

A bullish pattern characterized by:

- Horizontal resistance line at the top
- Rising support line at the bottom
- Decreasing volume during formation
- Breakout above resistance with increased volume

### Descending Triangle

A bearish pattern characterized by:

- Horizontal support line at the bottom
- Falling resistance line at the top
- Decreasing volume during formation
- Breakout below support with increased volume

## Confidence Scoring

Each pattern is assigned a confidence score (0-100) based on:

- Pattern quality (adherence to ideal formation)
- Volume confirmation
- Multi-timeframe alignment
- Historical success rate
- Market conditions

## Timeframe Restrictions

- **Day Scanner**: 15min, 30min, and 1hour timeframes
- **Swing Scanner**: 1hour, 4hour, daily, and weekly timeframes
- **Golden Scanner**: Focuses on 1hour, 4hour, and daily timeframes

## Backtesting Framework

The backtesting system includes:

### Data Integrity Checks

- Validation of candle data completeness and quality
- Gap detection and interpolation
- Outlier detection and filtering
- Data quality reporting with recommendations

### Performance Metrics

- Win rate (percentage of successful trades)
- Profit factor (gross profit / gross loss)
- Average candles to breakout
- Maximum drawdown
- Risk-reward ratio

## Deployment

### Local Deployment

```bash
cd /path/to/BreakoutScanner
./deploy-local.sh
```

### Cloud Deployment (Vercel)

```bash
cd /path/to/BreakoutScanner
./deploy-cloud.sh
```

### Production Deployment

```bash
cd /path/to/BreakoutScanner
./deploy-production.sh
```

## Authentication

The system uses Supabase authentication with email/password login:

- Demo credentials:
  - Email: demo@breakoutscanner.com
  - Password: Demo123!

## API Reference

### Polygon API

The system uses the following Polygon API endpoints:

- `/v2/last/trade/{stocksTicker}`: Get current price
- `/v2/aggs/ticker/{stocksTicker}/range/{multiplier}/{timespan}/{from}/{to}`: Get historical data
- WebSocket: `wss://socket.polygon.io/stocks`

### Supabase Tables

- `market_data_cache`: Stores candle data
- `market_data_metadata`: Stores metadata for cached data
- `detected_patterns`: Stores detected patterns
- `backtest_results`: Stores backtesting results

## Troubleshooting

### Common Issues

#### Stale Data

If you see outdated prices:

1. Check the data freshness indicator
2. Verify your Polygon API subscription status
3. Clear the cache and refresh

#### Build Errors

If you encounter build errors:

1. Ensure all dependencies are installed: `npm install`
2. Check for TypeScript errors: `npm run tsc`
3. Verify environment variables are set correctly

#### Connection Issues

If WebSocket connection fails:

1. Check your internet connection
2. Verify Polygon API key is valid
3. Check for rate limiting or subscription issues

## Future Enhancements

Planned improvements:

1. Machine learning model for pattern recognition
2. Mobile app with push notifications
3. Integration with trading platforms for automated execution
4. Social sharing of trade ideas
5. Custom pattern creation tool

## Support

For issues or questions, please contact support@breakoutscanner.com
