
import React from 'react';
import { RefreshCw } from 'lucide-react';

export interface LoadingIndicatorProps {
  message?: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ 
  message = "Loading..." 
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 w-full">
      <RefreshCw className="h-8 w-8 animate-spin mb-3 text-primary" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
};

export default LoadingIndicator;
