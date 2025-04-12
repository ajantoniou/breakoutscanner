
export interface ScannerFilterPreset {
  id: string;
  name: string;
  patternTypes: string[];
  channelTypes: string[];
  emaPatterns: string[];
  timeframe: string;
  createdAt: Date;
  description?: string;
  minPrice?: number;
  maxPrice?: number;
  minVolume?: number;
  isDefault?: boolean;
}
