import { useCallback } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { adaptBooleanToVoid } from '@/utils/typeAdapters';

interface UseScannerRefreshLogicProps {
  onRefresh: (symbols?: string[], forceRefresh?: boolean, runFullBacktest?: boolean) => Promise<boolean>;
  onToggleRealTime: () => boolean;
  onRunFullBacktest: () => Promise<boolean>;
}

export const useScannerRefreshLogic = ({
  onRefresh,
  onToggleRealTime,
  onRunFullBacktest
}: UseScannerRefreshLogicProps) => {
  const { toast } = useToast();
  
  const handleRefresh = useCallback(async (symbols?: string[], forceRefresh?: boolean, runFullBacktest?: boolean) => {
    try {
      const success = await onRefresh(symbols, forceRefresh, runFullBacktest);
      if (success) {
        toast({
          title: "Data Refreshed",
          description: "Market patterns have been updated."
        });
        return true;
      } else {
        toast({
          title: "Refresh Failed",
          description: "Failed to refresh market patterns.",
          variant: "destructive"
        });
        return false;
      }
    } catch (error: any) {
      toast({
        title: "Refresh Error",
        description: error.message || "An error occurred during refresh.",
        variant: "destructive"
      });
      return false;
    }
  }, [onRefresh, toast]);
  
  const handleToggleRealTime = useCallback(() => {
    const isRealTime = onToggleRealTime();
    if (isRealTime) {
      toast({
        title: "Real-time Mode Enabled",
        description: "Market data will update as it happens."
      });
    } else {
      toast({
        title: "Real-time Mode Disabled",
        description: "Using standard refresh intervals."
      });
    }
    return isRealTime;
  }, [onToggleRealTime, toast]);
  
  const handleRunFullBacktest = useCallback(async () => {
    try {
      const success = await onRunFullBacktest();
      if (success) {
        toast({
          title: "Full Backtest Started",
          description: "Running backtest on all available symbols."
        });
        return true;
      } else {
        toast({
          title: "Backtest Failed",
          description: "Failed to start full backtest.",
          variant: "destructive"
        });
        return false;
      }
    } catch (error: any) {
      toast({
        title: "Backtest Error",
        description: error.message || "An error occurred during backtest.",
        variant: "destructive"
      });
      return false;
    }
  }, [onRunFullBacktest, toast]);
  
  return {
    handleRefresh,
    handleToggleRealTime,
    handleRunFullBacktest
  };
};
