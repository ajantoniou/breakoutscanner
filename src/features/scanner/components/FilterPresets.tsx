
import React, { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
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
  CardTitle,
} from "@/components/ui/card";
import { Check, Plus, Save, Trash2, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ScannerFilterPreset } from "@/hooks/scannerHooks/dataSource/apiStateHooks";

interface FilterPresetsProps {
  presets: ScannerFilterPreset[];
  activePresetId: string | null;
  onSelectPreset?: (presetId: string) => void;
  onDeletePreset?: (presetId: string) => void;
  onSavePreset?: (preset: Omit<ScannerFilterPreset, "id" | "createdAt">) => ScannerFilterPreset;
  currentSettings?: {
    timeframe: string;
    patternType: string;
    channelType: string;
    emaFilter: string;
  };
}

const FilterPresets: React.FC<FilterPresetsProps> = ({
  presets,
  activePresetId,
  onSelectPreset,
  onDeletePreset,
  onSavePreset,
  currentSettings
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [newPresetDescription, setNewPresetDescription] = useState("");
  const [minPrice, setMinPrice] = useState<number | undefined>(5);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [minVolume, setMinVolume] = useState<number | undefined>(500000);
  
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  
  useEffect(() => {
    if (isDialogOpen) {
      if (editingPresetId) {
        const preset = presets.find(p => p.id === editingPresetId);
        if (preset) {
          setNewPresetName(preset.name);
          setNewPresetDescription(preset.description || "");
          setMinPrice(preset.minPrice);
          setMaxPrice(preset.maxPrice);
          setMinVolume(preset.minVolume);
        }
      } else {
        setNewPresetName(`${currentSettings?.patternType} ${currentSettings?.timeframe} Scan`);
        setNewPresetDescription("");
        setMinPrice(5);
        setMaxPrice(undefined);
        setMinVolume(500000);
      }
    }
  }, [isDialogOpen, editingPresetId, currentSettings, presets]);

  const handleSavePreset = () => {
    if (!newPresetName.trim()) {
      toast.error("Please enter a preset name");
      return;
    }
    
    const patternTypes = currentSettings?.patternType === "all" 
      ? ["bullish", "bearish"] 
      : [currentSettings?.patternType];
      
    const channelTypes = currentSettings?.channelType === "all"
      ? ["ascending", "descending", "horizontal"]
      : [currentSettings?.channelType];
      
    const emaPatterns = currentSettings?.emaFilter === "all"
      ? ["7over50", "7over100", "50over100", "allBullish"]
      : [currentSettings?.emaFilter];
    
    if (editingPresetId) {
      const updatedPresets = presets.map(preset => {
        if (preset.id === editingPresetId) {
          return {
            ...preset,
            name: newPresetName,
            description: newPresetDescription,
            timeframe: currentSettings?.timeframe,
            patternTypes,
            channelTypes,
            emaPatterns,
            minPrice,
            maxPrice,
            minVolume
          };
        }
        return preset;
      });
      
      localStorage.setItem("filter_presets", JSON.stringify(updatedPresets));
      
      toast.success("Preset updated", {
        description: `"${newPresetName}" has been updated`
      });
    } else {
      if (onSavePreset) {
        const newPreset = onSavePreset({
          name: newPresetName,
          description: newPresetDescription,
          timeframe: currentSettings?.timeframe,
          patternTypes,
          channelTypes,
          emaPatterns,
          minPrice,
          maxPrice,
          minVolume
        });
        
        toast.success("Preset saved", {
          description: `"${newPresetName}" has been saved to your presets`
        });
        
        onSelectPreset && onSelectPreset(newPreset.id);
      }
    }
    
    setIsDialogOpen(false);
    setEditingPresetId(null);
  };
  
  const handleDeletePreset = (presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    
    if (preset?.isDefault) {
      toast.error("Cannot delete default preset");
      return;
    }
    
    onDeletePreset && onDeletePreset(presetId);
    toast.success("Preset deleted", {
      description: `Preset has been removed from your saved presets`
    });
  };
  
  const handleEditPreset = (presetId: string) => {
    setEditingPresetId(presetId);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Saved Scan Presets</h3>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              <span>New Preset</span>
            </Button>
          </DialogTrigger>
          
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingPresetId ? "Edit Scan Preset" : "Save New Scan Preset"}</DialogTitle>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="presetName">Preset Name</Label>
                <Input
                  id="presetName"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder="e.g., Bull Flag Daily Scan"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  value={newPresetDescription}
                  onChange={(e) => setNewPresetDescription(e.target.value)}
                  placeholder="Describe what this scan looks for"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="minPrice">Min Price ($)</Label>
                  <Input
                    id="minPrice"
                    type="number"
                    value={minPrice || ""}
                    onChange={(e) => setMinPrice(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="Minimum price"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="maxPrice">Max Price ($)</Label>
                  <Input
                    id="maxPrice"
                    type="number"
                    value={maxPrice || ""}
                    onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="No maximum"
                  />
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="minVolume">Min Volume</Label>
                <Input
                  id="minVolume"
                  type="number"
                  value={minVolume || ""}
                  onChange={(e) => setMinVolume(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="Minimum volume"
                />
              </div>
              
              <div className="pt-2">
                <h4 className="text-sm font-medium mb-2">Current Filter Settings</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{currentSettings?.timeframe} timeframe</Badge>
                  <Badge variant="outline">{currentSettings?.patternType} patterns</Badge>
                  <Badge variant="outline">{currentSettings?.channelType} channels</Badge>
                  <Badge variant="outline">{currentSettings?.emaFilter} EMA</Badge>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsDialogOpen(false);
                  setEditingPresetId(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSavePreset}>
                <Save className="h-4 w-4 mr-2" />
                Save Preset
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {presets.map((preset) => (
          <Card 
            key={preset.id} 
            className={`${activePresetId === preset.id ? 'border-primary' : 'border-border'} cursor-pointer hover:border-primary/70 transition-all`}
            onClick={() => onSelectPreset && onSelectPreset(preset.id)}
          >
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-base">{preset.name}</CardTitle>
                {activePresetId === preset.id && (
                  <Badge variant="default" className="ml-auto">
                    <Check className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs line-clamp-2">
                {preset.description || `${preset.timeframe} scan with ${preset.patternTypes?.join(', ') || 'various'} patterns`}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pb-2">
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="text-xs">{preset.timeframe}</Badge>
                {preset.minPrice && (
                  <Badge variant="outline" className="text-xs">&gt;${preset.minPrice}</Badge>
                )}
                {preset.patternTypes && preset.patternTypes[0] !== "all" && (
                  <Badge variant="outline" className="text-xs">{preset.patternTypes[0]}</Badge>
                )}
              </div>
            </CardContent>
            
            <CardFooter className="pt-0 justify-end">
              {!preset.isDefault && (
                <>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditPreset(preset.id);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePreset && onDeletePreset(preset.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default FilterPresets;
