import * as dotenv from 'dotenv';
import { createPolygonMvpClient } from '../services/api/polygon/polygonMvpClient.ts';

// Load environment variables
dotenv.config();

async function testPolygonClient() {
  console.log('Testing Polygon MVP client...');
  
  const apiKey = process.env.VITE_POLYGON_API_KEY;
  if (!apiKey) {
    console.error('ERROR: VITE_POLYGON_API_KEY environment variable is not set!');
    process.exit(1);
  }
  
  // Create client instance
  const polygonClient = createPolygonMvpClient(apiKey);
  
  // Step 1: Verify connectivity
  console.log('\n1. Verifying API connectivity...');
  const isConnected = await polygonClient.verifyConnectivity();
  if (!isConnected) {
    console.error('ERROR: Failed to connect to Polygon API. Check your API key.');
    process.exit(1);
  }
  
  // Step 2: Get current prices for all stocks in our universe
  console.log('\n2. Fetching current prices for target universe...');
  const currentPrices = await polygonClient.getCurrentPrices();
  console.log(`Received prices for ${currentPrices.length} symbols:`);
  currentPrices.forEach(price => {
    console.log(`  ${price.symbol}: $${price.price.toFixed(2)} (as of ${new Date(price.timestamp).toLocaleTimeString()})`);
  });
  
  // Step 3: Get historical data for a single stock
  const testSymbol = 'AAPL';
  const timeframe = '1h';
  console.log(`\n3. Fetching historical ${timeframe} bars for ${testSymbol}...`);
  
  // Get data for the last 7 days
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 7);
  
  const historicalData = await polygonClient.getHistoricalBars(
    testSymbol,
    timeframe,
    fromDate,
    new Date()
  );
  
  console.log(`Received ${historicalData.bars.length} historical bars for ${testSymbol}`);
  
  if (historicalData.bars.length > 0) {
    // Print the first 3 and last 3 bars
    console.log('First 3 bars:');
    historicalData.bars.slice(0, 3).forEach(bar => {
      console.log(`  ${new Date(bar.t).toLocaleString()}: Open $${bar.o.toFixed(2)}, Close $${bar.c.toFixed(2)}, Volume ${bar.v}`);
    });
    
    console.log('Last 3 bars:');
    historicalData.bars.slice(-3).forEach(bar => {
      console.log(`  ${new Date(bar.t).toLocaleString()}: Open $${bar.o.toFixed(2)}, Close $${bar.c.toFixed(2)}, Volume ${bar.v}`);
    });
  }
  
  console.log('\nPolygon API client test completed successfully!');
}

// Run the test
testPolygonClient().catch(error => {
  console.error('Test failed with error:', error);
  process.exit(1);
}); 