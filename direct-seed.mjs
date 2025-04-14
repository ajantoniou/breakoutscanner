/**
 * Directly seed the database with test patterns
 * Usage: node direct-seed.mjs [count]
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

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
    volume_confirmation: randomBoolean(0.7),
    intra_channel_pattern: isBullish 
      ? randomItem(['Higher Lows', 'Bull Flag', 'Double Bottom']) 
      : randomItem(['Lower Highs', 'Bear Flag', 'Double Top'])
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

seedDatabase().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
}); 