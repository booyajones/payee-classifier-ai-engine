
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Download, Trash2, Loader2, Zap, Clock } from 'lucide-react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { useDownloadProgress } from '@/contexts/DownloadProgressContext';
import { InstantDownloadService } from '@/lib/services/instantDownloadService';

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
  const { downloads } = useDownloadProgress();
  
  // Check for active download for this job
  const downloadId = `batch-${job.id}`;
  const activeDownload = downloads[downloadId];
  
  // Track instant download status
  const [downloadStatus, setDownloadStatus] = useState<{
    status: 'instant' | 'processing' | 'unavailable' | 'checking';
    hasFiles: boolean;
    hasResults: boolean;
  }>({ status: 'checking', hasFiles: false, hasResults: false });
  
  console.log(`[BATCH JOB CARD] Job ${job.id.substring(0,8)}: activeDownload =`, activeDownload, 'downloadStatus =', downloadStatus);
  
  // Check download status for completed jobs
  useEffect(() => {
    if (job.status === 'completed') {
      InstantDownloadService.hasInstantDownload(job.id)
        .then(status => {
          console.log(`[BATCH JOB CARD] Download status for ${job.id.substring(0,8)}:`, status);
          setDownloadStatus({
            status: status.status,
            hasFiles: status.hasFiles,
            hasResults: status.hasResults
          });
        })
        .catch(error => {
          console.error(`[BATCH JOB CARD] Error checking download status:`, error);
          setDownloadStatus({ status: 'unavailable', hasFiles: false, hasResults: false });
        });
    }
  }, [job.id, job.status]);

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

      {/* Download Progress - Show if there's an active download */}
      {activeDownload && activeDownload.isActive && (
        <div className="space-y-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span className="font-medium">Downloading...</span>
            </div>
            <span className="text-muted-foreground">{Math.round(activeDownload.progress)}%</span>
          </div>
          <Progress value={activeDownload.progress} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{activeDownload.stage}</span>
            <span>{activeDownload.processed}/{activeDownload.total} items</span>
          </div>
        </div>
      )}

      {/* Download Status for Completed Jobs */}
      {job.status === 'completed' && (
        <div className="space-y-2 p-3 bg-muted/30 border border-border rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {downloadStatus.status === 'instant' ? (
                <>
                  <Zap className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">⚡ Instant Download Ready</span>
                </>
              ) : downloadStatus.status === 'processing' ? (
                <>
                  <Clock className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-700">⏳ Preparing Files...</span>
                </>
              ) : downloadStatus.status === 'checking' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">Checking status...</span>
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-700">⏳ Auto-Processing...</span>
                </>
              )}
            </div>
            
            <Button 
              onClick={onDownload} 
              size="sm" 
              className="flex items-center gap-2"
              variant={downloadStatus.status === 'instant' ? "default" : "outline"}
              disabled={activeDownload?.isActive || downloadStatus.status === 'checking'}
            >
              {downloadStatus.status === 'instant' ? (
                <><Zap className="h-4 w-4" />Instant Download</>
              ) : (
                <><Download className="h-4 w-4" />Download</>
              )}
            </Button>
          </div>
          
          {downloadStatus.status === 'processing' && (
            <div className="text-xs text-muted-foreground">
              Files: {downloadStatus.hasFiles ? '✓' : '⏳'} | 
              Results: {downloadStatus.hasResults ? '✓' : '⏳'}
            </div>
          )}
        </div>
      )}

      {/* Download Button - Show for finalizing OR stuck jobs */}
      {(isEffectivelyComplete && job.status !== 'completed') && !activeDownload?.isActive && (
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
      )}
    </div>
  );
};

export default BatchJobCardContent;
