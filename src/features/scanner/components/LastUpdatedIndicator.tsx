
import React from "react";
import { format } from "date-fns";
import { Clock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface LastUpdatedIndicatorProps {
  lastUpdated: Date;
  showFullDate?: boolean;
  className?: string;
}

const LastUpdatedIndicator: React.FC<LastUpdatedIndicatorProps> = ({ 
  lastUpdated, 
  showFullDate = false, 
  className = ""
}) => {
  const formattedTime = format(lastUpdated, "h:mm a");
  const formattedDate = format(lastUpdated, "MMM d, yyyy");
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center text-xs text-muted-foreground ${className}`}>
            <Clock className="h-3 w-3 mr-1" />
            <span>{showFullDate ? `${formattedDate} ${formattedTime}` : formattedTime}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Last updated on {formattedDate} at {formattedTime}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default LastUpdatedIndicator;
