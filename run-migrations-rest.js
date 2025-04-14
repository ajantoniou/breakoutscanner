/**
 * Run Supabase migrations using direct REST API calls
 * Usage: node run-migrations-rest.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');

// Check if required environment variables are set
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file');
  process.exit(1);
}

// Extract project ref from URL (e.g., https://xxxx.supabase.co -> xxxx)
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)/)[1];

async function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, 'https://api.supabase.com');
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey
      }
    };
    
    const req = https.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        } else {
          reject(new Error(`Request failed with status code ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', (e) => {
      reject(e);
    });
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function runMigration(sql) {
  try {
    // Using the SQL API endpoint to run queries
    const response = await makeRequest(
      'POST',
      `/rest/v1/sql`,
      { query: sql }
    );
    
    return response;
  } catch (error) {
    console.error('Error executing SQL:', error.message);
    throw error;
  }
}

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
      
      // Split the content by semicolons to run each statement separately
      const statements = sqlContent
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);
      
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        console.log(`Executing statement ${i + 1}/${statements.length}`);
        
        await runMigration(statement);
      }
      
      console.log(`Migration completed: ${migrationFile}`);
    } catch (err) {
      console.error(`Error running migration ${migrationFile}:`, err);
      process.exit(1);
    }
  }
  
  console.log('All migrations completed successfully!');
}

runMigrations().catch(err => {
  console.error('Unexpected error running migrations:', err);
  process.exit(1);
}); 