
import { toast } from "sonner";

type UniverseSize = 'small' | 'medium' | 'large' | 'technology' | 'finance' | 'options';
type HistoricalYears = 1 | 2 | 5;

/**
 * Function to toggle analysis mode
 */
export const toggleAnalysisMode = (
  analyzeFullUniverse: boolean,
  setAnalyzeFullUniverse: (value: boolean) => void
): boolean => {
  const newMode = !analyzeFullUniverse;
  setAnalyzeFullUniverse(newMode);
  localStorage.setItem("analyze_full_universe", newMode.toString());
  return newMode;
};

/**
 * Function to change universe size
 */
export const changeUniverseSize = (
  size: UniverseSize,
  setUniverseSize: (size: UniverseSize) => void
): UniverseSize => {
  setUniverseSize(size);
  localStorage.setItem("stock_universe_size", size);
  
  // Show toast with information about the new universe size
  const sizeInfo = {
    small: "50 stocks (fast analysis)",
    medium: "200 stocks (balanced)",
    large: "500 stocks (comprehensive)",
    technology: "45 technology stocks",
    finance: "30 financial stocks",
    options: "100 stocks with highest options volume and liquidity"
  };
  
  toast.info(`Stock universe changed: ${sizeInfo[size]}`, {
    description: "Refresh data to apply the new universe"
  });
  
  return size;
};

/**
 * Function to change historical data period
 */
export const changeHistoricalYears = (
  years: HistoricalYears,
  setHistoricalYears: (years: HistoricalYears) => void
): HistoricalYears => {
  setHistoricalYears(years);
  localStorage.setItem("historical_years", years.toString());
  
  toast.info(`Historical data period: ${years} ${years === 1 ? 'year' : 'years'}`, {
    description: "Refresh data to apply the new period"
  });
  
  return years;
};

/**
 * Function to load user preferences from localStorage
 */
export const loadUserPreferences = (
  setAnalyzeFullUniverse: (value: boolean) => void,
  setUniverseSize: (size: UniverseSize) => void,
  setHistoricalYears: (years: HistoricalYears) => void
): void => {
  const savedAnalyzeFullUniverse = localStorage.getItem("analyze_full_universe");
  const savedUniverseSize = localStorage.getItem("stock_universe_size") as UniverseSize | null;
  const savedHistoricalYears = localStorage.getItem("historical_years");
  
  // Save our defaults to localStorage if not already set
  if (savedAnalyzeFullUniverse === null) {
    localStorage.setItem("analyze_full_universe", "true");
  } else {
    setAnalyzeFullUniverse(savedAnalyzeFullUniverse === "true");
  }
  
  if (!savedUniverseSize) {
    localStorage.setItem("stock_universe_size", "options");
  } else if (['small', 'medium', 'large', 'technology', 'finance', 'options'].includes(savedUniverseSize)) {
    setUniverseSize(savedUniverseSize);
  }
  
  if (!savedHistoricalYears) {
    localStorage.setItem("historical_years", "5");
  } else {
    const years = parseInt(savedHistoricalYears);
    if ([1, 2, 5].includes(years)) {
      setHistoricalYears(years as HistoricalYears);
    }
  }
  
  // Always save the API key configuration to localStorage
  localStorage.setItem("market_api_key", DEFAULT_API_KEY);
  localStorage.setItem("market_api_provider", "Polygon.io");
  localStorage.setItem("market_api_is_premium", "true");
};

// Import at the top of the file
import { DEFAULT_API_KEY } from '@/services/api/marketData/apiKeyService';
