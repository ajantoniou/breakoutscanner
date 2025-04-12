import { toast } from "sonner";
import { PatternData } from "@/services/types/patternTypes";
import { adaptToastFunction } from "@/utils/functionAdapters";

// Adapt toast functions to handle different argument counts
const showToast = adaptToastFunction(toast);
const showErrorToast = adaptToastFunction(toast.error);
const showSuccessToast = adaptToastFunction(toast.success);

export const showApiErrorToast = (title: string, description?: string) => {
  showErrorToast(title, description);
};

export const showApiSuccessToast = (title: string, description?: string) => {
  showSuccessToast(title, description);
};

/**
 * Fetches raw polygon data from the API
 */
export const fetchRawPolygonData = async (symbols: string[], timeframe: string, apiKey: string) => {
  // This is a placeholder function that would be implemented to fetch raw data
  console.log("Fetching raw polygon data for", symbols, "with timeframe", timeframe);
  return {};
};

/**
 * Enhances patterns with channel information
 */
export const enhancePatternsWithChannelInfo = async (
  patterns: PatternData[]
): Promise<PatternData[]> => {
  // This is a placeholder function that would be implemented to enhance patterns
  console.log("Enhancing patterns with channel info");
  return patterns;
};
