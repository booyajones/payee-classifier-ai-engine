
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
        </div>
      )}

      {/* Download Button */}
      {isCompleted && (
        <div className="flex justify-end">
          <Button 
            onClick={onDownload} 
            size="sm" 
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download Results
          </Button>
        </div>
      )}
    </div>
  );
};

export default BatchJobCardContent;
