import React, { useEffect, useState } from 'react';
import { stockRecommendationService } from '@/services/api/stockRecommendationService';
import { PatternData } from '@/services/types/patternTypes';

/**
 * Dashboard component for displaying accurate stock recommendations
 */
const AccurateRecommendationDashboard: React.FC = () => {
  const [recommendations, setRecommendations] = useState<Record<string, PatternData[]>>({
    dayTrading: [],
    swingTrading: [],
    golden: []
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'dayTrading' | 'swingTrading' | 'golden'>('dayTrading');
  const [confidenceFilter, setConfidenceFilter] = useState<number>(80);
  const [directionFilter, setDirectionFilter] = useState<'bullish' | 'bearish' | undefined>(undefined);

  // Function to load recommendations
  const loadRecommendations = async () => {
    try {
      setLoading(true);
      
      const results = await stockRecommendationService.getAllRecommendations(
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
    
    // Set up interval to refresh data every 5 minutes
    const intervalId = setInterval(loadRecommendations, 5 * 60 * 1000);
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, [confidenceFilter, directionFilter]);

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Breakout Scanner with Accurate Pricing</h2>
        <div className="flex items-center">
          <span className="mr-2">Last updated: {lastUpdated}</span>
          <button 
            onClick={loadRecommendations}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {loading ? 'Refreshing...' : 'Refresh Data'}
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
      
      {/* Tabs */}
      <div className="mb-4 border-b">
        <div className="flex">
          <button
            className={`py-2 px-4 font-medium ${activeTab === 'dayTrading' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('dayTrading')}
          >
            Day Trading
            {recommendations.dayTrading.length > 0 && (
              <span className="ml-2 bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
                {recommendations.dayTrading.length}
              </span>
            )}
          </button>
          <button
            className={`py-2 px-4 font-medium ${activeTab === 'swingTrading' ? 'border-b-2 border-purple-500 text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('swingTrading')}
          >
            Swing Trading
            {recommendations.swingTrading.length > 0 && (
              <span className="ml-2 bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-xs">
                {recommendations.swingTrading.length}
              </span>
            )}
          </button>
          <button
            className={`py-2 px-4 font-medium ${activeTab === 'golden' ? 'border-b-2 border-yellow-500 text-yellow-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('golden')}
          >
            Golden Scanner
            {recommendations.golden.length > 0 && (
              <span className="ml-2 bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-xs">
                {recommendations.golden.length}
              </span>
            )}
          </button>
        </div>
      </div>
      
      {/* Content */}
      {loading && Object.keys(recommendations).every(key => recommendations[key as keyof typeof recommendations].length === 0) ? (
        <div className="p-4 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mr-2"></div>
          Loading stock recommendations...
        </div>
      ) : (
        <div>
          {/* Day Trading Tab */}
          {activeTab === 'dayTrading' && (
            <div>
              <div className="mb-3 flex justify-between items-center">
                <h3 className="text-lg font-semibold">Day Trading Recommendations</h3>
                <div className="text-sm text-gray-500">
                  Showing {recommendations.dayTrading.length} results
                </div>
              </div>
              
              {recommendations.dayTrading.length === 0 ? (
                <p className="text-gray-500">No recommendations found matching your criteria.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recommendations.dayTrading.map((rec, index) => (
                    <div key={`day-${index}`} className="bg-white p-4 rounded shadow border-l-4 border-blue-500">
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
                          <p className="text-gray-700">${rec.entry.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="font-medium">Target</p>
                          <p className="text-green-600">${rec.target.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="font-medium">Stop</p>
                          <p className="text-red-600">${rec.stopLoss.toFixed(2)}</p>
                        </div>
                      </div>
                      
                      <div className="mt-3 flex justify-between text-sm">
                        <div>
                          <span className="font-medium">Direction:</span> 
                          <span className={rec.direction === 'bullish' ? 'text-green-600 ml-1' : 'text-red-600 ml-1'}>
                            {rec.direction.charAt(0).toUpperCase() + rec.direction.slice(1)}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Profit:</span> 
                          <span className="text-green-600 ml-1">{rec.potentialProfit.toFixed(1)}%</span>
                        </div>
                      </div>
                      
                      <div className="mt-2 text-sm">
                        <span className="font-medium">Timeframe:</span> 
                        <span className="ml-1">{rec.timeframe}</span>
                        {rec.multiTimeframeConfirmation && (
                          <span className="ml-2 bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full text-xs">
                            Multi-TF Confirmed
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Swing Trading Tab */}
          {activeTab === 'swingTrading' && (
            <div>
              <div className="mb-3 flex justify-between items-center">
                <h3 className="text-lg font-semibold">Swing Trading Recommendations</h3>
                <div className="text-sm text-gray-500">
                  Showing {recommendations.swingTrading.length} results
                </div>
              </div>
              
              {recommendations.swingTrading.length === 0 ? (
                <p className="text-gray-500">No recommendations found matching your criteria.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recommendations.swingTrading.map((rec, index) => (
                    <div key={`swing-${index}`} className="bg-white p-4 rounded shadow border-l-4 border-purple-500">
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
                          <p className="text-gray-700">${rec.entry.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="font-medium">Target</p>
                          <p className="text-green-600">${rec.target.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="font-medium">Stop</p>
                          <p className="text-red-600">${rec.stopLoss.toFixed(2)}</p>
                        </div>
                      </div>
                      
                      <div className="mt-3 flex justify-between text-sm">
                        <div>
                          <span className="font-medium">Direction:</span> 
                          <span className={rec.direction === 'bullish' ? 'text-green-600 ml-1' : 'text-red-600 ml-1'}>
                            {rec.direction.charAt(0).toUpperCase() + rec.direction.slice(1)}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Profit:</span> 
                          <span className="text-green-600 ml-1">{rec.potentialProfit.toFixed(1)}%</span>
                        </div>
                      </div>
                      
                      <div className="mt-2 text-sm">
                        <span className="font-medium">Timeframe:</span> 
                        <span className="ml-1">{rec.timeframe}</span>
                        {rec.multiTimeframeConfirmation && (
                          <span className="ml-2 bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full text-xs">
                            Multi-TF Confirmed
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Golden Scanner Tab */}
          {activeTab === 'golden' && (
            <div>
              <div className="mb-3 flex justify-between items-center">
                <h3 className="text-lg font-semibold">Golden Scanner Recommendations</h3>
                <div className="text-sm text-gray-500">
                  Showing {recommendations.golden.length} results
                </div>
              </div>
              
              {recommendations.golden.length === 0 ? (
                <p className="text-gray-500">No recommendations found matching your criteria.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recommendations.golden.map((rec, index) => (
                    <div key={`golden-${index}`} className="bg-white p-4 rounded shadow border-l-4 border-yellow-500">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-lg">{rec.symbol}</h4>
                          <p className="text-sm text-gray-600">{rec.patternType}</p>
                        </div>
                        <div className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm font-medium">
                          {rec.confidenceScore}% Confidence
                        </div>
                      </div>
                      
                      <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <p className="font-medium">Current</p>
                          <p className="text-gray-700">${rec.entry.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="font-medium">Target</p>
                          <p className="text-green-600">${rec.target.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="font-medium">Stop</p>
                          <p className="text-red-600">${rec.stopLoss.toFixed(2)}</p>
                        </div>
                      </div>
                      
                      <div className="mt-3 flex justify-between text-sm">
                        <div>
                          <span className="font-medium">Direction:</span> 
                          <span className={rec.direction === 'bullish' ? 'text-green-600 ml-1' : 'text-red-600 ml-1'}>
                            {rec.direction.charAt(0).toUpperCase() + rec.direction.slice(1)}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Profit:</span> 
                          <span className="text-green-600 ml-1">{rec.potentialProfit.toFixed(1)}%</span>
                        </div>
                      </div>
                      
                      <div className="mt-2 text-sm">
                        <span className="font-medium">Timeframe:</span> 
                        <span className="ml-1">{rec.timeframe}</span>
                        <span className="ml-2 bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full text-xs">
                          Multi-TF Confirmed
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h3 className="text-lg font-semibold mb-2">Data Source Information</h3>
        <p>All stock prices and recommendations are powered by Yahoo Finance API, providing accurate real-time market data.</p>
        <p className="mt-2">Day Trading scanner focuses on 15-minute to 1-hour timeframes with a universe of 20 stocks that are either indices or have 0DTE options.</p>
        <p className="mt-2">Swing Trading scanner focuses on 4-hour to 1-week timeframes with a universe of 100 stocks that have volatility, high volume, and big swings.</p>
        <p className="mt-2">Golden Scanner shows only the highest confidence setups (90%+) with multi-timeframe confirmation for the most reliable trading opportunities.</p>
      </div>
    </div>
  );
};

export default AccurateRecommendationDashboard;
