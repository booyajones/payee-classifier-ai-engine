
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, Activity, CheckCircle, AlertCircle, XCircle, Loader2 } from 'lucide-react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { formatDistanceToNow } from 'date-fns';

interface BatchJobStatusIndicatorProps {
  job: BatchJob;
  isPolling?: boolean;
  isRefreshing?: boolean;
  lastChecked?: Date;
}

const BatchJobStatusIndicator = ({ 
  job, 
  isPolling = false, 
  isRefreshing = false,
  lastChecked 
}: BatchJobStatusIndicatorProps) => {
  const getStatusIcon = () => {
    if (isRefreshing) return <Loader2 className="h-3 w-3 animate-spin" />;
    
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
    switch (job.status) {
      case 'completed':
        return 'default';
      case 'failed':
      case 'expired':
        return 'destructive';
      case 'cancelled':
        return 'secondary';
      case 'in_progress':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getStatusText = () => {
    if (isRefreshing) return 'Refreshing...';
    
    let statusText = job.status.charAt(0).toUpperCase() + job.status.slice(1);
    
    if (job.status === 'in_progress' && job.request_counts.total > 0) {
      const progress = Math.round((job.request_counts.completed / job.request_counts.total) * 100);
      statusText += ` (${progress}%)`;
    }
    
    return statusText;
  };

  return (
    <div className="flex items-center gap-2">
      <Badge variant={getStatusVariant()} className="flex items-center gap-1">
        {getStatusIcon()}
        {getStatusText()}
      </Badge>
      
      {isPolling && (
        <Badge variant="outline" className="text-xs">
          <Activity className="h-2 w-2 mr-1" />
          Auto-polling
        </Badge>
      )}
      
      {lastChecked && (
        <span className="text-xs text-muted-foreground">
          Last checked {formatDistanceToNow(lastChecked)} ago
        </span>
      )}
    </div>
  );
};

export default BatchJobStatusIndicator;
