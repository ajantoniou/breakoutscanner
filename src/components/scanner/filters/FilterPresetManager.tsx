import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  Clock,
  Filter,
  Trash2,
  Edit,
  Copy,
  CheckCircle
} from 'lucide-react';
import { ScannerFilterPreset } from '@/services/types/backtestTypes';
import formatDistanceToNow from 'date-fns/formatDistanceToNow';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface FilterPresetManagerProps {
  presets: ScannerFilterPreset[];
  activePresetId: string | null;
  onSelectPreset: (preset: ScannerFilterPreset) => void;
  onDeletePreset: (presetId: string) => Promise<void>;
  onDuplicatePreset: (preset: ScannerFilterPreset) => Promise<void>;
  onSetDefaultPreset: (presetId: string) => Promise<void>;
}

const FilterPresetManager: React.FC<FilterPresetManagerProps> = ({
  presets,
  activePresetId,
  onSelectPreset,
  onDeletePreset,
  onDuplicatePreset,
  onSetDefaultPreset
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(activePresetId);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => {
    setSelectedPreset(activePresetId);
  }, [activePresetId]);

  const handlePresetSelect = (preset: ScannerFilterPreset) => {
    setSelectedPreset(preset.id);
    onSelectPreset(preset);
  };

  const handleDelete = async (presetId: string) => {
    try {
      setIsDeleting(presetId);
      await onDeletePreset(presetId);
      toast.success('Preset deleted successfully');
    } catch (error) {
      toast.error('Failed to delete preset');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleDuplicate = async (preset: ScannerFilterPreset) => {
    try {
      await onDuplicatePreset(preset);
      toast.success('Preset duplicated successfully');
    } catch (error) {
      toast.error('Failed to duplicate preset');
    }
  };

  const handleSetDefault = async (presetId: string) => {
    try {
      await onSetDefaultPreset(presetId);
      toast.success('Default preset updated');
    } catch (error) {
      toast.error('Failed to update default preset');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Saved Filter Presets</CardTitle>
        <CardDescription>
          Select a preset to quickly apply saved filters
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-2">
            {presets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No saved presets. Create your first preset to save your filters.
              </div>
            ) : (
              presets.map((preset) => (
                <div key={preset.id}>
                  <Card
                    className={`
                      cursor-pointer transition-all
                      ${selectedPreset === preset.id ? 'border-primary shadow-md' : 'hover:border-primary/20'}
                    `}
                    onClick={() => handlePresetSelect(preset)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{preset.name}</h3>
                            {preset.isDefault && (
                              <Badge variant="secondary" className="text-amber-600">
                                <Star className="h-3 w-3 mr-1 fill-current" />
                                Default
                              </Badge>
                            )}
                          </div>
                          {preset.description && (
                            <p className="text-sm text-muted-foreground">
                              {preset.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            Created {formatDistanceToNow(new Date(preset.createdAt))} ago
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {selectedPreset === preset.id && (
                            <Badge variant="outline" className="bg-primary/5">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicate(preset);
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          {!preset.isDefault && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetDefault(preset.id);
                              }}
                            >
                              <Star className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(preset.id);
                            }}
                            disabled={isDeleting === preset.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <Separator className="my-3" />

                      <div className="flex flex-wrap gap-1">
                        {preset.patternTypes.map((type) => (
                          <Badge key={type} variant="outline">
                            {type}
                          </Badge>
                        ))}
                        {preset.channelTypes.map((type) => (
                          <Badge key={type} variant="outline" className="border-blue-200">
                            {type}
                          </Badge>
                        ))}
                        {preset.emaPatterns.map((pattern) => (
                          <Badge key={pattern} variant="outline" className="border-green-200">
                            {pattern}
                          </Badge>
                        ))}
                        <Badge variant="outline" className="border-purple-200">
                          {preset.timeframe}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default FilterPresetManager; 