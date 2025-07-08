import React from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { Clock, Loader2, RefreshCw, TrendingUp, Zap, Timer } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface EnhancedBatchJobProgressProps {
  job: BatchJob;
  onManualRefresh?: () => void;
  isRefreshing?: boolean;
}

const EnhancedBatchJobProgress = ({ job, onManualRefresh, isRefreshing = false }: EnhancedBatchJobProgressProps) => {
  const { total, completed, failed } = job.request_counts;
  const createdTime = new Date(job.created_at * 1000);
  const ageInMs = Date.now() - createdTime.getTime();
  const ageInMinutes = ageInMs / (1000 * 60);
  const ageInHours = ageInMs / (1000 * 60 * 60);
  
  const getProgressPercentage = () => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  const getProcessingRate = () => {
    if (completed === 0 || ageInHours === 0) return null;
    return completed / ageInHours;
  };

  const getEstimatedTimeRemaining = () => {
    const progress = getProgressPercentage();
    const rate = getProcessingRate();
    
    if (!rate || progress <= 0) return null;
    
    const remaining = (total - completed) / rate;
    
    if (remaining > 24) {
      return `~${Math.round(remaining / 24)}d ${Math.round((remaining % 24))}h`;
    } else if (remaining > 1) {
      return `~${Math.round(remaining)}h ${Math.round((remaining % 1) * 60)}m`;
    }
    return `~${Math.round(remaining * 60)}m`;
  };

  const getProgressPhase = () => {
    const progress = getProgressPercentage();
    const isLargeJob = total > 1000;
    const isVeryLargeJob = total > 5000;
    
    if (progress === 0 && ageInMinutes < 3) {
      return {
        phase: 'Initializing',
        message: 'Job is being queued and validated by OpenAI.',
        detail: 'This typically takes 1-3 minutes for job setup.',
        variant: 'default' as const,
        color: 'blue',
        showTimeoutWarning: false
      };
    } else if (progress === 0 && ageInMinutes < 10) {
      return {
        phase: 'Queue Processing',
        message: 'Waiting in OpenAI\'s processing queue.',
        detail: isVeryLargeJob ? 'Very large jobs may queue for 10-30 minutes.' : 
                isLargeJob ? 'Large jobs typically queue for 5-15 minutes.' : 
                'Should start processing within 5-10 minutes.',
        variant: 'default' as const,
        color: 'yellow',
        showTimeoutWarning: false
      };
    } else if (progress === 0 && ageInMinutes < 30) {
      return {
        phase: 'Extended Queue',
        message: 'Still waiting for processing to begin.',
        detail: 'During high demand, large jobs can take 15-30 minutes to start. This is normal.',
        variant: 'secondary' as const,
        color: 'orange',
        showTimeoutWarning: true
      };
    } else if (progress === 0) {
      return {
        phase: 'Long Queue Time',
        message: 'Extended queue time detected.',
        detail: 'This may indicate high API demand. Consider manual refresh or contact support if this persists beyond 1 hour.',
        variant: 'secondary' as const,
        color: 'red',
        showTimeoutWarning: true
      };
    } else if (progress > 0 && progress < 5) {
      return {
        phase: 'Starting Up',
        message: 'Processing has begun!',
        detail: 'Initial progress is often slow as the system ramps up. Expect acceleration soon.',
        variant: 'default' as const,
        color: 'green',
        showTimeoutWarning: false
      };
    } else if (progress >= 5 && progress < 25) {
      return {
        phase: 'Active Processing',
        message: 'Steady progress underway.',
        detail: `Processing at ~${getProcessingRate()?.toFixed(0) || 'calculating'} items/hour. ${getEstimatedTimeRemaining() || 'Calculating ETA...'}`,
        variant: 'default' as const,
        color: 'green',
        showTimeoutWarning: false
      };
    } else if (progress >= 25 && progress < 75) {
      return {
        phase: 'Mid-Process',
        message: 'Making good progress.',
        detail: `${getEstimatedTimeRemaining() || 'Calculating time remaining...'} estimated remaining.`,
        variant: 'default' as const,
        color: 'blue',
        showTimeoutWarning: false
      };
    } else if (progress >= 75 && progress < 95) {
      return {
        phase: 'Nearing Completion',
        message: 'Almost finished!',
        detail: `${getEstimatedTimeRemaining() || 'Final processing'} remaining. Final items often process faster.`,
        variant: 'default' as const,
        color: 'purple',
        showTimeoutWarning: false
      };
    } else {
      return {
        phase: 'Final Processing',
        message: 'In final stages.',
        detail: 'Nearly complete! Job should finish very soon.',
        variant: 'default' as const,
        color: 'green',
        showTimeoutWarning: false
      };
    }
  };

  const showProgress = total > 0 && job.status === 'in_progress';

  if (!showProgress) return null;

  const progressPhase = getProgressPhase();
  const progress = getProgressPercentage();
  const rate = getProcessingRate();
  const isLargeJob = total > 1000;
  const isVeryLargeJob = total > 5000;

  return (
    <Card className="border-l-4 border-l-primary/50">
      <CardContent className="p-4 space-y-4">
        {/* Enhanced Progress Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isRefreshing ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : progress === 0 ? (
              <Clock className="h-5 w-5 text-muted-foreground" />
            ) : (
              <TrendingUp className="h-5 w-5 text-green-600" />
            )}
            <div className="space-y-1">
              <Badge variant={progressPhase.variant} className="font-medium">
                {progressPhase.phase}
              </Badge>
              {isVeryLargeJob && (
                <Badge variant="outline" className="text-xs ml-2 bg-purple-50 text-purple-700 border-purple-200">
                  Enterprise Scale
                </Badge>
              )}
              {isLargeJob && !isVeryLargeJob && (
                <Badge variant="outline" className="text-xs ml-2 bg-blue-50 text-blue-700 border-blue-200">
                  Large Batch
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">{progress}%</div>
              {rate && (
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  {rate.toFixed(0)}/hr
                </div>
              )}
            </div>
            {progressPhase.showTimeoutWarning && onManualRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onManualRefresh}
                disabled={isRefreshing}
                className="h-8 px-3"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            )}
          </div>
        </div>

        {/* Enhanced Progress Bar */}
        <div className="space-y-2">
          <Progress 
            value={progress} 
            className="h-3 bg-gray-100" 
          />
          <div className="flex justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="font-medium">
                {completed.toLocaleString()} / {total.toLocaleString()} processed
              </span>
              {failed > 0 && (
                <span className="text-destructive font-medium">
                  {failed} failed
                </span>
              )}
            </div>
            {getEstimatedTimeRemaining() && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Timer className="h-4 w-4" />
                {getEstimatedTimeRemaining()} remaining
              </div>
            )}
          </div>
        </div>

        {/* Phase Information */}
        <Alert className={`border-l-4 border-l-${progressPhase.color}-500`}>
          <AlertDescription>
            <div className="space-y-3">
              <div>
                <p className="font-medium">{progressPhase.message}</p>
                <p className="text-sm text-muted-foreground mt-1">{progressPhase.detail}</p>
              </div>
              
              {/* Timing Information */}
              <div className="flex items-center gap-6 text-sm text-muted-foreground border-t pt-2">
                <span>Started {formatDistanceToNow(createdTime)} ago</span>
                {rate && (
                  <span>Processing rate: {rate.toFixed(1)} items/hour</span>
                )}
                {ageInHours > 1 && (
                  <span>Runtime: {Math.round(ageInHours)}h {Math.round((ageInHours % 1) * 60)}m</span>
                )}
              </div>

              {/* Large Job Context */}
              {isVeryLargeJob && progress < 100 && (
                <div className="text-sm bg-purple-50 p-3 rounded border border-purple-200">
                  <p className="text-purple-800 font-medium">🏭 Enterprise-Scale Processing</p>
                  <p className="text-purple-700 text-xs mt-1">
                    Jobs with {total.toLocaleString()} items typically take 24-48+ hours. 
                    Current progress is normal for this scale.
                  </p>
                </div>
              )}
              
              {isLargeJob && !isVeryLargeJob && progress < 100 && (
                <div className="text-sm bg-blue-50 p-3 rounded border border-blue-200">
                  <p className="text-blue-800 font-medium">📊 Large Batch Processing</p>
                  <p className="text-blue-700 text-xs mt-1">
                    Large batches like this ({total.toLocaleString()} items) typically complete within 12-24 hours.
                  </p>
                </div>
              )}

              {/* Progress Insights */}
              {progress > 10 && progress < 90 && (
                <div className="text-xs text-muted-foreground">
                  💡 You can safely close this page - we'll continue tracking progress and notify you when complete.
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default EnhancedBatchJobProgress;