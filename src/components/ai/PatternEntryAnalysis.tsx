
import React, { useState, useEffect } from 'react';
import { PatternData } from '@/services/types/patternTypes';
import { EntryAnalysis } from '@/services/ai/analysisTypes';
import { generateEntryAnalysis } from '@/services/ai/strategyAnalysisService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertCircle, ArrowDown, ArrowUp, Crosshair, TrendingUp, TrendingDown } from 'lucide-react';

interface PatternEntryAnalysisProps {
  pattern: PatternData;
  showCard?: boolean;
  analysis?: EntryAnalysis; 
}

const PatternEntryAnalysis: React.FC<PatternEntryAnalysisProps> = ({ 
  pattern, 
  showCard = true,
  analysis: providedAnalysis 
}) => {
  const [analysis, setAnalysis] = useState<EntryAnalysis | null>(providedAnalysis || null);
  const [loading, setLoading] = useState<boolean>(!providedAnalysis);
  
  useEffect(() => {
    async function fetchAnalysis() {
      if (!providedAnalysis && pattern) {
        try {
          const generatedAnalysis = await generateEntryAnalysis(pattern);
          setAnalysis(generatedAnalysis);
        } catch (error) {
          console.error('Error generating analysis:', error);
        } finally {
          setLoading(false);
        }
      }
    }
    
    fetchAnalysis();
  }, [pattern, providedAnalysis]);
  
  if (loading || !analysis) {
    return (
      <Card className={showCard ? "mt-4" : ""}>
        <CardHeader>
          <CardTitle className="text-lg">Entry Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4">
            <AlertCircle className="w-6 h-6 text-yellow-500 mr-2" />
            <p className="text-sm text-muted-foreground">Generating analysis...</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const getLevelText = (level: number, type: 'support' | 'resistance') => {
    const baseText = type === 'support' ? 'Support level' : 'Resistance level';
    const difference = Math.abs(((level - pattern.entryPrice) / pattern.entryPrice) * 100);
    return `${baseText} at ${level.toFixed(2)} (${difference.toFixed(2)}% from entry)`;
  };

  const Content = () => (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium mb-1">Key Price Levels</h3>
        <div className="space-y-2 text-sm">
          {analysis.keyLevels && (
            <div className="flex items-center text-emerald-600">
              <TrendingUp className="w-4 h-4 mr-2" />
              <span>Target: {analysis.keyLevels.target.toFixed(2)} ({((analysis.keyLevels.target - pattern.entryPrice) / pattern.entryPrice * 100).toFixed(2)}% potential profit)</span>
            </div>
          )}

          <div className="flex items-center text-blue-600">
            <Crosshair className="w-4 h-4 mr-2" />
            <span>Entry: {pattern.entryPrice.toFixed(2)}</span>
          </div>

          {analysis.keyLevels && (
            <div className="flex items-center text-red-600">
              <TrendingDown className="w-4 h-4 mr-2" />
              <span>Stop Loss: {analysis.keyLevels.stopLoss.toFixed(2)} ({((analysis.keyLevels.stopLoss - pattern.entryPrice) / pattern.entryPrice * 100).toFixed(2)}% risk)</span>
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="font-medium mb-1">Support & Resistance</h3>
        <div className="space-y-2 text-sm">
          {analysis.nextLevels && analysis.nextLevels.support && analysis.nextLevels.support.length > 0 ? (
            analysis.nextLevels.support.map((level, index) => (
              <div key={`support-${index}`} className="flex items-center text-green-600">
                <ArrowUp className="w-4 h-4 mr-2" />
                <span>{getLevelText(level, 'support')}</span>
              </div>
            ))
          ) : (
            <div className="flex items-center text-muted-foreground">
              <AlertCircle className="w-4 h-4 mr-2" />
              <span>No support levels identified</span>
            </div>
          )}

          {analysis.nextLevels && analysis.nextLevels.resistance && analysis.nextLevels.resistance.length > 0 ? (
            analysis.nextLevels.resistance.map((level, index) => (
              <div key={`resistance-${index}`} className="flex items-center text-red-600">
                <ArrowDown className="w-4 h-4 mr-2" />
                <span>{getLevelText(level, 'resistance')}</span>
              </div>
            ))
          ) : (
            <div className="flex items-center text-muted-foreground">
              <AlertCircle className="w-4 h-4 mr-2" />
              <span>No resistance levels identified</span>
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="font-medium mb-1">Recommendations</h3>
        <div className="space-y-2 text-sm">
          {analysis.strengths && analysis.strengths.map((rec, index) => (
            <div key={`strength-${index}`} className="flex items-start">
              <CheckCircle className="w-4 h-4 mr-2 mt-0.5 text-green-600" />
              <span>{rec}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return showCard ? (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-lg">Entry Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <Content />
      </CardContent>
    </Card>
  ) : (
    <Content />
  );
};

export default PatternEntryAnalysis;
