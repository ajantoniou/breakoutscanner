
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Wifi, WifiOff, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { RealTimeQuote } from "@/hooks/scannerHooks/useRealTimeData";

interface RealTimeUpdatesProps {
  realTimeData: Record<string, RealTimeQuote>;
  isConnected: boolean;
  marketOpen: boolean;
  lastUpdated: Date | null;
  isLoading: boolean;
  onRefresh: () => void;
}

const RealTimeUpdates: React.FC<RealTimeUpdatesProps> = ({
  realTimeData,
  isConnected,
  marketOpen,
  lastUpdated,
  isLoading,
  onRefresh
}) => {
  const topMovers = Object.values(realTimeData)
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
    .slice(0, 5);
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Real-Time Market Data</CardTitle>
        <div className="flex items-center space-x-2">
          {isConnected ? (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <Wifi className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
              <WifiOff className="h-3 w-3 mr-1" />
              Disconnected
            </Badge>
          )}
          
          {marketOpen ? (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              Market Open
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              Market Closed
            </Badge>
          )}
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onRefresh} 
            disabled={isLoading}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {Object.keys(realTimeData).length > 0 ? (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Top Movers</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
                {topMovers.map((quote) => (
                  <div 
                    key={quote.symbol} 
                    className="flex flex-col p-2 rounded-md border"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{quote.symbol}</span>
                      <span className={quote.changePercent >= 0 ? "text-green-600" : "text-red-600"}>
                        {quote.price.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500">
                        Vol: {(quote.volume / 1000).toFixed(1)}K
                      </span>
                      <span 
                        className={`text-xs font-medium ${
                          quote.changePercent >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {quote.changePercent >= 0 ? "+" : ""}
                        {quote.changePercent.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {lastUpdated && (
              <div className="text-xs text-gray-500 mt-2">
                Last updated: {format(lastUpdated, "HH:mm:ss")}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <AlertCircle className="h-8 w-8 text-gray-400 mb-2" />
            <h3 className="text-sm font-medium">No real-time data available</h3>
            <p className="text-xs text-gray-500 mt-1">
              {marketOpen 
                ? "Check your connection or refresh to fetch the latest quotes" 
                : "Market is currently closed, real-time data will be available when the market opens"}
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRefresh} 
              disabled={isLoading}
              className="mt-4"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Quotes
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RealTimeUpdates;
