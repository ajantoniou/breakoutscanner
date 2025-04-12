
import { useState, useCallback } from "react";

export const useScannerUpdates = () => {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const updateTimestamp = useCallback(() => {
    setLastUpdated(new Date());
  }, []);
  
  return {
    lastUpdated,
    setLastUpdated: updateTimestamp
  };
};
