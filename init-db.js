import { SupabaseConfigService } from './src/services/supabase/supabaseConfigService';

// Initialize the database schema
async function initializeDatabase() {
  console.log('Starting database initialization...');
  
  try {
    const configService = new SupabaseConfigService();
    const result = await configService.initialize();
    
    if (result) {
      console.log('Database initialization successful!');
    } else {
      console.error('Database initialization failed.');
    }
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// Run the initialization
initializeDatabase(); 