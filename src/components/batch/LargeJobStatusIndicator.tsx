import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, Activity, CheckCircle, AlertCircle, XCircle, Loader2, AlertTriangle, Hourglass } from 'lucide-react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { formatDistanceToNow } from 'date-fns';

interface LargeJobStatusIndicatorProps {
  job: BatchJob;
  isPolling?: boolean;
  isRefreshing?: boolean;
  lastChecked?: Date;
  isStalled?: boolean;
}

const LargeJobStatusIndicator = ({ 
  job, 
  isPolling = false, 
  isRefreshing = false,
  lastChecked,
  isStalled = false
}: LargeJobStatusIndicatorProps) => {
  const createdTime = new Date(job.created_at * 1000);
  const jobAge = Date.now() - createdTime.getTime();
  const ageHours = jobAge / (1000 * 60 * 60);
  const isLargeJob = job.request_counts.total > 1000;
  const isVeryLargeJob = job.request_counts.total > 5000;
  const isLongRunning = ageHours > 2;
  const isVeryLongRunning = ageHours > 12;

  const getStatusIcon = () => {
    if (isRefreshing) return <Loader2 className="h-3 w-3 animate-spin" />;
    
    if (isStalled) return <AlertTriangle className="h-3 w-3" />;
    
    // Enhanced icons for long-running jobs
    if (isVeryLongRunning && job.status === 'in_progress') {
      return <Hourglass className="h-3 w-3" />;
    }
    
    switch (job.status) {
      case 'validating':
        return <Clock className="h-3 w-3" />;
      case 'in_progress':
        return <Activity className="h-3 w-3" />;
      case 'finalizing':
        return <Loader2 className="h-3 w-3 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-3 w-3" />;
      case 'failed':
        return <AlertCircle className="h-3 w-3" />;
      case 'cancelled':
      case 'expired':
        return <XCircle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const getStatusVariant = () => {
    if (isStalled) return 'destructive';
    
    switch (job.status) {
      case 'completed':
        return 'default';
      case 'failed':
      case 'expired':
        return 'destructive';
      case 'cancelled':
        return 'secondary';
      case 'in_progress':
        return isVeryLongRunning ? 'outline' : 'outline';
      default:
        return 'secondary';
    }
  };

  const getStatusText = () => {
    if (isRefreshing) return 'Refreshing...';
    
    if (isStalled) return 'Stalled - No Progress';
    
    let statusText = job.status.charAt(0).toUpperCase() + job.status.slice(1);
    
    if (job.status === 'in_progress' && job.request_counts.total > 0) {
      const progress = Math.round((job.request_counts.completed / job.request_counts.total) * 100);
      statusText += ` (${progress}%)`;
      
      // Add context for long-running jobs
      if (isVeryLongRunning) {
        statusText += ' - Marathon Job';
      } else if (isLongRunning) {
        statusText += ' - Long Running';
      }
    }
    
    return statusText;
  };

  const getJobSizeIndicator = () => {
    if (isVeryLargeJob) {
      return (
        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
          <Hourglass className="h-2 w-2 mr-1" />
          Enterprise Scale ({job.request_counts.total.toLocaleString()} items)
        </Badge>
      );
    } else if (isLargeJob) {
      return (
        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
          Large Batch ({job.request_counts.total.toLocaleString()} items)
        </Badge>
      );
    }
    return null;
  };

  const getTimeIndicator = () => {
    // FIXED: Don't show "running" for completed jobs
    if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled' || job.status === 'expired') {
      return null;
    }
    
    if (isVeryLongRunning) {
      return (
        <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
          <Clock className="h-2 w-2 mr-1" />
          {Math.round(ageHours)}h running
        </Badge>
      );
    } else if (isLongRunning) {
      return (
        <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
          <Clock className="h-2 w-2 mr-1" />
          {Math.round(ageHours)}h running
        </Badge>
      );
    }
    return null;
  };

  const getElapsedTime = () => {
    return formatDistanceToNow(createdTime, { addSuffix: true });
  };

  const getProgressRate = () => {
    if (job.status !== 'in_progress' || job.request_counts.completed === 0) return null;
    
    const rate = job.request_counts.completed / ageHours;
    if (rate < 1) {
      return `${(rate * 60).toFixed(1)}/hour`;
    }
    return `${rate.toFixed(0)}/hour`;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant={getStatusVariant()} className="flex items-center gap-1">
          {getStatusIcon()}
          {getStatusText()}
        </Badge>
        
        {getJobSizeIndicator()}
        {getTimeIndicator()}
        
        {isPolling && (
          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
            <Activity className="h-2 w-2 mr-1" />
            Live Updates
          </Badge>
        )}
        
        {isStalled && (
          <Badge variant="destructive" className="text-xs">
            <AlertTriangle className="h-2 w-2 mr-1" />
            Needs Action
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>Created {getElapsedTime()}</span>
        
        {getProgressRate() && (
          <span>• Rate: {getProgressRate()}</span>
        )}
        
        {lastChecked && (
          <span>• Last checked {formatDistanceToNow(lastChecked)} ago</span>
        )}
      </div>

      {/* Context messages for large/long-running jobs */}
      {(isLargeJob || isLongRunning) && job.status === 'in_progress' && (
        <div className="text-xs text-muted-foreground bg-blue-50 p-2 rounded border border-blue-200">
          {isVeryLargeJob && isVeryLongRunning ? (
            <span>🏭 Enterprise-scale batch processing can take 24-48+ hours. This is normal for jobs with {job.request_counts.total.toLocaleString()} items.</span>
          ) : isVeryLargeJob ? (
            <span>📊 Large batch detected. Processing {job.request_counts.total.toLocaleString()} items typically takes 12-24+ hours.</span>
          ) : isLongRunning ? (
            <span>⏱️ Long-running job (2+ hours). Large batches can take 12-24+ hours to complete.</span>
          ) : (
            <span>🔄 This job is processing normally. Large batches may take several hours.</span>
          )}
        </div>
      )}
    </div>
  );
};

export default LargeJobStatusIndicator;