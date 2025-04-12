
import { PatternData } from '@/services/types/patternTypes';
import { HistoricalPrice } from '@/services/backtesting/backtestTypes';

// Get historical prices for a pattern
export async function getHistoricalPrices(pattern: PatternData): Promise<HistoricalPrice[]> {
  try {
    // In a real implementation, this would call an API to get price data
    // For now, we'll return mock data
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 60); // Go back 60 days
    
    const prices: HistoricalPrice[] = [];
    const priceRange = pattern.targetPrice - pattern.entryPrice;
    
    // Generate 50 days of mock price data
    for (let i = 0; i < 50; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      // Calculate mock prices - start near entry and gradually move toward target
      const progress = Math.min(1, i / 40); // Movement toward target over time
      const randomNoise = (Math.random() - 0.5) * (priceRange * 0.2); // Add some randomness
      
      const basePrice = pattern.entryPrice + (priceRange * progress) + randomNoise;
      const open = basePrice * (0.99 + Math.random() * 0.02);
      const close = basePrice * (0.99 + Math.random() * 0.02);
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (0.99 - Math.random() * 0.01);
      const volume = Math.floor(10000 + Math.random() * 90000);
      
      prices.push({
        date: date,
        open,
        high,
        low,
        close,
        volume
      });
    }
    
    return prices;
  } catch (error) {
    console.error("Error getting historical prices:", error);
    return [];
  }
}
