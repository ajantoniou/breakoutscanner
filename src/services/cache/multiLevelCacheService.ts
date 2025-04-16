import { PatternData } from "../types/patternTypes";
import { BacktestResult } from "../types/backtestTypes";
import { DataMetadata } from "../api/marketData/dataService";
import { Candle } from "../types/patternTypes";
import * as localCache from "./cacheService";
import { supabase } from "@/integrations/supabase/client";
import { getCachedPatterns, savePatterns } from "../supabase/patternCacheService";

// Cache invalidation settings
const CACHE_TTL = {
  MEMORY: 5 * 60 * 1000, // 5 minutes in milliseconds
  LOCAL_STORAGE: 30 * 60 * 1000, // 30 minutes in milliseconds
  SUPABASE: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
};

// Memory cache storage
interface MemoryCacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class MemoryCache {
  private static instance: MemoryCache;
  private cache: Map<string, MemoryCacheItem<any>> = new Map();
  
  // Private constructor for singleton pattern
  private constructor() {}
  
  // Get singleton instance
  public static getInstance(): MemoryCache {
    if (!MemoryCache.instance) {
      MemoryCache.instance = new MemoryCache();
    }
    return MemoryCache.instance;
  }
  
  // Set item in memory cache
  public set<T>(key: string, data: T, ttl: number = CACHE_TTL.MEMORY): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl,
    });
  }
  
  // Get item from memory cache
  public get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    // Check if item is expired
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data as T;
  }
  
  // Delete item from memory cache
  public delete(key: string): void {
    this.cache.delete(key);
  }
  
  // Clear entire memory cache
  public clear(): void {
    this.cache.clear();
  }
  
  // Clear expired items from memory cache
  public clearExpired(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
  
  // Get cache stats
  public getStats(): { size: number; oldestItem: number; newestItem: number } {
    let oldestTimestamp = Date.now();
    let newestTimestamp = 0;
    
    for (const item of this.cache.values()) {
      oldestTimestamp = Math.min(oldestTimestamp, item.timestamp);
      newestTimestamp = Math.max(newestTimestamp, item.timestamp);
    }
    
    return {
      size: this.cache.size,
      oldestItem: oldestTimestamp,
      newestItem: newestTimestamp,
    };
  }
}

/**
 * Multi-level cache service that orchestrates memory, localStorage, and Supabase caching
 */
export class MultiLevelCacheService {
  private static instance: MultiLevelCacheService;
  private memoryCache: MemoryCache;
  private supabaseCache: any; // Using any type temporarily until we import correctly
  private cacheHits: { memory: number; localStorage: number; supabase: number } = { memory: 0, localStorage: 0, supabase: 0 };
  private cacheMisses: { memory: number; localStorage: number; supabase: number } = { memory: 0, localStorage: 0, supabase: 0 };
  private cacheUpdates: { memory: number; localStorage: number; supabase: number } = { memory: 0, localStorage: 0, supabase: 0 };
  
  // Private constructor for singleton pattern
  private constructor() {
    this.memoryCache = MemoryCache.getInstance();
    
    // Dynamically import the SupabaseCacheService
    import("../supabase/supabaseCacheService").then(module => {
      const SupabaseCacheService = module.default;
      this.supabaseCache = new SupabaseCacheService();
    }).catch(error => {
      console.error("Failed to initialize SupabaseCacheService:", error);
    });
    
    // Set up periodic cache cleanup
    setInterval(() => this.memoryCache.clearExpired(), 60000); // Clear expired memory cache items every minute
  }
  
  // Get singleton instance
  public static getInstance(): MultiLevelCacheService {
    if (!MultiLevelCacheService.instance) {
      MultiLevelCacheService.instance = new MultiLevelCacheService();
    }
    return MultiLevelCacheService.instance;
  }
  
  // Generate cache key
  private generateCacheKey(prefix: string, identifier: string): string {
    return `${prefix}_${identifier}`;
  }
  
  /**
   * Get patterns from cache using multi-level approach
   * @param timeframe Timeframe to get patterns for
   * @returns Cached patterns or null if not found
   */
  public async getPatterns(timeframe: string): Promise<PatternData[] | null> {
    const cacheKey = this.generateCacheKey('patterns', timeframe);
    
    // Try memory cache first (fastest)
    const memoryPatterns = this.memoryCache.get<PatternData[]>(cacheKey);
    if (memoryPatterns) {
      this.cacheHits.memory++;
      console.log(`Memory cache hit for patterns (${timeframe})`);
      return memoryPatterns;
    }
    this.cacheMisses.memory++;
    
    // Try localStorage next
    const localStoragePatterns = await localCache.fetchCachedPatterns(timeframe);
    if (localStoragePatterns) {
      this.cacheHits.localStorage++;
      console.log(`LocalStorage cache hit for patterns (${timeframe})`);
      
      // Update memory cache for future requests
      this.memoryCache.set(cacheKey, localStoragePatterns);
      this.cacheUpdates.memory++;
      
      return localStoragePatterns;
    }
    this.cacheMisses.localStorage++;
    
    // Finally, try Supabase cache
    const supabasePatterns = await getCachedPatterns(timeframe);
    if (supabasePatterns) {
      this.cacheHits.supabase++;
      console.log(`Supabase cache hit for patterns (${timeframe})`);
      
      // Update memory and localStorage caches for future requests
      this.memoryCache.set(cacheKey, supabasePatterns);
      await localCache.storeCachedPatterns(timeframe, supabasePatterns);
      this.cacheUpdates.memory++;
      this.cacheUpdates.localStorage++;
      
      return supabasePatterns;
    }
    this.cacheMisses.supabase++;
    
    // No cache hit at any level
    return null;
  }
  
