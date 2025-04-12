import React, { useEffect, useState } from 'react';
import { realTimeDataService } from '@/services/api/marketData/realTimeDataService';
import { yahooDataTestSymbols } from './yahooDataTestSymbols';

/**
 * Component to test Yahoo Finance API integration with real-time data
 */
const YahooFinanceRealTimeTest: React.FC = () => {
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Function to run the tests
  const runTests = async () => {
    try {
      setLoading(true);
      
      const results: Record<string, any> = {};
      
      // Test current prices for popular stocks
      const priceResults: Record<string, number> = {};
      for (const symbol of yahooDataTestSymbols) {
        const price = await realTimeDataService.getCurrentPrice(symbol);
        priceResults[symbol] = price;
      }
      
      results.currentPrices = priceResults;
      
      // Get current timestamp
      setLastUpdated(new Date().toLocaleTimeString());
      
      setTestResults(results);
      setLoading(false);
    } catch (err) {
      console.error('Error running Yahoo Finance real-time tests:', err);
      setError(`Error running tests: ${err instanceof Error ? err.message : String(err)}`);
      setLoading(false);
    }
  };

  // Run tests on component mount
  useEffect(() => {
    runTests();
    
    // Set up interval to refresh data every 60 seconds
    const intervalId = setInterval(runTests, 60000);
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Yahoo Finance Real-Time Data Test</h2>
        <div className="flex items-center">
          <span className="mr-2">Last updated: {lastUpdated}</span>
          <button 
            onClick={runTests}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>
      </div>
      
      {error && (
        <div className="p-4 mb-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {loading && !testResults.currentPrices ? (
        <div className="p-4 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mr-2"></div>
          Loading real-time market data...
        </div>
      ) : (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Current Real-Time Prices</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(testResults.currentPrices || {}).map(([symbol, price]) => (
              <div key={symbol} className="bg-white p-3 rounded shadow">
                <div className="font-bold">{symbol}</div>
                <div className="text-lg">${(price as number).toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h3 className="text-lg font-semibold mb-2">Data Source Information</h3>
        <p>This test uses the Yahoo Finance API to fetch real-time market data with high accuracy.</p>
        <p className="mt-2">The data is refreshed automatically every minute or can be manually refreshed using the button above.</p>
      </div>
    </div>
  );
};

export default YahooFinanceRealTimeTest;
