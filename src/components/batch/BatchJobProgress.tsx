import React from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';

interface BatchJobProgressProps {
  job: BatchJob;
}

const BatchJobProgress = ({ job }: BatchJobProgressProps) => {
  const { total, completed, failed } = job.request_counts;
  
  const getProgressPercentage = () => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  const showProgress = total > 0 && job.status === 'in_progress';

  if (!showProgress) return null;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>Progress: {completed}/{total} requests</span>
        <span>{getProgressPercentage()}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
          style={{ width: `${getProgressPercentage()}%` }}
        />
      </div>
    </div>
  );
};

export default BatchJobProgress;