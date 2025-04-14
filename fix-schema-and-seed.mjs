/**
 * Fix the database schema and seed with test patterns
 * Usage: node fix-schema-and-seed.mjs [count]
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get command line argument for count
const count = parseInt(process.argv[2] || '10', 10);

// Check if required environment variables are set
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Pattern types and other data
const patternTypes = [
  'Bull Flag', 
  'Bear Flag', 
  'Cup and Handle', 
  'Double Bottom', 
  'Double Top',
  'Ascending Triangle',
  'Descending Triangle',
  'Symmetrical Triangle',
  'Head and Shoulders',
  'Inverse Head and Shoulders'
];

const channelTypes = ['horizontal', 'ascending', 'descending'];
const emaPatterns = ['7over50', '7over100', '50over100', 'allBullish', 'allBearish', 'mixed'];
const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA', 'AMD'];
const timeframes = ['1h', '4h', '1d', '1w'];
const statuses = ['active', 'completed', 'failed'];

// Helper functions
function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomDecimal(min, max, decimals = 2) {
  const rand = Math.random() * (max - min) + min;
  const power = Math.pow(10, decimals);
  return Math.round(rand * power) / power;
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomBoolean(probability = 0.5) {
  return Math.random() < probability;
}

// Generate pattern data
function generatePattern() {
  const symbol = randomItem(symbols);
  const timeframe = randomItem(timeframes);
  const patternType = randomItem(patternTypes);
  const channelType = randomItem(channelTypes);
  const emaPattern = randomItem(emaPatterns);
  
  const basePrice = randomDecimal(50, 500, 2);
  
  const isBullish = patternType.includes('Bull') || 
                    patternType.includes('Cup') || 
                    patternType.includes('Bottom') ||
                    patternType.includes('Ascending') ||
                    (patternType === 'Symmetrical Triangle' && randomBoolean());
  
  const priceChangePercent = randomDecimal(2, 15) / 100;
  const targetPrice = isBullish 
    ? basePrice * (1 + priceChangePercent) 
    : basePrice * (1 - priceChangePercent);
  
  const stopLoss = isBullish
    ? basePrice * (1 - randomDecimal(1, 5) / 100)
    : basePrice * (1 + randomDecimal(1, 5) / 100);
    
  const riskRewardRatio = Math.abs((targetPrice - basePrice) / (stopLoss - basePrice));
  
  const confidenceScore = randomDecimal(60, 95);
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  const createdAt = randomDate(startDate, new Date());
  
  const status = randomItem(statuses);
  
  // Support and resistance levels
  const volatility = 0.08; // 8% average volatility
  const supportLevel = basePrice * (1 - volatility * randomDecimal(0.3, 0.7));
  const resistanceLevel = basePrice * (1 + volatility * randomDecimal(0.3, 0.7));
  
  return {
    symbol,
    timeframe,
    pattern_type: patternType,
    entry_price: basePrice,
    target_price: targetPrice,
    stop_loss: stopLoss,
    risk_reward_ratio: riskRewardRatio,
    confidence_score: confidenceScore,
    status,
    created_at: createdAt.toISOString(),
    updated_at: new Date().toISOString(),
    channel_type: channelType,
    ema_pattern: emaPattern,
    support_level: supportLevel,
    resistance_level: resistanceLevel,
    trendline_break: randomBoolean(0.3),
    volume_confirmation: randomBoolean(0.7)
  };
}

// Generate backtest results
function generateBacktestResult(patternId, patternData) {
  const isBullish = patternData.pattern_type.includes('Bull') || 
                    patternData.pattern_type.includes('Cup') || 
                    patternData.pattern_type.includes('Bottom') ||
                    patternData.pattern_type.includes('Ascending');
  
  // Assign higher success probability to certain pattern types
  let successProbability = 0.5;
  if (patternData.pattern_type.includes('Flag') || patternData.pattern_type.includes('Cup')) {
    successProbability = 0.75;
  } else if (patternData.pattern_type.includes('Triangle')) {
    successProbability = 0.65;
  }
  
  const success = randomBoolean(successProbability);
  const profitLossPercent = success 
    ? randomDecimal(1, 15) 
    : -randomDecimal(1, 10);
  
  const daysToBreakout = randomBetween(1, 14);
  const daysToTarget = success ? daysToBreakout + randomBetween(1, 10) : null;
  const maxDrawdown = success ? -randomDecimal(0.5, 5) : -randomDecimal(5, 15);
  
  return {
    pattern_id: patternId,
    symbol: patternData.symbol,
    pattern_type: patternData.pattern_type,
    timeframe: patternData.timeframe,
    success,
    profit_loss_percent: profitLossPercent,
    days_to_breakout: daysToBreakout,
    days_to_target: daysToTarget,
    max_drawdown: maxDrawdown,
    created_at: new Date().toISOString()
  };
}

// Run SQL query to fix schema
async function fixSchema() {
  console.log('Fixing schema...');
  
  // SQL query to create patterns table from scratch
  const sql = `
    DROP TABLE IF EXISTS cached_patterns CASCADE;
    
    CREATE TABLE cached_patterns (
        id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
        symbol TEXT NOT NULL,
        timeframe TEXT NOT NULL,
        pattern_type TEXT NOT NULL,
        entry_price DECIMAL(12,4) NOT NULL,
        target_price DECIMAL(12,4) NOT NULL,
        confidence_score DECIMAL(8,2) NOT NULL,
        status TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        channel_type TEXT NOT NULL,
        ema_pattern TEXT,
        support_level DECIMAL(12,4),
        resistance_level DECIMAL(12,4),
        trendline_break BOOLEAN DEFAULT FALSE,
        volume_confirmation BOOLEAN DEFAULT FALSE,
        stop_loss DECIMAL(12,4),
        risk_reward_ratio DECIMAL(8,2)
    );
    
    CREATE INDEX idx_cached_patterns_symbol ON cached_patterns(symbol);
    CREATE INDEX idx_cached_patterns_timeframe ON cached_patterns(timeframe);
    CREATE INDEX idx_cached_patterns_pattern_type ON cached_patterns(pattern_type);
    CREATE INDEX idx_cached_patterns_created_at ON cached_patterns(created_at);
    
    ALTER TABLE cached_patterns ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Allow authenticated users to read cached_patterns"
    ON cached_patterns FOR SELECT
    TO authenticated
    USING (true);
    
    CREATE POLICY "Allow anon users to read cached_patterns"
    ON cached_patterns FOR SELECT
    TO anon
    USING (true);
  `;
  
  const { error } = await supabase.rpc('execute_sql', { sql });
  
  if (error) {
    // Try alternative approach with REST API
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey
        },
        body: JSON.stringify({ query: sql })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to execute SQL: ${await response.text()}`);
      }
      
      console.log('Schema fixed successfully!');
    } catch (err) {
      console.error('Error fixing schema:', err.message);
      // Continue anyway - the table might already exist correctly
    }
  } else {
    console.log('Schema fixed successfully!');
  }
}

async function seedDatabase() {
  console.log(`Seeding database with ${count} patterns...`);
  
  // Generate patterns
  const patterns = Array.from({ length: count }, () => generatePattern());
  
  // Insert patterns into database
  const { data: insertedPatterns, error: patternsError } = await supabase
    .from('cached_patterns')
    .insert(patterns)
    .select();
  
  if (patternsError) {
    console.error('Error inserting patterns:', patternsError);
    process.exit(1);
  }
  
  console.log(`Successfully inserted ${insertedPatterns.length} patterns`);
  
  // Generate and insert backtest results
  const backtestResults = insertedPatterns.map(pattern => 
    generateBacktestResult(pattern.id, pattern)
  );
  
  const { data: insertedResults, error: resultsError } = await supabase
    .from('backtest_results')
    .insert(backtestResults)
    .select();
  
  if (resultsError) {
    console.error('Error inserting backtest results:', resultsError);
    process.exit(1);
  }
  
  console.log(`Successfully inserted ${insertedResults.length} backtest results`);
  
  console.log('Database seeding completed successfully!');
}

async function main() {
  try {
    await fixSchema();
    await seedDatabase();
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

main(); 