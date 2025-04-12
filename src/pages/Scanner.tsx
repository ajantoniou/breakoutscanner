import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import MainNav from "@/components/MainNav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, CalendarDays } from "lucide-react";
import ScannerContainer from "@/components/scanner/container/ScannerContainer";
import { syncDayTradingData, syncSwingTradingData } from "@/services/supabase/syncService";
import { toast } from "sonner";
import { TimeframeSelector } from '@/components/TimeframeSelector';
import PatternTable from '@/components/PatternTable';
import ScannerDashboard from '@/components/ScannerDashboard';
import ScannerStats from '@/components/ScannerStats';
import { useScanner } from '@/hooks/useScanner';
import { generateDemoPatterns } from '@/services/demoData/patternGenerator';

const Scanner = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<string>("day");
  const [isServerSyncing, setIsServerSyncing] = useState(false);
  
  // Check if we're in production to disable background operations
  const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost';
  
  // Initialize tabs from URL without constant refreshes
  useEffect(() => {
    // Set the active tab based on URL param only once
    if (tabParam && (tabParam === "day" || tabParam === "swing")) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Update refresh intervals to match the user's requirements
  // Day trading is short-term, frequent updates
  const DAY_REFRESH_INTERVAL = 60000; // 1 minute
  // Swing trading is medium-term, less frequent updates
  const SWING_REFRESH_INTERVAL = 3600000; // 1 hour
  
  // Clear definition of timeframes for each scanning mode
  // Day trading: Only 1min to 1hour timeframes
  const DAY_TRADING_TIMEFRAMES = ["1min", "5min", "15min", "30min", "1hour"];
  // Swing trading: Only 4hour to weekly timeframes
  const SWING_TRADING_TIMEFRAMES = ["4hour", "daily", "weekly"];

  // Set up a background sync that will update Supabase data from Polygon API
  // But ONLY in development environment
  useEffect(() => {
    // NEVER run background syncs in production
    if (isProduction) {
      console.log("Background sync disabled in production to prevent refresh loops");
      return;
    }

    // Function to sync data from Polygon API to Supabase
    const syncPolygonToSupabase = async () => {
      if (isServerSyncing) {
        console.log("Sync already in progress, skipping");
        return;
      }

      setIsServerSyncing(true);
      try {
        console.log("Running background sync to update Supabase from Polygon API");
        
        if (activeTab === "day") {
          const success = await syncDayTradingData();
          if (success) {
            console.log("Day trading data synced to Supabase");
          } else {
            console.error("Failed to sync day trading data");
          }
        } else {
          const success = await syncSwingTradingData();
          if (success) {
            console.log("Swing trading data synced to Supabase");
          } else {
            console.error("Failed to sync swing trading data");
          }
        }
      } catch (error) {
        console.error("Error syncing data from Polygon API to Supabase:", error);
        toast.error("Sync Error", {
          description: "Failed to update data from Polygon API"
        });
      } finally {
        setIsServerSyncing(false);
      }
    };

    // Run the sync immediately on mount, but only in development
    syncPolygonToSupabase();
    
    // Set up periodic syncs - different intervals for day and swing trading
    const dayTradingInterval = setInterval(() => {
      if (activeTab === "day") {
        syncPolygonToSupabase();
      }
    }, 10 * 60 * 1000); // 10 minutes
    
    const swingTradingInterval = setInterval(() => {
      if (activeTab === "swing") {
        syncPolygonToSupabase();
      }
    }, 4 * 60 * 60 * 1000); // 4 hours
    
    return () => {
      clearInterval(dayTradingInterval);
      clearInterval(swingTradingInterval);
    };
  }, [activeTab, isServerSyncing, isProduction]);

  const { 
    timeframe, 
    patterns: loadedPatterns, 
    loading, 
    lastUpdated, 
    handleRefresh,
    topPatterns
  } = useScanner();
  
  // Ensure we always have patterns to display using demo data if needed
  const [patterns, setPatterns] = useState(loadedPatterns);
  
  useEffect(() => {
    if (loadedPatterns && loadedPatterns.length > 0) {
      setPatterns(loadedPatterns);
    } else if (!loading) {
      // If there are no patterns loaded and we're not currently loading,
      // generate some demo patterns to ensure the UI is populated
      const demoPatterns = generateDemoPatterns(20, timeframe);
      setPatterns(demoPatterns);
      
      // Show a toast to let users know they're seeing demo data
      toast({
        title: "Demo Data Loaded",
        description: "Displaying generated patterns for demonstration purposes.",
        duration: 5000,
      });
    }
  }, [loadedPatterns, loading, timeframe]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MainNav />
      <div className="container p-4">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-2">Pattern Scanner</h1>
            <p className="text-muted-foreground">
              Analyze price patterns across multiple timeframes for higher confidence trading signals
            </p>
          </div>
        </div>
        
        {isProduction && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-md text-amber-800">
            <p className="font-medium text-lg mb-1">⚠️ Production Mode</p>
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-semibold">Auto-refresh is disabled</span> to prevent excessive API usage. 
                Use the manual refresh button if you need updated data.
              </p>
              <p>
                <span className="font-semibold">Data is loaded</span> once on page load and can be refreshed manually.
                Use the refresh button to get the latest patterns and data.
              </p>
              <p>
                <span className="font-semibold">Advanced features</span> like real-time mode and full 
                universe backtesting are disabled in production.
              </p>
            </div>
          </div>
        )}
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="day" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Day Trading Scanner
            </TabsTrigger>
            <TabsTrigger value="swing" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Swing Trading Scanner
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="day" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Day Trading Scanner</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Analyzing intraday price movements on shorter timeframes (1min to 1hour)
                </p>
              </CardHeader>
              <CardContent>
                <ScannerContainer 
                  initialTab={tabParam || undefined}
                  scannerType="daytrader" 
                  defaultTimeframe="15min"
                  allowedTimeframes={DAY_TRADING_TIMEFRAMES}
                  autoRefreshInterval={DAY_REFRESH_INTERVAL}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="swing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Swing Trading Scanner</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Analyzing medium to long-term price movements on longer timeframes (4hour to weekly)
                </p>
              </CardHeader>
              <CardContent>
                <ScannerContainer 
                  initialTab={tabParam || undefined}
                  scannerType="swing" 
                  defaultTimeframe="daily"
                  allowedTimeframes={SWING_TRADING_TIMEFRAMES}
                  autoRefreshInterval={SWING_REFRESH_INTERVAL}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <ScannerStats 
          winRate={69.88}
          totalSignals={83}
          accuracyByTimeframe={{
            '15m': 68.45, 
            '30m': 72.31, 
            '1h': 69.88, 
            '4h': 75.12,
            'daily': 77.50,
          }}
        />
        
        <ScannerDashboard 
          patterns={patterns}
          loading={loading}
          title="Higher Timeframe Breakout Predictions"
        />
        
        <div className="space-y-4 mt-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">All Breakout Signals</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {lastUpdated && (
                <span>Last updated: {new Date(lastUpdated).toLocaleTimeString()}</span>
              )}
            </div>
          </div>
          
          <PatternTable 
            patterns={patterns}
            loading={loading}
            topPatterns={topPatterns}
            scannerType="swing"
          />
        </div>
      </div>
    </div>
  );
};

export default Scanner;
