
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/**
 * Save processed pattern data to Supabase
 */
export const savePatterns = async (patterns: any[]): Promise<boolean> => {
  if (!patterns || patterns.length === 0) {
    return false;
  }

  try {
    // Map patterns to the format expected by the cached_patterns table
    const dataToInsert = patterns.map(pattern => ({
      symbol: pattern.symbol,
      timeframe: pattern.timeframe,
      pattern_type: pattern.patternType,
      entry_price: pattern.entryPrice, // Keep as number
      target_price: pattern.targetPrice, // Keep as number
      confidence_score: pattern.confidenceScore, // Keep as number
      status: pattern.status || 'active',
      channel_type: pattern.channelType,
      ema_pattern: pattern.emaPattern,
      support_level: pattern.supportLevel, // Keep as number or null
      resistance_level: pattern.resistanceLevel, // Keep as number or null
      trendline_break: pattern.trendlineBreak,
      volume_confirmation: pattern.volumeConfirmation
    }));

    // First, delete existing patterns for this timeframe to avoid duplicates
    const { error: deleteError } = await supabase
      .from('cached_patterns')
      .delete()
      .eq('timeframe', patterns[0].timeframe);
    
    if (deleteError) {
      console.error("Error clearing old cached patterns:", deleteError);
    }
    
    // Then insert the new data
    const { error } = await supabase
      .from('cached_patterns')
      .insert(dataToInsert);
    
    if (error) {
      console.error("Error saving cached patterns:", error);
      return false;
    }
    
    console.log(`Successfully cached ${dataToInsert.length} patterns for timeframe ${patterns[0].timeframe}`);
    return true;
  } catch (error) {
    console.error("Exception saving cached patterns:", error);
    return false;
  }
};

/**
 * Retrieve patterns from Supabase
 */
export const getCachedPatterns = async (
  timeframe: string
): Promise<any[] | null> => {
  try {
    let query = supabase
      .from('cached_patterns')
      .select('*');
    
    if (timeframe !== 'all') {
      query = query.eq('timeframe', timeframe);
    }
    
    const { data, error } = await query
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Error fetching cached patterns:", error);
      return null;
    }
    
    if (!data || data.length === 0) {
      console.log(`No cached patterns found for timeframe ${timeframe}`);
      return null;
    }
    
    console.log(`Retrieved ${data.length} cached patterns for timeframe ${timeframe} from ${new Date(data[0].created_at).toLocaleString()}`);
    
    // Transform data to match the PatternData interface
    return data.map(row => ({
      id: row.id,
      symbol: row.symbol,
      timeframe: row.timeframe,
      patternType: row.pattern_type,
      entryPrice: row.entry_price, // Already a number
      targetPrice: row.target_price, // Already a number
      confidenceScore: row.confidence_score, // Already a number
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      channelType: row.channel_type,
      emaPattern: row.ema_pattern,
      supportLevel: row.support_level, // Already a number or null
      resistanceLevel: row.resistance_level, // Already a number or null
      trendlineBreak: row.trendline_break,
      volumeConfirmation: row.volume_confirmation
    }));
  } catch (error) {
    console.error("Exception fetching cached patterns:", error);
    return null;
  }
};
