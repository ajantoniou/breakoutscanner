
import React from "react";
import { RefreshCw } from "lucide-react";

interface LoadingIndicatorProps {
  size?: "sm" | "md" | "lg";
  text?: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  size = "md",
  text = "Loading..."
}) => {
  const sizeClass = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8"
  }[size];

  return (
    <div className="flex flex-col items-center justify-center py-4">
      <RefreshCw className={`${sizeClass} animate-spin text-primary mb-2`} />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
};

export default LoadingIndicator;
