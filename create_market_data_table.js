const { createClient } = require('@supabase/supabase-js');

// Initialize the Supabase client
const supabaseUrl = 'https://esjvtwpxlewrqqnmkgcp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzanZ0d3B4bGV3cnFxbm1rZ2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM3OTE0NjMsImV4cCI6MjA1OTM2NzQ2M30.DdF7TNveO34AvB_9iIiSzoEnFA_h9J-y2TfKGzlwMss';
const supabase = createClient(supabaseUrl, supabaseKey);

async function createMarketDataTable() {
  try {
    // Execute SQL to create the table
    const { data, error } = await supabase.rpc('create_market_data_table', {
      sql: `
        CREATE TABLE IF NOT EXISTS market_data (
          id SERIAL PRIMARY KEY,
          symbol TEXT NOT NULL,
          price NUMERIC,
          timestamp TIMESTAMP
        );
      `
    });

    if (error) {
      console.error('Error creating table:', error);
    } else {
      console.log('Table created successfully:', data);
    }
  } catch (err) {
    console.error('Exception:', err);
  }
}

createMarketDataTable(); 