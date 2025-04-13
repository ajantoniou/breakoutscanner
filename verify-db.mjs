/**
 * Verify the database setup
 * Usage: node verify-db.mjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Check if required environment variables are set
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyTables() {
  console.log('Verifying database tables...');
  
  // Check table structure
  const tablesSql = `
  SELECT table_name, column_name, data_type 
  FROM information_schema.columns 
  WHERE table_schema = 'public'
  AND table_name IN (
    'market_data_cache',
    'market_data_metadata',
    'detected_patterns',
    'backtest_results',
    'cached_patterns'
  )
  ORDER BY table_name, ordinal_position;
  `;
  
  try {
    // Execute SQL query
    const { data: tableData, error: tableError } = await supabase.rpc('pg_execute', { 
      sql_query: tablesSql 
    });
    
    if (tableError) {
      // Try alternative approach
      const response = await fetch(`${supabaseUrl}/rest/v1/sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey
        },
        body: JSON.stringify({ query: tablesSql })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to execute SQL: ${await response.text()}`);
      }
      
      const result = await response.json();
      console.log('Tables in database:');
      console.table(result);
    } else {
      console.log('Tables in database:');
      console.table(tableData);
    }
    
    // Count rows in each table
    const countSql = `
    SELECT 'market_data_cache' as table_name, COUNT(*) as row_count FROM market_data_cache
    UNION ALL
    SELECT 'market_data_metadata' as table_name, COUNT(*) as row_count FROM market_data_metadata
    UNION ALL
    SELECT 'detected_patterns' as table_name, COUNT(*) as row_count FROM detected_patterns
    UNION ALL
    SELECT 'backtest_results' as table_name, COUNT(*) as row_count FROM backtest_results
    UNION ALL
    SELECT 'cached_patterns' as table_name, COUNT(*) as row_count FROM cached_patterns
    ORDER BY table_name;
    `;
    
    const { data: countData, error: countError } = await supabase.rpc('pg_execute', { 
      sql_query: countSql 
    });
    
    if (countError) {
      // Try alternative approach
      const countResponse = await fetch(`${supabaseUrl}/rest/v1/sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey
        },
        body: JSON.stringify({ query: countSql })
      });
      
      if (!countResponse.ok) {
        throw new Error(`Failed to execute SQL: ${await countResponse.text()}`);
      }
      
      const countResult = await countResponse.json();
      console.log('\nRow counts:');
      console.table(countResult);
    } else {
      console.log('\nRow counts:');
      console.table(countData);
    }
    
  } catch (err) {
    console.error('Error verifying tables:', err);
    
    // Try querying each table individually
    console.log('\nTrying to query tables individually...');
    
    const tables = [
      'market_data_cache',
      'market_data_metadata',
      'detected_patterns',
      'backtest_results',
      'cached_patterns'
    ];
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.error(`Error querying ${table}:`, error.message);
        } else {
          console.log(`${table}: ${count} rows`);
        }
      } catch (tableErr) {
        console.error(`Error accessing ${table}:`, tableErr.message);
      }
    }
  }
}

verifyTables().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
}); 