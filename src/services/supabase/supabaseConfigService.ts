import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ttmeplqmrjhysyqzuaoh.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0bWVwbHFtcmpoeXN5cXp1YW9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyMTU0NzAsImV4cCI6MjA1ODc5MTQ3MH0.38s2h7dvsOPYk_CmC8dS2h3VSCDClezIlQ4VgBFn2Ek';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Supabase configuration service
 * Handles database schema setup and maintenance
 */
class SupabaseConfigService {
  /**
   * Initialize Supabase configuration
   * Sets up necessary tables and indexes if they don't exist
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('Initializing Supabase configuration...');
      
      // Check if tables exist
      const { data: tables, error: tablesError } = await supabase
        .from('patterns')
        .select('id')
        .limit(1);
      
      if (tablesError) {
        console.log('Tables may not exist, creating schema...');
        await this.createSchema();
      } else {
        console.log('Tables already exist, skipping schema creation');
      }
      
      return true;
    } catch (error) {
      console.error('Error initializing Supabase configuration:', error);
      return false;
    }
  }
  
  /**
   * Create database schema
   * Creates necessary tables and indexes
   */
  private async createSchema(): Promise<void> {
    try {
      // Create patterns table
      const { error: patternsError } = await supabase.rpc('create_patterns_table');
      
      if (patternsError) {
        console.error('Error creating patterns table:', patternsError);
      }
      
      // Create backtest_results table
      const { error: backtestError } = await supabase.rpc('create_backtest_results_table');
      
      if (backtestError) {
        console.error('Error creating backtest_results table:', backtestError);
      }
      
      // Create user_settings table
      const { error: settingsError } = await supabase.rpc('create_user_settings_table');
      
      if (settingsError) {
        console.error('Error creating user_settings table:', settingsError);
      }
      
      console.log('Schema creation completed');
    } catch (error) {
      console.error('Error creating schema:', error);
      throw error;
    }
  }
  
  /**
   * Check if Supabase connection is working
   */
  async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('patterns')
        .select('count(*)', { count: 'exact', head: true });
      
      return !error;
    } catch (error) {
      console.error('Error testing Supabase connection:', error);
      return false;
    }
  }
  
  /**
   * Get Supabase configuration status
   */
  async getStatus(): Promise<{
    connected: boolean;
    tablesExist: boolean;
    patternCount: number;
    backtestCount: number;
    userCount: number;
  }> {
    try {
      // Check connection
      const connected = await this.testConnection();
      
      if (!connected) {
        return {
          connected: false,
          tablesExist: false,
          patternCount: 0,
          backtestCount: 0,
          userCount: 0
        };
      }
      
      // Check if tables exist
      const { data: patterns, error: patternsError } = await supabase
        .from('patterns')
        .select('count(*)', { count: 'exact', head: true });
      
      const { data: backtests, error: backtestsError } = await supabase
        .from('backtest_results')
        .select('count(*)', { count: 'exact', head: true });
      
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('count(*)', { count: 'exact', head: true });
      
      const tablesExist = !patternsError && !backtestsError;
      
      return {
        connected,
        tablesExist,
        patternCount: patterns?.[0]?.count || 0,
        backtestCount: backtests?.[0]?.count || 0,
        userCount: users?.[0]?.count || 0
      };
    } catch (error) {
      console.error('Error getting Supabase status:', error);
      return {
        connected: false,
        tablesExist: false,
        patternCount: 0,
        backtestCount: 0,
        userCount: 0
      };
    }
  }
}

export default new SupabaseConfigService();
