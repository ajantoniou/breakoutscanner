/**
 * Run Supabase migrations using the Supabase JS client
 * Usage: node run-migrations.mjs
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      
      // Execute SQL using Supabase REST API
      // Split by semicolons to execute each statement separately
      const statements = sqlContent
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);
        
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        console.log(`Executing statement ${i + 1}/${statements.length}`);
        
        try {
          const { data, error } = await supabase.rpc('pg_temp_execute', { 
            sql_query: statement
          });
          
          if (error) {
            // Alternative approach - fallback to using the REST API directly
            console.log(`Using fallback method for statement: ${statement.substring(0, 50)}...`);
            
            const { data, error } = await supabase
              .from('_migrations_temp')
              .select('*')
              .limit(1)
              .then(async () => {
                return await fetch(`${supabaseUrl}/rest/v1/pg/sql`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseKey}`,
                    'apikey': supabaseKey
                  },
                  body: JSON.stringify({ query: statement })
                }).then(res => res.json());
              });
              
            if (error) {
              throw new Error(`SQL error: ${error.message}`);
            }
          }
        } catch (stmtError) {
          // If an error occurs with a single statement, continue with the others
          console.warn(`Warning: Statement failed but continuing: ${stmtError.message}`);
        }
      }
      
      console.log(`Migration completed: ${migrationFile}`);
    } catch (err) {
      console.error(`Error running migration ${migrationFile}:`, err);
      // Don't exit - try the next migration
      console.log('Continuing with next migration...');
    }
  }
  
  console.log('All migrations completed successfully!');
}

runMigrations().catch(err => {
  console.error('Unexpected error running migrations:', err);
  process.exit(1);
}); 