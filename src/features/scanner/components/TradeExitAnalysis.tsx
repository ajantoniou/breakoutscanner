
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface TradeExitAnalysisProps {
  trade?: any;
  showCard?: boolean;
}

const TradeExitAnalysis: React.FC<TradeExitAnalysisProps> = ({ trade, showCard = false }) => {
  if (!trade) return null;
  
  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Exit Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Trade exit analysis for {trade.symbol} will be displayed here.
        </p>
      </CardContent>
    </Card>
  );
};

export default TradeExitAnalysis;
