import React, { useEffect, useState } from 'react';
import { realTimeDataService } from '@/services/api/marketData/realTimeDataService';
import { yahooDataTestSymbols } from './yahooDataTestSymbols';

/**
 * Component to test Yahoo Finance API integration
 */
const YahooFinanceTest: React.FC = () => {
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
        
        // Test candle data for AAPL
        const appleCandles = await realTimeDataService.getLatestCandles('AAPL', '1d', 5);
        results.appleCandles = appleCandles;
        
        // Test price accuracy verification
        const tslaPrice = await realTimeDataService.getCurrentPrice('TSLA');
        const accuracyTest = await realTimeDataService.verifyPriceAccuracy('TSLA', tslaPrice);
        results.accuracyTest = {
          symbol: 'TSLA',
          price: tslaPrice,
          isAccurate: accuracyTest
        };
        
        setTestResults(results);
        setLoading(false);
      } catch (err) {
        console.error('Error running Yahoo Finance tests:', err);
        setError(`Error running tests: ${err instanceof Error ? err.message : String(err)}`);
        setLoading(false);
      }
    };
    
    runTests();
  }, []);

  if (loading) {
    return <div className="p-4">Loading Yahoo Finance test results...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">Error: {error}</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Yahoo Finance API Integration Test</h2>
      
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Current Prices</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(testResults.currentPrices || {}).map(([symbol, price]) => (
            <div key={symbol} className="bg-white p-3 rounded shadow">
              <div className="font-bold">{symbol}</div>
              <div className="text-lg">${(price as number).toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">AAPL Candle Data (Last 5 Days)</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Open</th>
                <th className="px-4 py-2">High</th>
                <th className="px-4 py-2">Low</th>
                <th className="px-4 py-2">Close</th>
                <th className="px-4 py-2">Volume</th>
              </tr>
            </thead>
            <tbody>
              {(testResults.appleCandles || []).map((candle: any, index: number) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="px-4 py-2">{new Date(candle.timestamp).toLocaleDateString()}</td>
                  <td className="px-4 py-2">${candle.open.toFixed(2)}</td>
                  <td className="px-4 py-2">${candle.high.toFixed(2)}</td>
                  <td className="px-4 py-2">${candle.low.toFixed(2)}</td>
                  <td className="px-4 py-2">${candle.close.toFixed(2)}</td>
                  <td className="px-4 py-2">{candle.volume.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Price Accuracy Test</h3>
        {testResults.accuracyTest && (
          <div className="bg-white p-4 rounded shadow">
            <div>Symbol: {testResults.accuracyTest.symbol}</div>
            <div>Current Price: ${testResults.accuracyTest.price.toFixed(2)}</div>
            <div>
              Accuracy: 
              <span className={testResults.accuracyTest.isAccurate ? 'text-green-600 ml-2' : 'text-red-600 ml-2'}>
                {testResults.accuracyTest.isAccurate ? 'Accurate' : 'Inaccurate'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default YahooFinanceTest;
