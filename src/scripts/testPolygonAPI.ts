import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

// Use the API key from the screenshot
const POLYGON_API_KEY = 'onEimwzRMEYR2FhgLVBZnAmyz9EC8KfI';

async function testPolygonAPI() {
  console.log('Testing Polygon API connection...');
  
  try {
    // Test the REST API
    const response = await fetch(`https://api.polygon.io/v2/aggs/ticker/AAPL/range/1/day/2023-01-01/2023-01-10?apiKey=${POLYGON_API_KEY}`);
    const data = await response.json();
    
    console.log('API Response Status:', response.status);
    console.log('API Response:', JSON.stringify(data, null, 2));
    
    // Now try to access S3 flat files info
    console.log('\nS3 Credentials Information:');
    console.log('Access Key ID:', process.env.POLYGON_ACCESS_KEY_ID || '40952a0d-d560-4ebc-993b-669ff34a7bbb');
    console.log('Secret Access Key is available');
    console.log('S3 Endpoint: https://files.polygon.io');
    console.log('Bucket: flatfiles');
    
    // Print subscription info from the API
    const subscriptionResponse = await fetch(`https://api.polygon.io/v1/reference/status?apiKey=${POLYGON_API_KEY}`);
    const subscriptionData = await subscriptionResponse.json();
    console.log('\nSubscription Status:');
    console.log(JSON.stringify(subscriptionData, null, 2));
    
  } catch (error) {
    console.error('Error testing Polygon API:', error);
  }
}

testPolygonAPI(); 