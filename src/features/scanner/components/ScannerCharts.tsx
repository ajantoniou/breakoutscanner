
import React from 'react';
import { PatternData, TimeframeStats } from '@/services/types/patternTypes';
import { BacktestResult } from '@/services/types/backtestTypes';
import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface ScannerChartsProps {
  patterns: PatternData[];
  backtestResults: BacktestResult[];
  patternTypeStats: Record<string, number>;
  timeframeStats: TimeframeStats;
}

const ScannerCharts: React.FC<ScannerChartsProps> = ({
  patterns,
  backtestResults,
  patternTypeStats,
  timeframeStats
}) => {
  // Create data for pattern status chart
  const statusData = [
    { name: 'Active', value: patterns.filter(p => p.status === 'active').length, color: '#22c55e' },
    { name: 'Completed', value: patterns.filter(p => p.status === 'completed').length, color: '#3b82f6' },
    { name: 'Failed', value: patterns.filter(p => p.status === 'failed').length, color: '#ef4444' }
  ].filter(item => item.value > 0);

  // Create data for pattern type chart
  const patternTypeData = Object.entries(patternTypeStats)
    .map(([key, value]) => ({ name: key, value, color: getColorForPattern(key) }))
    .filter(item => item.value > 0);

  // Skip rendering charts if no data is available
  if (patterns.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard
        title="Pattern Status"
        value={`${timeframeStats.successRate.toFixed(1)}% Success Rate`}
        description={`${backtestResults.length} verified patterns`}
      >
        <ChartContainer data={statusData} />
      </StatCard>

      <StatCard
        title="Pattern Types"
        value={`${patterns.length} Total Patterns`}
        description={`${Object.keys(patternTypeStats).length} different types`}
      >
        <ChartContainer data={patternTypeData} />
      </StatCard>

      <StatCard
        title="Performance"
        value={`${timeframeStats.avgProfit.toFixed(2)}% Avg. Profit`}
        description={`${timeframeStats.avgDaysToBreakout.toFixed(1)} days to breakout`}
      >
        <PerformanceStats stats={timeframeStats} />
      </StatCard>
    </div>
  );
};

const StatCard: React.FC<{
  title: string;
  value: string;
  description: string;
  children: React.ReactNode;
}> = ({ title, value, description, children }) => {
  return (
    <Card className="p-4">
      <h3 className="text-lg font-medium mb-1">{title}</h3>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-gray-500 mb-4">{description}</p>
      {children}
    </Card>
  );
};

const ChartContainer: React.FC<{ data: Array<{ name: string; value: number; color: string }> }> = ({ data }) => {
  if (data.length === 0) return <p className="text-center text-gray-500 py-8">No data available</p>;

  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={30}
            outerRadius={60}
            paddingAngle={5}
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [`${value} patterns`, 'Count']} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

const PerformanceStats: React.FC<{ stats: TimeframeStats }> = ({ stats }) => {
  return (
    <div className="space-y-2">
      <StatRow label="Success Rate" value={`${stats.successRate.toFixed(1)}%`} />
      <StatRow label="Accuracy Rate" value={`${stats.accuracyRate.toFixed(1)}%`} />
      <StatRow label="Average Profit" value={`${stats.avgProfit.toFixed(2)}%`} />
      <StatRow label="Days to Breakout" value={stats.avgDaysToBreakout.toFixed(1)} />
    </div>
  );
};

const StatRow: React.FC<{ label: string; value: string | number }> = ({ label, value }) => {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
};

// Helper function to get a color based on pattern type
function getColorForPattern(patternType: string): string {
  const patternColors: Record<string, string> = {
    'BullFlag': '#22c55e',
    'BearFlag': '#ef4444',
    'DoubleBottom': '#3b82f6',
    'DoubleTop': '#f97316',
    'CupAndHandle': '#a855f7',
    'HeadAndShoulders': '#ec4899',
    'SymmetricalTriangle': '#6366f1',
    'AscendingTriangle': '#0ea5e9',
    'DescendingTriangle': '#f43f5e',
  };

  // Check if we have a specific color for this pattern
  for (const [key, color] of Object.entries(patternColors)) {
    if (patternType.includes(key)) {
      return color;
    }
  }

  // Fallback colors based on pattern sentiment
  if (patternType.toLowerCase().includes('bull') || 
      patternType.toLowerCase().includes('bottom') || 
      patternType.toLowerCase().includes('ascending')) {
    return '#22c55e'; // green for bullish
  }
  
  if (patternType.toLowerCase().includes('bear') || 
      patternType.toLowerCase().includes('top') || 
      patternType.toLowerCase().includes('descending')) {
    return '#ef4444'; // red for bearish
  }
  
  return '#6366f1'; // purple as default
}

export default ScannerCharts;
