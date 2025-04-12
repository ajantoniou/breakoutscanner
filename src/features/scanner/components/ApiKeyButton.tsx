
import React from 'react';
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ApiKeyButtonProps {
  className?: string;
}

const ApiKeyButton = ({ className }: ApiKeyButtonProps) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="outline"
            className={className}
          >
            <Shield className="h-4 w-4 mr-2 text-green-500" />
            Secure API
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">
          <div className="space-y-2">
            <p className="font-medium">Secure API Connection</p>
            <p className="text-sm text-muted-foreground">
              API requests are securely routed through Supabase Edge Functions.
              No API key required on the frontend.
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ApiKeyButton;
