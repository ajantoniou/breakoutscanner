import React from 'react';
import { PatternData } from '@/services/types/patternTypes';

interface ScannerStatsProps {
  patterns: PatternData[];
  filteredPatterns: PatternData[];
}

/**
 * Component to display statistics about scanner results
 */
const ScannerStats: React.FC<ScannerStatsProps> = ({ patterns, filteredPatterns }) => {
  // Calculate statistics
  const totalPatterns = patterns.length;
  const filteredCount = filteredPatterns.length;
  
  const bullishCount = filteredPatterns.filter(p => p.direction === 'bullish').length;
  const bearishCount = filteredPatterns.filter(p => p.direction === 'bearish').length;
  
  const bullishPercentage = filteredCount > 0 ? (bullishCount / filteredCount) * 100 : 0;
  const bearishPercentage = filteredCount > 0 ? (bearishCount / filteredCount) * 100 : 0;
  
  // Count patterns by timeframe
  const patternsByTimeframe: Record<string, number> = {};
  filteredPatterns.forEach(pattern => {
    patternsByTimeframe[pattern.timeframe] = (patternsByTimeframe[pattern.timeframe] || 0) + 1;
  });
  
  // Count patterns by type
  const patternsByType: Record<string, number> = {};
  filteredPatterns.forEach(pattern => {
    patternsByType[pattern.patternType] = (patternsByType[pattern.patternType] || 0) + 1;
  });
  
  // Count patterns with multi-timeframe confirmation
  const confirmedCount = filteredPatterns.filter(p => p.multiTimeframeConfirmation).length;
  const confirmedPercentage = filteredCount > 0 ? (confirmedCount / filteredCount) * 100 : 0;

  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="text-lg font-semibold mb-3">Scanner Statistics</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-gray-50 p-3 rounded">
          <p className="text-sm text-gray-500">Total Patterns</p>
          <p className="text-xl font-semibold">{totalPatterns}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <p className="text-sm text-gray-500">Filtered Results</p>
          <p className="text-xl font-semibold">{filteredCount}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <p className="text-sm text-gray-500">Multi-TF Confirmed</p>
          <p className="text-xl font-semibold">{confirmedCount} <span className="text-sm font-normal text-gray-500">({confirmedPercentage.toFixed(0)}%)</span></p>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <p className="text-sm text-gray-500">Avg. Confidence</p>
          <p className="text-xl font-semibold">
            {filteredCount > 0 
              ? (filteredPatterns.reduce((sum, p) => sum + p.confidenceScore, 0) / filteredCount).toFixed(0) 
              : 0}%
          </p>
        </div>
      </div>
      
      <div className="mb-4">
        <h4 className="font-medium mb-2">Direction Distribution</h4>
        <div className="flex h-6 rounded overflow-hidden">
          {bullishCount > 0 && (
            <div 
              className="bg-green-500 text-white text-xs flex items-center justify-center"
              style={{ width: `${bullishPercentage}%` }}
            >
              {bullishPercentage > 10 ? `${bullishCount} (${bullishPercentage.toFixed(0)}%)` : ''}
            </div>
          )}
          {bearishCount > 0 && (
            <div 
              className="bg-red-500 text-white text-xs flex items-center justify-center"
              style={{ width: `${bearishPercentage}%` }}
            >
              {bearishPercentage > 10 ? `${bearishCount} (${bearishPercentage.toFixed(0)}%)` : ''}
            </div>
          )}
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <div>Bullish: {bullishCount}</div>
          <div>Bearish: {bearishCount}</div>
        </div>
      </div>
      
      {Object.keys(patternsByTimeframe).length > 0 && (
        <div className="mb-4">
          <h4 className="font-medium mb-2">Patterns by Timeframe</h4>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(patternsByTimeframe).map(([timeframe, count]) => (
              <div key={timeframe} className="bg-gray-50 p-2 rounded text-center">
                <p className="text-sm font-medium">{timeframe}</p>
                <p className="text-gray-600">{count}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {Object.keys(patternsByType).length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Patterns by Type</h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(patternsByType).map(([type, count]) => (
              <div key={type} className="bg-gray-50 p-2 rounded text-center">
                <p className="text-sm font-medium">{type}</p>
                <p className="text-gray-600">{count}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScannerStats;
