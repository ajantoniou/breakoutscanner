
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  PencilIcon, 
  TrashIcon, 
  CheckIcon, 
  PlusIcon, 
  XIcon,
  StarIcon
} from "lucide-react";
import { ScannerFilterPreset } from "@/services/types/backtestTypes";
import { ensureDateString } from "@/utils/dateConverter";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

export interface FilterPresetsManagerProps {
  presets: ScannerFilterPreset[];
  activePresetId: string | null;
  onSetActivePreset: (presetId: string) => void;
  onDeletePreset: (presetId: string) => Promise<void>;
  onClose: () => void;
  onSavePreset: (preset: Omit<ScannerFilterPreset, "id" | "createdAt">) => ScannerFilterPreset;
  currentFilters: {
    patternTypes: string[];
    channelTypes: string[];
    emaPatterns: string[];
    timeframe: string;
  };
}

const FilterPresetsManager: React.FC<FilterPresetsManagerProps> = ({
  presets,
  activePresetId,
  onSetActivePreset,
  onDeletePreset,
  onClose,
  onSavePreset,
  currentFilters
}) => {
  const [newPresetName, setNewPresetName] = useState("");
  const [newPresetDescription, setNewPresetDescription] = useState("");
  const [newPresetMinPrice, setNewPresetMinPrice] = useState<number | undefined>(undefined);
  const [newPresetMaxPrice, setNewPresetMaxPrice] = useState<number | undefined>(undefined);
  const [newPresetMinVolume, setNewPresetMinVolume] = useState<number | undefined>(undefined);
  const [isDefault, setIsDefault] = useState(false);
  const [showNewPresetForm, setShowNewPresetForm] = useState(false);
  
  const handleSaveNewPreset = () => {
    if (!newPresetName.trim()) return;
    
    const newPreset = {
      name: newPresetName.trim(),
      patternTypes: [...currentFilters.patternTypes],
      channelTypes: [...currentFilters.channelTypes],
      emaPatterns: [...currentFilters.emaPatterns],
      timeframe: currentFilters.timeframe,
      description: newPresetDescription,
      minPrice: newPresetMinPrice,
      maxPrice: newPresetMaxPrice,
      minVolume: newPresetMinVolume,
      isDefault: isDefault
    };
    
    const savedPreset = onSavePreset(newPreset);
    
    // Reset form
    setNewPresetName("");
    setNewPresetDescription("");
    setNewPresetMinPrice(undefined);
    setNewPresetMaxPrice(undefined);
    setNewPresetMinVolume(undefined);
    setIsDefault(false);
    setShowNewPresetForm(false);
    
    // Set as active
    onSetActivePreset(savedPreset.id);
  };
  
  const handleSelectPreset = (presetId: string) => {
    onSetActivePreset(presetId);
  };
  
  const handleDeletePreset = async (presetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await onDeletePreset(presetId);
  };
  
  const formatDate = (date: string | Date) => {
    try {
      const dateStr = ensureDateString(date);
      if (!dateStr) return "Unknown date";
      
      const dateObj = new Date(dateStr);
      return dateObj.toLocaleDateString('en-US', {
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      return "Invalid date";
    }
  };
  
  return (
    <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="text-xl font-semibold">
          Filter Presets
        </DialogTitle>
      </DialogHeader>
      
      <div className="space-y-4">
        {/* New preset form */}
        {showNewPresetForm ? (
          <Card className="border-primary/40 border-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">
                New Filter Preset
              </CardTitle>
              <CardDescription>
                Save current filter settings as a preset
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="presetName">Preset Name *</Label>
                <Input 
                  id="presetName" 
                  value={newPresetName} 
                  onChange={e => setNewPresetName(e.target.value)}
                  placeholder="My Filter Preset"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="presetDescription">Description (optional)</Label>
                <Input 
                  id="presetDescription" 
                  value={newPresetDescription} 
                  onChange={e => setNewPresetDescription(e.target.value)}
                  placeholder="Describe your filter preset"
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minPrice">Min Price (optional)</Label>
                  <Input 
                    id="minPrice" 
                    type="number" 
                    min={0}
                    value={newPresetMinPrice !== undefined ? newPresetMinPrice : ''}
                    onChange={e => setNewPresetMinPrice(e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="0"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="maxPrice">Max Price (optional)</Label>
                  <Input 
                    id="maxPrice" 
                    type="number" 
                    min={0}
                    value={newPresetMaxPrice !== undefined ? newPresetMaxPrice : ''}
                    onChange={e => setNewPresetMaxPrice(e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="1000"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="minVolume">Min Volume (optional)</Label>
                  <Input 
                    id="minVolume" 
                    type="number" 
                    min={0}
                    value={newPresetMinVolume !== undefined ? newPresetMinVolume : ''}
                    onChange={e => setNewPresetMinVolume(e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="100000"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="isDefault" 
                  checked={isDefault} 
                  onCheckedChange={setIsDefault} 
                />
                <Label htmlFor="isDefault">
                  Set as default preset
                </Label>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setShowNewPresetForm(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveNewPreset}
                disabled={!newPresetName.trim()}
              >
                Save Preset
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <Button 
            onClick={() => setShowNewPresetForm(true)}
            className="w-full"
            variant="outline"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Create New Preset
          </Button>
        )}
        
        {/* Preset list */}
        <div className="space-y-2">
          {presets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No saved presets. Create your first one!
            </div>
          ) : (
            presets.map(preset => (
              <Card 
                key={preset.id}
                className={`cursor-pointer transition-all ${
                  activePresetId === preset.id 
                    ? 'border-primary/60 bg-primary/5' 
                    : 'hover:border-primary/20'
                }`}
                onClick={() => handleSelectPreset(preset.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-medium">
                        {preset.name}
                      </CardTitle>
                      {preset.isDefault && (
                        <Badge variant="outline" className="text-amber-500 border-amber-200 bg-amber-50">
                          <StarIcon className="h-3 w-3 mr-1" />
                          Default
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {activePresetId === preset.id && (
                        <Badge variant="secondary" className="h-5 px-1">
                          <CheckIcon className="h-3 w-3" />
                        </Badge>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-5 w-5 text-destructive hover:bg-destructive/10 hover:text-destructive-foreground"
                        onClick={(e) => handleDeletePreset(preset.id, e)}
                      >
                        <TrashIcon className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-3">
                  {preset.description && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {preset.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="bg-primary/5">
                      {preset.timeframe}
                    </Badge>
                    
                    {preset.minPrice !== undefined && (
                      <Badge variant="outline" className="bg-muted/50">
                        min ${preset.minPrice}
                      </Badge>
                    )}
                    
                    <Badge variant="secondary" className="text-xs">
                      {preset.patternTypes.length === 1 && preset.patternTypes[0] === "all" 
                        ? "All patterns" 
                        : `${preset.patternTypes.length} patterns`
                      }
                    </Badge>
                    
                    <Badge variant="secondary" className="text-xs">
                      {preset.channelTypes.length === 1 && preset.channelTypes[0] === "all" 
                        ? "All channels" 
                        : `${preset.channelTypes.length} channels`
                      }
                    </Badge>
                    
                    <Badge variant="secondary" className="text-xs">
                      {preset.emaPatterns.length === 1 && preset.emaPatterns[0] === "all" 
                        ? "All EMAs" 
                        : `${preset.emaPatterns.length} EMAs`
                      }
                    </Badge>
                  </div>
                  
                  <div className="text-xs text-muted-foreground mt-2">
                    Created: {formatDate(preset.createdAt)}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
      
      <div className="flex justify-end mt-4">
        <Button onClick={onClose}>
          Close
        </Button>
      </div>
    </DialogContent>
  );
};

export default FilterPresetsManager;
