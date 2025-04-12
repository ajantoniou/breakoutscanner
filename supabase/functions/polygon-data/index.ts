// Follow Deno-first approach for Supabase Edge Functions
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

// Polygon API base URL
const POLYGON_API_BASE_URL = 'https://api.polygon.io'

// Polygon API key (it's safe to store this in the server-side Edge Function)
const POLYGON_API_KEY = Deno.env.get('POLYGON_API_KEY') || 'onEimwzRMEYR2FhgLVBZnAmyz9EC8KfI'

// Cache TTL values (in seconds)
const CACHE_TTL = {
  AGGREGATES: 60 * 60, // 1 hour for historical data
  REFERENCE: 24 * 60 * 60, // 24 hours for reference data
  MARKET_STATUS: 60, // 1 minute for market status
  TRADES: 15, // 15 seconds for trades
  LAST_TRADE: 5 // 5 seconds for last trade
}

serve(async (req) => {
  // Handle CORS preflight requests (OPTIONS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    
    // Get query parameters with defaults
    const ticker = url.searchParams.get('ticker') || 'AAPL'
    const timeframe = url.searchParams.get('timeframe') || '1'
    const timespan = url.searchParams.get('timespan') || 'day'
    const from = url.searchParams.get('from') || '2023-01-01'
    const to = url.searchParams.get('to') || '2023-12-31'
    const limit = url.searchParams.get('limit') || '730'
    const action = url.searchParams.get('action') || 'aggregates'
    
    // Determine which Polygon API endpoint to call
    let polygonUrl = ''
    let cacheTtl = CACHE_TTL.AGGREGATES
    
    switch (action) {
      case 'aggregates':
        // Historical price data (default)
        polygonUrl = `${POLYGON_API_BASE_URL}/v2/aggs/ticker/${ticker}/range/${timeframe}/${timespan}/${from}/${to}?limit=${limit}&apiKey=${POLYGON_API_KEY}`
        cacheTtl = CACHE_TTL.AGGREGATES
        break
        
      case 'reference':
        // Reference data about a ticker
        polygonUrl = `${POLYGON_API_BASE_URL}/v3/reference/tickers/${ticker}?apiKey=${POLYGON_API_KEY}`
        cacheTtl = CACHE_TTL.REFERENCE
        break
        
      case 'marketstatus':
        // Check if the market is open
        polygonUrl = `${POLYGON_API_BASE_URL}/v1/marketstatus/now?apiKey=${POLYGON_API_KEY}`
        cacheTtl = CACHE_TTL.MARKET_STATUS
        break
        
      case 'trades':
        // Get recent trades
        polygonUrl = `${POLYGON_API_BASE_URL}/v3/trades/${ticker}?limit=${limit}&apiKey=${POLYGON_API_KEY}`
        cacheTtl = CACHE_TTL.TRADES
        break
        
      case 'lasttrade':
        // Get last trade
        polygonUrl = `${POLYGON_API_BASE_URL}/v2/last/trade/${ticker}?apiKey=${POLYGON_API_KEY}`
        cacheTtl = CACHE_TTL.LAST_TRADE
        break
        
      default:
        // Default to aggregates
        polygonUrl = `${POLYGON_API_BASE_URL}/v2/aggs/ticker/${ticker}/range/${timeframe}/${timespan}/${from}/${to}?limit=${limit}&apiKey=${POLYGON_API_KEY}`
        cacheTtl = CACHE_TTL.AGGREGATES
    }
    
    // Make the request to Polygon API
    const polygonResponse = await fetch(polygonUrl)
    
    if (!polygonResponse.ok) {
      throw new Error(`Polygon API error: ${polygonResponse.status} ${polygonResponse.statusText}`)
    }
    
    // Get the JSON response
    const data = await polygonResponse.json()
    
    // Return the data with CORS headers and caching headers
    return new Response(
      JSON.stringify(data),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': `public, max-age=${cacheTtl}`,
        },
      }
    )
  } catch (error) {
    console.error(`Error in polygon-data function:`, error)
    
    // Return error with CORS headers
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  }
}) 