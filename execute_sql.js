const fs = require('fs');
const https = require('https');

// Read the SQL file
const sql = fs.readFileSync('create_market_data_table.sql', 'utf8');

// Supabase credentials
const supabaseUrl = 'https://esjvtwpxlewrqqnmkgcp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzanZ0d3B4bGV3cnFxbm1rZ2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM3OTE0NjMsImV4cCI6MjA1OTM2NzQ2M30.DdF7TNveO34AvB_9iIiSzoEnFA_h9J-y2TfKGzlwMss';

// Prepare the request options
const options = {
  hostname: 'esjvtwpxlewrqqnmkgcp.supabase.co',
  path: '/rest/v1/rpc/execute_sql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`
  }
};

// Prepare the request data
const data = JSON.stringify({
  query: sql
});

// Make the request
const req = https.request(options, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    console.log('Response status code:', res.statusCode);
    console.log('Response headers:', res.headers);
    console.log('Response body:', responseData);
  });
});

req.on('error', (error) => {
  console.error('Error executing SQL:', error);
});

// Write data to request body
req.write(data);
req.end(); 