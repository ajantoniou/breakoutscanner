
import { useEffect } from "react";
import { loadUserPreferences } from '../preferencesUtils';
import { useFilterPresets } from '../useFilterPresets';

export const useFilterPresetLogic = (
  setAnalyzeFullUniverse: (analyze: boolean) => void,
  setUniverseSize: (size: string) => void,
  setHistoricalYears: (years: 1 | 2 | 5) => void
) => {
  const {
    savedFilterPresets,
    activePresetId,
    loadFilterPresets,
    saveFilterPreset,
    setActivePreset,
    deleteFilterPreset
  } = useFilterPresets();
  
  // Load user preferences and filter presets on mount
  useEffect(() => {
    loadUserPreferences(setAnalyzeFullUniverse, setUniverseSize, setHistoricalYears);
    loadFilterPresets();
  }, [setAnalyzeFullUniverse, setUniverseSize, setHistoricalYears, loadFilterPresets]);
  
  return {
    savedFilterPresets,
    activePresetId,
    loadFilterPresets,
    saveFilterPreset,
    setActivePreset,
    deleteFilterPreset
  };
};
