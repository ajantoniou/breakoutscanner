
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.3'
import { patternTypes, channelTypes, emaPatterns, symbols, timeframes } from './mock-data.ts'

// Define Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseKey)

// Define Polygon API key - recommended to move this to environment variable
const polygonApiKey = Deno.env.get('POLYGON_API_KEY') || 'YOUR_POLYGON_API_KEY'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Fetch real stock data from Polygon API
async function fetchRealStockData(symbol: string): Promise<any> {
  try {
    // Get the previous trading day
    const today = new Date()
    let previousDay = new Date(today)
    previousDay.setDate(today.getDate() - 1)
    
    // If weekend, adjust to Friday
    const dayOfWeek = previousDay.getDay()
    if (dayOfWeek === 0) previousDay.setDate(previousDay.getDate() - 2) // Sunday to Friday
    if (dayOfWeek === 6) previousDay.setDate(previousDay.getDate() - 1) // Saturday to Friday
    
    const formattedDate = previousDay.toISOString().split('T')[0]
    
    // Fetch real stock data from Polygon API
    const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${formattedDate}/${formattedDate}?apiKey=${polygonApiKey}`
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch data for ${symbol}: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    if (!data.results || data.results.length === 0) {
      throw new Error(`No data found for ${symbol} on ${formattedDate}`)
    }
    
    // Also fetch company details to check market cap
    const detailsUrl = `https://api.polygon.io/v3/reference/tickers/${symbol}?apiKey=${polygonApiKey}`
    const detailsResponse = await fetch(detailsUrl)
    
    if (!detailsResponse.ok) {
      throw new Error(`Failed to fetch details for ${symbol}: ${detailsResponse.statusText}`)
    }
    
    const detailsData = await detailsResponse.json()
    
    // Combine price and company data
    return {
      price: data.results[0],
      details: detailsData.results,
    }
  } catch (error) {
    console.error(`Error fetching real data for ${symbol}:`, error)
    return null
  }
}

// Generate a random number between min and max
function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

// Generate a random decimal with 2 decimal places between min and max
function randomDecimal(min: number, max: number): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2))
}

// Generate a random date between start and end dates
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

// Generate a random boolean with probability
function randomBoolean(probability = 0.5): boolean {
  return Math.random() < probability
}

// Generate a random item from an array
function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

// Generate random pattern data with REAL price data
async function generateRealisticPattern() {
  const symbol = randomItem(symbols)
  const timeframe = randomItem(timeframes)
  const patternType = randomItem(patternTypes)
  const channelType = randomItem(channelTypes)
  const emaPattern = randomItem(emaPatterns)
  
  // Fetch real stock data from Polygon API
  const stockData = await fetchRealStockData(symbol)
  let basePrice, marketCap
  
  if (stockData && stockData.price) {
    // Use real closing price
    basePrice = stockData.price.c
    marketCap = stockData.details?.market_cap || 0
    
    // Filter out stocks with price < $5 or market cap < $100M
    if (basePrice < 5 || marketCap < 100000000) {
      console.log(`Skipping ${symbol} - price: $${basePrice}, market cap: $${marketCap}`)
      return null
    }
    
    console.log(`Using real price data for ${symbol}: $${basePrice}, market cap: $${(marketCap/1000000).toFixed(2)}M`)
  } else {
    // If we can't get real data, skip this stock
    console.log(`Skipping ${symbol} - could not fetch real data`)
    return null
  }
  
  const isBullish = patternType.includes('Bull') || 
                    patternType.includes('Cup') || 
                    patternType.includes('Bottom') ||
                    patternType.includes('Ascending') ||
                    (patternType === 'Symmetrical Triangle' && randomBoolean())
  
  const entryPrice = basePrice
  const priceChangePercent = randomDecimal(2, 15) / 100
  const targetPrice = isBullish 
    ? basePrice * (1 + priceChangePercent) 
    : basePrice * (1 - priceChangePercent)
  
  const confidenceScore = randomDecimal(60, 95)
  
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 30)
  const createdAt = randomDate(startDate, new Date())
  
  const status = randomItem(['active', 'completed', 'failed'])
  
  // Generate more realistic support and resistance levels
  const averageVolatility = 0.08 // 8% average stock volatility
  const adjustedVolatility = stockData ? (stockData.price.h - stockData.price.l) / stockData.price.c : averageVolatility
  
  const supportLevel = basePrice * (1 - adjustedVolatility * randomDecimal(0.3, 0.7))
  const resistanceLevel = basePrice * (1 + adjustedVolatility * randomDecimal(0.3, 0.7))
  
  // Generate intra-channel pattern
  const intraChannelPatterns = isBullish 
    ? ['Higher Lows', 'Bull Flag', 'Double Bottom'] 
    : ['Lower Highs', 'Bear Flag', 'Double Top']
  const intraChannelPattern = randomItem(intraChannelPatterns)
  
  return {
    symbol,
    timeframe,
    pattern_type: patternType,
    entry_price: entryPrice,
    target_price: targetPrice,
    confidence_score: confidenceScore,
    status,
    created_at: createdAt.toISOString(),
    updated_at: new Date().toISOString(),
    channel_type: channelType,
    ema_pattern: emaPattern,
    support_level: supportLevel,
    resistance_level: resistanceLevel,
    trendline_break: randomBoolean(0.3),
    volume_confirmation: randomBoolean(0.7),
    intra_channel_pattern: intraChannelPattern
  }
}

