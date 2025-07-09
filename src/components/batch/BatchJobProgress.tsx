import React from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { Clock, Loader2, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface BatchJobProgressProps {
  job: BatchJob;
  onManualRefresh?: () => void;
  isRefreshing?: boolean;
}

const BatchJobProgress = ({ job, onManualRefresh, isRefreshing = false }: BatchJobProgressProps) => {
  const { total, completed, failed } = job.request_counts;
  
  const getProgressPercentage = () => {
    if (total === 0) return 0;
    return Number(((completed / total) * 100).toFixed(1)); // Show 1 decimal place for better precision
  };

  const getJobAge = () => {
    const createdTime = new Date(job.created_at * 1000);
    const ageInMinutes = (Date.now() - createdTime.getTime()) / (1000 * 60);
    return ageInMinutes;
  };

  const getEstimatedTimeRemaining = () => {
    const progress = getProgressPercentage();
    if (progress <= 0) return null;
    
    const ageInMinutes = getJobAge();
    const estimatedTotal = (ageInMinutes / progress) * 100;
    const remaining = estimatedTotal - ageInMinutes;
    
    if (remaining > 60) {
      return `~${Math.round(remaining / 60)}h ${Math.round(remaining % 60)}m`;
    }
    return `~${Math.round(remaining)}m`;
  };

  const getProgressStage = () => {
    const progress = getProgressPercentage();
    const ageInMinutes = getJobAge();
    
    if (progress === 0 && ageInMinutes < 5) {
      return {
        stage: 'Initializing',
        message: 'Job is being queued and validated by OpenAI. This typically takes 2-5 minutes.',
        variant: 'default' as const,
        showTimeoutWarning: false
      };
    } else if (progress === 0 && ageInMinutes < 15) {
      return {
        stage: 'Queued',
        message: 'Waiting for OpenAI processing to begin. Large jobs may take 5-15 minutes to start.',
        variant: 'default' as const,
        showTimeoutWarning: false
      };
    } else if (progress === 0 && ageInMinutes >= 15) {
      return {
        stage: 'Delayed Start',
        message: 'Processing is taking longer than usual. You can manually refresh or wait for automatic updates.',
        variant: 'secondary' as const,
        showTimeoutWarning: true
      };
    } else if (progress > 0 && progress < 100) {
      return {
        stage: 'Processing',
        message: `Processing requests at OpenAI. ${getEstimatedTimeRemaining() || 'Calculating time remaining...'}`,
        variant: 'default' as const,
        showTimeoutWarning: false
      };
    }
    
    return {
      stage: 'Processing',
      message: 'Processing your batch job...',
      variant: 'default' as const,
      showTimeoutWarning: false
    };
  };

  // FIXED: Only show progress for truly active jobs
  const showProgress = total > 0 && job.status === 'in_progress';

  if (!showProgress) return null;

  const progressStage = getProgressStage();
  const progress = getProgressPercentage();
  const ageInMinutes = getJobAge();

  return (
    <div className="space-y-3">
      {/* Enhanced Progress Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : progress === 0 ? (
            <Clock className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          )}
          <Badge variant={progressStage.variant} className="text-xs">
            {progressStage.stage}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{progress}%</span>
          {isRefreshing && <span className="text-xs text-muted-foreground">Updating...</span>}
          {progressStage.showTimeoutWarning && onManualRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onManualRefresh}
              disabled={isRefreshing}
              className="h-6 px-2 text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar with better visual feedback */}
      <div className="space-y-1">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Progress: {completed}/{total} requests</span>
          {failed > 0 && <span className="text-destructive">{failed} failed</span>}
        </div>
      </div>

      {/* Stage Information and Messaging */}
      <Alert variant={progressStage.showTimeoutWarning ? 'default' : 'default'}>
        <AlertDescription className="text-sm">
          <div className="space-y-2">
            <p>{progressStage.message}</p>
            
            {/* Job timing info */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Started {formatDistanceToNow(new Date(job.created_at * 1000))} ago</span>
              {progress > 0 && (
                <span>ETA: {getEstimatedTimeRemaining() || 'Calculating...'}</span>
              )}
            </div>

            {/* Additional context based on stage */}
            {progress === 0 && ageInMinutes >= 5 && (
              <p className="text-xs text-muted-foreground">
                💡 OpenAI batch jobs typically take 5-15 minutes before showing initial progress. 
                You can safely leave this page - we'll track progress automatically.
              </p>
            )}
            
            {progress > 0 && progress < 25 && (
              <p className="text-xs text-muted-foreground">
                ⚡ Processing has started! Progress updates will be more frequent now.
              </p>
            )}
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default BatchJobProgress;