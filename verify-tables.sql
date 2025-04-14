-- Verify tables exist
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public'
AND table_name IN (
  'market_data_cache',
  'market_data_metadata',
  'detected_patterns',
  'backtest_results',
  'cached_patterns'
)
ORDER BY table_name, ordinal_position;

-- Count rows in each table
SELECT 'market_data_cache' as table_name, COUNT(*) as row_count FROM market_data_cache
UNION ALL
SELECT 'market_data_metadata' as table_name, COUNT(*) as row_count FROM market_data_metadata
UNION ALL
SELECT 'detected_patterns' as table_name, COUNT(*) as row_count FROM detected_patterns
UNION ALL
SELECT 'backtest_results' as table_name, COUNT(*) as row_count FROM backtest_results
UNION ALL
SELECT 'cached_patterns' as table_name, COUNT(*) as row_count FROM cached_patterns
ORDER BY table_name; 