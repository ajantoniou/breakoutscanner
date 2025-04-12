
import React from "react";
import { ensureDateString } from '@/utils/dateConverter';
import { ScannerFilterPreset } from '@/services/types/backtestTypes';

// Normalize presets to ensure createdAt is always a string
export const normalizePresets = (presets: any[]): ScannerFilterPreset[] => {
  return presets.map(preset => ({
    ...preset,
    createdAt: ensureDateString(preset.createdAt) || new Date().toISOString(),
    description: preset.description || "",
    isDefault: preset.isDefault || false
  }));
};

// Function to use in components that need normalized presets
export const getSafePresets = (filterPresets: any[]): ScannerFilterPreset[] => {
  return normalizePresets(filterPresets);
};