  /**
   * Store patterns in multi-level cache
   * @param timeframe Timeframe of patterns
   * @param patterns Patterns to store
   */
  public async storePatterns(timeframe: string, patterns: PatternData[]): Promise<void> {
    if (!patterns || patterns.length === 0) {
      return;
    }
    
    const cacheKey = this.generateCacheKey('patterns', timeframe);
    
    // Store in memory cache (fastest access)
    this.memoryCache.set(cacheKey, patterns);
    this.cacheUpdates.memory++;
    
    // Store in localStorage (persistent client-side)
    await localCache.storeCachedPatterns(timeframe, patterns);
    this.cacheUpdates.localStorage++;
    
    // Store in Supabase (server-side, available across devices)
    await savePatterns(patterns);
    this.cacheUpdates.supabase++;
    
    console.log(`Stored ${patterns.length} patterns in multi-level cache (${timeframe})`);
  }
  
  /**
   * Get candles from cache using multi-level approach
   * @param symbol Stock symbol
   * @param timeframe Timeframe of candles
   * @returns Candles, metadata, and cache validity
   */
  public async getCandles(symbol: string, timeframe: string): Promise<{ candles: Candle[]; metadata: DataMetadata | null; isCacheValid: boolean }> {
    // Check if supabaseCache is initialized
    if (!this.supabaseCache) {
      return { candles: [], metadata: null, isCacheValid: false };
    }
    
    const cacheKey = this.generateCacheKey(`candles_${symbol}`, timeframe);
    
    // Try memory cache first (fastest)
    const memoryCandleData = this.memoryCache.get<{ candles: Candle[]; metadata: DataMetadata | null; isCacheValid: boolean }>(cacheKey);
    if (memoryCandleData && memoryCandleData.isCacheValid) {
      this.cacheHits.memory++;
      console.log(`Memory cache hit for candles ${symbol} (${timeframe})`);
      return memoryCandleData;
    }
    this.cacheMisses.memory++;
    
    // Try Supabase cache (no localStorage for candles due to size)
    const supabaseCandleData = await this.supabaseCache.retrieveCandles(symbol, timeframe);
    if (supabaseCandleData.isCacheValid && supabaseCandleData.candles.length > 0) {
      this.cacheHits.supabase++;
      console.log(`Supabase cache hit for candles ${symbol} (${timeframe})`);
      
      // Update memory cache for future requests
      this.memoryCache.set(cacheKey, supabaseCandleData);
      this.cacheUpdates.memory++;
      
      return supabaseCandleData;
    }
    this.cacheMisses.supabase++;
    
    // No valid cache found
    return { candles: [], metadata: null, isCacheValid: false };
  }
  
  /**
   * Store candles in multi-level cache
   * @param symbol Stock symbol
   * @param timeframe Timeframe of candles
   * @param candles Candles to store
   * @param metadata Metadata for candles
   */
  public async storeCandles(symbol: string, timeframe: string, candles: Candle[], metadata: DataMetadata): Promise<void> {
    if (!candles || candles.length === 0 || !this.supabaseCache) {
      return;
    }
    
    const cacheKey = this.generateCacheKey(`candles_${symbol}`, timeframe);
    
    // Store in memory cache (fastest access)
    this.memoryCache.set(cacheKey, { candles, metadata, isCacheValid: true });
    this.cacheUpdates.memory++;
    
    // Store in Supabase (server-side, available across devices)
    await this.supabaseCache.storeCandles(symbol, timeframe, candles, metadata);
    this.cacheUpdates.supabase++;
    
    console.log(`Stored ${candles.length} candles for ${symbol} (${timeframe}) in multi-level cache`);
  }
  
  /**
   * Clear specific cache entry across all levels
   * @param prefix Cache prefix
   * @param identifier Cache identifier
   */
  public async clearCache(prefix: string, identifier: string): Promise<void> {
    const cacheKey = this.generateCacheKey(prefix, identifier);
    
    // Clear from memory cache
    this.memoryCache.delete(cacheKey);
    
    // Clear from localStorage if it's a pattern cache
    if (prefix === 'patterns') {
      await localCache.clearCachedPatterns(identifier);
    }
    
    // Clear from Supabase if it's a candles cache
    if (prefix === 'candles' && this.supabaseCache) {
      const [symbol, timeframe] = identifier.split('_');
      await this.supabaseCache.clearCache(symbol, timeframe);
    }
    
    console.log(`Cleared cache for ${prefix}_${identifier} across all levels`);
  }
  
  /**
   * Get cache performance stats
   */
  public getCacheStats(): {
    hits: { memory: number; localStorage: number; supabase: number };
    misses: { memory: number; localStorage: number; supabase: number };
    updates: { memory: number; localStorage: number; supabase: number };
    hitRate: number;
    memoryCacheSize: number;
  } {
    const totalHits = this.cacheHits.memory + this.cacheHits.localStorage + this.cacheHits.supabase;
    const totalRequests = totalHits + this.cacheMisses.memory + this.cacheMisses.localStorage + this.cacheMisses.supabase;
    const hitRate = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;
    
    return {
      hits: { ...this.cacheHits },
      misses: { ...this.cacheMisses },
      updates: { ...this.cacheUpdates },
      hitRate,
      memoryCacheSize: this.memoryCache.getStats().size
    };
  }
  
  /**
   * Reset cache performance counters
   */
  public resetCacheStats(): void {
    this.cacheHits = { memory: 0, localStorage: 0, supabase: 0 };
    this.cacheMisses = { memory: 0, localStorage: 0, supabase: 0 };
    this.cacheUpdates = { memory: 0, localStorage: 0, supabase: 0 };
  }
}

// Export singleton instance
export const multiLevelCache = MultiLevelCacheService.getInstance(); 