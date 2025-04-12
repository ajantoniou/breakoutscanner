
import React from "react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Bot } from "lucide-react";

const AIEmptyState: React.FC = () => {
  return (
    <Alert>
      <Bot className="h-4 w-4" />
      <AlertTitle>AI Strategy Assistant</AlertTitle>
      <AlertDescription>
        Not enough data to generate strategy recommendations.
        Run a backtest or use the strategy comparison tool to generate insights.
      </AlertDescription>
    </Alert>
  );
};

export default AIEmptyState;
