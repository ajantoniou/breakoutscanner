
import React from 'react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface ScannerTabsProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  patternCounts: {
    all: number;
    active: number;
    completed: number;
    failed: number;
  };
}

const ScannerTabs: React.FC<ScannerTabsProps> = ({
  activeTab,
  onTabChange,
  patternCounts
}) => {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="grid grid-cols-4 h-auto">
        <TabsTrigger value="all" className="py-2">
          All Patterns
          <Badge variant="outline" className="ml-2">
            {patternCounts.all}
          </Badge>
        </TabsTrigger>
        
        <TabsTrigger value="active" className="py-2">
          Active
          <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
            {patternCounts.active}
          </Badge>
        </TabsTrigger>
        
        <TabsTrigger value="completed" className="py-2">
          Completed
          <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 border-blue-200">
            {patternCounts.completed}
          </Badge>
        </TabsTrigger>
        
        <TabsTrigger value="failed" className="py-2">
          Failed
          <Badge variant="outline" className="ml-2 bg-red-50 text-red-700 border-red-200">
            {patternCounts.failed}
          </Badge>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
};

export default ScannerTabs;
