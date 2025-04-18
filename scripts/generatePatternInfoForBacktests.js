// Import required modules
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Initialize Supabase client with correct URL and key from .env
const supabaseUrl = process.env.SUPABASE_URL || 'https://ttmeplqmrjhysyqzuaoh.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0bWVwbHFtcmpoeXN5cXp1YW9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyMTU0NzAsImV4cCI6MjA1ODc5MTQ3MH0.38s2h7dvsOPYk_CmC8dS2h3VSCDClezIlQ4VgBFn2Ek';

console.log(`Using Supabase URL: ${supabaseUrl}`);

// Create Supabase client with node-fetch
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  },
  global: {
    fetch: fetch
  }
});

// First, get the actual schema of the patterns table
async function getTableColumns(tableName) {
  try {
    console.log(`Fetching schema for '${tableName}' table...`);
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {
      console.error(`Error fetching schema for '${tableName}':`, error);
      return [];
    }
    
    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      console.log(`Available columns for '${tableName}': ${columns.join(', ')}`);
      return columns;
    } else {
      console.log(`No data found in '${tableName}' table.`);
      return [];
    }
  } catch (error) {
    console.error(`Error checking schema for '${tableName}':`, error);
    return [];
  }
}

// Array of stock symbols to use
const symbols = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM', 'V', 'JNJ',
  'WMT', 'PG', 'DIS', 'HD', 'BAC', 'INTC', 'VZ', 'CSCO', 'ADBE', 'PYPL',
  'CRM', 'CMCSA', 'NFLX', 'PEP', 'ABT', 'KO', 'AVGO', 'T', 'TXN', 'QCOM'
];

// Array of pattern types
const patternTypes = [
  'Bull Flag', 'Bear Flag', 'Ascending Triangle', 'Descending Triangle',
  'Cup and Handle', 'Double Bottom', 'Double Top', 'Head and Shoulders',
  'Inverse Head and Shoulders', 'Symmetrical Triangle'
];

// Array of timeframes
const timeframes = ['15m', '30m', '1h', '4h', '1d'];

// Array of channel types - lowercase to match database enum
const channelTypes = ['ascending', 'descending', 'horizontal'];

// Array of status values to use
const statusValues = ['active', 'completed', 'invalidated', 'pending'];

// EMA pattern types - use actual enum values, not booleans
const emaPatternValues = ['cross_7_50', 'cross_50_100', 'cross_7_100', 'above_all', 'below_all', 'none'];

// Helper function to get a random item from an array
const getRandomItem = (array) => array[Math.floor(Math.random() * array.length)];

// Helper function to generate a random price
const getRandomPrice = (min, max) => +(min + Math.random() * (max - min)).toFixed(2);

// Helper function to generate a random confidence score
const getRandomConfidenceScore = () => Math.floor(60 + Math.random() * 40);

// Main function to generate pattern information for backtest results
async function generatePatternInfo() {
  console.log('=== Generating Pattern Information for Backtest Results ===\n');
  
  try {
    // Get available column values for the channel_type enum
    console.log('Checking valid values for channel_type enum...');
    try {
      // Try to grab a pattern that has a valid channel_type
      const { data: samplePatterns, error: sampleError } = await supabase
        .from('patterns')
        .select('channel_type, ema_pattern')
        .not('channel_type', 'is', null)
        .limit(5);
        
      if (samplePatterns && samplePatterns.length > 0) {
        const validChannelTypes = [...new Set(samplePatterns.map(p => p.channel_type).filter(Boolean))];
        const validEmaPatterns = [...new Set(samplePatterns.map(p => p.ema_pattern).filter(Boolean))];
        
        if (validChannelTypes.length > 0) {
          console.log(`Found valid channel_types: ${validChannelTypes.join(', ')}`);
          // Update our channel types array to use only valid values
          if (validChannelTypes.length >= 2) {
            channelTypes.length = 0;
            channelTypes.push(...validChannelTypes);
          }
        }
        
        if (validEmaPatterns.length > 0) {
          console.log(`Found valid ema_pattern values: ${validEmaPatterns.join(', ')}`);
          // Update our ema pattern values array to use only valid values
          if (validEmaPatterns.length >= 1) {
            emaPatternValues.length = 0;
            emaPatternValues.push(...validEmaPatterns);
          }
        }
      }
    } catch (enumError) {
      console.log('Could not determine valid enum values:', enumError);
    }
    
    // Get all existing patterns first to avoid duplicates
    const { data: existingPatterns, error: patternError } = await supabase
      .from('patterns')
      .select('id')
      .limit(1000);
      
    if (patternError) {
      console.error('Error fetching existing patterns:', patternError);
      return;
    }
    
    const existingPatternIds = new Set(existingPatterns.map(p => p.id));
    console.log(`Found ${existingPatternIds.size} existing patterns`);
    
    // Fetch backtest results that need pattern information
    const { data: backtestResults, error: backtestError } = await supabase
      .from('backtest_results')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (backtestError) {
      console.error('Error fetching backtest results:', backtestError);
      return;
    }
    
    console.log(`Found ${backtestResults.length} backtest results to process`);
    
    // Create patterns for each backtest result if needed
    let createdPatterns = 0;
    let updatedPatterns = 0;
    
    for (const backtest of backtestResults) {
      if (!existingPatternIds.has(backtest.pattern_id)) {
        // Generate pattern data
        const symbol = getRandomItem(symbols);
        const patternType = getRandomItem(patternTypes);
        const timeframe = getRandomItem(timeframes);
        const entryPrice = getRandomPrice(50, 500);
        const targetPrice = +(entryPrice * (1 + Math.random() * 0.1)).toFixed(2);
        const confidenceScore = getRandomConfidenceScore();
        const channelType = getRandomItem(channelTypes);
        const status = getRandomItem(statusValues);
        
        // Support and resistance levels 
        const supportLevel = +(entryPrice * 0.95).toFixed(2);
        const resistanceLevel = +(entryPrice * 1.05).toFixed(2);
        
        // Random volume confirmation and trendline break flags
        const volumeConfirmation = Math.random() > 0.5;
        const trendlineBreak = Math.random() > 0.3;
        
        // Use enum value for ema_pattern
        const emaPattern = getRandomItem(emaPatternValues);
        
        // Create pattern object with only the available columns
        const pattern = {
          id: backtest.pattern_id,
          symbol,
          pattern_type: patternType,
          timeframe,
          entry_price: entryPrice,
          target_price: targetPrice,
          confidence_score: confidenceScore,
          status,
          channel_type: channelType,
          ema_pattern: emaPattern,
          support_level: supportLevel,
          resistance_level: resistanceLevel,
          trendline_break: trendlineBreak,
          volume_confirmation: volumeConfirmation,
          created_at: backtest.created_at
        };
        
        // Insert pattern into database
        const { error: insertError } = await supabase
          .from('patterns')
          .insert(pattern);
          
        if (insertError) {
          console.error(`Error creating pattern ${backtest.pattern_id}:`, insertError);
        } else {
          createdPatterns++;
          console.log(`Created pattern for backtest ${backtest.id}`);
        }
      } else {
        console.log(`Pattern ${backtest.pattern_id} already exists for backtest ${backtest.id}`);
        updatedPatterns++;
      }
    }
    
    console.log('\n=== Pattern Generation Complete ===');
    console.log(`Created ${createdPatterns} new patterns`);
    console.log(`${updatedPatterns} backtest results already had patterns`);
    
  } catch (error) {
    console.error('Error generating pattern info:', error);
  }
}

// Run the main function
generatePatternInfo().catch(err => {
  console.error('Unhandled error:', err);
}); 