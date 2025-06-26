
import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Trash2 } from 'lucide-react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';

interface BatchJobCardContentProps {
  job: BatchJob;
  payeeRowData?: PayeeRowData;
  isCompleted: boolean;
  onDownload: () => void;
}

const BatchJobCardContent = ({
  job,
  payeeRowData,
  isCompleted,
  onDownload
}: BatchJobCardContentProps) => {
  const payeeCount = payeeRowData?.uniquePayeeNames?.length || 0;
  const { total, completed, failed } = job.request_counts;
  
  const getProgressPercentage = () => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  const showProgress = total > 0 && job.status === 'in_progress';
  
  // Check if job is effectively complete (100% done OR officially completed)
  const isEffectivelyComplete = job.status === 'completed' || 
    (total > 0 && completed === total && job.status === 'finalizing');
  
  // Check if job has been stuck in finalizing for too long
  const isStuckFinalizing = job.status === 'finalizing' && 
    job.finalizing_at && 
    (Date.now() - (job.finalizing_at * 1000)) > (60 * 60 * 1000); // 1 hour

  return (
    <div className="space-y-3">
      {/* Progress Bar */}
      {showProgress && (
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
      )}

      {/* Request Counts */}
      {total > 0 && (
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>Total: {total}</span>
          <span>Completed: {completed}</span>
          {failed > 0 && <span className="text-red-600">Failed: {failed}</span>}
          {getProgressPercentage() === 100 && job.status === 'finalizing' && (
            <span className="text-orange-600">Finalizing...</span>
          )}
        </div>
      )}

      {/* Stuck Finalizing Warning */}
      {isStuckFinalizing && (
        <div className="bg-orange-50 border border-orange-200 rounded-md p-2">
          <p className="text-sm text-orange-800">
            Job appears stuck in finalizing. Results may still be downloadable.
          </p>
        </div>
      )}

      {/* Download Button - Show for completed OR 100% done jobs */}
      {isEffectivelyComplete && (
        <div className="flex justify-end">
          <Button 
            onClick={onDownload} 
            size="sm" 
            className="flex items-center gap-2"
            variant={isStuckFinalizing ? "outline" : "default"}
          >
            <Download className="h-4 w-4" />
            {isStuckFinalizing ? "Force Download" : "Download Results"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default BatchJobCardContent;
