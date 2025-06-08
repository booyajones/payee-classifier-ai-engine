
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, Download, RefreshCw, Trash, Loader2, CheckCheck, AlertCircle } from "lucide-react";
import { BatchJob } from "@/lib/openai/trueBatchAPI";

interface BatchJobCardProps {
  job: BatchJob;
  payeeCount: number;
  isRefreshing: boolean;
  isDownloading: boolean;
  isPolling: boolean;
  isCompleted?: boolean;
  progress?: { current: number; total: number };
  lastError?: string;
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
  onRefresh,
  onDownload,
  onCancel,
  onDelete
}: BatchJobCardProps) => {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  // Calculate OpenAI batch progress
  const batchProgress = job.request_counts.total > 0 
    ? Math.round((job.request_counts.completed / job.request_counts.total) * 100)
    : 0;

  // Determine what progress to show
  const getProgressInfo = () => {
    if (isDownloading && progress) {
      return {
        percentage: Math.round((progress.current / progress.total) * 100),
        label: `Processing results: ${progress.current}/${progress.total}`,
        showBar: true
      };
    }
    
    if (job.status === 'in_progress' || job.status === 'finalizing') {
      if (job.request_counts.completed > 0) {
        return {
          percentage: batchProgress,
          label: `OpenAI processing: ${job.request_counts.completed}/${job.request_counts.total}`,
          showBar: true
        };
      } else {
        return {
          percentage: 0,
          label: 'OpenAI batch processing started...',
          showBar: true
        };
      }
    }
    
    if (job.status === 'validating') {
      return {
        percentage: 0,
        label: 'Validating batch request...',
        showBar: true
      };
    }
    
    return { showBar: false };
  };

  const progressInfo = getProgressInfo();

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
            <span className="font-medium">Total Requests:</span> {job.request_counts.total}
          </div>
          <div>
            <span className="font-medium">Completed:</span> {job.request_counts.completed}
          </div>
          <div>
            <span className="font-medium">Failed:</span> {job.request_counts.failed}
          </div>
          <div>
            <span className="font-medium">Batch Progress:</span> {batchProgress}%
          </div>
        </div>

        {progressInfo.showBar && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{progressInfo.label}</span>
              {progressInfo.percentage !== undefined && <span>{progressInfo.percentage}%</span>}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${progressInfo.percentage || 0}%` }}
              ></div>
            </div>
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
