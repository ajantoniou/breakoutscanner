const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBacktestResults() {
  // Check backtest_results
  const { data: backtestData, error: backtestError } = await supabase
    .from('backtest_results')
    .select('*')
    .limit(5);
  
  if (backtestError) {
    console.error('Error fetching backtest results:', backtestError);
    return;
  }
  
  console.log('Backtest results sample:');
  console.log(JSON.stringify(backtestData, null, 2));
  
  // Check columns
  const firstRow = backtestData[0] || {};
  console.log('\nColumns in backtest_results:');
  console.log(Object.keys(firstRow));
  
  // Check detected_patterns (using integer IDs)
  const { data: patternData, error: patternError } = await supabase
    .from('detected_patterns')
    .select('*')
    .limit(2);
  
  if (patternError) {
    console.error('Error fetching detected patterns:', patternError);
  } else {
    console.log('\nDetected patterns sample:');
    console.log(JSON.stringify(patternData, null, 2));
    console.log('\nColumns in detected_patterns:');
    console.log(Object.keys(patternData[0] || {}));
  }
  
  // Check cached_patterns (using UUID IDs)
  const { data: cachedData, error: cachedError } = await supabase
    .from('cached_patterns')
    .select('*')
    .limit(2);
  
  if (cachedError) {
    console.error('Error fetching cached patterns:', cachedError);
  } else {
    console.log('\nCached patterns sample:');
    console.log(JSON.stringify(cachedData, null, 2));
    console.log('\nColumns in cached_patterns:');
    console.log(Object.keys(cachedData[0] || {}));
  }
  
  // Check for pattern ID in cached_patterns
  if (firstRow.pattern_id) {
    console.log('\nLooking up pattern with ID:', firstRow.pattern_id);
    
    // Check in cached_patterns (using UUID)
    const { data: cachedPattern, error: cachedPatternError } = await supabase
      .from('cached_patterns')
      .select('*')
      .eq('id', firstRow.pattern_id)
      .limit(1);
    
    if (cachedPatternError) {
      console.error('Error looking up cached pattern:', cachedPatternError);
    } else if (cachedPattern && cachedPattern.length > 0) {
      console.log('\nFound matching pattern in cached_patterns:');
      console.log(JSON.stringify(cachedPattern[0], null, 2));
    } else {
      console.log('\nPattern not found in cached_patterns!');
      
      // Try a more generic query to see if any patterns exist with similar IDs
      const { data: anyPatterns, error: anyError } = await supabase
        .from('cached_patterns')
        .select('id')
        .limit(5);
      
      if (!anyError && anyPatterns) {
        console.log('\nSample pattern IDs in cached_patterns:');
        console.log(anyPatterns.map(p => p.id));
      }
    }
  }
}

checkBacktestResults().catch(console.error); 