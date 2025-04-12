
import { useState, useCallback } from 'react';

export interface PerformanceMetrics {
  avgResponseTime: number;
  avgRenderTime: number;
  memoryUsage: number;
  cpuUsage: number;
  networkLatency: number;
}

export const usePerformanceMonitoring = () => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>({
    avgResponseTime: 0,
    avgRenderTime: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    networkLatency: 0
  });
  
  const runPerformanceMonitoring = useCallback(() => {
    setIsMonitoring(true);
    
    // Mock metrics collection (would be actual performance measurements in a real app)
    const mockMetrics = {
      avgResponseTime: Math.floor(Math.random() * 100) + 50,
      avgRenderTime: Math.floor(Math.random() * 30) + 10,
      memoryUsage: Math.floor(Math.random() * 500) + 100,
      cpuUsage: Math.floor(Math.random() * 60) + 10,
      networkLatency: Math.floor(Math.random() * 200) + 30
    };
    
    setMetrics(mockMetrics);
    setIsMonitoring(false);
    
    return mockMetrics;
  }, []);
  
  return {
    metrics,
    isMonitoring,
    runPerformanceMonitoring
  };
};

export default usePerformanceMonitoring;
