import React, { useState, useEffect } from "react";
import MainNav from "@/components/MainNav";
import ScannerContainer from "@/components/scanner/container/ScannerContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, TrendingUp } from "lucide-react";
import { STOCK_UNIVERSES } from "@/services/api/marketData/stockUniverses";

// Constants for the Swing Scanner
const SWING_TIMEFRAMES = ['1h', '4h', '1d', 'weekly'];
const SWING_PATTERNS = ['Bull Flag', 'Bear Flag', 'Ascending Triangle', 'Descending Triangle', 'Symmetrical Triangle'];

const SwingScanner = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Update time display every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => {
      clearInterval(timer);
    };
  }, []);
  
  return (
    <div className="flex flex-col min-h-screen">
      <MainNav />
      
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Swing Trading Scanner</h2>
            <p className="text-muted-foreground">
              Identify swing trading opportunities using higher timeframe analysis
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Clock className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Last Updated: </span>
              {currentTime.toLocaleTimeString()}
            </Button>
            <Button variant="default" size="sm">
              <TrendingUp className="mr-2 h-4 w-4" />
              Trend Analysis
            </Button>
          </div>
        </div>
        
        <div className="grid gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="mb-4">
                <h3 className="text-lg font-medium">Multi-Timeframe Breakout Scanner</h3>
                <p className="text-sm text-muted-foreground">
                  Analyzing flexible timeframe combinations to identify the highest probability breakout opportunities
                </p>
                <div className="mt-2 text-xs text-blue-600">
                  <p>
                    <strong>Strategy:</strong> Using AI to dynamically pair entry timeframes (15m, 30m, 1h) with the strongest higher timeframe channel confirmations
                  </p>
                  <ul className="mt-1 list-disc list-inside pl-2">
                    <li>15min entries with 30min/1hour channel confirmation</li>
                    <li>30min entries with 1hour/4hour channel confirmation</li>
                    <li>1hour entries with 4hour/daily channel confirmation</li>
                  </ul>
                </div>
              </div>
              
              <ScannerContainer 
                scannerType="swing"
                defaultTimeframe="1h"
                allowedTimeframes={['1h', '4h']}
                autoRefreshInterval={300000}
                initialTab="patterns"
                onTabChange={(tab) => console.log(`Tab changed to ${tab}`)}
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="mb-4">
                <h3 className="text-lg font-medium">Daily & Weekly Swing Scanner</h3>
                <p className="text-sm text-muted-foreground">
                  Longer-term setups for positional trading using daily and weekly timeframes
                </p>
                <div className="mt-2 text-xs text-blue-600">
                  <p>
                    <strong>Strategy:</strong> Finding longer-duration breakout opportunities with weekly confirmation
                  </p>
                </div>
              </div>
              
              <ScannerContainer 
                scannerType="swing"
                defaultTimeframe="1d"
                allowedTimeframes={['1d', 'weekly']}
                autoRefreshInterval={600000}
                initialTab="patterns"
                onTabChange={(tab) => console.log(`Tab changed to ${tab}`)}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SwingScanner; 