
import React from 'react';
import { Progress } from '@/components/ui/progress';
import { BatchJob } from '@/lib/openai/trueBatchAPI';

interface BatchJobProgressProps {
  job: BatchJob;
  isCompleted?: boolean;
}

const BatchJobProgress = ({
  job,
  isCompleted = false
}: BatchJobProgressProps) => {
  // Calculate progress info
  const progressInfo = React.useMemo(() => {
    // For completed jobs, show 100% progress
    if (job.status === 'completed' || isCompleted) {
      return {
        percentage: 100,
        label: 'Processing complete',
        showBar: true
      };
    }

    if (job.status === 'in_progress' && job.request_counts.total > 0) {
      const percentage = Math.round((job.request_counts.completed / job.request_counts.total) * 100);
      return {
        percentage,
        label: `${job.request_counts.completed}/${job.request_counts.total} completed`,
        showBar: true
      };
    }

    // For other statuses, don't show progress bar
    return {
      percentage: 0,
      label: 'Ready',
      showBar: false
    };
  }, [job.status, job.request_counts, isCompleted]);

  if (!progressInfo.showBar) return null;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{progressInfo.label}</span>
        <span className="font-medium">{progressInfo.percentage}%</span>
      </div>
      <Progress value={progressInfo.percentage} className="h-2" />
    </div>
  );
};

export default BatchJobProgress;
