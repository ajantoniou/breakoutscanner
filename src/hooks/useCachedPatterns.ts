
import { useState, useEffect } from 'react';
import { PatternData } from '@/services/types/patternTypes';

const CACHE_KEY_PREFIX = 'pattern_data_cache_';
// Make cache expiry configurable based on timeframe
const getCacheExpiryTime = (timeframe: string): number => {
  switch (timeframe) {
    case '1h': return 60 * 60 * 1000; // 1 hour
    case '4h': return 4 * 60 * 60 * 1000; // 4 hours
    case '1d': return 24 * 60 * 60 * 1000; // 1 day
    case '1w': return 7 * 24 * 60 * 60 * 1000; // 1 week
    default: return 2 * 60 * 60 * 1000; // 2 hours default
  }
};

export interface CachedData<T> {
  data: T;
  timestamp: number;
  timeframe: string;
  source?: string;
}

export const useCachedPatterns = (timeframe: string) => {
  const [cache, setCache] = useState<CachedData<PatternData[]> | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [cacheHitCount, setCacheHitCount] = useState<number>(0);
  
  const cacheKey = `${CACHE_KEY_PREFIX}${timeframe}`;
  const cacheExpiryTime = getCacheExpiryTime(timeframe);
  
  // Load from cache on initial mount
  useEffect(() => {
    const loadFromCache = () => {
      try {
        const cachedData = localStorage.getItem(cacheKey);
        
        if (cachedData) {
          const parsedCache: CachedData<PatternData[]> = JSON.parse(cachedData);
          const now = Date.now();
          
          // Check if cache is still valid
          if (now - parsedCache.timestamp < cacheExpiryTime) {
            console.log(`Loading ${parsedCache.data.length} patterns from cache for ${timeframe}`);
            setCache(parsedCache);
            setLastUpdated(new Date(parsedCache.timestamp));
            setCacheHitCount(prev => prev + 1);
            return true;
          } else {
            console.log(`Cache for ${timeframe} is expired (${Math.round((now - parsedCache.timestamp) / (60 * 1000))} minutes old)`);
            return false;
          }
        }
      } catch (error) {
        console.error("Error loading from cache:", error);
      }
      
      return false;
    };
    
    loadFromCache();
  }, [timeframe, cacheKey, cacheExpiryTime]);
  
  // Function to save data to cache
  const saveToCache = (patterns: PatternData[], source?: string) => {
    try {
      const now = Date.now();
      const cacheData: CachedData<PatternData[]> = {
        data: patterns,
        timestamp: now,
        timeframe,
        source
      };
      
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      setCache(cacheData);
      setLastUpdated(new Date(now));
      
      console.log(`Saved ${patterns.length} patterns to cache for ${timeframe}`);
      
      return true;
    } catch (error) {
      console.error("Error saving to cache:", error);
      return false;
    }
  };
  
  // Function to clear cache
  const clearCache = () => {
    localStorage.removeItem(cacheKey);
    setCache(null);
    setLastUpdated(null);
    console.log(`Cleared cache for ${timeframe}`);
  };
  
  // Function to check if cache is stale
  const isCacheStale = () => {
    if (!cache) return true;
    
    const now = Date.now();
    return now - cache.timestamp > cacheExpiryTime;
  };

  // Helper to get age of cache in minutes
  const getCacheAge = (): number | null => {
    if (!cache) return null;
    
    const now = Date.now();
    return Math.round((now - cache.timestamp) / (60 * 1000));
  };
  
  return {
    cachedPatterns: cache?.data || null,
    cacheSource: cache?.source,
    lastUpdated,
    saveToCache,
    clearCache,
    isCacheStale,
    cacheHitCount,
    getCacheAge
  };
};
