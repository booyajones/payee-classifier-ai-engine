
import { Loader2, CheckCircle, AlertCircle, Clock, MemoryStick, Activity } from 'lucide-react';
import { useProgressPersistence } from '@/hooks/useProgressPersistence';
import { useMemoryMonitor } from '@/lib/performance/memoryOptimization';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadState } from '@/hooks/useSmartFileUpload';
import { formatDistanceToNow } from 'date-fns';

interface EnhancedUploadProgressDisplayProps {
  uploadState: UploadState;
  uploadId: string;
  showMemoryStats?: boolean;
  showProgressHistory?: boolean;
}

const EnhancedUploadProgressDisplay = ({ 
  uploadState, 
  uploadId, 
  showMemoryStats = true,
  showProgressHistory = false 
}: EnhancedUploadProgressDisplayProps) => {
  const { getProgress, getProgressHistory } = useProgressPersistence();
  const memoryStats = useMemoryMonitor(showMemoryStats);
  
  const currentProgress = getProgress(uploadId);
  const progressHistory = showProgressHistory ? getProgressHistory(uploadId) : [];

  const getStatusIcon = () => {
    switch (uploadState) {
      case 'processing':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'complete':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getMemoryPressureBadge = () => {
    if (!memoryStats) return null;
    
    const variant = memoryStats.memoryPressure === 'high' ? 'destructive' 
      : memoryStats.memoryPressure === 'medium' ? 'secondary' : 'outline';
    
    return (
      <Badge variant={variant} className="text-xs">
        <MemoryStick className="h-3 w-3 mr-1" />
        {memoryStats.memoryPressure} pressure
      </Badge>
    );
  };

  if (!currentProgress || uploadState === 'idle') {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span>{currentProgress.stage}</span>
          </div>
          <div className="flex items-center gap-2">
            {getMemoryPressureBadge()}
            <Badge variant="outline" className="text-xs">
              {currentProgress.percentage}%
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Main Progress Bar */}
        <div className="space-y-2">
          <Progress 
            value={currentProgress.percentage} 
            className="w-full h-2"
          />
          <p className="text-sm text-muted-foreground">
            {currentProgress.message}
          </p>
        </div>

        {/* Job Information */}
        {currentProgress.jobId && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Activity className="h-3 w-3" />
            <span>Job ID: {currentProgress.jobId}</span>
            <span>•</span>
            <span>Started {formatDistanceToNow(new Date(currentProgress.timestamp))} ago</span>
          </div>
        )}

        {/* Memory Statistics */}
        {showMemoryStats && memoryStats && (
          <Alert variant={memoryStats.memoryPressure === 'high' ? 'destructive' : 'default'}>
            <MemoryStick className="h-4 w-4" />
            <AlertDescription>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>Memory Usage: {(memoryStats.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB</div>
                <div>Available: {((memoryStats.jsHeapSizeLimit - memoryStats.usedJSHeapSize) / 1024 / 1024).toFixed(1)}MB</div>
              </div>
              {memoryStats.memoryPressure === 'high' && (
                <div className="mt-2 text-xs font-medium text-red-600">
                  High memory usage detected. Consider closing other browser tabs.
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Processing Information */}
        <div className="text-sm text-muted-foreground">
          {uploadState === 'processing' && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>
                This operation may take several minutes. You can safely leave this page - 
                progress will be saved automatically.
              </span>
            </div>
          )}
          
          {uploadState === 'complete' && (
            <div className="text-green-600 font-medium">
              Processing completed successfully!
            </div>
          )}
          
          {uploadState === 'error' && (
            <div className="text-red-600 font-medium">
              An error occurred during processing. Please try again.
            </div>
          )}
        </div>

        {/* Progress History (if enabled) */}
        {showProgressHistory && progressHistory.length > 1 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Progress History</h4>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {progressHistory.slice(-5).map((item, index) => (
                <div key={index} className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>{item.stage}: {item.message}</span>
                  <span>{item.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedUploadProgressDisplay;
