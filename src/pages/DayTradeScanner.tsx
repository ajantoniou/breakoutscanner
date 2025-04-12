
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import MainNav from "@/components/MainNav";
import ScannerContainer from "@/components/scanner/container/ScannerContainer";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, BarChart2 } from "lucide-react";

// Array of symbols suitable for day trading
const DAY_TRADE_SYMBOLS = [
  'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'META', 'TSLA', 'NVDA', 'AMD', 
  'SPY', 'QQQ', 'IWM', 'DIA', 'XLE', 'XLF', 'XLK', 'XLV',
  'NFLX', 'PYPL', 'SQ', 'COIN', 'BABA', 'SHOP', 'ROKU', 'ZM'
];

// Updated timeframes for day trading - 1min to 1hour only
const DAY_TRADE_TIMEFRAMES = ['1min', '5min', '15min', '30min', '1hour'];

const DayTradeScanner = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMarketOpen, setIsMarketOpen] = useState(false);
  
  // Extract tab from URL params
  const searchParams = new URLSearchParams(location.search);
  const tabParam = searchParams.get('tab');
  
  // Check if market is open (just a placeholder - would be replaced with real market data check)
  useEffect(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hours = now.getHours();
    
    // Simple check: Monday-Friday, 9:30 AM - 4:00 PM EST
    // This is just a simplification - a real implementation would use proper market calendar
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const isDuringMarketHours = hours >= 9 && hours < 16;
    
    setIsMarketOpen(isWeekday && isDuringMarketHours);
  }, []);
  
  const handleTabChange = (tab: string) => {
    const newSearchParams = new URLSearchParams(location.search);
    newSearchParams.set('tab', tab);
    navigate(`${location.pathname}?${newSearchParams.toString()}`);
  };
  
  // Update auto-refresh interval to be less frequent (5 minutes instead of 1 minute)
  const AUTO_REFRESH_INTERVAL = 300000; // 5 minutes (was 60000 - 1 minute)
  
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MainNav />
      
      <div className="container p-4">
        <div className="mb-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Day Trading Scanner
          </h1>
          <p className="text-muted-foreground">
            Track intraday patterns on 1-minute to 1-hour charts
          </p>
        </div>
        
        {!isMarketOpen && (
          <Card className="mb-4 bg-amber-50 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-amber-800">Market is currently closed</h3>
                  <p className="text-sm text-amber-700">
                    Using historical patterns from the latest market session
                  </p>
                </div>
                <Button variant="outline" className="bg-white" onClick={() => toast.info("Refreshing data...")}>
                  <BarChart2 className="h-4 w-4 mr-2" />
                  View latest patterns
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        <ScannerContainer 
          initialTab={tabParam || "active"}
          scannerType="daytrader" 
          defaultTimeframe="15min"
          autoRefreshInterval={AUTO_REFRESH_INTERVAL}
          allowedTimeframes={DAY_TRADE_TIMEFRAMES}
          onTabChange={handleTabChange}
        />
      </div>
    </div>
  );
};

export default DayTradeScanner;
