
import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StrategyBacktestResult } from "@/services/backtesting/strategyTypes";

interface StrategyPerformanceChartProps {
  results: StrategyBacktestResult[];
  height?: number;
}

const StrategyPerformanceChart: React.FC<StrategyPerformanceChartProps> = ({ 
  results,
  height = 300
}) => {
  // Prepare chart data
  const chartData = results.map(result => ({
    name: result.strategyName,
    winRate: result.winRate,
    expectancy: result.expectancy,
    profitFactor: result.profitFactor * 10, // Scale profit factor for visualization
    tradeCount: result.totalTrades,
    averageProfit: result.averageWin || 0 // Use averageWin instead of averageProfit
  }));

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Breakout Strategy Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height: `${height}px` }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" orientation="left" />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                domain={[0, 100]} 
              />
              <Tooltip />
              <Legend />
              <Bar 
                yAxisId="left" 
                dataKey="expectancy" 
                name="Expectancy (%)" 
                fill="#8884d8" 
              />
              <Bar 
                yAxisId="right" 
                dataKey="winRate" 
                name="Win Rate (%)" 
                fill="#82ca9d" 
              />
              <Bar 
                yAxisId="left" 
                dataKey="averageProfit" 
                name="Avg Profit (%)" 
                fill="#ff8042" 
              />
              <Bar 
                yAxisId="left" 
                dataKey="profitFactor" 
                name="Profit Factor (x10)" 
                fill="#ffc658" 
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default StrategyPerformanceChart;
