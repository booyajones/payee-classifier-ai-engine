
import React from 'react';
import { Progress } from '@/components/ui/progress';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { useUnifiedProgress } from '@/contexts/UnifiedProgressContext';

interface BatchJobProgressProps {
  job: BatchJob;
  isCompleted: boolean;
  isDownloading: boolean;
  progress?: { current: number; total: number };
  customProgress?: {
    stage: string;
    percentage: number;
    isActive: boolean;
  };
}

const BatchJobProgress = ({
  job,
  isCompleted,
  isDownloading,
  progress,
  customProgress
}: BatchJobProgressProps) => {
  const { getProgress } = useUnifiedProgress();

  // Calculate progress info
  const progressInfo = React.useMemo(() => {
    // For completed jobs, show 100% progress
    if (job.status === 'completed' && isCompleted) {
      return {
        percentage: 100,
        label: 'Processing complete',
        showBar: true,
        source: 'completed'
      };
    }

    const unifiedProgress = getProgress(`job-${job.id}`);
    
    if (unifiedProgress && unifiedProgress.percentage > 0) {
      return {
        percentage: unifiedProgress.percentage,
        label: unifiedProgress.stage || unifiedProgress.message || 'Processing...',
        showBar: true,
        source: 'unified'
      };
    }

    if (customProgress && customProgress.isActive) {
      return {
        percentage: customProgress.percentage,
        label: customProgress.stage,
        showBar: true,
        source: 'custom'
      };
    }

    if (progress && progress.total > 0) {
      const percentage = Math.round((progress.current / progress.total) * 100);
      return {
        percentage,
        label: `Downloading: ${progress.current}/${progress.total}`,
        showBar: true,
        source: 'download'
      };
    }

    if (job.status === 'in_progress' && job.request_counts.total > 0) {
      const percentage = Math.round((job.request_counts.completed / job.request_counts.total) * 100);
      return {
        percentage,
        label: `${job.request_counts.completed}/${job.request_counts.total} completed`,
        showBar: true,
        source: 'batch'
      };
    }

    return {
      percentage: 0,
      label: 'Ready',
      showBar: false,
      source: 'none'
    };
  }, [job.status, job.id, job.request_counts, isCompleted, getProgress, customProgress, progress]);

  const showBar = progressInfo.showBar || isDownloading;

  if (!showBar) return null;

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
