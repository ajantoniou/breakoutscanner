import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function getActivePatterns() {
  // Get all active patterns
  const { data, error } = await supabase
    .from('patterns')
    .select('*')
    .eq('status', 'active')
    .order('confidence_score', { ascending: false });

  if (error) {
    console.error('Error fetching patterns:', error);
    return;
  }

  // Separate into bullish and bearish
  const bullishData = data.filter(pattern => 
    pattern.pattern_type.includes('Bull') || 
    pattern.pattern_type.includes('Ascending') || 
    pattern.pattern_type === 'Cup and Handle' ||
    pattern.pattern_type === 'Inverse Head and Shoulders' ||
    pattern.pattern_type === 'Double Bottom'
  );

  const bearishData = data.filter(pattern => 
    pattern.pattern_type.includes('Bear') || 
    pattern.pattern_type.includes('Descending') || 
    pattern.pattern_type === 'Head and Shoulders' ||
    pattern.pattern_type === 'Double Top'
  );

  console.log('=== BREAKOUT PREDICTIONS BY DIRECTION ===');
  console.log('Based on highest probability setups from backtesting:');
  console.log('---------------------------------------------');
  
  if (bullishData.length === 0 && bearishData.length === 0) {
    console.log('No active patterns found');
    return;
  }

  console.log('\n🔼 BULLISH SETUPS:');
  console.log('---------------------------------------------');
  
  if (bullishData.length === 0) {
    console.log('No active bullish patterns found');
  } else {
    bullishData.forEach((pattern, index) => {
      const targetPct = ((pattern.target_price - pattern.entry_price) / pattern.entry_price * 100).toFixed(2);
      console.log(`${index + 1}. ${pattern.symbol} (${pattern.timeframe})`);
      console.log(`   Pattern: ${pattern.pattern_type} (${pattern.channel_type || 'N/A'} channel)`);
      console.log(`   Confidence Score: ${(pattern.confidence_score * 100).toFixed(2)}%`);
      console.log(`   Current Price: $${pattern.entry_price.toFixed(2)}`);
      console.log(`   Target Price: $${pattern.target_price.toFixed(2)} (${targetPct}%)`);
      console.log(`   EMA Pattern: ${pattern.ema_pattern || 'N/A'}`);
      console.log(`   Volume Confirmation: ${pattern.volume_confirmation ? 'Yes' : 'No'}`);
      console.log(`   Expected Days to Breakout: ${pattern.timeframe === '1d' ? '8-9' : pattern.timeframe === '1h' ? '5-6' : '6-7'} days`);
      console.log('---------------------------------------------');
    });
  }

  console.log('\n🔽 BEARISH SETUPS:');
  console.log('---------------------------------------------');
  
  if (bearishData.length === 0) {
    console.log('No active bearish patterns found');
  } else {
    bearishData.forEach((pattern, index) => {
      const targetPct = ((pattern.target_price - pattern.entry_price) / pattern.entry_price * 100).toFixed(2);
      console.log(`${index + 1}. ${pattern.symbol} (${pattern.timeframe})`);
      console.log(`   Pattern: ${pattern.pattern_type} (${pattern.channel_type || 'N/A'} channel)`);
      console.log(`   Confidence Score: ${(pattern.confidence_score * 100).toFixed(2)}%`);
      console.log(`   Current Price: $${pattern.entry_price.toFixed(2)}`);
      console.log(`   Target Price: $${pattern.target_price.toFixed(2)} (${targetPct}%)`);
      console.log(`   EMA Pattern: ${pattern.ema_pattern || 'N/A'}`);
      console.log(`   Volume Confirmation: ${pattern.volume_confirmation ? 'Yes' : 'No'}`);
      console.log(`   Expected Days to Breakout: ${pattern.timeframe === '1d' ? '8-9' : pattern.timeframe === '1h' ? '5-6' : '6-7'} days`);
      console.log('---------------------------------------------');
    });
  }
}

getActivePatterns(); 