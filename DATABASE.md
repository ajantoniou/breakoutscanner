# Database Structure

This document outlines the database schema for the Breakout Scanner application.

## Tables

### market_data_cache

Stores market data (OHLCV) and technical indicators for specific symbols and timeframes.

| Column | Type | Description |
|--------|------|-------------|
| id | BIGINT | Primary key |
| cache_key | TEXT | Unique identifier for the cache entry (format: SYMBOL_TIMEFRAME) |
| symbol | TEXT | Stock symbol (e.g., AAPL, MSFT) |
| timestamp | TIMESTAMP WITH TIME ZONE | Timestamp of the candle |
| open | DECIMAL(12,4) | Opening price |
| high | DECIMAL(12,4) | Highest price |
| low | DECIMAL(12,4) | Lowest price |
| close | DECIMAL(12,4) | Closing price |
| volume | BIGINT | Trading volume |
| index | INTEGER | Index of the candle in the dataset |
| ema7 | DECIMAL(12,4) | 7-period Exponential Moving Average |
| ema20 | DECIMAL(12,4) | 20-period Exponential Moving Average |
| ema50 | DECIMAL(12,4) | 50-period Exponential Moving Average |
| ema100 | DECIMAL(12,4) | 100-period Exponential Moving Average |
| ema200 | DECIMAL(12,4) | 200-period Exponential Moving Average |
| rsi14 | DECIMAL(12,4) | 14-period Relative Strength Index |
| atr14 | DECIMAL(12,4) | 14-period Average True Range |
| created_at | TIMESTAMP WITH TIME ZONE | Record creation timestamp |

### market_data_metadata

Stores metadata about cached market data.

| Column | Type | Description |
|--------|------|-------------|
| id | BIGINT | Primary key |
| cache_key | TEXT | Unique identifier for the cache entry (format: SYMBOL_TIMEFRAME) |
| symbol | TEXT | Stock symbol (e.g., AAPL, MSFT) |
| timeframe | TEXT | Timeframe (e.g., 15m, 1h, 1d) |
| source | TEXT | Data source (e.g., polygon, yahoo) |
| fetched_at | TIMESTAMP WITH TIME ZONE | When the data was fetched |
| is_delayed | BOOLEAN | Whether the data is delayed |
| request_duration | INTEGER | Duration of the API request in milliseconds |
| retry_count | INTEGER | Number of retries required |
| created_at | TIMESTAMP WITH TIME ZONE | Record creation timestamp |

### detected_patterns

Stores detected trading patterns.

| Column | Type | Description |
|--------|------|-------------|
| id | BIGINT | Primary key |
| symbol | TEXT | Stock symbol (e.g., AAPL, MSFT) |
| pattern_type | TEXT | Type of pattern (e.g., Bull Flag, Ascending Triangle) |
| timeframe | TEXT | Timeframe (e.g., 15m, 1h, 1d) |
| confidence_score | INTEGER | Confidence score (0-100) |
| multi_timeframe_confirmation | BOOLEAN | Whether pattern is confirmed across multiple timeframes |
| entry_price | DECIMAL(12,4) | Suggested entry price |
| target_price | DECIMAL(12,4) | Suggested target price |
| stop_loss | DECIMAL(12,4) | Suggested stop loss price |
| risk_reward_ratio | DECIMAL(8,2) | Risk/reward ratio |
| detected_at | TIMESTAMP WITH TIME ZONE | When the pattern was detected |
| pattern_data | JSONB | Additional pattern data in JSON format |
| created_at | TIMESTAMP WITH TIME ZONE | Record creation timestamp |

### cached_patterns

Stores generated pattern templates.

| Column | Type | Description |
|--------|------|-------------|
| id | BIGINT | Primary key |
| symbol | TEXT | Stock symbol (e.g., AAPL, MSFT) |
| timeframe | TEXT | Timeframe (e.g., 15m, 1h, 1d) |
| pattern_type | TEXT | Type of pattern (e.g., Bull Flag, Ascending Triangle) |
| entry_price | DECIMAL(12,4) | Suggested entry price |
| target_price | DECIMAL(12,4) | Suggested target price |
| confidence_score | DECIMAL(8,2) | Confidence score (0-100) |
| status | TEXT | Pattern status (active, completed, failed) |
| created_at | TIMESTAMP WITH TIME ZONE | Record creation timestamp |
| updated_at | TIMESTAMP WITH TIME ZONE | Record update timestamp |
| channel_type | TEXT | Channel type (horizontal, ascending, descending) |
| ema_pattern | TEXT | EMA pattern type |
| support_level | DECIMAL(12,4) | Support price level |
| resistance_level | DECIMAL(12,4) | Resistance price level |
| trendline_break | BOOLEAN | Whether a trendline break occurred |
| volume_confirmation | BOOLEAN | Whether volume confirms the pattern |
| intra_channel_pattern | TEXT | Pattern within the channel |
| stop_loss | DECIMAL(12,4) | Suggested stop loss price |
| risk_reward_ratio | DECIMAL(8,2) | Risk/reward ratio |

### backtest_results

Stores backtest results for patterns.

| Column | Type | Description |
|--------|------|-------------|
| id | BIGINT | Primary key |
| pattern_id | BIGINT | Foreign key to detected_patterns table |
| symbol | TEXT | Stock symbol (e.g., AAPL, MSFT) |
| pattern_type | TEXT | Type of pattern (e.g., Bull Flag, Ascending Triangle) |
| timeframe | TEXT | Timeframe (e.g., 15m, 1h, 1d) |
| success | BOOLEAN | Whether the backtest was successful |
| profit_loss_percent | DECIMAL(8,2) | Profit/loss percentage |
| days_to_breakout | INTEGER | Number of days until breakout |
| days_to_target | INTEGER | Number of days until target reached |
| max_drawdown | DECIMAL(8,2) | Maximum drawdown percentage |
| created_at | TIMESTAMP WITH TIME ZONE | Record creation timestamp |

## Row Level Security (RLS)

All tables have Row Level Security (RLS) enabled with the following policies:

- **Authenticated Users**: Can read from all tables
- **Anonymous Users**: Can only read from the `detected_patterns` and `cached_patterns` tables

## Migrations

Database migrations are stored in the `supabase/migrations` directory:

1. `20240724_create_market_data_tables.sql`: Creates the initial tables
2. `20240725_add_missing_columns.sql`: Adds missing columns to the backtest_results table
3. `20240726_create_missing_tables.sql`: Creates additional tables

To run migrations, use the `run-migrations.sh` script:

```bash
./run-migrations.sh
```

## Data Seeding

To seed the database with initial data, use the `seed-db.sh` script:

```bash
./seed-db.sh [count]
```

This will call the `seed-patterns` Supabase Edge Function to generate `count` pattern entries with realistic market data (default: 20). 