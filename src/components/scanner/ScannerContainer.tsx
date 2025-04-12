import React, { useState } from 'react';
import AccurateRecommendationDashboard from './AccurateRecommendationDashboard';
import YahooFinanceTest from '../testing/YahooFinanceTest';
import YahooFinanceRealTimeTest from '../testing/YahooFinanceRealTimeTest';
import YahooFinanceRecommendationTest from '../testing/YahooFinanceRecommendationTest';
import YahooBacktestDashboard from '../backtest/YahooBacktestDashboard';

/**
 * Container component for the scanner interface
 */
const ScannerContainer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('scanner');

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Breakout Scanner with Accurate Pricing</h1>
      
      {/* Navigation Tabs */}
      <div className="mb-6 border-b">
        <div className="flex flex-wrap -mb-px">
          <button
            className={`mr-2 py-2 px-4 font-medium ${
              activeTab === 'scanner' 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('scanner')}
          >
            Scanner Dashboard
          </button>
          <button
            className={`mr-2 py-2 px-4 font-medium ${
              activeTab === 'backtest' 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('backtest')}
          >
            Backtest Dashboard
          </button>
          <button
            className={`mr-2 py-2 px-4 font-medium ${
              activeTab === 'realtime' 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('realtime')}
          >
            Real-Time Prices
          </button>
          <button
            className={`mr-2 py-2 px-4 font-medium ${
              activeTab === 'test' 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('test')}
          >
            Data Accuracy Test
          </button>
        </div>
      </div>
      
      {/* Tab Content */}
      <div>
        {activeTab === 'scanner' && <AccurateRecommendationDashboard />}
        {activeTab === 'backtest' && <YahooBacktestDashboard />}
        {activeTab === 'realtime' && <YahooFinanceRealTimeTest />}
        {activeTab === 'test' && (
          <div>
            <YahooFinanceTest />
            <div className="mt-8">
              <YahooFinanceRecommendationTest />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScannerContainer;
