import React, { useEffect, useState } from 'react';
import { stockRecommendationService } from '@/services/api/stockRecommendationService';
import { backtestPatternsWithYahoo, getBacktestStatistics } from '@/services/backtesting/yahooBacktestService';
import { PatternData } from '@/services/types/patternTypes';
import { BacktestResult } from '@/services/types/backtestTypes';

/**
 * Dashboard component for backtesting with Yahoo Finance data
 */
const YahooBacktestDashboard: React.FC = () => {
  const [patterns, setPatterns] = useState<PatternData[]>([]);
  const [backtestResults, setBacktestResults] = useState<BacktestResult[]>([]);
  const [statistics, setStatistics] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [backtestLoading, setBacktestLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('all');
  const [selectedDirection, setSelectedDirection] = useState<string>('all');

  // Load patterns for backtesting
  const loadPatterns = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get recommendations for all scanner modes
      const allRecommendations = await stockRecommendationService.getAllRecommendations(70);
      
      // Combine all patterns
      const allPatterns = [
        ...allRecommendations.dayTrading,
        ...allRecommendations.swingTrading,
        ...allRecommendations.golden
      ];
      
      // Remove duplicates (same symbol and timeframe)
      const uniquePatterns = allPatterns.filter((pattern, index, self) =>
        index === self.findIndex(p => (
          p.symbol === pattern.symbol && p.timeframe === pattern.timeframe
        ))
      );
      
      setPatterns(uniquePatterns);
      setLoading(false);
    } catch (err) {
      console.error('Error loading patterns for backtesting:', err);
      setError(`Error loading patterns: ${err instanceof Error ? err.message : String(err)}`);
      setLoading(false);
    }
  };

  // Run backtest on loaded patterns
  const runBacktest = async () => {
    try {
      setBacktestLoading(true);
      setError(null);
      
      // Filter patterns based on selected timeframe and direction
      let patternsToTest = [...patterns];
      
      if (selectedTimeframe !== 'all') {
        patternsToTest = patternsToTest.filter(pattern => pattern.timeframe === selectedTimeframe);
      }
      
      if (selectedDirection !== 'all') {
        patternsToTest = patternsToTest.filter(pattern => pattern.direction === selectedDirection);
      }
      
      // Run backtest with Yahoo Finance data
      const results = await backtestPatternsWithYahoo(patternsToTest, true);
      
      // Calculate statistics
      const stats = getBacktestStatistics(results);
      
      setBacktestResults(results);
      setStatistics(stats);
      setBacktestLoading(false);
    } catch (err) {
      console.error('Error running backtest:', err);
      setError(`Error running backtest: ${err instanceof Error ? err.message : String(err)}`);
      setBacktestLoading(false);
    }
  };

  // Load patterns on component mount
  useEffect(() => {
    loadPatterns();
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Backtest with Yahoo Finance Data</h2>
      
      {error && (
        <div className="p-4 mb-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <div className="mb-6 bg-white p-4 rounded shadow">
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Backtest Configuration</h3>
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Timeframe</label>
              <select 
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value)}
                className="p-2 border rounded"
              >
                <option value="all">All Timeframes</option>
                <option value="15m">15 Minutes</option>
                <option value="30m">30 Minutes</option>
                <option value="1h">1 Hour</option>
                <option value="4h">4 Hours</option>
                <option value="1d">1 Day</option>
                <option value="1w">1 Week</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Direction</label>
              <select 
                value={selectedDirection}
                onChange={(e) => setSelectedDirection(e.target.value)}
                className="p-2 border rounded"
              >
                <option value="all">All Directions</option>
                <option value="bullish">Bullish</option>
                <option value="bearish">Bearish</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <button 
            onClick={loadPatterns}
            disabled={loading}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:bg-gray-400"
          >
            {loading ? 'Loading Patterns...' : 'Refresh Patterns'}
          </button>
          
          <button 
            onClick={runBacktest}
            disabled={loading || backtestLoading || patterns.length === 0}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {backtestLoading ? 'Running Backtest...' : 'Run Backtest'}
          </button>
        </div>
        
        <div className="mt-4">
          <p className="text-sm text-gray-600">
            {patterns.length} patterns loaded for backtesting
          </p>
        </div>
      </div>
      
      {/* Backtest Statistics */}
      {Object.keys(statistics).length > 0 && (
        <div className="mb-6 bg-white p-4 rounded shadow">
          <h3 className="text-lg font-semibold mb-4">Backtest Statistics</h3>
          
          <div className="mb-6">
            <h4 className="font-medium mb-2">Overall Performance</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-gray-500">Win Rate</p>
                <p className="text-xl font-semibold">{statistics.overall.winRate.toFixed(1)}%</p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-gray-500">Profit Factor</p>
                <p className="text-xl font-semibold">{statistics.overall.profitFactor.toFixed(2)}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-gray-500">Avg. Profit/Loss</p>
                <p className="text-xl font-semibold">{statistics.overall.averageProfitLoss.toFixed(2)}%</p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-gray-500">Avg. Candles to Breakout</p>
                <p className="text-xl font-semibold">{statistics.overall.averageCandlesToBreakout.toFixed(1)}</p>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Performance by Timeframe</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2 text-left">Timeframe</th>
                    <th className="px-4 py-2 text-right">Trades</th>
                    <th className="px-4 py-2 text-right">Win Rate</th>
                    <th className="px-4 py-2 text-right">Profit Factor</th>
                    <th className="px-4 py-2 text-right">Avg. Candles to Breakout</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(statistics.byTimeframe || {}).map(([timeframe, stats]: [string, any]) => (
                    <tr key={timeframe} className="border-t">
                      <td className="px-4 py-2 font-medium">{timeframe}</td>
                      <td className="px-4 py-2 text-right">{stats.totalTrades}</td>
                      <td className="px-4 py-2 text-right">{stats.winRate.toFixed(1)}%</td>
                      <td className="px-4 py-2 text-right">{stats.profitFactor.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right">{stats.averageCandlesToBreakout.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
      {/* Backtest Results */}
      {backtestResults.length > 0 && (
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-lg font-semibold mb-4">Backtest Results</h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 text-left">Symbol</th>
                  <th className="px-4 py-2 text-left">Pattern</th>
                  <th className="px-4 py-2 text-left">Timeframe</th>
                  <th className="px-4 py-2 text-right">Entry</th>
                  <th className="px-4 py-2 text-right">Exit</th>
                  <th className="px-4 py-2 text-right">P/L %</th>
                  <th className="px-4 py-2 text-center">Result</th>
                  <th className="px-4 py-2 text-right">Candles</th>
                </tr>
              </thead>
              <tbody>
                {backtestResults.map((result, index) => (
                  <tr key={index} className="border-t">
                    <td className="px-4 py-2 font-medium">{result.symbol}</td>
                    <td className="px-4 py-2">{result.patternType}</td>
                    <td className="px-4 py-2">{result.timeframe}</td>
                    <td className="px-4 py-2 text-right">${result.entryPrice.toFixed(2)}</td>
                    <td className="px-4 py-2 text-right">${result.actualExitPrice.toFixed(2)}</td>
                    <td className={`px-4 py-2 text-right ${result.profitLossPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {result.profitLossPercent.toFixed(2)}%
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs ${result.successful ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {result.successful ? 'Win' : 'Loss'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">{result.candlesToBreakout}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h3 className="text-lg font-semibold mb-2">Backtest Information</h3>
        <p>This backtesting system uses Yahoo Finance historical data for accurate performance analysis.</p>
        <p className="mt-2">The "Average Candles to Breakout" metric shows how many candles it typically takes for a pattern to reach its target, helping you position your trades effectively.</p>
        <p className="mt-2">Win Rate and Profit Factor metrics help you identify the most reliable pattern types and timeframes for your trading strategy.</p>
      </div>
    </div>
  );
};

export default YahooBacktestDashboard;
