import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Plus,
  X,
  Save,
  Filter,
  ChevronDown,
  ChevronUp,
  Star,
  Trash2
} from 'lucide-react';

interface FilterCondition {
  id: string;
  field: string;
  operator: string;
  value: string | number;
}

interface FilterGroup {
  id: string;
  conditions: FilterCondition[];
  operator: 'AND' | 'OR';
}

interface AdvancedFilterBuilderProps {
  onApplyFilters: (filters: FilterGroup[]) => void;
  onSavePreset: (name: string, filters: FilterGroup[]) => void;
  availableFields: {
    name: string;
    type: 'number' | 'string' | 'boolean' | 'date';
    label: string;
  }[];
}

const AdvancedFilterBuilder: React.FC<AdvancedFilterBuilderProps> = ({
  onApplyFilters,
  onSavePreset,
  availableFields
}) => {
  const [filterGroups, setFilterGroups] = useState<FilterGroup[]>([{
    id: '1',
    conditions: [],
    operator: 'AND'
  }]);
  const [presetName, setPresetName] = useState('');
  const [showSavePreset, setShowSavePreset] = useState(false);

  const getOperatorsByType = (type: string) => {
    switch (type) {
      case 'number':
        return [
          { value: '>', label: 'Greater than' },
          { value: '<', label: 'Less than' },
          { value: '=', label: 'Equals' },
          { value: '>=', label: 'Greater than or equal' },
          { value: '<=', label: 'Less than or equal' },
          { value: '!=', label: 'Not equal' }
        ];
      case 'string':
        return [
          { value: 'contains', label: 'Contains' },
          { value: 'equals', label: 'Equals' },
          { value: 'startsWith', label: 'Starts with' },
          { value: 'endsWith', label: 'Ends with' }
        ];
      case 'boolean':
        return [
          { value: '=', label: 'Is' }
        ];
      case 'date':
        return [
          { value: 'before', label: 'Before' },
          { value: 'after', label: 'After' },
          { value: 'between', label: 'Between' }
        ];
      default:
        return [];
    }
  };

  const addCondition = (groupId: string) => {
    setFilterGroups(groups => groups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          conditions: [
            ...group.conditions,
            {
              id: Math.random().toString(36).substr(2, 9),
              field: availableFields[0].name,
              operator: getOperatorsByType(availableFields[0].type)[0].value,
              value: ''
            }
          ]
        };
      }
      return group;
    }));
  };

  const removeCondition = (groupId: string, conditionId: string) => {
    setFilterGroups(groups => groups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          conditions: group.conditions.filter(c => c.id !== conditionId)
        };
      }
      return group;
    }));
  };

  const addGroup = () => {
    setFilterGroups([
      ...filterGroups,
      {
        id: Math.random().toString(36).substr(2, 9),
        conditions: [],
        operator: 'AND'
      }
    ]);
  };

  const removeGroup = (groupId: string) => {
    setFilterGroups(groups => groups.filter(g => g.id !== groupId));
  };

  const updateCondition = (
    groupId: string,
    conditionId: string,
    field: string,
    value: any
  ) => {
    setFilterGroups(groups => groups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          conditions: group.conditions.map(condition => {
            if (condition.id === conditionId) {
              return { ...condition, [field]: value };
            }
            return condition;
          })
        };
      }
      return group;
    }));
  };

  const handleSavePreset = () => {
    if (presetName.trim()) {
      onSavePreset(presetName, filterGroups);
      setShowSavePreset(false);
      setPresetName('');
    }
  };

  return (
    <div className="space-y-4">
      {filterGroups.map((group, groupIndex) => (
        <Card key={group.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                Filter Group {groupIndex + 1}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Select
                  value={group.operator}
                  onValueChange={(value) => {
                    setFilterGroups(groups => groups.map(g => {
                      if (g.id === group.id) {
                        return { ...g, operator: value as 'AND' | 'OR' };
                      }
                      return g;
                    }));
                  }}
                >
                  <SelectTrigger className="h-8 w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AND">AND</SelectItem>
                    <SelectItem value="OR">OR</SelectItem>
                  </SelectContent>
                </Select>
                {filterGroups.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeGroup(group.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {group.conditions.map((condition) => (
              <div key={condition.id} className="flex items-center gap-2">
                <Select
                  value={condition.field}
                  onValueChange={(value) => updateCondition(group.id, condition.id, 'field', value)}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFields.map(field => (
                      <SelectItem key={field.name} value={field.name}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={condition.operator}
                  onValueChange={(value) => updateCondition(group.id, condition.id, 'operator', value)}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getOperatorsByType(
                      availableFields.find(f => f.name === condition.field)?.type || 'string'
                    ).map(op => (
                      <SelectItem key={op.value} value={op.value}>
                        {op.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  className="flex-1"
                  value={condition.value}
                  onChange={(e) => updateCondition(group.id, condition.id, 'value', e.target.value)}
                  placeholder="Value"
                />

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => removeCondition(group.id, condition.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => addCondition(group.id)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Condition
            </Button>
          </CardContent>
        </Card>
      ))}

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={addGroup}
          className="flex-1"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Filter Group
        </Button>

        <Button
          variant="default"
          onClick={() => onApplyFilters(filterGroups)}
          className="flex-1"
        >
          <Filter className="h-4 w-4 mr-2" />
          Apply Filters
        </Button>

        <Button
          variant="secondary"
          onClick={() => setShowSavePreset(true)}
          className="flex-1"
        >
          <Save className="h-4 w-4 mr-2" />
          Save as Preset
        </Button>
      </div>

      {showSavePreset && (
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Preset name"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                />
                <Button onClick={handleSavePreset}>
                  Save
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowSavePreset(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdvancedFilterBuilder; 