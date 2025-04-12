
import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BacktestResult } from "@/services/backtesting/backtestTypes";

interface AccuracyChartProps {
  results: BacktestResult[];
}

const AccuracyChart: React.FC<AccuracyChartProps> = ({ results }) => {
  // Process data for visualization
  const prepareChartData = () => {
    // Group by pattern type
    const patternGroups: Record<string, BacktestResult[]> = {};
    
    results.forEach(result => {
      if (!patternGroups[result.patternType]) {
        patternGroups[result.patternType] = [];
      }
      patternGroups[result.patternType].push(result);
    });
    
    // Calculate success rate per pattern type
    return Object.entries(patternGroups).map(([patternType, results]) => {
      const successful = results.filter(r => r.successful).length;
      const total = results.length;
      const successRate = total > 0 ? (successful / total) * 100 : 0;
      const avgReturn = results.reduce((sum, r) => sum + r.profitLossPercent, 0) / total;
      
      return {
        patternType,
        successRate: Number(successRate.toFixed(2)),
        avgReturn: Number(avgReturn.toFixed(2)),
        avgCandlesToBreakout: Number(
          (results.reduce((sum, r) => sum + r.candlesToBreakout, 0) / total).toFixed(2)
        ),
        sampleSize: total
      };
    });
  };
  
  const chartData = prepareChartData();

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Pattern Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="patternType" 
                angle={-45} 
                textAnchor="end" 
                height={70} 
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="successRate" 
                name="Success Rate (%)" 
                stroke="#8884d8" 
                dot={{ r: 4 }} 
              />
              <Line 
                type="monotone" 
                dataKey="avgReturn" 
                name="Avg Return (%)" 
                stroke="#82ca9d" 
                dot={{ r: 4 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default AccuracyChart;
