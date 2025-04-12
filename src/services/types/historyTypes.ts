
export interface HistoricalPriceData {
  date: string; // Using string to be consistent with other parts of the app
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  symbol?: string;
}

// Add a second interface for services that expect Date format
export interface HistoricalPrice {
  date: string | Date; // Allow both types for compatibility
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  symbol?: string;
  // Additional fields that might be used
  isSimulated?: boolean;
  rsi?: number;
  atr?: number;
  macd?: number;
  macdSignal?: number;
  macdHistogram?: number;
  emaCrossovers?: any[]; // Add this field to fix errors
}

// Convert between the two types
export function convertToHistoricalPriceData(price: HistoricalPrice): HistoricalPriceData {
  return {
    date: typeof price.date === 'string' ? price.date : price.date.toISOString(),
    open: price.open,
    high: price.high,
    low: price.low,
    close: price.close,
    volume: price.volume,
    symbol: price.symbol
  };
}

export function convertToHistoricalPrice(price: HistoricalPriceData): HistoricalPrice {
  return {
    date: price.date, // Keep as string for compatibility
    open: price.open,
    high: price.high,
    low: price.low,
    close: price.close,
    volume: price.volume,
    symbol: price.symbol
  };
}

// Type alias for compatibility with different parts of the codebase
export type { HistoricalPrice as PriceDataPoint };
export type { HistoricalPriceData as HistoricalCandle };
