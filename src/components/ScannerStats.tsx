import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle } from 'lucide-react';

interface ScannerStatsProps {
  winRate?: number;  // Win rate as a percentage
  totalSignals?: number;  // Total number of signals analyzed
  accuracyByTimeframe?: Record<string, number>;  // Accuracy by timeframe
}

const ScannerStats: React.FC<ScannerStatsProps> = ({
  winRate = 69.88,  // Default to our backtest win rate
  totalSignals = 83,  // Default to our backtest total
  accuracyByTimeframe = { 
    '15m': 68.45, 
    '30m': 72.31, 
    '1h': 69.88, 
    '4h': 75.12,
    'daily': 77.50,
  },
}) => {
  // Helper to get the color based on accuracy
  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 75) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    if (accuracy >= 65) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
  };

  return (
    <Card className="border-2 border-indigo-100 dark:border-indigo-900 mb-6">
      <CardHeader className="bg-indigo-50 dark:bg-indigo-950/30 pb-2">
        <CardTitle className="text-xl flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          Accuracy Statistics
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-3 mb-3">
              <div className={`text-2xl font-bold px-2 py-1 rounded ${getAccuracyColor(winRate)}`}>
                {winRate.toFixed(2)}%
              </div>
              <div className="text-sm">
                <p className="font-medium">Overall Win Rate</p>
                <p className="text-slate-500 dark:text-slate-400 text-xs">
                  Based on {totalSignals} analyzed signals
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Target Accuracy: 75%</p>
              <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5">
                <div 
                  className={`h-2.5 rounded-full ${winRate >= 75 ? 'bg-green-600' : 'bg-amber-500'}`}
                  style={{ width: `${Math.min(100, (winRate / 75) * 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {winRate >= 75 
                  ? 'Target accuracy achieved!' 
                  : `${((75 - winRate) / 75 * 100).toFixed(1)}% improvement needed to reach target`}
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Accuracy by Timeframe</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(accuracyByTimeframe).map(([timeframe, accuracy]) => (
                <Badge 
                  key={timeframe}
                  variant="outline" 
                  className={`flex justify-between items-center ${getAccuracyColor(accuracy)}`}
                >
                  <span>{timeframe}:</span>
                  <span className="font-bold">{accuracy.toFixed(1)}%</span>
                </Badge>
              ))}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Higher timeframes generally show higher accuracy (4h+: {(accuracyByTimeframe['4h'] || 0).toFixed(1)}%+)
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ScannerStats; 