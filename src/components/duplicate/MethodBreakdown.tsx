// @ts-nocheck
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface MethodBreakdownProps {
  ruleCount: number;
  fuzzyCount: number;
  aiCount: number;
  webSearchCount: number;
}

const MethodBreakdown = ({ ruleCount, fuzzyCount, aiCount, webSearchCount }: MethodBreakdownProps) => {
  const total = ruleCount + fuzzyCount + aiCount + webSearchCount;

  const getPercentage = (count: number) => {
    return total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Method Breakdown</CardTitle>
        <CardDescription>Classification methods used for duplicate detection</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span>Rule-Based</span>
          <Badge>{ruleCount} ({getPercentage(ruleCount)}%)</Badge>
        </div>
        <div className="flex items-center justify-between">
          <span>Fuzzy Matching</span>
          <Badge>{fuzzyCount} ({getPercentage(fuzzyCount)}%)</Badge>
        </div>
        <div className="flex items-center justify-between">
          <span>AI Classification</span>
          <Badge>{aiCount} ({getPercentage(aiCount)}%)</Badge>
        </div>
        <div className="flex items-center justify-between">
          <span>Web Search Enhanced AI</span>
          <Badge>{webSearchCount} ({getPercentage(webSearchCount)}%)</Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default MethodBreakdown;
