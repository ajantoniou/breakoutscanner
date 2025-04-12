
import React from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Bot } from "lucide-react";

const AILoadingState: React.FC = () => {
  return (
    <Card className="col-span-full animate-pulse">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          AI Strategy Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-4 bg-muted rounded w-3/4"></div>
        <div className="h-4 bg-muted rounded w-1/2"></div>
        <div className="h-4 bg-muted rounded w-2/3"></div>
      </CardContent>
    </Card>
  );
};

export default AILoadingState;
