import { createClient, SupabaseClient, PostgrestFilterBuilder } from '@supabase/supabase-js';
import { Candle } from '@/services/types/patternTypes';
import { DataMetadata } from '@/services/api/marketData/dataService';

/**
 * Optimized Supabase query service for efficient data retrieval
 */
class SupabaseQueryService {
  private supabase: SupabaseClient;
  private readonly CACHE_TABLE = 'market_data_cache';
  private readonly METADATA_TABLE = 'market_data_metadata';
  private readonly PATTERN_TABLE = 'detected_patterns';
  private readonly BACKTEST_TABLE = 'backtest_results';
  private readonly QUERY_TIMEOUT = 10000; // 10 seconds
  private readonly MAX_BATCH_SIZE = 500;
  private queryCache: Map<string, { data: any, timestamp: number }> = new Map();
  private readonly QUERY_CACHE_DURATION = 30 * 1000; // 30 seconds

  constructor() {
    // Initialize Supabase client
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase URL or key not provided. Query service will not function properly.');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Generate a cache key for a query
   * @param table Table name
   * @param filters Filter object
   * @returns Cache key string
   */
  private generateQueryCacheKey(table: string, filters: Record<string, any>): string {
    return `${table}:${JSON.stringify(filters)}`;
  }

  /**
   * Execute a query with timeout and caching
   * @param queryBuilder PostgrestFilterBuilder
   * @param cacheKey Cache key
   * @returns Promise with query result
   */
  private async executeQuery<T>(
    queryBuilder: PostgrestFilterBuilder<any, any, any[]>,
    cacheKey: string
  ): Promise<{ data: T[] | null; error: any }> {
    try {
      // Check cache first
      const cachedResult = this.queryCache.get(cacheKey);
      if (cachedResult && (Date.now() - cachedResult.timestamp) < this.QUERY_CACHE_DURATION) {
        return { data: cachedResult.data, error: null };
      }
      
      // Set up timeout
      const timeoutPromise = new Promise<{ data: null; error: any }>((resolve) => {
        setTimeout(() => {
          resolve({ data: null, error: { message: 'Query timeout' } });
        }, this.QUERY_TIMEOUT);
      });
      
      // Execute query
      const queryPromise = queryBuilder.then((result) => {
        // Cache successful result
        if (!result.error && result.data) {
          this.queryCache.set(cacheKey, {
            data: result.data,
            timestamp: Date.now()
          });
        }
        
        return result;
      });
      
      // Race between query and timeout
      return await Promise.race([queryPromise, timeoutPromise]);
    } catch (error) {
      console.error('Error executing query:', error);
      return { data: null, error };
    }
  }

  /**
   * Get market data with optimized query
   * @param symbol Stock symbol
   * @param timeframe Timeframe string
   * @returns Promise with candles and metadata
   */
  async getMarketData(
    symbol: string,
    timeframe: string
  ): Promise<{ candles: Candle[]; metadata: DataMetadata | null }> {
    try {
      const cacheKey = `${symbol.toUpperCase()}_${timeframe}`;
      
      // First, get metadata with a separate query
      const metadataFilters = { cache_key: cacheKey };
      const metadataCacheKey = this.generateQueryCacheKey(this.METADATA_TABLE, metadataFilters);
      
      const metadataQuery = this.supabase
        .from(this.METADATA_TABLE)
        .select('*')
        .eq('cache_key', cacheKey)
        .single();
      
      const metadataResult = await this.executeQuery(metadataQuery, metadataCacheKey);
      
      if (metadataResult.error || !metadataResult.data) {
        return { candles: [], metadata: null };
      }
      
      const metadata = this.convertSupabaseMetadataToDataMetadata(metadataResult.data);
      
      // Then, get candles with a separate optimized query
      const candleFilters = { cache_key: cacheKey };
      const candleCacheKey = this.generateQueryCacheKey(this.CACHE_TABLE, candleFilters);
      
      const candlesQuery = this.supabase
        .from(this.CACHE_TABLE)
        .select('timestamp, open, high, low, close, volume, ema7, ema20, ema50, ema100, ema200, rsi14, atr14')
        .eq('cache_key', cacheKey)
        .order('index', { ascending: true });
      
      const candlesResult = await this.executeQuery(candlesQuery, candleCacheKey);
      
      if (candlesResult.error || !candlesResult.data) {
        return { candles: [], metadata };
      }
      
      // Convert to Candle format
      const candles = candlesResult.data.map(row => ({
        timestamp: new Date(row.timestamp).getTime(),
        open: row.open,
        high: row.high,
        low: row.low,
        close: row.close,
        volume: row.volume,
        ema7: row.ema7 || 0,
        ema20: row.ema20 || 0,
        ema50: row.ema50 || 0,
        ema100: row.ema100 || 0,
        ema200: row.ema200 || 0,
        rsi14: row.rsi14 || 0,
        atr14: row.atr14 || 0
      }));
      
      return { candles, metadata };
    } catch (error) {
      console.error('Error in getMarketData:', error);
      return { candles: [], metadata: null };
    }
  }

  /**
   * Convert Supabase metadata format to DataMetadata
   * @param supabaseMetadata Metadata from Supabase
   * @returns DataMetadata object
   */
  private convertSupabaseMetadataToDataMetadata(supabaseMetadata: any): DataMetadata {
    return {
      fetchedAt: supabaseMetadata.fetched_at,
      isDelayed: supabaseMetadata.is_delayed,
      source: supabaseMetadata.source,
      lastUpdated: supabaseMetadata.last_updated,
      validUntil: supabaseMetadata.valid_until,
      marketStatus: supabaseMetadata.market_status,
      dataAge: supabaseMetadata.data_age,
      requestDuration: supabaseMetadata.request_duration,
      retryCount: supabaseMetadata.retry_count
    };
  }

  /**
   * Get multiple symbols' market data in a single optimized query
   * @param symbols Array of stock symbols
   * @param timeframe Timeframe string
   * @returns Promise with object mapping symbols to candle arrays and metadata
   */
  async getMultipleSymbolsData(
    symbols: string[],
    timeframe: string
  ): Promise<{ 
    data: Record<string, Candle[]>, 
    metadata: Record<string, DataMetadata | null> 
  }> {
    try {
      const result: Record<string, Candle[]> = {};
      const metadataResult: Record<string, DataMetadata | null> = {};
      
      // Generate cache keys
      const cacheKeys = symbols.map(symbol => `${symbol.toUpperCase()}_${timeframe}`);
      
      // Get all metadata in a single query
      const metadataFilters = { cache_keys: cacheKeys };
      const metadataCacheKey = this.generateQueryCacheKey(this.METADATA_TABLE, metadataFilters);
      
      const metadataQuery = this.supabase
        .from(this.METADATA_TABLE)
        .select('*')
        .in('cache_key', cacheKeys);
      
      const metadataQueryResult = await this.executeQuery(metadataQuery, metadataCacheKey);
      
      // Process metadata
      if (!metadataQueryResult.error && metadataQueryResult.data) {
        metadataQueryResult.data.forEach(row => {
          const symbol = row.symbol;
          metadataResult[symbol] = this.convertSupabaseMetadataToDataMetadata(row);
        });
      }
      
      // Get all candles in a single query
      const candleFilters = { cache_keys: cacheKeys };
      const candleCacheKey = this.generateQueryCacheKey(this.CACHE_TABLE, candleFilters);
      
      const candlesQuery = this.supabase
        .from(this.CACHE_TABLE)
        .select('cache_key, symbol, timestamp, open, high, low, close, volume, ema7, ema20, ema50, ema100, ema200, rsi14, atr14, index')
        .in('cache_key', cacheKeys)
        .order('index', { ascending: true });
      
      const candlesQueryResult = await this.executeQuery(candlesQuery, candleCacheKey);
      
      // Process candles
      if (!candlesQueryResult.error && candlesQueryResult.data) {
        // Group candles by symbol
        const groupedCandles: Record<string, any[]> = {};
        
        candlesQueryResult.data.forEach(row => {
          const symbol = row.symbol;
          
          if (!groupedCandles[symbol]) {
            groupedCandles[symbol] = [];
          }
          
          groupedCandles[symbol].push(row);
        });
        
        // Convert to Candle format
        Object.entries(groupedCandles).forEach(([symbol, rows]) => {
          // Sort by index to ensure correct order
          rows.sort((a, b) => a.index - b.index);
          
          result[symbol] = rows.map(row => ({
            timestamp: new Date(row.timestamp).getTime(),
            open: row.open,
            high: row.high,
            low: row.low,
            close: row.close,
            volume: row.volume,
            ema7: row.ema7 || 0,
            ema20: row.ema20 || 0,
            ema50: row.ema50 || 0,
            ema100: row.ema100 || 0,
            ema200: row.ema200 || 0,
            rsi14: row.rsi14 || 0,
            atr14: row.atr14 || 0
          }));
        });
      }
      
      // Fill in missing symbols
      symbols.forEach(symbol => {
        if (!result[symbol]) {
          result[symbol] = [];
        }
        
        if (!metadataResult[symbol]) {
          metadataResult[symbol] = null;
        }
      });
      
      return { data: result, metadata: metadataResult };
    } catch (error) {
      console.error('Error in getMultipleSymbolsData:', error);
      
      // Return empty results
      const emptyResult: Record<string, Candle[]> = {};
      const emptyMetadata: Record<string, DataMetadata | null> = {};
      
      symbols.forEach(symbol => {
        emptyResult[symbol] = [];
        emptyMetadata[symbol] = null;
      });
      
      return { data: emptyResult, metadata: emptyMetadata };
    }
  }

  /**
   * Get detected patterns with optimized query
   * @param filters Filter object
   * @param limit Maximum number of results
   * @param offset Offset for pagination
   * @returns Promise with detected patterns
   */
  async getDetectedPatterns(
    filters: Record<string, any> = {},
    limit: number = 50,
    offset: number = 0
  ): Promise<{ patterns: any[]; total: number }> {
    try {
      const cacheKey = this.generateQueryCacheKey(this.PATTERN_TABLE, { ...filters, limit, offset });
      
      // Build query
      let query = this.supabase
        .from(this.PATTERN_TABLE)
        .select('*', { count: 'exact' })
        .order('detected_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      // Apply filters
      if (filters.symbol) {
        query = query.eq('symbol', filters.symbol);
      }
      
      if (filters.pattern_type) {
        query = query.eq('pattern_type', filters.pattern_type);
      }
      
      if (filters.timeframe) {
        query = query.eq('timeframe', filters.timeframe);
      }
      
      if (filters.direction) {
        query = query.eq('direction', filters.direction);
      }
      
      if (filters.min_confidence) {
        query = query.gte('confidence', filters.min_confidence);
      }
      
      if (filters.from_date) {
        query = query.gte('detected_at', filters.from_date);
      }
      
      if (filters.to_date) {
        query = query.lte('detected_at', filters.to_date);
      }
      
      // Execute query
      const result = await this.executeQuery(query, cacheKey);
      
      if (result.error) {
        console.error('Error fetching patterns:', result.error);
        return { patterns: [], total: 0 };
      }
      
      return { 
        patterns: result.data || [], 
        total: result.count || 0 
      };
    } catch (error) {
      console.error('Error in getDetectedPatterns:', error);
      return { patterns: [], total: 0 };
    }
  }

  /**
   * Get backtest results with optimized query
   * @param filters Filter object
   * @param limit Maximum number of results
   * @param offset Offset for pagination
   * @returns Promise with backtest results
   */
  async getBacktestResults(
    filters: Record<string, any> = {},
    limit: number = 50,
    offset: number = 0
  ): Promise<{ results: any[]; total: number }> {
    try {
      const cacheKey = this.generateQueryCacheKey(this.BACKTEST_TABLE, { ...filters, limit, offset });
      
      // Build query
      let query = this.supabase
        .from(this.BACKTEST_TABLE)
        .select('*', { count: 'exact' })
        .order('run_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      // Apply filters
      if (filters.pattern_type) {
        query = query.eq('pattern_type', filters.pattern_type);
      }
      
      if (filters.timeframe) {
        query = query.eq('timeframe', filters.timeframe);
      }
      
      if (filters.min_win_rate) {
        query = query.gte('win_rate', filters.min_win_rate);
      }
      
      if (filters.from_date) {
        query = query.gte('run_at', filters.from_date);
      }
      
      if (filters.to_date) {
        query = query.lte('run_at', filters.to_date);
      }
      
      // Execute query
      const result = await this.executeQuery(query, cacheKey);
      
      if (result.error) {
        console.error('Error fetching backtest results:', result.error);
        return { results: [], total: 0 };
      }
      
      return { 
        results: result.data || [], 
        total: result.count || 0 
      };
    } catch (error) {
      console.error('Error in getBacktestResults:', error);
      return { results: [], total: 0 };
    }
  }

  /**
   * Clear query cache
   */
  clearQueryCache(): void {
    this.queryCache.clear();
  }

  /**
   * Get database statistics
   * @returns Promise with database statistics
   */
  async getDatabaseStats(): Promise<{
    cacheEntries: number;
    patternEntries: number;
    backtestEntries: number;
    databaseSize: string;
    lastUpdated: string;
  }> {
    try {
      // Get count of cache entries
      const cacheCountQuery = this.supabase
        .from(this.CACHE_TABLE)
        .select('*', { count: 'exact', head: true });
      
      const cacheCountResult = await this.executeQuery(cacheCountQuery, 'cache_count');
      
      // Get count of pattern entries
      const patternCountQuery = this.supabase
        .from(this.PATTERN_TABLE)
        .select('*', { count: 'exact', head: true });
      
      const patternCountResult = await this.executeQuery(patternCountQuery, 'pattern_count');
      
      // Get count of backtest entries
      const backtestCountQuery = this.supabase
        .from(this.BACKTEST_TABLE)
        .select('*', { count: 'exact', head: true });
      
      const backtestCountResult = await this.executeQuery(backtestCountQuery, 'backtest_count');
      
      // Get latest update time
      const latestUpdateQuery = this.supabase
        .from(this.METADATA_TABLE)
        .select('last_updated')
        .order('last_updated', { ascending: false })
        .limit(1);
      
      const latestUpdateResult = await this.executeQuery(latestUpdateQuery, 'latest_update');
      
      // Calculate approximate database size (this is just an estimate)
      const cacheCount = cacheCountResult.count || 0;
      const patternCount = patternCountResult.count || 0;
      const backtestCount = backtestCountResult.count || 0;
      
      // Rough estimate: 1KB per cache entry, 2KB per pattern, 5KB per backtest
      const totalSizeKB = cacheCount * 1 + patternCount * 2 + backtestCount * 5;
      let databaseSize = '';
      
      if (totalSizeKB < 1024) {
        databaseSize = `${totalSizeKB} KB`;
      } else if (totalSizeKB < 1024 * 1024) {
        databaseSize = `${(totalSizeKB / 1024).toFixed(2)} MB`;
      } else {
        databaseSize = `${(totalSizeKB / (1024 * 1024)).toFixed(2)} GB`;
      }
      
      const lastUpdated = latestUpdateResult.data && latestUpdateResult.data.length > 0
        ? latestUpdateResult.data[0].last_updated
        : new Date().toISOString();
      
      return {
        cacheEntries: cacheCount,
        patternEntries: patternCount,
        backtestEntries: backtestCount,
        databaseSize,
        lastUpdated
      };
    } catch (error) {
      console.error('Error in getDatabaseStats:', error);
      return {
        cacheEntries: 0,
        patternEntries: 0,
        backtestEntries: 0,
        databaseSize: 'Unknown',
        lastUpdated: new Date().toISOString()
      };
    }
  }

  /**
   * Optimize database by cleaning up old data
   * @param maxAgeHours Maximum age in hours for data to keep
   * @returns Promise with optimization result
   */
  async optimizeDatabase(maxAgeHours: number = 24): Promise<{
    success: boolean;
    message: string;
    deletedEntries: {
      cache: number;
      metadata: number;
      patterns: number;
    };
  }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - maxAgeHours);
      const cutoffString = cutoffDate.toISOString();
      
      // Delete old cache entries
      const cacheDeleteQuery = this.supabase
        .from(this.CACHE_TABLE)
        .delete()
        .lt('created_at', cutoffString);
      
      const cacheDeleteResult = await this.executeQuery(cacheDeleteQuery, 'cache_delete');
      
      // Delete old metadata entries
      const metadataDeleteQuery = this.supabase
        .from(this.METADATA_TABLE)
        .delete()
        .lt('created_at', cutoffString);
      
      const metadataDeleteResult = await this.executeQuery(metadataDeleteQuery, 'metadata_delete');
      
      // Delete old pattern entries (keep patterns longer)
      const olderCutoffDate = new Date();
      olderCutoffDate.setHours(olderCutoffDate.getHours() - maxAgeHours * 3);
      const olderCutoffString = olderCutoffDate.toISOString();
      
      const patternDeleteQuery = this.supabase
        .from(this.PATTERN_TABLE)
        .delete()
        .lt('detected_at', olderCutoffString);
      
      const patternDeleteResult = await this.executeQuery(patternDeleteQuery, 'pattern_delete');
      
      // Clear query cache
      this.clearQueryCache();
      
      return {
        success: true,
        message: `Successfully optimized database, removed data older than ${maxAgeHours} hours`,
        deletedEntries: {
          cache: cacheDeleteResult.data?.length || 0,
          metadata: metadataDeleteResult.data?.length || 0,
          patterns: patternDeleteResult.data?.length || 0
        }
      };
    } catch (error: any) {
      console.error('Error in optimizeDatabase:', error);
      return {
        success: false,
        message: error.message || 'Unknown error optimizing database',
        deletedEntries: {
          cache: 0,
          metadata: 0,
          patterns: 0
        }
      };
    }
  }
}

export default SupabaseQueryService;
