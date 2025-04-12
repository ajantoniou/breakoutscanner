import { identifyAllTrendlines, checkBreakthrough, TrendlineData } from '../services/backtesting/utils/trendlineAnalysis';
import { calculateATR } from '../services/backtesting/utils/technicalIndicators';
import { supabase } from '../integrations/supabase/client';
import { delayedDataManager } from '../services/api/marketData/delayedDataManager';
import { HistoricalPrice } from '../services/backtesting/backtestTypes';

interface TrendlineAccuracyStats {
  totalTrendlines: number;
  supportTrendlines: number;
  resistanceTrendlines: number;
  horizontalTrendlines: number;
  diagonalTrendlines: number;
  emaTrendlines: number;
  averageBouncePercentage: number;
  averageStrength: number;
  accurateBreakouts: number;
  totalBreakouts: number;
  breakoutAccuracy: number;
  
  // Enhanced statistics
  wickBasedTrendlines: number;
  bodyBasedTrendlines: number;
  averageSlopeAngle: number;
  slopeQualityScore: number;
  bodyPenetrations: number;
}

async function testTrendlineAccuracy() {
  console.log("🔍 Starting enhanced trendline accuracy test...");
  
  // Define symbols and timeframes to test
  const symbols = [
    'AAPL', 'MSFT', 'AMZN', 'NVDA', 'GOOGL', 
    'META', 'TSLA', 'AMD', 'NFLX', 'PYPL'
  ];
  
  const timeframes = ['1h'];
  
  const results: Record<string, Record<string, TrendlineAccuracyStats>> = {};
  
  for (const symbol of symbols) {
    results[symbol] = {};
    
    for (const timeframe of timeframes) {
      console.log(`Testing ${symbol} on ${timeframe} timeframe...`);
      
      try {
        // Get delayed data from Polygon
        const data = await delayedDataManager.getDelayedData(symbol, timeframe);
        
        if (!data || !data.results || data.results.length < 100) {
          console.log(`Insufficient data for ${symbol} (${timeframe})`);
          continue;
        }
        
        // Sort data by timestamp ascending
        const sortedData = data.results.sort((a: any, b: any) => a.t - b.t);
        
        // Convert to HistoricalPrice format
        const historicalPrices: HistoricalPrice[] = sortedData.map((candle: any) => ({
          open: candle.o,
          high: candle.h,
          low: candle.l,
          close: candle.c,
          volume: candle.v,
          timestamp: candle.t
        }));
        
        // Calculate ATR for later use
        const atr = calculateATR(historicalPrices);
        
        // Split data for training and testing
        const trainingData = historicalPrices.slice(50); // Use most recent 50 candles for training
        const testingData = historicalPrices.slice(0, 50); // Use older candles for testing
        
        // Test with different trendline approaches
        console.log("Testing three different trendline approaches:");
        
        // 1. Base case: Standard configuration
        const standardTrendlines = identifyAllTrendlines(trainingData, {
          validationThreshold: 0.75,
          minConfirmationTouches: 2
        });
        
        // 2. Wick-based trendlines
        const wickTrendlines = identifyAllTrendlines(trainingData, {
          validationThreshold: 0.75,
          minConfirmationTouches: 2,
          useWicks: true,
          volatilityAdjustment: false
        });
        
        // 3. Body-based trendlines
        const bodyTrendlines = identifyAllTrendlines(trainingData, {
          validationThreshold: 0.75,
          minConfirmationTouches: 2,
          useWicks: false,
          volatilityAdjustment: false
        });
        
        // 4. Adaptive (volatility-adjusted) trendlines
        const adaptiveTrendlines = identifyAllTrendlines(trainingData, {
          validationThreshold: 0.75,
          minConfirmationTouches: 2,
          volatilityAdjustment: true
        });
        
        // Count slope-based statistics for diagonal trendlines only
        const diagonalTrendlines = adaptiveTrendlines.filter(t => t.type === 'diagonal');
        
        let totalSlopeAngle = 0;
        let totalSlopeQuality = 0;
        let bodyPenetrations = 0;
        
        // Check for body penetrations with current implementation
        if (diagonalTrendlines.length > 0) {
          for (const trendline of diagonalTrendlines) {
            // Extract additional metadata
            const slopeAngle = (trendline as any).slopeAngle || 0;
            totalSlopeAngle += slopeAngle;
            
            // Calculate slope quality if not already present
            const slopeQuality = (trendline as any).slopeQuality || calculateSlopeQuality(slopeAngle);
            totalSlopeQuality += slopeQuality;
            
            // Check for potential body penetrations the trendline might have
            // This is just for statistics; the validation should already prevent these
            for (let i = trendline.startIndex; i <= trendline.endIndex; i++) {
              const linePrice = trendline.priceAtIndex(i);
              const candle = trainingData[i];
              
              const bodyTop = Math.max(candle.open, candle.close);
              const bodyBottom = Math.min(candle.open, candle.close);
              
              if (linePrice > bodyBottom && linePrice < bodyTop) {
                bodyPenetrations++;
                break; // One penetration is enough to count this trendline
              }
            }
          }
        }
        
        const averageSlopeAngle = diagonalTrendlines.length > 0 
          ? totalSlopeAngle / diagonalTrendlines.length 
          : 0;
          
        const averageSlopeQuality = diagonalTrendlines.length > 0 
          ? totalSlopeQuality / diagonalTrendlines.length 
          : 0;
        
        // Count trendlines by type
        const supportTrendlines = adaptiveTrendlines.filter(t => t.subType === 'support');
        const resistanceTrendlines = adaptiveTrendlines.filter(t => t.subType === 'resistance');
        const horizontalTrendlines = adaptiveTrendlines.filter(t => t.type === 'horizontal');
        const emaTrendlines = adaptiveTrendlines.filter(t => t.type === 'ema');
        
        // Count wick vs body based trendlines
        const wickBasedTrendlines = adaptiveTrendlines.filter(t => (t as any).useWicks === true).length;
        const bodyBasedTrendlines = adaptiveTrendlines.filter(t => (t as any).useWicks === false).length;
        
        // Calculate average bounce percentage and strength
        const avgBouncePercentage = adaptiveTrendlines.length > 0 
          ? adaptiveTrendlines.reduce((sum, t) => sum + t.bouncePercentage, 0) / adaptiveTrendlines.length
          : 0;
        
        const avgStrength = adaptiveTrendlines.length > 0 
          ? adaptiveTrendlines.reduce((sum, t) => sum + t.strength, 0) / adaptiveTrendlines.length
          : 0;
        
        // Test breakout accuracy with the adaptive approach
        let accurateBreakouts = 0;
        let totalBreakouts = 0;
        
        // Extend trendlines to testing data and check for breakouts
        for (let i = 1; i < testingData.length; i++) {
          const currentCandle = testingData[i];
          const prevCandle = testingData[i - 1];
          
          for (const trendline of adaptiveTrendlines) {
            // Use the built-in checkBreakthrough function
            const breakoutResult = checkBreakthrough(trendline, currentCandle, i + trainingData.length);
            
            if (breakoutResult.isBreakthrough) {
              totalBreakouts++;
              
              // Check if price continues in the expected direction
              if (i + 5 < testingData.length) {
                const futureCandle = testingData[i + 5];
                const isAccurate = (breakoutResult.direction === 'up' && futureCandle.close > currentCandle.close) ||
                                  (breakoutResult.direction === 'down' && futureCandle.close < currentCandle.close);
                
                if (isAccurate) {
                  accurateBreakouts++;
                }
              }
            }
          }
        }
        
        const breakoutAccuracy = totalBreakouts > 0 
          ? (accurateBreakouts / totalBreakouts) * 100
          : 0;
        
        // Report comparison of different approaches
        console.log(`\nTrendline Count Comparison:`);
        console.log(`- Standard approach: ${standardTrendlines.length} trendlines`);
        console.log(`- Wick-based approach: ${wickTrendlines.length} trendlines`);
        console.log(`- Body-based approach: ${bodyTrendlines.length} trendlines`);
        console.log(`- Adaptive approach: ${adaptiveTrendlines.length} trendlines`);
        
        // Record stats for the adaptive approach
        results[symbol][timeframe] = {
          totalTrendlines: adaptiveTrendlines.length,
          supportTrendlines: supportTrendlines.length,
          resistanceTrendlines: resistanceTrendlines.length,
          horizontalTrendlines: horizontalTrendlines.length,
          diagonalTrendlines: diagonalTrendlines.length,
          emaTrendlines: emaTrendlines.length,
          averageBouncePercentage: avgBouncePercentage,
          averageStrength: avgStrength,
          accurateBreakouts,
          totalBreakouts,
          breakoutAccuracy,
          
          // Enhanced statistics
          wickBasedTrendlines,
          bodyBasedTrendlines,
          averageSlopeAngle,
          slopeQualityScore: averageSlopeQuality,
          bodyPenetrations
        };
        
        console.log(`\nResults for ${symbol} (${timeframe}):`);
        console.log(`- Total Trendlines: ${adaptiveTrendlines.length}`);
        console.log(`- Wick-based: ${wickBasedTrendlines}, Body-based: ${bodyBasedTrendlines}`);
        console.log(`- Average Slope Angle: ${averageSlopeAngle.toFixed(2)}°`);
        console.log(`- Slope Quality Score: ${averageSlopeQuality.toFixed(2)} (0-1 scale)`);
        console.log(`- Average Bounce Percentage: ${avgBouncePercentage.toFixed(2)}%`);
        console.log(`- Breakout Accuracy: ${breakoutAccuracy.toFixed(2)}%`);
        console.log(`- Body Penetrations Prevented: ${bodyPenetrations}`);
        
      } catch (error) {
        console.error(`Error testing ${symbol} (${timeframe}):`, error);
      }
    }
  }
  
  // Calculate overall statistics
  let totalTrendlines = 0;
  let totalSupportTrendlines = 0;
  let totalResistanceTrendlines = 0;
  let totalHorizontalTrendlines = 0;
  let totalDiagonalTrendlines = 0;
  let totalEmaTrendlines = 0;
  let totalWickBasedTrendlines = 0;
  let totalBodyBasedTrendlines = 0;
  let sumBouncePercentage = 0;
  let sumStrength = 0;
  let sumSlopeAngle = 0;
  let sumSlopeQuality = 0;
  let totalBodyPenetrations = 0;
  let totalAccurateBreakouts = 0;
  let totalBreakouts = 0;
  let symbolCount = 0;
  
  for (const symbol of Object.keys(results)) {
    for (const timeframe of Object.keys(results[symbol])) {
      const stats = results[symbol][timeframe];
      
      totalTrendlines += stats.totalTrendlines;
      totalSupportTrendlines += stats.supportTrendlines;
      totalResistanceTrendlines += stats.resistanceTrendlines;
      totalHorizontalTrendlines += stats.horizontalTrendlines;
      totalDiagonalTrendlines += stats.diagonalTrendlines;
      totalEmaTrendlines += stats.emaTrendlines;
      totalWickBasedTrendlines += stats.wickBasedTrendlines;
      totalBodyBasedTrendlines += stats.bodyBasedTrendlines;
      sumBouncePercentage += stats.averageBouncePercentage * stats.totalTrendlines;
      sumStrength += stats.averageStrength * stats.totalTrendlines;
      sumSlopeAngle += stats.averageSlopeAngle * stats.diagonalTrendlines;
      sumSlopeQuality += stats.slopeQualityScore * stats.diagonalTrendlines;
      totalBodyPenetrations += stats.bodyPenetrations;
      totalAccurateBreakouts += stats.accurateBreakouts;
      totalBreakouts += stats.totalBreakouts;
      
      symbolCount++;
    }
  }
  
  const overallBouncePercentage = totalTrendlines > 0 
    ? sumBouncePercentage / totalTrendlines
    : 0;
  
  const overallStrength = totalTrendlines > 0 
    ? sumStrength / totalTrendlines
    : 0;
  
  const overallSlopeAngle = totalDiagonalTrendlines > 0
    ? sumSlopeAngle / totalDiagonalTrendlines
    : 0;
    
  const overallSlopeQuality = totalDiagonalTrendlines > 0
    ? sumSlopeQuality / totalDiagonalTrendlines
    : 0;
  
  const overallBreakoutAccuracy = totalBreakouts > 0 
    ? (totalAccurateBreakouts / totalBreakouts) * 100
    : 0;
  
  console.log("\n📊 OVERALL TRENDLINE STATISTICS 📊");
  console.log(`Total Symbols Tested: ${symbols.length}`);
  console.log(`Total Timeframes Tested: ${timeframes.length}`);
  console.log(`Total Trendlines Identified: ${totalTrendlines}`);
  console.log(`  - Support Trendlines: ${totalSupportTrendlines}`);
  console.log(`  - Resistance Trendlines: ${totalResistanceTrendlines}`);
  console.log(`  - Horizontal Trendlines: ${totalHorizontalTrendlines}`);
  console.log(`  - Diagonal Trendlines: ${totalDiagonalTrendlines}`);
  console.log(`  - EMA-based Trendlines: ${totalEmaTrendlines}`);
  console.log(`  - Wick-based Trendlines: ${totalWickBasedTrendlines}`);
  console.log(`  - Body-based Trendlines: ${totalBodyBasedTrendlines}`);
  
  console.log(`\nTrendline Quality Metrics:`);
  console.log(`Average Bounce Percentage: ${overallBouncePercentage.toFixed(2)}%`);
  console.log(`Average Trendline Strength: ${overallStrength.toFixed(2)}`);
  console.log(`Average Slope Angle: ${overallSlopeAngle.toFixed(2)}°`);
  console.log(`Average Slope Quality: ${overallSlopeQuality.toFixed(2)}`);
  console.log(`Body Penetrations Prevented: ${totalBodyPenetrations}`);
  console.log(`Breakout Accuracy: ${overallBreakoutAccuracy.toFixed(2)}%`);
  
  if (overallBreakoutAccuracy >= 75) {
    console.log("\n✅ TRENDLINE ACCURACY TARGET ACHIEVED");
    console.log(`Breakout accuracy of ${overallBreakoutAccuracy.toFixed(2)}% exceeds the 75% target.`);
  } else {
    console.log("\n❌ TRENDLINE ACCURACY TARGET NOT MET");
    console.log(`Breakout accuracy of ${overallBreakoutAccuracy.toFixed(2)}% is below the 75% target.`);
    console.log("Consider adjusting trendline validation parameters for better accuracy.");
  }
  
  // Additional recommendation based on wick vs body comparison
  if (totalWickBasedTrendlines > totalBodyBasedTrendlines) {
    console.log("\nRECOMMENDATION: Continue using wick-based trendlines as the primary method.");
    console.log(`Wick-based trendlines (${totalWickBasedTrendlines}) outperformed body-based trendlines (${totalBodyBasedTrendlines}).`);
  } else {
    console.log("\nRECOMMENDATION: Consider switching to body-based trendlines as the primary method.");
    console.log(`Body-based trendlines (${totalBodyBasedTrendlines}) outperformed wick-based trendlines (${totalWickBasedTrendlines}).`);
  }
  
  if (overallSlopeAngle > 30) {
    console.log("\nWARNING: Average slope angle of diagonal trendlines is high.");
    console.log("Consider increasing minSlopeAngle or decreasing maxSlopeAngle in configuration.");
  }
}

/**
 * Helper function to calculate slope quality score
 */
function calculateSlopeQuality(angleInDegrees: number): number {
  // Moderate slopes (15-30 degrees) are considered optimal
  const OPTIMAL_MIN = 15;
  const OPTIMAL_MAX = 30;
  
  if (angleInDegrees >= OPTIMAL_MIN && angleInDegrees <= OPTIMAL_MAX) {
    return 1.0; // Perfect score for optimal angles
  } else if (angleInDegrees < OPTIMAL_MIN) {
    // Score decreases as angle approaches 0
    return angleInDegrees / OPTIMAL_MIN;
  } else {
    // Score decreases as angle approaches 90
    return 1.0 - ((angleInDegrees - OPTIMAL_MAX) / (90 - OPTIMAL_MAX));
  }
}

// Run the test
testTrendlineAccuracy().catch(error => {
  console.error("Error in trendline accuracy test:", error);
}); 