// Generate backtest result for a pattern
function generateBacktestResult(patternId: string, success: boolean = null) {
  const randomSuccess = success === null ? randomBoolean(0.65) : success
  const profitLossPercent = randomSuccess 
    ? randomDecimal(1, 15) 
    : -randomDecimal(1, 10)
  
  const daysToBreakout = randomBetween(1, 14)
  const daysToTarget = randomSuccess ? daysToBreakout + randomBetween(1, 10) : null
  const maxDrawdown = randomSuccess ? -randomDecimal(0.5, 5) : -randomDecimal(5, 15)
  
  return {
    pattern_id: patternId,
    success: randomSuccess,
    profit_loss_percent: profitLossPercent,
    days_to_breakout: daysToBreakout,
    days_to_target: daysToTarget,
    max_drawdown: maxDrawdown,
    created_at: new Date().toISOString()
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    // Parse request parameters
    const { count = 50 } = await req.json()
    
    console.log(`Attempting to generate ${count} patterns with real price data`)
    
    // Generate patterns with real price data
    const patternPromises = Array.from({ length: count * 2 }, () => generateRealisticPattern())
    const unfilteredPatterns = await Promise.all(patternPromises)
    
    // Filter out null patterns (those with price < $5 or market cap < $100M)
    const patterns = unfilteredPatterns.filter(Boolean)
    
    if (patterns.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid patterns generated. Check API key and try again.' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    console.log(`Generated ${patterns.length} valid patterns after filtering`)
    
    // Insert patterns into the database
    const { data: insertedPatterns, error: patternsError } = await supabase
      .from('cached_patterns')
      .insert(patterns)
      .select()
    
    if (patternsError) {
      console.error('Error inserting patterns:', patternsError)
      return new Response(
        JSON.stringify({ error: 'Failed to insert patterns', details: patternsError }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    // Generate backtest results for each pattern
    const backtestResults = insertedPatterns.map(pattern => {
      // Determine whether backtest was successful based on pattern type for more realistic data
      const isBullish = pattern.pattern_type.includes('Bull') || 
                        pattern.pattern_type.includes('Cup') || 
                        pattern.pattern_type.includes('Bottom') ||
                        pattern.pattern_type.includes('Ascending')
      
      // Assign higher success probability to certain pattern types
      let successProbability = 0.5
      if (pattern.pattern_type.includes('Flag') || pattern.pattern_type.includes('Cup')) {
        successProbability = 0.75
      } else if (pattern.pattern_type.includes('Triangle')) {
        successProbability = 0.65
      }
      
      const success = randomBoolean(successProbability)
      return generateBacktestResult(pattern.id, success)
    })
    
    // Insert backtest results into the database
    const { data: insertedResults, error: resultsError } = await supabase
      .from('backtest_results')
      .insert(backtestResults)
      .select()
    
    if (resultsError) {
      console.error('Error inserting backtest results:', resultsError)
      return new Response(
        JSON.stringify({ error: 'Failed to insert backtest results', details: resultsError }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        patternCount: insertedPatterns.length,
        backtestCount: insertedResults.length,
        message: `Successfully inserted ${insertedPatterns.length} patterns with REAL market prices (>$5) and market caps (>$100M)`
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', details: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
