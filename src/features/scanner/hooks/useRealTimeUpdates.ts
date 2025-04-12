
import { useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { PatternData } from "@/services/types/patternTypes";

export const useRealTimeUpdates = (
  toggleAnalysisMode: () => boolean,
  changeUniverseSize: (size: string) => string,
  changeHistoricalYears: (years: 1 | 2 | 5) => number
) => {
  const toggleUniverseMode = useCallback(() => {
    const newMode = toggleAnalysisMode();
    const messageText = newMode 
      ? "Analyzing stocks with high options volume" 
      : "Limited market analysis enabled";
    
    const descriptionText = newMode 
      ? "Scanning 500+ liquid stocks with high options volume" 
      : "Scanning top 25 stocks for faster results";
    
    toast({
      title: messageText,
      description: descriptionText
    });
    
    return newMode;
  }, [toggleAnalysisMode]);

  return {
    toggleUniverseMode,
    changeUniverseSize,
    changeHistoricalYears
  };
};
