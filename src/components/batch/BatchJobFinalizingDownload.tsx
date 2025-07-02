import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';

interface BatchJobFinalizingDownloadProps {
  job: BatchJob;
  activeDownload: {
    isActive: boolean;
  } | undefined;
  onDownload: () => void;
}

const BatchJobFinalizingDownload = ({ 
  job, 
  activeDownload, 
  onDownload 
}: BatchJobFinalizingDownloadProps) => {
  const { total, completed } = job.request_counts;
  
  // Check if job is effectively complete (100% done OR officially completed)
  const isEffectivelyComplete = job.status === 'completed' || 
    (total > 0 && completed === total && job.status === 'finalizing');
  
  // Check if job has been stuck in finalizing for too long
  const isStuckFinalizing = job.status === 'finalizing' && 
    job.finalizing_at && 
    (Date.now() - (job.finalizing_at * 1000)) > (60 * 60 * 1000); // 1 hour

  // Only show for finalizing jobs that aren't completed yet and don't have active download
  if (!(isEffectivelyComplete && job.status !== 'completed') || activeDownload?.isActive) {
    return null;
  }

  return (
    <div className="flex justify-end">
      <Button 
        onClick={onDownload} 
        size="sm" 
        className="flex items-center gap-2"
        variant={isStuckFinalizing ? "outline" : "default"}
        disabled={activeDownload?.isActive}
      >
        <Download className="h-4 w-4" />
        {isStuckFinalizing ? "Force Download" : "Download Results"}
      </Button>
    </div>
  );
};

export default BatchJobFinalizingDownload;