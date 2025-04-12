import React, { useEffect, useState } from 'react';
import { yahooStockRecommendationService } from '@/services/api/yahoo/yahooStockRecommendationService';

/**
 * Component to test Yahoo Finance stock recommendations with accurate pricing
 */
const YahooFinanceRecommendationTest: React.FC = () => {
  const [recommendations, setRecommendations] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [confidenceFilter, setConfidenceFilter] = useState<number>(80);
  const [directionFilter, setDirectionFilter] = useState<'bullish' | 'bearish' | undefined>(undefined);

  // Function to load recommendations
  const loadRecommendations = async () => {
    try {
      setLoading(true);
      
      const results = await yahooStockRecommendationService.getAllTimeframeRecommendations(
        confidenceFilter,
        directionFilter
      );
      
      setRecommendations(results);
      setLastUpdated(new Date().toLocaleTimeString());
      setLoading(false);
    } catch (err) {
      console.error('Error loading stock recommendations:', err);
      setError(`Error loading recommendations: ${err instanceof Error ? err.message : String(err)}`);
      setLoading(false);
    }
  };

  // Load recommendations on component mount and when filters change
  useEffect(() => {
    loadRecommendations();
  }, [confidenceFilter, directionFilter]);

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Stock Recommendations with Accurate Pricing</h2>
        <div className="flex items-center">
          <span className="mr-2">Last updated: {lastUpdated}</span>
          <button 
            onClick={loadRecommendations}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>
      
      <div className="mb-6 flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Confidence Filter</label>
          <select 
            value={confidenceFilter}
            onChange={(e) => setConfidenceFilter(Number(e.target.value))}
            className="p-2 border rounded"
          >
            <option value={60}>60%+</option>
            <option value={70}>70%+</option>
            <option value={80}>80%+</option>
            <option value={90}>90%+</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Direction Filter</label>
          <select 
            value={directionFilter || ''}
            onChange={(e) => setDirectionFilter(e.target.value === '' ? undefined : e.target.value as 'bullish' | 'bearish')}
            className="p-2 border rounded"
          >
            <option value="">All</option>
            <option value="bullish">Bullish</option>
            <option value="bearish">Bearish</option>
          </select>
        </div>
      </div>
      
      {error && (
        <div className="p-4 mb-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {loading && Object.keys(recommendations).length === 0 ? (
        <div className="p-4 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mr-2"></div>
          Loading stock recommendations...
        </div>
      ) : (
        <div className="space-y-8">
          {/* 1-Hour Timeframe */}
          <div>
            <h3 className="text-lg font-semibold mb-3">1-Hour Timeframe</h3>
            {recommendations['1h']?.length === 0 ? (
              <p className="text-gray-500">No recommendations found for this timeframe.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendations['1h']?.map((rec, index) => (
                  <div key={`1h-${index}`} className="bg-white p-4 rounded shadow border-l-4 border-blue-500">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-lg">{rec.symbol}</h4>
                        <p className="text-sm text-gray-600">{rec.patternType}</p>
                      </div>
                      <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
                        {rec.confidenceScore}% Confidence
                      </div>
                    </div>
                    
                    <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="font-medium">Current</p>
                        <p className="text-gray-700">${rec.currentPrice.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="font-medium">Target</p>
                        <p className="text-green-600">${rec.targetPrice.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="font-medium">Stop</p>
                        <p className="text-red-600">${rec.stopLossPrice.toFixed(2)}</p>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex justify-between text-sm">
                      <div>
                        <span className="font-medium">Direction:</span> 
                        <span className={rec.direction === 'Bullish' ? 'text-green-600 ml-1' : 'text-red-600 ml-1'}>
                          {rec.direction}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Profit:</span> 
                        <span className="text-green-600 ml-1">{rec.potentialProfit.toFixed(1)}%</span>
                      </div>
                    </div>
                    
                    <div className="mt-2 text-sm">
                      <span className="font-medium">Expected Breakout:</span> 
                      <span className="ml-1">{rec.expectedBreakout}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* 4-Hour Timeframe */}
          <div>
            <h3 className="text-lg font-semibold mb-3">4-Hour Timeframe</h3>
            {recommendations['4h']?.length === 0 ? (
              <p className="text-gray-500">No recommendations found for this timeframe.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendations['4h']?.map((rec, index) => (
                  <div key={`4h-${index}`} className="bg-white p-4 rounded shadow border-l-4 border-purple-500">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-lg">{rec.symbol}</h4>
                        <p className="text-sm text-gray-600">{rec.patternType}</p>
                      </div>
                      <div className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm font-medium">
                        {rec.confidenceScore}% Confidence
                      </div>
                    </div>
                    
                    <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="font-medium">Current</p>
                        <p className="text-gray-700">${rec.currentPrice.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="font-medium">Target</p>
                        <p className="text-green-600">${rec.targetPrice.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="font-medium">Stop</p>
                        <p className="text-red-600">${rec.stopLossPrice.toFixed(2)}</p>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex justify-between text-sm">
                      <div>
                        <span className="font-medium">Direction:</span> 
                        <span className={rec.direction === 'Bullish' ? 'text-green-600 ml-1' : 'text-red-600 ml-1'}>
                          {rec.direction}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Profit:</span> 
                        <span className="text-green-600 ml-1">{rec.potentialProfit.toFixed(1)}%</span>
                      </div>
                    </div>
                    
                    <div className="mt-2 text-sm">
                      <span className="font-medium">Expected Breakout:</span> 
                      <span className="ml-1">{rec.expectedBreakout}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* 1-Day Timeframe */}
          <div>
            <h3 className="text-lg font-semibold mb-3">1-Day Timeframe</h3>
            {recommendations['1d']?.length === 0 ? (
              <p className="text-gray-500">No recommendations found for this timeframe.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendations['1d']?.map((rec, index) => (
                  <div key={`1d-${index}`} className="bg-white p-4 rounded shadow border-l-4 border-green-500">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-lg">{rec.symbol}</h4>
                        <p className="text-sm text-gray-600">{rec.patternType}</p>
                      </div>
                      <div className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-medium">
                        {rec.confidenceScore}% Confidence
                      </div>
                    </div>
                    
                    <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="font-medium">Current</p>
                        <p className="text-gray-700">${rec.currentPrice.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="font-medium">Target</p>
                        <p className="text-green-600">${rec.targetPrice.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="font-medium">Stop</p>
                        <p className="text-red-600">${rec.stopLossPrice.toFixed(2)}</p>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex justify-between text-sm">
                      <div>
                        <span className="font-medium">Direction:</span> 
                        <span className={rec.direction === 'Bullish' ? 'text-green-600 ml-1' : 'text-red-600 ml-1'}>
                          {rec.direction}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Profit:</span> 
                        <span className="text-green-600 ml-1">{rec.potentialProfit.toFixed(1)}%</span>
                      </div>
                    </div>
                    
                    <div className="mt-2 text-sm">
                      <span className="font-medium">Expected Breakout:</span> 
                      <span className="ml-1">{rec.expectedBreakout}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h3 className="text-lg font-semibold mb-2">Data Source Information</h3>
        <p>All stock prices and recommendations are powered by Yahoo Finance API, providing accurate real-time market data.</p>
        <p className="mt-2">The recommendations include expected breakout timing based on historical pattern analysis.</p>
        <p className="mt-2">Filter by confidence score and direction to find the best opportunities for your trading strategy.</p>
      </div>
    </div>
  );
};

export default YahooFinanceRecommendationTest;
