import React from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';

interface BatchJobRequestCountsProps {
  job: BatchJob;
}

const BatchJobRequestCounts = ({ job }: BatchJobRequestCountsProps) => {
  const { total, completed, failed } = job.request_counts;
  
  const getProgressPercentage = () => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  if (total === 0) return null;

  return (
    <div className="flex gap-4 text-sm text-muted-foreground">
      <span>Total: {total}</span>
      <span>Completed: {completed}</span>
      {failed > 0 && <span className="text-red-600">Failed: {failed}</span>}
      {getProgressPercentage() === 100 && job.status === 'finalizing' && (
        <span className="text-orange-600">Finalizing...</span>
      )}
    </div>
  );
};

export default BatchJobRequestCounts;