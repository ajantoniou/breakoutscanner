import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Polygon API key
const POLYGON_API_KEY = 'onEimwzRMEYR2FhgLVBZnAmyz9EC8KfI';

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ttmeplqmrjhysyqzuaoh.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0bWVwbHFtcmpoeXN5cXp1YW9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyMTU0NzAsImV4cCI6MjA1ODc5MTQ3MH0.38s2h7dvsOPYk_CmC8dS2h3VSCDClezIlQ4VgBFn2Ek';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0bWVwbHFtcmpoeXN5cXp1YW9oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzIxNTQ3MCwiZXhwIjoyMDU4NzkxNDcwfQ.IEts22TIOhglV_S7pRWpyD6zYUiO8d4Wc_SICgAqHBA';

async function testPolygonAPI() {
  console.log('\n===== TESTING POLYGON.IO API =====');
  
  try {
    // Test the daily bars endpoint
    console.log('Testing daily bars endpoint...');
    const barsResponse = await fetch(`https://api.polygon.io/v2/aggs/ticker/AAPL/range/1/day/2023-01-01/2023-01-10?apiKey=${POLYGON_API_KEY}`);
    
    console.log('Status:', barsResponse.status, barsResponse.statusText);
    
    if (barsResponse.status === 200) {
      const data = await barsResponse.json();
      console.log('Success! Received data for', data.ticker);
      console.log('Results:', data.resultsCount, 'data points');
    } else {
      const errorText = await barsResponse.text();
      console.log('Error response:', errorText);
    }
    
    // Test S3 flat files credentials
    console.log('\nS3 Flat Files Credentials:');
    console.log('Access Key ID:', process.env.POLYGON_ACCESS_KEY_ID || '40952a0d-d560-4ebc-993b-669ff34a7bbb');
    console.log('Secret Access Key:', process.env.POLYGON_SECRET_ACCESS_KEY ? '✓ Present' : '✗ Missing');
    console.log('S3 Endpoint: https://files.polygon.io');
    console.log('Bucket: flatfiles');
    
    // Check the ticker types endpoint as another test
    console.log('\nTesting ticker types endpoint...');
    const typesResponse = await fetch(`https://api.polygon.io/v3/reference/tickers/types?apiKey=${POLYGON_API_KEY}`);
    
    console.log('Status:', typesResponse.status, typesResponse.statusText);
    
    if (typesResponse.status === 200) {
      const typesData = await typesResponse.json();
      console.log('Success! Received ticker types');
      console.log('Result count:', typesData.results?.length || 0);
    } else {
      const errorText = await typesResponse.text();
      console.log('Error response:', errorText);
    }
    
  } catch (error) {
    console.error('Error testing Polygon API:', error);
  }
}

async function testSupabaseConnection() {
  console.log('\n===== TESTING SUPABASE CONNECTION =====');
  
  // Test with anon key
  try {
    console.log('Testing with anon key...');
    const supabaseAnon = createClient(supabaseUrl, supabaseKey);
    
    const { data: tables, error: tablesError } = await supabaseAnon
      .from('backtest_results')
      .select('id')
      .limit(1);
      
    if (tablesError) {
      console.error('Error with anon key:', tablesError.message);
    } else {
      console.log('Success! Connected with anon key');
      console.log('Tables available:', tables ? 'Yes' : 'No');
    }
  } catch (error) {
    console.error('Error connecting to Supabase with anon key:', error);
  }
  
  // Test with service role key if available
  if (supabaseServiceKey) {
    try {
      console.log('\nTesting with service role key...');
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      
      const { data: tables, error: tablesError } = await supabaseAdmin
        .from('backtest_results')
        .select('id')
        .limit(1);
        
      if (tablesError) {
        console.error('Error with service role key:', tablesError.message);
      } else {
        console.log('Success! Connected with service role key');
        console.log('Tables available:', tables ? 'Yes' : 'No');
      }
    } catch (error) {
      console.error('Error connecting to Supabase with service role key:', error);
    }
  } else {
    console.log('\nNo service role key provided, skipping test');
  }
}

async function main() {
  console.log('====================================');
  console.log('TESTING API CONNECTIONS');
  console.log('====================================');
  
  await testPolygonAPI();
  await testSupabaseConnection();
  
  console.log('\n====================================');
  console.log('TESTS COMPLETED');
  console.log('====================================');
}

main().catch(error => {
  console.error('Error in main test function:', error);
}); 