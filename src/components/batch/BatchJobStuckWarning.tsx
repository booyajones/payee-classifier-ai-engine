import React from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';

interface BatchJobStuckWarningProps {
  job: BatchJob;
}

const BatchJobStuckWarning = ({ job }: BatchJobStuckWarningProps) => {
  // Check if job has been stuck in finalizing for too long
  const isStuckFinalizing = job.status === 'finalizing' && 
    job.finalizing_at && 
    (Date.now() - (job.finalizing_at * 1000)) > (60 * 60 * 1000); // 1 hour

  if (!isStuckFinalizing) return null;

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-md p-2">
      <p className="text-sm text-orange-800">
        Job appears stuck in finalizing. Results may still be downloadable.
      </p>
    </div>
  );
};

export default BatchJobStuckWarning;