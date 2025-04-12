
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { ScannerFilterPreset } from '@/services/types/backtestTypes';
import { ensureDateString } from '@/utils/dateConverter';

export const useFilterPresets = () => {
  const [savedFilterPresets, setSavedFilterPresets] = useState<ScannerFilterPreset[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  // Load filter presets from localStorage on initial render
  const loadFilterPresets = useCallback(() => {
    try {
      const storedPresets = JSON.parse(localStorage.getItem('scanner_filter_presets') || '[]');
      // Convert string dates to string if they're Date objects
      const formattedPresets = storedPresets.map((preset: any) => ({
        ...preset,
        createdAt: ensureDateString(preset.createdAt) || new Date().toISOString()
      }));
      setSavedFilterPresets(formattedPresets);
      
      const activeId = localStorage.getItem('active_filter_preset_id');
      if (activeId && formattedPresets.some((p: ScannerFilterPreset) => p.id === activeId)) {
        setActivePresetId(activeId);
      }
    } catch (error) {
      console.error("Error loading filter presets:", error);
      setSavedFilterPresets([]);
    }
  }, []);

  // Save a new filter preset
  const saveFilterPreset = useCallback((preset: Omit<ScannerFilterPreset, "id" | "createdAt">) => {
    const newPreset: ScannerFilterPreset = {
      ...preset,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(), // Store as string
    };
    
    setSavedFilterPresets(prev => [...prev, newPreset]);
    setActivePresetId(newPreset.id);
    
    const existingPresets = JSON.parse(localStorage.getItem('scanner_filter_presets') || '[]');
    localStorage.setItem('scanner_filter_presets', JSON.stringify([...existingPresets, newPreset]));
    localStorage.setItem('active_filter_preset_id', newPreset.id);
    
    toast.success(`Saved preset: ${newPreset.name}`);
    return newPreset;
  }, []);
  
  // Set active preset
  const setActivePreset = useCallback((presetId: string) => {
    setActivePresetId(presetId);
    localStorage.setItem('active_filter_preset_id', presetId);
  }, []);
  
  // Delete a filter preset
  const deleteFilterPreset = useCallback((presetId: string) => {
    setSavedFilterPresets(prev => prev.filter(p => p.id !== presetId));
    
    if (activePresetId === presetId) {
      setActivePresetId(null);
      localStorage.removeItem('active_filter_preset_id');
    }
    
    const existingPresets = JSON.parse(localStorage.getItem('scanner_filter_presets') || '[]');
    localStorage.setItem(
      'scanner_filter_presets', 
      JSON.stringify(existingPresets.filter((p: ScannerFilterPreset) => p.id !== presetId))
    );
    
    toast.success("Filter preset deleted");
    return Promise.resolve();
  }, [activePresetId]);

  useEffect(() => {
    loadFilterPresets();
  }, [loadFilterPresets]);

  return {
    savedFilterPresets,
    activePresetId,
    loadFilterPresets,
    saveFilterPreset,
    setActivePreset,
    deleteFilterPreset
  };
};
