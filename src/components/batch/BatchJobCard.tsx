
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Calendar, RefreshCw, Download, X, Trash2, Users, Clock } from 'lucide-react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { useUnifiedProgress } from '@/contexts/UnifiedProgressContext';
import BatchJobTimeoutIndicator from './BatchJobTimeoutIndicator';

interface BatchJobCardProps {
  job: BatchJob;
  payeeCount: number;
  isRefreshing: boolean;
  isDownloading: boolean;
  isPolling: boolean;
  progress?: { current: number; total: number };
  customProgress?: {
    stage: string;
    percentage: number;
    isActive: boolean;
  };
  lastError?: string;
  onRefresh: () => void;
  onDownload: () => void;
  onCancel: () => void;
  onDelete: () => void;
  isCompleted?: boolean;
  isStuck?: boolean;
  shouldTimeout?: boolean;
  elapsedTime?: string;
  onRecover?: () => void;
  isRecovering?: boolean;
}

const BatchJobCard = React.memo(({
  job,
  payeeCount,
  isRefreshing,
  isDownloading,
  isPolling,
  progress,
  customProgress,
  lastError,
  onRefresh,
  onDownload,
  onCancel,
  onDelete,
  isCompleted = false,
  isStuck = false,
  shouldTimeout = false,
  elapsedTime = '',
  onRecover = () => {},
  isRecovering = false
}: BatchJobCardProps) => {
  const { getProgress } = useUnifiedProgress();
  const [showDetails, setShowDetails] = useState(false);

  // Memoize status color calculation
  const statusColor = useMemo(() => {
    switch (job.status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      case 'expired': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'in_progress': return shouldTimeout ? 'bg-red-100 text-red-800 border-red-200' : 
                                isStuck ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 
                                'bg-blue-100 text-blue-800 border-blue-200';
      case 'validating': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'finalizing': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }, [job.status, shouldTimeout, isStuck]);

  // Memoize status display
  const statusDisplay = useMemo(() => {
    if (shouldTimeout) return 'Stuck';
    if (isStuck && job.status === 'in_progress') return 'Slow Progress';
    return job.status.charAt(0).toUpperCase() + job.status.slice(1).replace('_', ' ');
  }, [job.status, shouldTimeout, isStuck]);

  // Memoize progress info calculation
  const progressInfo = useMemo(() => {
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

  return (
    <Card className={`transition-all duration-200 ${isCompleted ? 'ring-2 ring-green-200' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              Job {job.id.slice(-8)}
              {isCompleted && <Badge variant="outline" className="text-green-600 border-green-300">Completed</Badge>}
              {elapsedTime && (
                <Badge variant="outline" className="text-gray-600 border-gray-300 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {elapsedTime}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {payeeCount} payees
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(job.created_at * 1000).toLocaleString()}
              </span>
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={statusColor}>
              {statusDisplay}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {showBar && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{progressInfo.label}</span>
              <span className="font-medium">{progressInfo.percentage}%</span>
            </div>
            <Progress value={progressInfo.percentage} className="h-2" />
          </div>
        )}

        <BatchJobTimeoutIndicator
          job={job}
          isStuck={isStuck}
          shouldTimeout={shouldTimeout}
          elapsedTime={elapsedTime}
          onRecover={onRecover}
          isRecovering={isRecovering}
        />

        {lastError && (
          <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{lastError}</span>
          </div>
        )}

        {showDetails && (
          <div className="text-xs text-muted-foreground space-y-1 bg-gray-50 p-2 rounded">
            <div>Created: {new Date(job.created_at * 1000).toLocaleString()}</div>
            {job.in_progress_at && (
              <div>Started: {new Date(job.in_progress_at * 1000).toLocaleString()}</div>
            )}
            {job.completed_at && (
              <div>Completed: {new Date(job.completed_at * 1000).toLocaleString()}</div>
            )}
            <div>Requests: {job.request_counts.completed}/{job.request_counts.total} 
              {job.request_counts.failed > 0 && ` (${job.request_counts.failed} failed)`}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="text-muted-foreground"
          >
            {showDetails ? 'Hide' : 'Show'} Details
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing || isPolling}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${(isRefreshing || isPolling) ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            {job.status === 'completed' && !isCompleted && (
              <Button
                variant="default"
                size="sm"
                onClick={onDownload}
                disabled={isDownloading}
              >
                <Download className={`h-3 w-3 mr-1 ${isDownloading ? 'animate-pulse' : ''}`} />
                Download
              </Button>
            )}

            {['validating', 'in_progress', 'finalizing'].includes(job.status) && (
              <Button
                variant="destructive"
                size="sm"
                onClick={onCancel}
              >
                <X className="h-3 w-3 mr-1" />
                Cancel
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

BatchJobCard.displayName = 'BatchJobCard';

export default BatchJobCard;
