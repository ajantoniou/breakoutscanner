
import React from "react";
import { Button } from "@/components/ui/button";
import { DatabaseZap } from "lucide-react";

interface ScannerActionsProps {
  onSyncToSupabase: () => void;
  isLoading: boolean;
  dataSource: string;
}

const ScannerActions: React.FC<ScannerActionsProps> = ({
  onSyncToSupabase,
  isLoading,
  dataSource
}) => {
  return (
    <div className="flex items-center space-x-2">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={onSyncToSupabase}
        disabled={isLoading || dataSource !== 'api'}
        className="flex items-center"
      >
        <DatabaseZap className="h-4 w-4 mr-2" />
        Sync to Supabase
      </Button>
    </div>
  );
};

export default ScannerActions;
