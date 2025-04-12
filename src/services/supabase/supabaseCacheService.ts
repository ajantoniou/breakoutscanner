import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Candle } from '@/services/types/patternTypes';
import { DataMetadata } from '@/services/api/marketData/dataService';

/**
 * Supabase cache service for efficient data storage and retrieval
 * with proper timestamp tracking
 */
class SupabaseCacheService {
  private supabase: SupabaseClient;
  private readonly CACHE_TABLE = 'market_data_cache';
  private readonly METADATA_TABLE = 'market_data_metadata';
  private readonly MAX_BATCH_SIZE = 500; // Maximum number of records to insert at once

  constructor() {
    // Initialize Supabase client
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase URL or key not provided. Cache service will not function properly.');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Generate a unique cache key for a symbol and timeframe
   * @param symbol Stock symbol
   * @param timeframe Timeframe string
   * @returns Unique cache key
   */
  private generateCacheKey(symbol: string, timeframe: string): string {
    return `${symbol.toUpperCase()}_${timeframe}`;
  }

  /**
   * Store candle data in Supabase cache
   * @param symbol Stock symbol
   * @param timeframe Timeframe string
   * @param candles Array of candles
   * @param metadata Data metadata
   * @returns Promise with storage result
   */
  async storeCandles(
    symbol: string,
    timeframe: string,
    candles: Candle[],
    metadata: DataMetadata
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (!candles || candles.length === 0) {
        return { success: false, message: 'No candles to store' };
      }

      const cacheKey = this.generateCacheKey(symbol, timeframe);
      
      // First, delete existing data for this symbol and timeframe
      await this.clearCache(symbol, timeframe);
      
      // Prepare candle data for storage
      const candleData = candles.map((candle, index) => ({
        cache_key: cacheKey,
        symbol: symbol.toUpperCase(),
        timeframe,
        index,
        timestamp: new Date(candle.timestamp).toISOString(),
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
        ema7: candle.ema7 || null,
        ema20: candle.ema20 || null,
        ema50: candle.ema50 || null,
        ema100: candle.ema100 || null,
        ema200: candle.ema200 || null,
        rsi14: candle.rsi14 || null,
        atr14: candle.atr14 || null,
        created_at: new Date().toISOString()
      }));
      
      // Store metadata
      const metadataResult = await this.supabase
        .from(this.METADATA_TABLE)
        .insert({
          cache_key: cacheKey,
          symbol: symbol.toUpperCase(),
          timeframe,
          fetched_at: metadata.fetchedAt,
          is_delayed: metadata.isDelayed,
          source: metadata.source,
          last_updated: metadata.lastUpdated || new Date().toISOString(),
          valid_until: metadata.validUntil,
          market_status: metadata.marketStatus,
          data_age: metadata.dataAge,
          request_duration: metadata.requestDuration,
          retry_count: metadata.retryCount || 0,
          candle_count: candles.length,
          created_at: new Date().toISOString()
        });
      
      if (metadataResult.error) {
        console.error('Error storing metadata:', metadataResult.error);
        return { success: false, message: `Metadata storage failed: ${metadataResult.error.message}` };
      }
      
      // Store candles in batches to avoid hitting size limits
      for (let i = 0; i < candleData.length; i += this.MAX_BATCH_SIZE) {
        const batch = candleData.slice(i, i + this.MAX_BATCH_SIZE);
        
        const result = await this.supabase
          .from(this.CACHE_TABLE)
          .insert(batch);
        
        if (result.error) {
          console.error(`Error storing batch ${i / this.MAX_BATCH_SIZE + 1}:`, result.error);
          return { success: false, message: `Batch storage failed: ${result.error.message}` };
        }
      }
      
      return { 
        success: true, 
        message: `Successfully stored ${candles.length} candles for ${symbol} (${timeframe})` 
      };
    } catch (error: any) {
      console.error('Error in storeCandles:', error);
      return { success: false, message: error.message || 'Unknown error storing candles' };
    }
  }

