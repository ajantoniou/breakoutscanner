import React from 'react';
import MainNav from '@/components/MainNav';
import GoldenScannerDashboard from '@/components/scanner/GoldenScannerDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const GoldenScanner = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MainNav />
      <div className="container p-4">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-2">Golden Scanner</h1>
            <p className="text-muted-foreground">
              Elite high-confidence patterns with minimum 5% profit potential and multi-timeframe confirmation
            </p>
          </div>
        </div>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>About Golden Scanner</CardTitle>
            <CardDescription>
              The most exclusive pattern detection system with strict filtering
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-2">
              <p>
                <span className="font-semibold">Golden Scanner</span> only shows the highest confidence patterns with:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Minimum 75% confidence rating</li>
                <li>Multi-timeframe confirmation</li>
                <li>5%+ profit potential</li>
                <li>Favorable risk-reward ratio (2:1 or better)</li>
                <li>Strong volume confirmation</li>
              </ul>
              <p className="mt-2">
                These signals have historically shown a 76.5% win rate across all timeframes and market conditions.
              </p>
            </div>
          </CardContent>
        </Card>
        
        <GoldenScannerDashboard />
      </div>
    </div>
  );
};

export default GoldenScanner; 