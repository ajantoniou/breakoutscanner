
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { BarChart2, Calendar, Globe } from "lucide-react";
import { Separator } from "@/components/ui/separator";

type BacktestConfigPanelProps = {
  universeSize: string;
  historicalYears: number;
  onUniverseSizeChange: (size: 'small' | 'medium' | 'large' | 'technology' | 'finance') => void;
  onHistoricalYearsChange: (years: 1 | 2 | 5) => void;
};

const BacktestConfigPanel: React.FC<BacktestConfigPanelProps> = ({
  universeSize,
  historicalYears,
  onUniverseSizeChange,
  onHistoricalYearsChange
}) => {
  return (
    <Card className="shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center">
          <BarChart2 className="h-5 w-5 mr-2" />
          Backtest Configuration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex items-center mb-2">
              <Globe className="h-4 w-4 mr-2 text-muted-foreground" />
              <Label className="font-medium">Stock Universe</Label>
            </div>
            <RadioGroup 
              value={universeSize} 
              onValueChange={(v) => onUniverseSizeChange(v as any)}
              className="flex flex-col gap-2 mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="small" id="universe-small" />
                <Label htmlFor="universe-small" className="cursor-pointer">Small (50 stocks)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="universe-medium" />
                <Label htmlFor="universe-medium" className="cursor-pointer">Medium (200 stocks)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="large" id="universe-large" />
                <Label htmlFor="universe-large" className="cursor-pointer">Large (500+ stocks)</Label>
              </div>
              <Separator className="my-2" />
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="technology" id="universe-tech" />
                <Label htmlFor="universe-tech" className="cursor-pointer">Technology Sector</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="finance" id="universe-finance" />
                <Label htmlFor="universe-finance" className="cursor-pointer">Financial Sector</Label>
              </div>
            </RadioGroup>
          </div>
          
          <div>
            <div className="flex items-center mb-2">
              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
              <Label className="font-medium">Historical Data</Label>
            </div>
            <RadioGroup 
              value={historicalYears.toString()} 
              onValueChange={(v) => onHistoricalYearsChange(parseInt(v) as any)}
              className="flex flex-col gap-2 mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="1" id="years-1" />
                <Label htmlFor="years-1" className="cursor-pointer">1 Year</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="2" id="years-2" />
                <Label htmlFor="years-2" className="cursor-pointer">2 Years</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="5" id="years-5" />
                <Label htmlFor="years-5" className="cursor-pointer">5 Years</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BacktestConfigPanel;
