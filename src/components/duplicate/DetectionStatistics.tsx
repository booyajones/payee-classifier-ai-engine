import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Search } from 'lucide-react';

interface DetectionStatisticsProps {
  statistics: {
    total_processed: number;
    duplicates_found: number;
    ai_judgments_made: number;
    processing_time_ms: number;
  };
  duplicate_groups_count: number;
}

export const DetectionStatistics = ({ statistics, duplicate_groups_count }: DetectionStatisticsProps) => {
  const duplicateRate = (statistics.duplicates_found / statistics.total_processed) * 100;
  const aiUsageRate = (statistics.ai_judgments_made / statistics.total_processed) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Duplicate Detection Results
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{statistics.total_processed}</div>
            <div className="text-sm text-blue-700">Total Records</div>
          </div>
          <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{statistics.duplicates_found}</div>
            <div className="text-sm text-orange-700">Duplicates Found</div>
          </div>
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{duplicate_groups_count}</div>
            <div className="text-sm text-green-700">Duplicate Groups</div>
          </div>
          <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{statistics.ai_judgments_made}</div>
            <div className="text-sm text-purple-700">AI Judgments</div>
          </div>
        </div>

        {/* Progress Indicators */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Duplicate Rate</span>
              <span>{duplicateRate.toFixed(1)}%</span>
            </div>
            <Progress value={duplicateRate} className="h-2" />
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>AI Analysis Usage</span>
              <span>{aiUsageRate.toFixed(1)}%</span>
            </div>
            <Progress value={aiUsageRate} className="h-2" />
          </div>
        </div>

        {/* Processing Time */}
        <div className="text-sm text-muted-foreground">
          Processing completed in {(statistics.processing_time_ms / 1000).toFixed(2)} seconds
        </div>
      </CardContent>
    </Card>
  );
};
