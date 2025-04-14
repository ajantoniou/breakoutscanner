# Breakout Scanner

A sophisticated multi-timeframe pattern detection and trading scanner with accurate real-time data from Yahoo Finance.

## Features

- **Accurate Real-Time Data**: Integration with Yahoo Finance API for reliable market data
- **Multi-Timeframe Analysis**: Scan patterns across different timeframes (15m, 30m, 1h, 4h, 1d, 1w)
- **Pattern Detection**: Identify Bull Flags, Bear Flags, Ascending Triangles, and Descending Triangles
- **Confidence Scoring**: Advanced algorithm to rate pattern reliability from 0-100%
- **Backtesting System**: Test pattern performance against historical data
- **Real-Time Alerts**: Configurable notifications for new pattern detections

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher)
- Supabase account for database and authentication

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/breakout-scanner.git
   cd breakout-scanner
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables:
   ```
   cp .env.example .env
   ```
   Then edit the `.env` file with your Supabase credentials.

4. Set up the database:
   ```
   ./run-migrations.sh
   ```
   This will create all required tables in your Supabase project.

5. Run the application locally:
   ```
   ./deploy-local.sh
   ```

6. Access the application at http://localhost:3000

## Database Setup

The application uses Supabase for data storage. The database schema includes:

- **market_data_cache**: Stores cached market data for faster retrieval
- **market_data_metadata**: Metadata about cached market data
- **detected_patterns**: Stores detected trading patterns
- **cached_patterns**: Stores generated pattern templates
- **backtest_results**: Stores results from pattern backtests

Run the database migrations to set up all tables:
```
./run-migrations.sh
```

Verify database setup:
```
cat verify-tables.sql | supabase sql
```

## Scanner Modes

- **Day Trading**: Focuses on 15m, 30m, and 1h timeframes for intraday opportunities
- **Swing Trading**: Analyzes 4h, 1d, and 1w timeframes for multi-day positions with 5%+ profit targets
- **Golden Scanner**: Shows only the highest confidence setups with multi-timeframe confirmation

## Deployment Options

- **Local Development**: `./deploy-local.sh`
- **Cloud Deployment (Vercel)**: `./deploy-cloud.sh`
- **Production Deployment**: `./deploy-production.sh`

## Testing

Run the comprehensive test script to verify functionality with real market data:
```
./test-real-data.sh
```

## Documentation

For detailed documentation, see [DOCUMENTATION.md](DOCUMENTATION.md).
