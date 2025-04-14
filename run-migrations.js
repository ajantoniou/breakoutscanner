/**
 * Run Supabase migrations using the Supabase JS client
 * Usage: node run-migrations.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Check if required environment variables are set
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigrations() {
  console.log('Running Supabase migrations...');
  
  // Get migration files
  const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort(); // Ensure migrations run in order
  
  // Run each migration
  for (const migrationFile of migrationFiles) {
    console.log(`Running migration: ${migrationFile}`);
    
    try {
      const sqlContent = fs.readFileSync(path.join(migrationsDir, migrationFile), 'utf8');
      
      // Execute SQL directly using PostgreSQL connection
      const { error } = await supabase.rpc('exec_sql', { 
        sql: sqlContent 
      });
      
      // Alternative approach - use supabase.from('_sql').select('*') as a workaround
      if (error) {
        const { data, error: sqlError } = await supabase
          .from('_sql')
          .select('*')
          .limit(1)
          .then(async () => {
            // This is a hack - after the connection is established, 
            // we can execute arbitrary SQL via function call
            return await supabase.rpc('pg_execute', { sql: sqlContent });
          });
          
        if (sqlError) {
          console.error(`Error running migration ${migrationFile}:`, sqlError);
          process.exit(1);
        }
      }
      
      console.log(`Migration completed: ${migrationFile}`);
    } catch (err) {
      console.error(`Error reading or executing migration ${migrationFile}:`, err);
      process.exit(1);
    }
  }
  
  console.log('All migrations completed successfully!');
}

runMigrations().catch(err => {
  console.error('Unexpected error running migrations:', err);
  process.exit(1);
}); 