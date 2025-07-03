import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, BarChart3 } from 'lucide-react';

interface MethodBreakdownProps {
  statistics: {
    high_confidence_matches: number;
    low_confidence_matches: number;
    ai_judgments_made: number;
  };
}

export const MethodBreakdown = ({ statistics }: MethodBreakdownProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Detection Method Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 border rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <BarChart3 className="h-5 w-5 text-green-500" />
              <span className="font-medium">High Confidence</span>
            </div>
            <div className="text-2xl font-bold">{statistics.high_confidence_matches}</div>
            <div className="text-sm text-muted-foreground">Algorithmic matches ≥95%</div>
          </div>
          
          <div className="text-center p-4 border rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Brain className="h-5 w-5 text-purple-500" />
              <span className="font-medium">AI Analyzed</span>
            </div>
            <div className="text-2xl font-bold">{statistics.ai_judgments_made}</div>
            <div className="text-sm text-muted-foreground">Ambiguous cases (75-95%)</div>
          </div>
          
          <div className="text-center p-4 border rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              <span className="font-medium">Low Confidence</span>
            </div>
            <div className="text-2xl font-bold">{statistics.low_confidence_matches}</div>
            <div className="text-sm text-muted-foreground">Algorithmic non-matches ≤75%</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