  /**
   * Retrieve candle data from Supabase cache
   * @param symbol Stock symbol
   * @param timeframe Timeframe string
   * @returns Promise with candles and metadata
   */
  async retrieveCandles(
    symbol: string,
    timeframe: string
  ): Promise<{ candles: Candle[]; metadata: DataMetadata | null; isCacheValid: boolean }> {
    try {
      const cacheKey = this.generateCacheKey(symbol, timeframe);
      
      // First, get metadata to check if cache is valid
      const metadataResult = await this.supabase
        .from(this.METADATA_TABLE)
        .select('*')
        .eq('cache_key', cacheKey)
        .single();
      
      if (metadataResult.error || !metadataResult.data) {
        return { candles: [], metadata: null, isCacheValid: false };
      }
      
      const metadata = this.convertSupabaseMetadataToDataMetadata(metadataResult.data);
      
      // Check if cache is still valid
      const isCacheValid = this.isCacheValid(metadata);
      
      if (!isCacheValid) {
        return { candles: [], metadata, isCacheValid: false };
      }
      
      // Get candles
      const candlesResult = await this.supabase
        .from(this.CACHE_TABLE)
        .select('*')
        .eq('cache_key', cacheKey)
        .order('index', { ascending: true });
      
      if (candlesResult.error || !candlesResult.data) {
        return { candles: [], metadata, isCacheValid: false };
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
      
      return { candles, metadata, isCacheValid: true };
    } catch (error: any) {
      console.error('Error in retrieveCandles:', error);
      return { candles: [], metadata: null, isCacheValid: false };
    }
  }

  /**
   * Check if cached data is still valid
   * @param metadata Data metadata
   * @returns Boolean indicating if cache is valid
   */
  private isCacheValid(metadata: DataMetadata): boolean {
    if (!metadata) return false;
    
    // If validUntil is set, use it as the primary validity check
    if (metadata.validUntil) {
      return new Date() < new Date(metadata.validUntil);
    }
    
    // Fallback to checking if data is not too old
    const fetchedAt = new Date(metadata.fetchedAt).getTime();
    const currentTime = Date.now();
    const dataAge = currentTime - fetchedAt;
    
    // Default cache validity is 5 minutes
    const DEFAULT_CACHE_DURATION = 5 * 60 * 1000;
    
    return dataAge <= DEFAULT_CACHE_DURATION;
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
   * Store current price in Supabase cache
   * @param symbol Stock symbol
   * @param price Current price
   * @param metadata Data metadata
   * @returns Promise with storage result
   */
  async storeCurrentPrice(
    symbol: string,
    price: number,
    metadata: DataMetadata
  ): Promise<{ success: boolean; message: string }> {
    try {
      const cacheKey = this.generateCacheKey(symbol, 'current');
      
      // First, delete existing data for this symbol
      await this.clearCache(symbol, 'current');
      
      // Store metadata and price
      const result = await this.supabase
        .from(this.METADATA_TABLE)
        .insert({
          cache_key: cacheKey,
          symbol: symbol.toUpperCase(),
          timeframe: 'current',
          fetched_at: metadata.fetchedAt,
          is_delayed: metadata.isDelayed,
          source: metadata.source,
          last_updated: metadata.lastUpdated || new Date().toISOString(),
          valid_until: metadata.validUntil,
          market_status: metadata.marketStatus,
          data_age: metadata.dataAge,
          request_duration: metadata.requestDuration,
          retry_count: metadata.retryCount || 0,
          current_price: price,
          created_at: new Date().toISOString()
        });
      
      if (result.error) {
        console.error('Error storing current price:', result.error);
        return { success: false, message: `Price storage failed: ${result.error.message}` };
      }
      
      return { 
        success: true, 
        message: `Successfully stored current price for ${symbol}` 
      };
    } catch (error: any) {
      console.error('Error in storeCurrentPrice:', error);
      return { success: false, message: error.message || 'Unknown error storing price' };
    }
  }

  /**
   * Retrieve current price from Supabase cache
   * @param symbol Stock symbol
   * @returns Promise with price and metadata
   */
  async retrieveCurrentPrice(
    symbol: string
  ): Promise<{ price: number; metadata: DataMetadata | null; isCacheValid: boolean }> {
    try {
      const cacheKey = this.generateCacheKey(symbol, 'current');
      
      // Get metadata and price
      const result = await this.supabase
        .from(this.METADATA_TABLE)
        .select('*')
        .eq('cache_key', cacheKey)
        .single();
      
      if (result.error || !result.data) {
        return { price: 0, metadata: null, isCacheValid: false };
      }
      
      const metadata = this.convertSupabaseMetadataToDataMetadata(result.data);
      
      // Check if cache is still valid
      const isCacheValid = this.isCacheValid(metadata);
      
      return { 
        price: result.data.current_price || 0, 
        metadata, 
        isCacheValid 
      };
    } catch (error: any) {
      console.error('Error in retrieveCurrentPrice:', error);
      return { price: 0, metadata: null, isCacheValid: false };
    }
  }

  /**
   * Clear cache for a specific symbol and timeframe
   * @param symbol Stock symbol
   * @param timeframe Timeframe string
   * @returns Promise with clear result
   */
  async clearCache(
    symbol: string,
    timeframe: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const cacheKey = this.generateCacheKey(symbol, timeframe);
      
      // Delete metadata
      const metadataResult = await this.supabase
        .from(this.METADATA_TABLE)
        .delete()
        .eq('cache_key', cacheKey);
      
      if (metadataResult.error) {
        console.error('Error clearing metadata:', metadataResult.error);
      }
      
      // Delete candles
      const candlesResult = await this.supabase
        .from(this.CACHE_TABLE)
        .delete()
        .eq('cache_key', cacheKey);
      
      if (candlesResult.error) {
        console.error('Error clearing candles:', candlesResult.error);
        return { success: false, message: `Cache clear failed: ${candlesResult.error.message}` };
      }
      
      return { 
        success: true, 
        message: `Successfully cleared cache for ${symbol} (${timeframe})` 
      };
    } catch (error: any) {
      console.error('Error in clearCache:', error);
      return { success: false, message: error.message || 'Unknown error clearing cache' };
    }
  }

  /**
   * Clear all cache data older than a specified age
   * @param maxAgeHours Maximum age in hours
   * @returns Promise with clear result
   */
  async clearOldCache(
    maxAgeHours: number = 24
  ): Promise<{ success: boolean; message: string }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - maxAgeHours);
      
