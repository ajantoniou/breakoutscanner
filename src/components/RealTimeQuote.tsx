import React, { useState, useEffect } from 'react';
import { useRealTimeData } from '@/hooks/useRealTimeData';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpIcon, ArrowDownIcon, MinusIcon, RefreshCwIcon, WifiIcon, WifiOffIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

interface RealTimeQuoteProps {
  symbol: string;
  apiKey?: string;
  showDetails?: boolean;
}

/**
 * Real-time stock quote component that displays continuously updating price data
 */
export function RealTimeQuote({ symbol, apiKey, showDetails = false }: RealTimeQuoteProps) {
  const [expanded, setExpanded] = useState(showDetails);
  
  // Use our real-time data hook
  const {
    connected,
    isUsingWebSocket,
    isLoading,
    error,
    lastUpdateTime,
    getSymbolData,
    refresh
  } = useRealTimeData({
    symbols: [symbol],
    dataTypes: ['agg', 'trade'],
    refreshInterval: 10000, // 10 second refresh for REST API fallback
    apiKey,
    debug: false
  });
  
  // Get the current data for this symbol
  const data = getSymbolData(symbol);
  
  // Format price with appropriate number of decimal places
  const formatPrice = (price: number) => {
    if (price === undefined || price === null) return '-';
    // Use 4 decimal places for prices under $10, otherwise 2
    return price < 10 ? price.toFixed(4) : price.toFixed(2);
  };
  
  // Format percent change
  const formatPercent = (percent: number) => {
    if (percent === undefined || percent === null) return '-';
    return `${percent > 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };
  
  // Determine price change direction
  const getDirection = () => {
    if (!data) return 'flat';
    
    // Check if we have price data
    if (data.priceData) {
      // For aggregated data, compare close to open
      if (data.priceData.close > data.priceData.open) return 'up';
      if (data.priceData.close < data.priceData.open) return 'down';
    }
    
    // If meta has a tick direction, use it
    if (data.meta && data.meta.tickDirection) {
      return data.meta.tickDirection;
    }
    
    return 'flat';
  };
  
  // Get current price
  const getCurrentPrice = () => {
    if (!data) return null;
    
    if (data.priceData) {
      return data.priceData.close;
    }
    
    if (data.tradeData) {
      return data.tradeData.price;
    }
    
    if (data.quoteData) {
      // For quotes, use mid price
      const bid = data.quoteData.bidPrice;
      const ask = data.quoteData.askPrice;
      if (bid && ask) {
        return (bid + ask) / 2;
      }
      return data.quoteData.bidPrice || data.quoteData.askPrice;
    }
    
    return null;
  };
  
  // Calculate percent change
  const getPercentChange = () => {
    if (!data || !data.priceData) return null;
    
    // Calculate percent change from close to open
    const close = data.priceData.close;
    const open = data.priceData.open;
    
    if (close === undefined || open === undefined || open === 0) return null;
    
    return ((close - open) / open) * 100;
  };
  
  // Get time since last update
  const getTimeSinceUpdate = () => {
    if (!lastUpdateTime) return 'Never';
    return formatDistanceToNow(lastUpdateTime, { addSuffix: true });
  };
  
  const direction = getDirection();
  const currentPrice = getCurrentPrice();
  const percentChange = getPercentChange();
  
  // Background color based on price direction
  const getBgColor = () => {
    if (direction === 'up') return 'bg-green-50';
    if (direction === 'down') return 'bg-red-50';
    return 'bg-gray-50';
  };
  
  // Text color based on price direction
  const getTextColor = () => {
    if (direction === 'up') return 'text-green-600';
    if (direction === 'down') return 'text-red-600';
    return 'text-gray-600';
  };
  
  // Direction icon
  const DirectionIcon = () => {
    if (direction === 'up') return <ArrowUpIcon className="h-4 w-4 text-green-600" />;
    if (direction === 'down') return <ArrowDownIcon className="h-4 w-4 text-red-600" />;
    return <MinusIcon className="h-4 w-4 text-gray-600" />;
  };
  
  return (
    <Card className={`${getBgColor()} border-t-4 ${
      direction === 'up' ? 'border-t-green-500' : 
      direction === 'down' ? 'border-t-red-500' : 
      'border-t-gray-300'
    }`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2 text-lg">
            {symbol}
            <Badge variant={isUsingWebSocket ? "default" : "outline"} className="ml-2">
              {isUsingWebSocket ? 
                <WifiIcon className="h-3 w-3 mr-1" /> : 
                <WifiOffIcon className="h-3 w-3 mr-1" />
              }
              {isUsingWebSocket ? 'Real-time' : 'Delayed'}
            </Badge>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => refresh()} disabled={isLoading}>
            <RefreshCwIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <CardDescription>
          {connected ? 'Connected' : 'Disconnected'} • Updated {getTimeSinceUpdate()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && !data ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        ) : error ? (
          <div className="text-red-500 text-sm">
            Error loading data: {error.message}
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${getTextColor()}`}>
                ${formatPrice(currentPrice || 0)}
              </span>
              <DirectionIcon />
            </div>
            {percentChange !== null && (
              <div className={`text-sm font-medium ${getTextColor()}`}>
                {formatPercent(percentChange)}
              </div>
            )}
          </div>
        )}
      </CardContent>
      {expanded && data && (
        <CardFooter className="flex flex-col items-start pt-0">
          <div className="w-full border-t pt-4 text-xs space-y-2">
            {data.priceData && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-gray-500">Open</div>
                  <div>${formatPrice(data.priceData.open)}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-gray-500">High</div>
                  <div>${formatPrice(data.priceData.high)}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-gray-500">Low</div>
                  <div>${formatPrice(data.priceData.low)}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-gray-500">Volume</div>
                  <div>{data.priceData.volume?.toLocaleString()}</div>
                </div>
              </>
            )}
            {data.quoteData && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-gray-500">Bid</div>
                  <div>${formatPrice(data.quoteData.bidPrice)} × {data.quoteData.bidSize}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-gray-500">Ask</div>
                  <div>${formatPrice(data.quoteData.askPrice)} × {data.quoteData.askSize}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-gray-500">Spread</div>
                  <div>{data.quoteData.spreadPercent?.toFixed(3)}%</div>
                </div>
              </>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div className="text-gray-500">Type</div>
              <div>{data.dataType}</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-gray-500">Source</div>
              <div>{data.meta?.source || 'Unknown'}</div>
            </div>
          </div>
        </CardFooter>
      )}
      <div className="px-6 pb-4">
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full text-xs"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Hide Details' : 'Show Details'}
        </Button>
      </div>
    </Card>
  );
}

/**
 * Example of how to use multiple quotes in a grid
 */
export function RealTimeQuoteGrid({ symbols = ['AAPL', 'MSFT', 'TSLA', 'NVDA'], apiKey }: { symbols?: string[], apiKey?: string }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {symbols.map(symbol => (
        <RealTimeQuote key={symbol} symbol={symbol} apiKey={apiKey} />
      ))}
    </div>
  );
} 