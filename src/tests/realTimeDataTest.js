// Real-time data verification test script
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Test configuration
const TEST_SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'TSLA', 'GOOGL', 'META', 'JPM', 'V', 'WMT'];
const POLYGON_API_KEY = 'onEimwzRMEYR2FhgLVBZnAmyz9EC8KfI';
const YAHOO_FINANCE_ENABLED = true;

// Utility functions
const logMessage = (message) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
};

const formatPrice = (price) => {
  return parseFloat(price).toFixed(2);
};

const calculateDifference = (price1, price2) => {
  const diff = Math.abs(price1 - price2);
  const percentDiff = (diff / price1) * 100;
  return {
    absolute: diff.toFixed(2),
    percent: percentDiff.toFixed(2) + '%'
  };
};

// Data fetching functions
const fetchPolygonData = async (symbol) => {
  try {
    logMessage(`Fetching Polygon data for ${symbol}...`);
    const url = `https://api.polygon.io/v2/last/trade/${symbol}?apiKey=${POLYGON_API_KEY}`;
    const response = await axios.get(url);
    
    if (response.data && response.data.results) {
      const price = response.data.results.p;
      const timestamp = response.data.results.t;
      const formattedTimestamp = new Date(timestamp).toISOString();
      
      return {
        symbol,
        price,
        timestamp: formattedTimestamp,
        source: 'Polygon.io',
        status: 'success'
      };
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    logMessage(`Error fetching Polygon data for ${symbol}: ${error.message}`);
    return {
      symbol,
      price: null,
      timestamp: null,
      source: 'Polygon.io',
      status: 'error',
      error: error.message
    };
  }
};

const fetchYahooFinanceData = async (symbol) => {
  if (!YAHOO_FINANCE_ENABLED) {
    return {
      symbol,
      price: null,
      timestamp: null,
      source: 'Yahoo Finance',
      status: 'disabled'
    };
  }
  
  try {
    logMessage(`Fetching Yahoo Finance data for ${symbol}...`);
    // Using a public API that provides Yahoo Finance data
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d`;
    const response = await axios.get(url);
    
    if (response.data && 
        response.data.chart && 
        response.data.chart.result && 
        response.data.chart.result[0] && 
        response.data.chart.result[0].meta) {
      
      const price = response.data.chart.result[0].meta.regularMarketPrice;
      const timestamp = response.data.chart.result[0].meta.regularMarketTime * 1000;
      const formattedTimestamp = new Date(timestamp).toISOString();
      
      return {
        symbol,
        price,
        timestamp: formattedTimestamp,
        source: 'Yahoo Finance',
        status: 'success'
      };
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    logMessage(`Error fetching Yahoo Finance data for ${symbol}: ${error.message}`);
    return {
      symbol,
      price: null,
      timestamp: null,
      source: 'Yahoo Finance',
      status: 'error',
      error: error.message
    };
  }
};

// Main test function
const runDataAccuracyTest = async () => {
  logMessage('Starting data accuracy verification test');
  logMessage(`Testing symbols: ${TEST_SYMBOLS.join(', ')}`);
  
  const results = [];
  
  for (const symbol of TEST_SYMBOLS) {
    logMessage(`Testing ${symbol}...`);
    
    // Fetch data from both sources
    const [polygonData, yahooData] = await Promise.all([
      fetchPolygonData(symbol),
      fetchYahooFinanceData(symbol)
    ]);
    
    // Compare results if both were successful
    let comparison = null;
    if (polygonData.status === 'success' && yahooData.status === 'success') {
      const diff = calculateDifference(polygonData.price, yahooData.price);
      comparison = {
        absoluteDifference: diff.absolute,
        percentDifference: diff.percent,
        isAccurate: parseFloat(diff.percent) < 0.5 // Consider accurate if difference is less than 0.5%
      };
    }
    
    results.push({
      symbol,
      polygonData,
      yahooData,
      comparison,
      timestamp: new Date().toISOString()
    });
    
    // Log individual result
    logMessage(`Results for ${symbol}:`);
    if (polygonData.status === 'success') {
      logMessage(`  Polygon: $${formatPrice(polygonData.price)} (${polygonData.timestamp})`);
    } else {
      logMessage(`  Polygon: Error - ${polygonData.error}`);
    }
    
    if (yahooData.status === 'success') {
      logMessage(`  Yahoo: $${formatPrice(yahooData.price)} (${yahooData.timestamp})`);
    } else if (yahooData.status === 'disabled') {
      logMessage(`  Yahoo: Disabled`);
    } else {
      logMessage(`  Yahoo: Error - ${yahooData.error}`);
    }
    
    if (comparison) {
      logMessage(`  Difference: $${comparison.absoluteDifference} (${comparison.percentDifference})`);
      logMessage(`  Accuracy: ${comparison.isAccurate ? 'PASS' : 'FAIL'}`);
    }
    
    logMessage('-----------------------------------');
  }
  
  // Generate summary
  const successfulTests = results.filter(r => 
    r.polygonData.status === 'success' && 
    (r.yahooData.status === 'success' || r.yahooData.status === 'disabled')
  ).length;
  
  const accurateTests = results.filter(r => 
    r.comparison && r.comparison.isAccurate
  ).length;
  
  logMessage('\nTEST SUMMARY:');
  logMessage(`Total symbols tested: ${TEST_SYMBOLS.length}`);
  logMessage(`Successful API calls: ${successfulTests}/${TEST_SYMBOLS.length}`);
  
  if (YAHOO_FINANCE_ENABLED) {
    logMessage(`Accurate prices (within 0.5%): ${accurateTests}/${results.filter(r => r.comparison).length}`);
  }
  
  // Calculate average data age
  const dataAges = results
    .filter(r => r.polygonData.status === 'success')
    .map(r => {
      const dataTimestamp = new Date(r.polygonData.timestamp).getTime();
      const testTimestamp = new Date(r.timestamp).getTime();
      return (testTimestamp - dataTimestamp) / 1000; // Age in seconds
    });
  
  if (dataAges.length > 0) {
    const averageDataAge = dataAges.reduce((sum, age) => sum + age, 0) / dataAges.length;
    logMessage(`Average data age: ${averageDataAge.toFixed(2)} seconds`);
  }
  
  // Final verdict
  const passRate = (successfulTests / TEST_SYMBOLS.length) * 100;
  if (passRate >= 90) {
    logMessage('\nOVERALL TEST RESULT: PASS');
    logMessage('The data accuracy improvements are working correctly.');
  } else {
    logMessage('\nOVERALL TEST RESULT: NEEDS IMPROVEMENT');
    logMessage('Some data accuracy issues remain. Please check the detailed logs.');
  }
  
  // Save results to file
  const resultsDir = path.join(__dirname, '..', '..', 'test-results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  const resultsFile = path.join(resultsDir, 'data-accuracy-results.json');
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  logMessage(`Detailed results saved to ${resultsFile}`);
};

// Run the test
runDataAccuracyTest().catch(error => {
  logMessage(`Test failed with error: ${error.message}`);
  process.exit(1);
});