      // Get old cache keys from metadata
      const oldMetadataResult = await this.supabase
        .from(this.METADATA_TABLE)
        .select('cache_key')
        .lt('created_at', cutoffDate.toISOString());
      
      if (oldMetadataResult.error) {
        console.error('Error finding old metadata:', oldMetadataResult.error);
        return { success: false, message: `Old cache lookup failed: ${oldMetadataResult.error.message}` };
      }
      
      if (!oldMetadataResult.data || oldMetadataResult.data.length === 0) {
        return { success: true, message: 'No old cache to clear' };
      }
      
      const cacheKeys = oldMetadataResult.data.map(row => row.cache_key);
      
      // Delete old candles in batches
      for (let i = 0; i < cacheKeys.length; i += this.MAX_BATCH_SIZE) {
        const batchKeys = cacheKeys.slice(i, i + this.MAX_BATCH_SIZE);
        
        const candlesResult = await this.supabase
          .from(this.CACHE_TABLE)
          .delete()
          .in('cache_key', batchKeys);
        
        if (candlesResult.error) {
          console.error(`Error clearing candles batch ${i / this.MAX_BATCH_SIZE + 1}:`, candlesResult.error);
        }
      }
      
      // Delete old metadata in batches
      for (let i = 0; i < cacheKeys.length; i += this.MAX_BATCH_SIZE) {
        const batchKeys = cacheKeys.slice(i, i + this.MAX_BATCH_SIZE);
        
        const metadataResult = await this.supabase
          .from(this.METADATA_TABLE)
          .delete()
          .in('cache_key', batchKeys);
        
        if (metadataResult.error) {
          console.error(`Error clearing metadata batch ${i / this.MAX_BATCH_SIZE + 1}:`, metadataResult.error);
        }
      }
      
      return { 
        success: true, 
        message: `Successfully cleared ${cacheKeys.length} old cache entries` 
      };
    } catch (error: any) {
      console.error('Error in clearOldCache:', error);
      return { success: false, message: error.message || 'Unknown error clearing old cache' };
    }
  }

  /**
   * Get cache statistics
   * @returns Promise with cache statistics
   */
  async getCacheStats(): Promise<{
    totalEntries: number;
    symbolCount: number;
    timeframeBreakdown: Record<string, number>;
    averageAge: number;
    oldestEntry: string;
    newestEntry: string;
  }> {
    try {
      // Get count of all metadata entries
      const countResult = await this.supabase
        .from(this.METADATA_TABLE)
        .select('*', { count: 'exact', head: true });
      
      const totalEntries = countResult.count || 0;
      
      // Get unique symbols
      const symbolsResult = await this.supabase
        .from(this.METADATA_TABLE)
        .select('symbol')
        .is('symbol', 'not.null');
      
      const symbols = symbolsResult.data 
        ? [...new Set(symbolsResult.data.map(row => row.symbol))]
        : [];
      
      // Get timeframe breakdown
      const timeframesResult = await this.supabase
        .from(this.METADATA_TABLE)
        .select('timeframe, count')
        .is('timeframe', 'not.null')
        .group('timeframe');
      
      const timeframeBreakdown: Record<string, number> = {};
      if (timeframesResult.data) {
        timeframesResult.data.forEach(row => {
          timeframeBreakdown[row.timeframe] = row.count;
        });
      }
      
      // Get oldest and newest entries
      const oldestResult = await this.supabase
        .from(this.METADATA_TABLE)
        .select('created_at')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();
      
      const newestResult = await this.supabase
        .from(this.METADATA_TABLE)
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      // Calculate average age
      const now = new Date();
      let totalAge = 0;
      let entryCount = 0;
      
      if (totalEntries > 0) {
        const agesResult = await this.supabase
          .from(this.METADATA_TABLE)
          .select('created_at');
        
        if (agesResult.data) {
          agesResult.data.forEach(row => {
            const age = now.getTime() - new Date(row.created_at).getTime();
            totalAge += age;
            entryCount++;
          });
        }
      }
      
      const averageAge = entryCount > 0 ? totalAge / entryCount : 0;
      
      return {
        totalEntries,
        symbolCount: symbols.length,
        timeframeBreakdown,
        averageAge,
        oldestEntry: oldestResult.data?.created_at || 'N/A',
        newestEntry: newestResult.data?.created_at || 'N/A'
      };
    } catch (error: any) {
      console.error('Error in getCacheStats:', error);
      return {
        totalEntries: 0,
        symbolCount: 0,
        timeframeBreakdown: {},
        averageAge: 0,
        oldestEntry: 'Error',
        newestEntry: 'Error'
      };
    }
  }
}

export default SupabaseCacheService;
