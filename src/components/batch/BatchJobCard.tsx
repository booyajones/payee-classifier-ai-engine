
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, Download, RefreshCw, Trash, Loader2, CheckCheck, AlertCircle } from "lucide-react";
import { BatchJob } from "@/lib/openai/trueBatchAPI";
import { useUnifiedProgress } from "@/contexts/UnifiedProgressContext";
import BatchProcessingProgress from "../BatchProcessingProgress";

interface BatchJobCardProps {
  job: BatchJob;
  payeeCount: number;
  isRefreshing: boolean;
  isDownloading: boolean;
  isPolling: boolean;
  isCompleted?: boolean;
  progress?: { current: number; total: number };
  lastError?: string;
  customProgress?: { stage: string; percentage: number; isActive: boolean };
  onRefresh: (jobId: string) => void;
  onDownload: (job: BatchJob) => void;
  onCancel: (jobId: string) => void;
  onDelete: (jobId: string) => void;
}

const BatchJobCard = ({
  job,
  payeeCount,
  isRefreshing,
  isDownloading,
  isPolling,
  isCompleted = false,
  progress,
  lastError,
  customProgress,
  onRefresh,
  onDownload,
  onCancel,
  onDelete
}: BatchJobCardProps) => {
  const { getProgress } = useUnifiedProgress();

  console.log(`[BATCH CARD DEBUG] Rendering job ${job.id.slice(-8)}, status: ${job.status}`);

  // Try to get unified progress for this job - with error handling
  let unifiedProgress = null;
  try {
    unifiedProgress = getProgress(`job-${job.id}`) || getProgress('file-upload');
  } catch (error) {
    console.error(`[BATCH CARD ERROR] Progress retrieval failed:`, error);
  }

  const formatDate = (timestamp: number) => {
    try {
      const date = new Date(timestamp * 1000);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('[BATCH CARD ERROR] Date formatting failed:', error);
      return 'Invalid date';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
      case 'expired':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      case 'cancelling':
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      case 'cancelling':
        return 'bg-amber-100 text-amber-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  // Enhanced progress calculation with better time-based estimates
  const calculateEnhancedProgress = () => {
    try {
      const now = Date.now() / 1000;
      const createdTime = job.created_at;
      const inProgressTime = job.in_progress_at || createdTime;
      const timeElapsed = now - inProgressTime;
      
      const batchProgress = job.request_counts.total > 0 
        ? Math.round((job.request_counts.completed / job.request_counts.total) * 100)
        : 0;

      return { batchProgress, timeElapsed, inProgressTime };
    } catch (error) {
      console.error('[BATCH CARD ERROR] Progress calculation failed:', error);
      return { batchProgress: 0, timeElapsed: 0, inProgressTime: 0 };
    }
  };

  // Determine what progress to show with error handling
  const getProgressInfo = () => {
    try {
      const { batchProgress, timeElapsed } = calculateEnhancedProgress();
      
      // First priority: unified progress that matches this job
      if (unifiedProgress?.isActive && unifiedProgress.jobId === job.id) {
        return {
          percentage: Math.max(0, Math.min(100, unifiedProgress.percentage || 0)),
          label: unifiedProgress.stage || 'Processing...',
          showBar: true,
          source: 'unified'
        };
      }
      
      // Second priority: custom progress (from smart batch manager)
      if (customProgress?.isActive) {
        return {
          percentage: Math.max(0, Math.min(100, customProgress.percentage || 0)),
          label: customProgress.stage || 'Processing...',
          showBar: true,
          source: 'custom'
        };
      }
      
      // Third priority: download progress
      if (isDownloading && progress) {
        return {
          percentage: Math.max(0, Math.min(100, Math.round((progress.current / progress.total) * 100))),
          label: `Processing results: ${progress.current}/${progress.total}`,
          showBar: true,
          source: 'download'
        };
      }
      
      // Fourth priority: Enhanced OpenAI batch progress
      if (job.status === 'in_progress' || job.status === 'finalizing') {
        if (job.request_counts.completed > 0) {
          return {
            percentage: Math.max(0, Math.min(100, batchProgress)),
            label: `OpenAI processing: ${job.request_counts.completed}/${job.request_counts.total} (${batchProgress}%)`,
            showBar: true,
            source: 'openai'
          };
        } else {
          // Time-based progress estimate
          let estimatedProgress = Math.min(50, 15 + (timeElapsed / 60) * 2); // Slow growth over time
          let progressLabel = `Processing ${job.request_counts.total} requests...`;
          
          if (timeElapsed > 300) { // After 5 minutes
            progressLabel += ` (${Math.floor(timeElapsed / 60)}m elapsed)`;
          }
          
          return {
            percentage: Math.max(0, Math.min(100, estimatedProgress)),
            label: progressLabel,
            showBar: true,
            source: 'openai-enhanced'
          };
        }
      }
      
      // Fifth priority: validating state
      if (job.status === 'validating') {
        return {
          percentage: 5,
          label: 'Validating batch request...',
          showBar: true,
          source: 'validating'
        };
      }
      
      return { showBar: false, source: 'none' };
    } catch (error) {
      console.error('[BATCH CARD ERROR] Progress info calculation failed:', error);
      return { showBar: false, source: 'error' };
    }
  };

  const progressInfo = getProgressInfo();
  const { batchProgress } = calculateEnhancedProgress();

  console.log(`[BATCH CARD DEBUG] Job ${job.id.slice(-8)} progress info:`, {
    status: job.status,
    progressInfo,
    showBar: progressInfo.showBar,
    isDownloading,
    hasProgress: !!progress
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              Job {job.id.slice(-8)}
              {isCompleted && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <CheckCheck className="h-3 w-3 mr-1" />
                  Downloaded
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {job.metadata?.description || 'Payee classification batch'} • {payeeCount} payees
              <br />
              <span className="text-xs text-muted-foreground">
                Created: {formatDate(job.created_at)}
              </span>
              {job.completed_at && (
                <>
                  <br />
                  <span className="text-xs text-muted-foreground">
                    Completed: {formatDate(job.completed_at)}
                  </span>
                </>
              )}
              {job.in_progress_at && job.status === 'in_progress' && (
                <>
                  <br />
                  <span className="text-xs text-muted-foreground">
                    Started processing: {formatDate(job.in_progress_at)}
                  </span>
                </>
              )}
            </CardDescription>
            {lastError && (
              <p className="text-xs text-red-600 mt-1">
                Last refresh error: {lastError}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(job.status)}
            <Badge className={getStatusColor(job.status)}>
              {job.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Total Requests:</span> {job.request_counts.total || 0}
          </div>
          <div>
            <span className="font-medium">Completed:</span> {job.request_counts.completed || 0}
          </div>
          <div>
            <span className="font-medium">Failed:</span> {job.request_counts.failed || 0}
          </div>
          <div>
            <span className="font-medium">Batch Progress:</span> {batchProgress}%
          </div>
        </div>

        {progressInfo.showBar && (
          <div className="space-y-2">
            <BatchProcessingProgress
              progress={progressInfo.percentage || 0}
              status={progressInfo.label || 'Processing...'}
            />
            <p className="text-xs text-muted-foreground">
              Progress source: {progressInfo.source}
            </p>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onRefresh(job.id)}
            disabled={isRefreshing || isPolling}
          >
            {isRefreshing || isPolling ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            {isRefreshing || isPolling ? 'Refreshing...' : 'Refresh Status'}
          </Button>

          {job.status === 'completed' && (
            <Button
              size="sm"
              onClick={() => onDownload(job)}
              disabled={isDownloading || isCompleted}
              variant={isCompleted ? "outline" : "default"}
            >
              {isDownloading ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : isCompleted ? (
                <CheckCheck className="h-3 w-3 mr-1" />
              ) : (
                <Download className="h-3 w-3 mr-1" />
              )}
              {isDownloading 
                ? (progress ? `Processing ${progress.current}/${progress.total}...` : 'Processing...')
                : isCompleted
                ? 'Already Downloaded'
                : 'Download Results'
              }
            </Button>
          )}

          {['validating', 'in_progress'].includes(job.status) && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onCancel(job.id)}
            >
              Cancel Job
            </Button>
          )}

          {['completed', 'failed', 'expired', 'cancelled', 'cancelling'].includes(job.status) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDelete(job.id)}
            >
              <Trash className="h-3 w-3 mr-1" />
              Remove from List
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BatchJobCard;
