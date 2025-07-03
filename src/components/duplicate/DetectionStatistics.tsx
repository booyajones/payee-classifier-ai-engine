// @ts-nocheck
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface DetectionStatisticsProps {
  totalPayees: number;
  duplicatesFound: number;
  uniquePayees: number;
}

const DetectionStatistics = ({ totalPayees, duplicatesFound, uniquePayees }: DetectionStatisticsProps) => {
  const duplicatePercentage = totalPayees > 0 ? (duplicatesFound / totalPayees) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Detection Statistics</CardTitle>
        <CardDescription>Summary of duplicate detection results.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span>Total Payees Processed:</span>
          <Badge variant="secondary">{totalPayees}</Badge>
        </div>
        <div className="flex items-center justify-between">
          <span>Potential Duplicates Found:</span>
          <Badge variant="destructive">{duplicatesFound} ({duplicatePercentage.toFixed(1)}%)</Badge>
        </div>
        <div className="flex items-center justify-between">
          <span>Unique Payees:</span>
          <Badge variant="outline">{uniquePayees}</Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default DetectionStatistics;
