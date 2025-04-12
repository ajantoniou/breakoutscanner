
import React from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useScanner } from "@/hooks/useScanner";

const ScannerActionButtons: React.FC = () => {
  const { 
    loading, 
    handleRefresh
  } = useScanner();

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="default"
        size="sm"
        onClick={handleRefresh}
        disabled={loading}
        className="gap-1 h-8"
      >
        {loading ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">Refresh Data</span>
      </Button>
    </div>
  );
};

export default ScannerActionButtons;
