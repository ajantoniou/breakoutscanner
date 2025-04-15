/**
 * Configuration service for accessing environment variables with validation
 */

// Config interface defining all available configuration options
export interface AppConfig {
  // API Keys
  polygonApiKey: string;
  
  // Supabase Config
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseEdgeFunctionUrl: string;
  
  // Feature Flags
  enableRealTimeUpdates: boolean;
  enablePolygonWebSocket: boolean;
  
  // Cache Settings
  dataCacheTTLSeconds: number;
  maxCacheEntries: number;
  
  // Development Flags
  isDevelopment: boolean;
  useMockData: boolean;
}

// Default configuration values (fallbacks for when env vars are missing)
const defaultConfig: Partial<AppConfig> = {
  enableRealTimeUpdates: false,
  enablePolygonWebSocket: false,
  dataCacheTTLSeconds: 60,
  maxCacheEntries: 1000,
  isDevelopment: import.meta.env.DEV,
  useMockData: false
};

/**
 * Validation methods to ensure config values meet expected formats
 */
const ConfigValidators = {
  isValidUrl: (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },
  
  isNonEmptyString: (value: string): boolean => {
    return typeof value === 'string' && value.trim().length > 0;
  },
  
  isValidApiKey: (key: string): boolean => {
    return typeof key === 'string' && key.trim().length >= 16;
  },
  
  isValidNumber: (value: any, min: number, max: number): boolean => {
    const num = Number(value);
    return !isNaN(num) && num >= min && num <= max;
  },
  
  isValidBoolean: (value: any): boolean => {
    return typeof value === 'boolean' || value === 'true' || value === 'false';
  }
};

/**
 * Get boolean value from string or boolean
 */
function getBooleanValue(value: string | boolean | undefined, defaultValue: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return defaultValue;
}

/**
 * Get number value from string or number
 */
function getNumberValue(value: string | number | undefined, defaultValue: number): number {
  if (typeof value === 'number') return value;
  if (value && !isNaN(Number(value))) return Number(value);
  return defaultValue;
}

/**
 * Configuration Service for accessing environment variables
 */
class ConfigService {
  private config: AppConfig;
  private static instance: ConfigService;
  
  private constructor() {
    // Initialize config with defaults and environment variables
    this.config = {
      // API Keys
      polygonApiKey: import.meta.env.VITE_POLYGON_API_KEY || defaultConfig.polygonApiKey || '',
      
      // Supabase Config
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL || defaultConfig.supabaseUrl || '',
      supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || defaultConfig.supabaseAnonKey || '',
      supabaseEdgeFunctionUrl: import.meta.env.VITE_SUPABASE_EDGE_FUNCTION_URL || defaultConfig.supabaseEdgeFunctionUrl || '',
      
      // Feature Flags
      enableRealTimeUpdates: getBooleanValue(
        import.meta.env.VITE_ENABLE_REALTIME_UPDATES, 
        defaultConfig.enableRealTimeUpdates || false
      ),
      enablePolygonWebSocket: getBooleanValue(
        import.meta.env.VITE_ENABLE_POLYGON_WEBSOCKET, 
        defaultConfig.enablePolygonWebSocket || false
      ),
      
      // Cache Settings
      dataCacheTTLSeconds: getNumberValue(
        import.meta.env.VITE_DATA_CACHE_TTL_SECONDS, 
        defaultConfig.dataCacheTTLSeconds || 60
      ),
      maxCacheEntries: getNumberValue(
        import.meta.env.VITE_MAX_CACHE_ENTRIES, 
        defaultConfig.maxCacheEntries || 1000
      ),
      
      // Development Flags
      isDevelopment: getBooleanValue(
        import.meta.env.DEV, 
        defaultConfig.isDevelopment || false
      ),
      useMockData: getBooleanValue(
        import.meta.env.VITE_USE_MOCK_DATA, 
        defaultConfig.useMockData || false
      )
    };
    
    // Perform validation
    this.validateConfig();
  }
  
  /**
   * Validate configuration values and log warnings
   */
  private validateConfig(): void {
    const validationErrors: string[] = [];
    
    // Validate API keys
    if (!ConfigValidators.isNonEmptyString(this.config.polygonApiKey) && !this.config.useMockData) {
      validationErrors.push('Missing Polygon API key. Real data will not be available.');
    }
    
    // Validate Supabase configuration
    if (!ConfigValidators.isValidUrl(this.config.supabaseUrl)) {
      validationErrors.push('Invalid or missing Supabase URL.');
    }
    
    if (!ConfigValidators.isNonEmptyString(this.config.supabaseAnonKey)) {
      validationErrors.push('Missing Supabase anonymous key.');
    }
    
    // Log validation errors
    if (validationErrors.length > 0 && this.config.isDevelopment) {
      console.warn('Configuration validation errors:');
      validationErrors.forEach(error => console.warn(`- ${error}`));
    }
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }
  
  /**
   * Get full configuration
   */
  public getConfig(): AppConfig {
    return { ...this.config };
  }
  
  /**
   * Get configuration value by key
   */
  public get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }
  
  /**
   * Check if real data capabilities are available
   */
  public canUseRealData(): boolean {
    return ConfigValidators.isNonEmptyString(this.config.polygonApiKey) && !this.config.useMockData;
  }
  
  /**
   * Check if WebSocket capabilities are available
   */
  public canUseWebSocket(): boolean {
    return this.canUseRealData() && this.config.enablePolygonWebSocket;
  }
  
  /**
   * Override configuration values (useful for testing)
   */
  public override(overrides: Partial<AppConfig>): void {
    if (this.config.isDevelopment) {
      this.config = { ...this.config, ...overrides };
      this.validateConfig();
    } else {
      console.warn('Config overrides are only allowed in development mode');
    }
  }
}

// Export singleton instance
export const configService = ConfigService.getInstance();

// Export default for convenience
export default configService; 